import { WebSocket } from 'ws';
import { EventMetadata } from '@semantest/core';

/**
 * WebSocket server configuration options
 */
export interface WebSocketServerOptions {
  port: number;
  host?: string;
  maxConnections?: number;
  heartbeatInterval?: number;
  requestTimeout?: number;
  path?: string;
}

/**
 * Client connection information
 */
export interface ClientInfo {
  id: string;
  connectedAt: number;
  lastPing?: number;
  metadata?: EventMetadata;
  subscriptions: Set<string>;
}

/**
 * Internal client connection
 */
export interface ClientConnection {
  id: string;
  ws: WebSocket;
  info: ClientInfo;
  isAlive: boolean;
  pendingRequests: Map<string, PendingRequest>;
}

/**
 * Pending request tracking
 */
export interface PendingRequest {
  id: string;
  method: string;
  timestamp: number;
  timeout: NodeJS.Timeout;
  resolve: (response: any) => void;
  reject: (error: Error) => void;
}