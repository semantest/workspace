import { EVENT_TYPE_PREFIX } from '@semantest/core';

/**
 * Browser event types
 */
export const BrowserEventTypes = {
  NAVIGATE: `${EVENT_TYPE_PREFIX.BROWSER}/navigate`,
  PAGE_LOAD: `${EVENT_TYPE_PREFIX.BROWSER}/page/load`,
  PAGE_ERROR: `${EVENT_TYPE_PREFIX.BROWSER}/page/error`,
  CONSOLE_LOG: `${EVENT_TYPE_PREFIX.BROWSER}/console/log`,
  NETWORK_REQUEST: `${EVENT_TYPE_PREFIX.BROWSER}/network/request`,
  NETWORK_RESPONSE: `${EVENT_TYPE_PREFIX.BROWSER}/network/response`,
  DIALOG: `${EVENT_TYPE_PREFIX.BROWSER}/dialog`,
  DOWNLOAD: `${EVENT_TYPE_PREFIX.BROWSER}/download`,
  WINDOW_OPEN: `${EVENT_TYPE_PREFIX.BROWSER}/window/open`,
  WINDOW_CLOSE: `${EVENT_TYPE_PREFIX.BROWSER}/window/close`,
  TAB_CREATE: `${EVENT_TYPE_PREFIX.BROWSER}/tab/create`,
  TAB_CLOSE: `${EVENT_TYPE_PREFIX.BROWSER}/tab/close`
} as const;

/**
 * Navigate event payload
 */
export interface NavigatePayload {
  url: string;
  referrer?: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

/**
 * Page load event payload
 */
export interface PageLoadPayload {
  url: string;
  title: string;
  loadTime: number;
  resources?: Array<{
    url: string;
    type: string;
    size: number;
    duration: number;
  }>;
}

/**
 * Page error event payload
 */
export interface PageErrorPayload {
  message: string;
  stack?: string;
  url: string;
  lineNumber?: number;
  columnNumber?: number;
}

/**
 * Console log event payload
 */
export interface ConsoleLogPayload {
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  args?: unknown[];
  location?: {
    url: string;
    lineNumber: number;
    columnNumber?: number;
  };
}

/**
 * Network request payload
 */
export interface NetworkRequestPayload {
  requestId: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
  timestamp: number;
}

/**
 * Network response payload
 */
export interface NetworkResponsePayload {
  requestId: string;
  url: string;
  status: number;
  statusText: string;
  headers?: Record<string, string>;
  body?: unknown;
  size?: number;
  duration?: number;
  fromCache?: boolean;
}

/**
 * Dialog event payload
 */
export interface DialogPayload {
  type: 'alert' | 'confirm' | 'prompt' | 'beforeunload';
  message: string;
  defaultValue?: string;
  action?: 'accept' | 'dismiss';
  inputValue?: string;
}

/**
 * Download event payload
 */
export interface DownloadPayload {
  url: string;
  filename: string;
  path?: string;
  size?: number;
  mimeType?: string;
  state: 'started' | 'completed' | 'failed';
}