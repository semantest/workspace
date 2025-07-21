import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { 
  RequestMessage,
  ResponseMessage,
  MessageType
} from '@semantest/core';
import { ClientManager } from './client-manager';
import { ClientConnection, PendingRequest } from './types';

/**
 * Handles request/response correlation for WebSocket messages
 */
export class RequestHandler {
  private clientManager: ClientManager;
  private requestTimeout: number;
  private handlers: Map<string, (request: RequestMessage, client: ClientConnection) => Promise<any>>;

  constructor(clientManager: ClientManager, requestTimeout: number) {
    this.clientManager = clientManager;
    this.requestTimeout = requestTimeout;
    this.handlers = new Map();
    
    // Register default handlers
    this.registerDefaultHandlers();
  }

  /**
   * Register a request handler for a specific method
   */
  registerHandler(
    method: string, 
    handler: (request: RequestMessage, client: ClientConnection) => Promise<any>
  ): void {
    this.handlers.set(method, handler);
  }

  /**
   * Handle incoming request from client
   */
  async handleRequest(client: ClientConnection, request: RequestMessage): Promise<void> {
    const handler = this.handlers.get(request.method);
    
    if (!handler) {
      await this.sendError(client, request.id, `Unknown method: ${request.method}`, 'METHOD_NOT_FOUND');
      return;
    }

    try {
      const result = await handler(request, client);
      await this.sendResponse(client, request.id, true, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      await this.sendError(client, request.id, errorMessage, 'REQUEST_ERROR');
    }
  }

  /**
   * Handle incoming response from client
   */
  async handleResponse(client: ClientConnection, response: ResponseMessage): Promise<void> {
    const pendingRequest = client.pendingRequests.get(response.requestId);
    
    if (!pendingRequest) {
      // Response for unknown request, ignore
      return;
    }

    // Clear timeout
    clearTimeout(pendingRequest.timeout);
    
    // Remove from pending
    client.pendingRequests.delete(response.requestId);
    
    // Resolve or reject promise
    if (response.success) {
      pendingRequest.resolve(response.payload);
    } else {
      pendingRequest.reject(new Error(response.error || 'Request failed'));
    }
  }

  /**
   * Send a request to a client and wait for response
   */
  async sendRequest<T = any>(
    clientId: string, 
    method: string, 
    payload: any
  ): Promise<T> {
    const client = this.clientManager.getClient(clientId);
    
    if (!client) {
      throw new Error('Client not found');
    }

    if (client.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Client connection not open');
    }

    const requestId = uuidv4();
    const request: RequestMessage = {
      id: requestId,
      type: MessageType.REQUEST,
      timestamp: Date.now(),
      method,
      payload
    };

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        client.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, this.requestTimeout);

      // Store pending request
      const pendingRequest: PendingRequest = {
        id: requestId,
        method,
        timestamp: Date.now(),
        timeout,
        resolve,
        reject
      };
      
      client.pendingRequests.set(requestId, pendingRequest);

      // Send request
      client.ws.send(JSON.stringify(request), (error) => {
        if (error) {
          clearTimeout(timeout);
          client.pendingRequests.delete(requestId);
          reject(error);
        }
      });
    });
  }

  /**
   * Send response to client
   */
  private async sendResponse(
    client: ClientConnection, 
    requestId: string, 
    success: boolean, 
    payload: any
  ): Promise<void> {
    const response: ResponseMessage = {
      id: uuidv4(),
      type: MessageType.RESPONSE,
      timestamp: Date.now(),
      requestId,
      success,
      payload
    };

    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(response));
    }
  }

  /**
   * Send error response to client
   */
  private async sendError(
    client: ClientConnection, 
    requestId: string, 
    message: string, 
    code: string
  ): Promise<void> {
    const response: ResponseMessage = {
      id: uuidv4(),
      type: MessageType.RESPONSE,
      timestamp: Date.now(),
      requestId,
      success: false,
      error: message,
      payload: { code }
    };

    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(response));
    }
  }

  /**
   * Clear all pending requests for a client
   */
  clearClientRequests(clientId: string): void {
    const client = this.clientManager.getClient(clientId);
    
    if (client) {
      client.pendingRequests.forEach(request => {
        clearTimeout(request.timeout);
        request.reject(new Error('Client disconnected'));
      });
      client.pendingRequests.clear();
    }
  }

  /**
   * Register default request handlers
   */
  private registerDefaultHandlers(): void {
    // Echo handler for testing
    this.registerHandler('echo', async (request) => {
      return request.payload;
    });

    // Server info handler
    this.registerHandler('server.info', async () => {
      return {
        version: '0.1.0',
        uptime: process.uptime(),
        connections: this.clientManager.getClientCount()
      };
    });

    // Client info handler
    this.registerHandler('client.info', async (_request, client) => {
      return {
        id: client.id,
        connectedAt: client.info.connectedAt,
        subscriptions: Array.from(client.info.subscriptions)
      };
    });
  }
}