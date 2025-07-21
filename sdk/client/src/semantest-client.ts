import {
  EventHandler,
  EventMetadata,
  BaseEvent,
  Transport,
  TransportOptions,
  TransportMessage,
  MessageType,
  EventMessage,
  RequestMessage,
  ResponseMessage,
  ErrorMessage,
  SubscribeMessage,
  UnsubscribeMessage
} from '@semantest/core';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter as EE3 } from 'eventemitter3';
import { WebSocketTransport } from './transport/websocket-transport';

/**
 * Client options
 */
export interface ClientOptions extends TransportOptions {
  /**
   * Client ID (auto-generated if not provided)
   */
  clientId?: string;
  
  /**
   * Default metadata to include with all events
   */
  defaultMetadata?: EventMetadata;
  
  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Request/response tracking
 */
interface PendingRequest {
  resolve: (response: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Internal event emitter for client events
 */
interface ClientEvents {
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  event: (event: BaseEvent) => void;
  reconnecting: (info: { attempt: number; delay: number }) => void;
}

/**
 * Semantest client implementation
 */
export class SemantestClient extends EE3<ClientEvents> {
  private transport: Transport;
  private options: ClientOptions;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private subscribedTypes: Set<string> = new Set();
  private connected = false;
  private connecting = false;

  constructor(options: ClientOptions) {
    super();
    
    this.options = {
      clientId: uuidv4(),
      debug: false,
      timeout: 10000,
      ...options
    };

    // Create transport
    this.transport = new WebSocketTransport(this.options);
    
    // Set up transport event handlers
    this.setupTransportHandlers();
  }

  /**
   * Connect to the server
   */
  async connect(): Promise<void> {
    if (this.connected || this.connecting) {
      return;
    }

    this.connecting = true;
    
    try {
      await this.transport.connect();
      this.connected = true;
      this.connecting = false;
      
      // Re-subscribe to previously subscribed event types
      if (this.subscribedTypes.size > 0) {
        await this.subscribeOnServer(Array.from(this.subscribedTypes));
      }
      
      super.emit('connected');
    } catch (error) {
      this.connecting = false;
      throw error;
    }
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    await this.transport.disconnect();
    this.connected = false;
    super.emit('disconnected');
  }

  /**
   * Send an event to the server
   */
  async send<T>(type: string, payload: T, metadata?: EventMetadata): Promise<void> {
    if (!this.connected) {
      throw new Error('Client is not connected');
    }

    const event: BaseEvent<T> = {
      id: uuidv4(),
      type,
      timestamp: Date.now(),
      payload,
      metadata: {
        ...this.options.defaultMetadata,
        ...metadata,
        source: this.options.clientId
      }
    };

    const message: EventMessage = {
      id: uuidv4(),
      type: MessageType.EVENT,
      timestamp: Date.now(),
      payload: event
    };

    await this.transport.send(message);
    
    if (this.options.debug) {
      console.log('[SemantestClient] Event emitted:', type, payload);
    }
  }

  /**
   * Subscribe to event handler
   */
  subscribe<T>(type: string, handler: EventHandler<T>): () => void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
      
      // Subscribe to this event type on the server
      if (this.connected && !this.subscribedTypes.has(type)) {
        this.subscribeOnServer([type]).catch(error => {
          console.error(`Failed to subscribe to ${type}:`, error);
        });
      }
    }

    this.eventHandlers.get(type)!.add(handler as EventHandler);
    this.subscribedTypes.add(type);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(type, handler);
    };
  }

  /**
   * Unsubscribe from event handler
   */
  unsubscribe<T>(type: string, handler: EventHandler<T>): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.delete(handler as EventHandler);
      
      // If no more handlers for this type, unsubscribe from server
      if (handlers.size === 0) {
        this.eventHandlers.delete(type);
        this.subscribedTypes.delete(type);
        
        if (this.connected) {
          this.unsubscribeFromServer([type]).catch(error => {
            console.error(`Failed to unsubscribe from ${type}:`, error);
          });
        }
      }
    }
  }

  /**
   * Subscribe to event handler (one-time)
   */
  subscribeOnce<T>(type: string, handler: EventHandler<T>): () => void {
    const wrappedHandler: EventHandler<T> = (event) => {
      handler(event);
      this.unsubscribe(type, wrappedHandler);
    };

    return this.subscribe(type, wrappedHandler);
  }

  /**
   * Send a request to the server
   */
  async request<TRequest, TResponse>(method: string, payload: TRequest): Promise<TResponse> {
    if (!this.connected) {
      throw new Error('Client is not connected');
    }

    const requestId = uuidv4();
    const message: RequestMessage<TRequest> = {
      id: requestId,
      type: MessageType.REQUEST,
      timestamp: Date.now(),
      method,
      payload
    };

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${method}`));
      }, this.options.timeout!);

      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout
      });

      // Send request
      this.transport.send(message).catch(error => {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(error);
      });
    });
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected && this.transport.isConnected();
  }

  /**
   * Subscribe to event types on the server
   */
  private async subscribeOnServer(eventTypes: string[]): Promise<void> {
    const message: SubscribeMessage = {
      id: uuidv4(),
      type: MessageType.SUBSCRIBE,
      timestamp: Date.now(),
      payload: { eventTypes }
    };

    await this.transport.send(message);
  }

  /**
   * Unsubscribe from event types on the server
   */
  private async unsubscribeFromServer(eventTypes: string[]): Promise<void> {
    const message: UnsubscribeMessage = {
      id: uuidv4(),
      type: MessageType.UNSUBSCRIBE,
      timestamp: Date.now(),
      payload: { eventTypes }
    };

    await this.transport.send(message);
  }

  /**
   * Set up transport event handlers
   */
  private setupTransportHandlers(): void {
    // Handle incoming messages
    this.transport.onMessage((message: TransportMessage) => {
      switch (message.type) {
        case MessageType.EVENT:
          this.handleEventMessage(message as EventMessage);
          break;
        case MessageType.RESPONSE:
          this.handleResponseMessage(message as ResponseMessage);
          break;
        case MessageType.ERROR:
          this.handleErrorMessage(message as ErrorMessage);
          break;
      }
    });

    // Handle transport errors
    this.transport.onError((error: Error) => {
      super.emit('error', error);
    });

    // Handle transport close
    this.transport.onClose(() => {
      this.connected = false;
      this.connecting = false;
      
      // Reject all pending requests
      this.pendingRequests.forEach(({ reject, timeout }) => {
        clearTimeout(timeout);
        reject(new Error('Connection closed'));
      });
      this.pendingRequests.clear();
    });
  }

  /**
   * Handle incoming event message
   */
  private handleEventMessage(message: EventMessage): void {
    const event = message.payload;
    const handlers = this.eventHandlers.get(event.type);
    
    if (handlers && handlers.size > 0) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
          super.emit('error', error instanceof Error ? error : new Error(String(error)));
        }
      });
    }

    // Also emit on the client itself for generic event handling
    super.emit('event', event);
  }

  /**
   * Handle response message
   */
  private handleResponseMessage(message: ResponseMessage): void {
    const pending = this.pendingRequests.get(message.requestId);
    
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.requestId);
      
      if (message.success) {
        pending.resolve(message.payload);
      } else {
        pending.reject(new Error(message.error || 'Request failed'));
      }
    }
  }

  /**
   * Handle error message
   */
  private handleErrorMessage(message: ErrorMessage): void {
    const error = new Error(message.payload.message);
    (error as any).code = message.payload.code;
    (error as any).details = message.payload.details;
    
    this.emit('error', error);
  }
}