/**
 * Default transport options
 */
export const DEFAULT_TRANSPORT_OPTIONS = {
  reconnect: true,
  reconnectInterval: 1000,
  reconnectMaxAttempts: 10,
  timeout: 30000
};

/**
 * Event type prefixes
 */
export const EVENT_TYPE_PREFIX = {
  SYSTEM: 'system',
  TEST: 'test',
  UI: 'ui',
  BROWSER: 'browser',
  CUSTOM: 'custom'
};

/**
 * System event types
 */
export const SYSTEM_EVENTS = {
  CONNECTED: `${EVENT_TYPE_PREFIX.SYSTEM}/connected`,
  DISCONNECTED: `${EVENT_TYPE_PREFIX.SYSTEM}/disconnected`,
  ERROR: `${EVENT_TYPE_PREFIX.SYSTEM}/error`,
  READY: `${EVENT_TYPE_PREFIX.SYSTEM}/ready`
};

/**
 * Protocol version
 */
export const PROTOCOL_VERSION = '1.0.0';

/**
 * Message size limits
 */
export const MESSAGE_SIZE_LIMIT = 1024 * 1024; // 1MB