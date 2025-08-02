/**
 * @semantest/core - Core library for Semantest extensions
 */

export { WebSocketClient } from './websocket/client';
export { MessageHandler } from './websocket/message-handler';
export { BridgeIsolated } from './bridge/isolated-world';
export { BridgeMain } from './bridge/main-world';
export { EventDispatcher } from './events/dispatcher';
export { EventListener } from './events/listener';
export { Logger } from './utils/logger';
export { StateManager } from './utils/state-manager';

// Type exports
export type { WebSocketMessage, WebSocketConfig } from './types/websocket';
export type { BridgeMessage } from './types/bridge';
export type { ExtensionState } from './types/state';