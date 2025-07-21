import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { createServer, Server as HTTPServer } from 'http';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { 
  TransportMessage,
  MessageType,
  EventMessage,
  RequestMessage,
  ResponseMessage,
  ErrorMessage,
  BaseEvent
} from '@semantest/core';
import { 
  WebSocketServerOptions,
  ClientConnection,
  ClientInfo
} from './types';
import { ClientManager } from './client-manager';
import { SubscriptionManager } from './subscription-manager';
import { MessageRouter } from './message-router';
import { RequestHandler } from './request-handler';
import { SecurityMiddleware } from './security/security-middleware';
import { RateLimiter } from './security/rate-limiter';
import { AccessController } from './security/access-controller';
import { EventValidator } from './security/event-validator';

/**
 * WebSocket server for Semantest distributed testing framework
 */
export class WebSocketServer extends EventEmitter {
  private options: Required<WebSocketServerOptions>;
  private httpServer?: HTTPServer;
  private wsServer?: WSServer;
  private clientManager: ClientManager;
  private subscriptionManager: SubscriptionManager;
  private messageRouter: MessageRouter;
  private requestHandler: RequestHandler;
  private heartbeatInterval?: NodeJS.Timeout;
  
  // Security components
  private securityMiddleware: SecurityMiddleware;
  private rateLimiter: RateLimiter;
  private accessController: AccessController;
  private eventValidator: EventValidator;

  constructor(options: WebSocketServerOptions) {
    super();
    
    // Set defaults for options
    this.options = {
      port: options.port,
      host: options.host || '0.0.0.0',
      maxConnections: options.maxConnections || 1000,
      heartbeatInterval: options.heartbeatInterval || 30000,
      requestTimeout: options.requestTimeout || 30000,
      path: options.path || '/'
    };

    // Initialize security components
    this.rateLimiter = new RateLimiter(100); // 100 events per second
    this.accessController = new AccessController({
      maxEventsPerSecond: 100,
      maxEventSize: 1024 * 1024,
      requireAuthentication: false
    });
    this.eventValidator = new EventValidator({
      maxEventsPerSecond: 100,
      maxEventSize: 1024 * 1024
    });
    this.securityMiddleware = new SecurityMiddleware();

    // Initialize managers
    this.clientManager = new ClientManager(this.options.maxConnections);
    this.subscriptionManager = new SubscriptionManager();
    this.messageRouter = new MessageRouter(
      this.clientManager,
      this.subscriptionManager
    );
    this.requestHandler = new RequestHandler(
      this.clientManager,
      this.options.requestTimeout
    );
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create HTTP server
        this.httpServer = createServer();
        
        // Create WebSocket server
        this.wsServer = new WSServer({ 
          server: this.httpServer,
          path: this.options.path,
          perMessageDeflate: {
            zlibDeflateOptions: {
              chunkSize: 1024,
              memLevel: 7,
              level: 3
            },
            zlibInflateOptions: {
              chunkSize: 10 * 1024
            },
            concurrencyLimit: 10,
            threshold: 1024
          }
        });

        // Set up connection handling
        this.wsServer.on('connection', this.handleConnection.bind(this));

        // Start heartbeat
        this.startHeartbeat();

        // Start HTTP server
        this.httpServer.listen(this.options.port, this.options.host, () => {
          this.emit('started', {
            port: this.options.port,
            host: this.options.host
          });
          resolve();
        });

        this.httpServer.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        delete this.heartbeatInterval;
      }

      // Close all client connections
      this.clientManager.getAllClients().forEach(client => {
        client.ws.close(1000, 'Server shutting down');
      });

      // Close WebSocket server
      if (this.wsServer) {
        this.wsServer.close(() => {
          delete this.wsServer;
        });
      }

      // Close HTTP server
      if (this.httpServer) {
        this.httpServer.close(() => {
          delete this.httpServer;
          this.emit('stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WebSocket, request: any): Promise<void> {
    const clientId = uuidv4();
    const clientInfo: ClientInfo = {
      id: clientId,
      connectedAt: Date.now(),
      subscriptions: new Set()
    };

    // Extract metadata from headers if available
    if (request.headers['x-metadata']) {
      try {
        clientInfo.metadata = JSON.parse(request.headers['x-metadata']);
      } catch (error) {
        // Ignore invalid metadata
      }
    }

    // Apply authentication check
    const authToken = request.headers['authorization'] || request.headers['x-auth-token'];
    if (this.securityMiddleware.requiresAuthentication() && !authToken) {
      ws.close(1008, 'Authentication required');
      return;
    }

    // Store authentication info
    if (authToken) {
      clientInfo.authToken = authToken as string;
      clientInfo.permissions = ['read', 'write']; // Default permissions
    }

    const client: ClientConnection = {
      id: clientId,
      ws,
      info: clientInfo,
      isAlive: true,
      pendingRequests: new Map()
    };

    // Register client
    try {
      this.clientManager.addClient(client);
      this.emit('client:connected', clientInfo);
    } catch (error) {
      ws.close(1008, 'Max connections reached');
      return;
    }

    // Set up client event handlers
    ws.on('message', (data) => this.handleMessage(client, data));
    ws.on('pong', () => this.handlePong(client));
    ws.on('close', () => this.handleDisconnect(client));
    ws.on('error', (error) => this.handleError(client, error));

    // Send welcome message
    const welcomeMessage: TransportMessage = {
      id: uuidv4(),
      type: MessageType.EVENT,
      timestamp: Date.now(),
      payload: {
        id: uuidv4(),
        type: 'system.connected',
        timestamp: Date.now(),
        payload: { clientId }
      }
    };
    
    this.sendToClient(client, welcomeMessage);
  }

  /**
   * Handle incoming message from client
   */
  private async handleMessage(client: ClientConnection, data: any): Promise<void> {
    try {
      const message = JSON.parse(data.toString()) as TransportMessage;
      
      // Apply rate limiting
      const isAllowed = this.rateLimiter.checkLimit(client.id);
      if (!isAllowed) {
        this.sendError(client, 'Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
        return;
      }

      // Apply access control for event types
      if (message.type === MessageType.EVENT) {
        const eventMessage = message as EventMessage;
        const accessResult = await this.accessController.checkAccess(
          client.id,
          eventMessage.payload.type
        );
        if (!accessResult.allowed) {
          this.sendError(client, 'Access denied', 'ACCESS_DENIED');
          return;
        }
      }
      
      switch (message.type) {
        case MessageType.EVENT:
          await this.handleEventMessage(client, message as EventMessage);
          break;
        case MessageType.REQUEST:
          await this.handleRequestMessage(client, message as RequestMessage);
          break;
        case MessageType.RESPONSE:
          await this.handleResponseMessage(client, message as ResponseMessage);
          break;
        case MessageType.SUBSCRIBE:
          await this.handleSubscribe(client, message);
          break;
        case MessageType.UNSUBSCRIBE:
          await this.handleUnsubscribe(client, message);
          break;
        case MessageType.PING:
          this.handlePing(client);
          break;
        default:
          this.sendError(client, 'Unknown message type', 'INVALID_MESSAGE_TYPE');
      }
    } catch (error) {
      this.sendError(client, 'Invalid message format', 'PARSE_ERROR');
    }
  }

  /**
   * Handle event message
   */
  private async handleEventMessage(client: ClientConnection, message: EventMessage): Promise<void> {
    const event = message.payload;
    
    // Validate event structure
    const validationResult = await this.securityMiddleware.validateEvent(event);
    if (!validationResult.valid) {
      this.sendError(client, `Invalid event: ${validationResult.errors?.map(e => e.message).join(', ')}`, 'INVALID_EVENT');
      return;
    }
    
    // Emit event locally
    this.emit('event', event);
    
    // Route to subscribers
    await this.messageRouter.routeEvent(event, client.id);
  }

  /**
   * Handle request message
   */
  private async handleRequestMessage(client: ClientConnection, message: RequestMessage): Promise<void> {
    await this.requestHandler.handleRequest(client, message);
  }

  /**
   * Handle response message
   */
  private async handleResponseMessage(client: ClientConnection, message: ResponseMessage): Promise<void> {
    await this.requestHandler.handleResponse(client, message);
  }

  /**
   * Handle subscribe message
   */
  private async handleSubscribe(client: ClientConnection, message: TransportMessage): Promise<void> {
    const { eventTypes } = message.payload as { eventTypes: string[] };
    
    eventTypes.forEach(eventType => {
      this.subscriptionManager.subscribe(client.id, eventType);
      client.info.subscriptions.add(eventType);
    });

    // Send confirmation
    const response: ResponseMessage = {
      id: uuidv4(),
      type: MessageType.RESPONSE,
      timestamp: Date.now(),
      requestId: message.id,
      success: true,
      payload: { subscribed: eventTypes }
    };

    this.sendToClient(client, response);
  }

  /**
   * Handle unsubscribe message
   */
  private async handleUnsubscribe(client: ClientConnection, message: TransportMessage): Promise<void> {
    const { eventTypes } = message.payload as { eventTypes: string[] };
    
    eventTypes.forEach(eventType => {
      this.subscriptionManager.unsubscribe(client.id, eventType);
      client.info.subscriptions.delete(eventType);
    });

    // Send confirmation
    const response: ResponseMessage = {
      id: uuidv4(),
      type: MessageType.RESPONSE,
      timestamp: Date.now(),
      requestId: message.id,
      success: true,
      payload: { unsubscribed: eventTypes }
    };

    this.sendToClient(client, response);
  }

  /**
   * Handle ping message
   */
  private handlePing(client: ClientConnection): void {
    const pongMessage: TransportMessage = {
      id: uuidv4(),
      type: MessageType.PONG,
      timestamp: Date.now(),
      payload: {}
    };
    
    this.sendToClient(client, pongMessage);
  }

  /**
   * Handle pong message (heartbeat response)
   */
  private handlePong(client: ClientConnection): void {
    client.isAlive = true;
    client.info.lastPing = Date.now();
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(client: ClientConnection): void {
    // Clean up subscriptions
    this.subscriptionManager.unsubscribeAll(client.id);
    
    // Remove client
    this.clientManager.removeClient(client.id);
    
    // Clear pending requests
    this.requestHandler.clearClientRequests(client.id);
    
    this.emit('client:disconnected', client.info);
  }

  /**
   * Handle client error
   */
  private handleError(client: ClientConnection, error: Error): void {
    this.emit('client:error', { client: client.info, error });
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clientManager.getAllClients().forEach(client => {
        if (!client.isAlive) {
          client.ws.terminate();
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, this.options.heartbeatInterval);
  }

  /**
   * Send message to specific client
   */
  private sendToClient(client: ClientConnection, message: TransportMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message to client
   */
  private sendError(client: ClientConnection, message: string, code: string): void {
    const errorMessage: ErrorMessage = {
      id: uuidv4(),
      type: MessageType.ERROR,
      timestamp: Date.now(),
      payload: { message, code }
    };
    
    this.sendToClient(client, errorMessage);
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: BaseEvent): void {
    this.messageRouter.broadcastEvent(event);
  }

  /**
   * Get information about all connected clients
   */
  getClients(): ClientInfo[] {
    return this.clientManager.getAllClients().map(client => client.info);
  }
}