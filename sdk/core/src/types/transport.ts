import { BaseEvent } from './events';

/**
 * Transport message types
 */
export enum MessageType {
  EVENT = 'event',
  REQUEST = 'request',
  RESPONSE = 'response',
  ERROR = 'error',
  PING = 'ping',
  PONG = 'pong',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe'
}

/**
 * Base transport message
 */
export interface TransportMessage<T = unknown> {
  id: string;
  type: MessageType;
  timestamp: number;
  payload: T;
}

/**
 * Event message
 */
export interface EventMessage extends TransportMessage<BaseEvent> {
  type: MessageType.EVENT;
}

/**
 * Request message
 */
export interface RequestMessage<T = unknown> extends TransportMessage<T> {
  type: MessageType.REQUEST;
  method: string;
}

/**
 * Response message
 */
export interface ResponseMessage<T = unknown> extends TransportMessage<T> {
  type: MessageType.RESPONSE;
  requestId: string;
  success: boolean;
  error?: string;
}

/**
 * Error message
 */
export interface ErrorMessage extends TransportMessage<{ message: string; code: string; details?: unknown }> {
  type: MessageType.ERROR;
}

/**
 * Subscribe message
 */
export interface SubscribeMessage extends TransportMessage<{ eventTypes: string[] }> {
  type: MessageType.SUBSCRIBE;
}

/**
 * Unsubscribe message
 */
export interface UnsubscribeMessage extends TransportMessage<{ eventTypes: string[] }> {
  type: MessageType.UNSUBSCRIBE;
}

/**
 * Transport interface
 */
export interface Transport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: TransportMessage): Promise<void>;
  onMessage(handler: (message: TransportMessage) => void): () => void;
  onError(handler: (error: Error) => void): () => void;
  onClose(handler: () => void): () => void;
  isConnected(): boolean;
}

/**
 * Transport options
 */
export interface TransportOptions {
  url: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  reconnectMaxAttempts?: number;
  timeout?: number;
  headers?: Record<string, string>;
}