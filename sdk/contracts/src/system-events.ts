import { EVENT_TYPE_PREFIX } from '@semantest/core';

/**
 * System event types
 */
export const SystemEventTypes = {
  CLIENT_CONNECT: `${EVENT_TYPE_PREFIX.SYSTEM}/client/connect`,
  CLIENT_DISCONNECT: `${EVENT_TYPE_PREFIX.SYSTEM}/client/disconnect`,
  SERVER_START: `${EVENT_TYPE_PREFIX.SYSTEM}/server/start`,
  SERVER_STOP: `${EVENT_TYPE_PREFIX.SYSTEM}/server/stop`,
  ERROR: `${EVENT_TYPE_PREFIX.SYSTEM}/error`,
  HEALTH_CHECK: `${EVENT_TYPE_PREFIX.SYSTEM}/health/check`,
  METRIC: `${EVENT_TYPE_PREFIX.SYSTEM}/metric`,
  CONFIG_CHANGE: `${EVENT_TYPE_PREFIX.SYSTEM}/config/change`
} as const;

/**
 * Client connect payload
 */
export interface ClientConnectPayload {
  clientId: string;
  clientType: 'cli' | 'browser' | 'sdk' | 'server';
  version: string;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Client disconnect payload
 */
export interface ClientDisconnectPayload {
  clientId: string;
  reason?: string;
  graceful: boolean;
}

/**
 * Server start payload
 */
export interface ServerStartPayload {
  serverId: string;
  version: string;
  port: number;
  host: string;
  protocols: string[];
}

/**
 * Server stop payload
 */
export interface ServerStopPayload {
  serverId: string;
  reason?: string;
  graceful: boolean;
}

/**
 * System error payload
 */
export interface SystemErrorPayload {
  code: string;
  message: string;
  stack?: string;
  context?: {
    clientId?: string;
    eventType?: string;
    operation?: string;
  };
  timestamp: number;
}

/**
 * Health check payload
 */
export interface HealthCheckPayload {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail';
    message?: string;
    duration?: number;
  }>;
  timestamp: number;
}

/**
 * Metric payload
 */
export interface MetricPayload {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp: number;
}

/**
 * Config change payload
 */
export interface ConfigChangePayload {
  section: string;
  changes: Array<{
    key: string;
    oldValue?: unknown;
    newValue?: unknown;
  }>;
  source: 'file' | 'env' | 'api' | 'cli';
}