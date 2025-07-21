// Main client
export { SemantestClient } from './semantest-client';
export type { ClientOptions } from './semantest-client';

// Transport
export { WebSocketTransport } from './transport/websocket-transport';

// React hooks
export {
  useSemantestClient,
  useEventSubscription,
  useEventValue,
  useEventCollector,
  useRequest
} from './hooks/use-semantest';

// React components
export * from './components';

// Re-export core types for convenience
export type {
  BaseEvent,
  EventMetadata,
  BrowserInfo,
  EventHandler,
  EventEmitter,
  Transport,
  TransportOptions,
  TransportMessage,
  MessageType
} from '@semantest/core';