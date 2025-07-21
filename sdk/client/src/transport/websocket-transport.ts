import { Transport, TransportOptions, TransportMessage, MessageType } from '@semantest/core';
import { EventEmitter } from 'eventemitter3';

/**
 * WebSocket transport implementation for browser environments
 */
export class WebSocketTransport extends EventEmitter implements Transport {
  private ws: WebSocket | null = null;
  private options: TransportOptions;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private messageHandlers: Set<(message: TransportMessage) => void> = new Set();
  private errorHandlers: Set<(error: Error) => void> = new Set();
  private closeHandlers: Set<() => void> = new Set();

  constructor(options: TransportOptions) {
    super();
    this.options = {
      reconnect: true,
      reconnectInterval: 1000,
      reconnectMaxAttempts: 5,
      timeout: 30000,
      ...options
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket connection
        this.ws = new WebSocket(this.options.url);

        // Set timeout for connection
        const timeoutId = setTimeout(() => {
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            this.ws.close();
            reject(new Error('Connection timeout'));
          }
        }, this.options.timeout);

        this.ws.onopen = () => {
          clearTimeout(timeoutId);
          this.reconnectAttempts = 0;
          this.startPingInterval();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as TransportMessage;
            
            // Handle pong messages internally
            if (message.type === MessageType.PONG) {
              return;
            }

            // Notify all message handlers
            this.messageHandlers.forEach(handler => handler(message));
          } catch (error) {
            console.error('Failed to parse message:', error);
            const err = error instanceof Error ? error : new Error('Failed to parse message');
            this.errorHandlers.forEach(handler => handler(err));
          }
        };

        this.ws.onerror = () => {
          clearTimeout(timeoutId);
          const error = new Error('WebSocket error');
          this.errorHandlers.forEach(handler => handler(error));
        };

        this.ws.onclose = () => {
          clearTimeout(timeoutId);
          this.stopPingInterval();
          this.emit('disconnected');
          
          // Notify close handlers
          this.closeHandlers.forEach(handler => handler());

          // Attempt reconnection if enabled
          if (this.options.reconnect && this.reconnectAttempts < this.options.reconnectMaxAttempts!) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    this.options.reconnect = false; // Disable auto-reconnect
    this.stopPingInterval();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Client disconnect');
    }
    
    this.ws = null;
  }

  async send(message: TransportMessage): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WebSocket is not connected');
    }

    try {
      this.ws!.send(JSON.stringify(message));
    } catch (error) {
      throw new Error(`Failed to send message: ${error}`);
    }
  }

  onMessage(handler: (message: TransportMessage) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onError(handler: (error: Error) => void): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  onClose(handler: () => void): () => void {
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.options.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private startPingInterval(): void {
    // Send ping every 30 seconds to keep connection alive
    this.pingTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          id: crypto.randomUUID(),
          type: MessageType.PING,
          timestamp: Date.now(),
          payload: {}
        }).catch(error => {
          console.error('Failed to send ping:', error);
        });
      }
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}