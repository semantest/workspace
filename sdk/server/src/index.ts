/**
 * @semantest/server - WebSocket server for distributed testing
 */

export { WebSocketServer } from './server';
export type { WebSocketServerOptions, ClientInfo } from './types';
export { ClientManager } from './client-manager';
export { SubscriptionManager } from './subscription-manager';
export { MessageRouter } from './message-router';
export { RequestHandler } from './request-handler';

// Re-export transport types from core
export type {
  TransportMessage,
  MessageType,
  EventMessage,
  RequestMessage,
  ResponseMessage,
  ErrorMessage,
  SubscribeMessage,
  UnsubscribeMessage
} from '@semantest/core';

// Export orchestration components
export * from './orchestration';