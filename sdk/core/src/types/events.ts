/**
 * Base event interface for all domain events
 */
export interface BaseEvent<T = unknown> {
  /**
   * Unique event ID
   */
  id: string;
  
  /**
   * Event type identifier
   */
  type: string;
  
  /**
   * Timestamp when event was created
   */
  timestamp: number;
  
  /**
   * Event payload
   */
  payload: T;
  
  /**
   * Optional metadata
   */
  metadata?: EventMetadata;
}

/**
 * Event metadata
 */
export interface EventMetadata {
  /**
   * Source of the event
   */
  source?: string;
  
  /**
   * User ID who triggered the event
   */
  userId?: string;
  
  /**
   * Session ID
   */
  sessionId?: string;
  
  /**
   * Browser information
   */
  browser?: BrowserInfo;
  
  /**
   * Custom metadata
   */
  custom?: Record<string, unknown>;
}

/**
 * Browser information
 */
export interface BrowserInfo {
  name: string;
  version: string;
  platform: string;
  userAgent: string;
}

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (event: BaseEvent<T>) => void | Promise<void>;

/**
 * Event emitter interface
 */
export interface EventEmitter {
  emit<T>(type: string, payload: T, metadata?: EventMetadata): Promise<void>;
  on<T>(type: string, handler: EventHandler<T>): () => void;
  off<T>(type: string, handler: EventHandler<T>): void;
  once<T>(type: string, handler: EventHandler<T>): () => void;
}

/**
 * Event store interface for persistence
 */
export interface EventStore {
  save(event: BaseEvent): Promise<void>;
  find(query: EventQuery): Promise<BaseEvent[]>;
  findById(id: string): Promise<BaseEvent | null>;
}

/**
 * Event query interface
 */
export interface EventQuery {
  type?: string | string[];
  startTime?: number;
  endTime?: number;
  metadata?: Partial<EventMetadata>;
  limit?: number;
  offset?: number;
}