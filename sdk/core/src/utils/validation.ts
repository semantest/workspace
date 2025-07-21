import { BaseEvent } from '../types/events';
import { ValidationError } from '../types/errors';

/**
 * Validate event structure
 */
export function validateEvent<T = unknown>(event: unknown): BaseEvent<T> {
  if (!event || typeof event !== 'object') {
    throw new ValidationError('Event must be an object');
  }
  
  const e = event as Record<string, unknown>;
  
  if (!e.id || typeof e.id !== 'string') {
    throw new ValidationError('Event must have a valid id');
  }
  
  if (!e.type || typeof e.type !== 'string') {
    throw new ValidationError('Event must have a valid type');
  }
  
  if (!e.timestamp || typeof e.timestamp !== 'number') {
    throw new ValidationError('Event must have a valid timestamp');
  }
  
  if (e.payload === undefined || e.payload === null) {
    throw new ValidationError('Event must have a payload');
  }
  
  return event as BaseEvent<T>;
}

/**
 * Validate event type
 */
export function validateEventType(type: unknown): string {
  if (!type || typeof type !== 'string') {
    throw new ValidationError('Event type must be a non-empty string');
  }
  
  if (!/^[a-zA-Z0-9_./-]+$/.test(type)) {
    throw new ValidationError('Event type must only contain alphanumeric characters, dots, underscores, slashes, and hyphens');
  }
  
  return type;
}

/**
 * Generate unique event ID
 */
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create event with defaults
 */
export function createEvent<T>(type: string, payload: T, metadata?: Record<string, unknown>): BaseEvent<T> {
  return {
    id: generateEventId(),
    type: validateEventType(type),
    timestamp: Date.now(),
    payload,
    metadata
  };
}