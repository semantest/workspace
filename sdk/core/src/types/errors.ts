/**
 * Base error class for Semantest SDK
 */
export class SemantestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'SemantestError';
    Object.setPrototypeOf(this, SemantestError.prototype);
  }
}

/**
 * Connection error
 */
export class ConnectionError extends SemantestError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends SemantestError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends SemantestError {
  constructor(message: string, details?: unknown) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'TimeoutError';
  }
}

/**
 * Event not found error
 */
export class EventNotFoundError extends SemantestError {
  constructor(eventId: string) {
    super(`Event not found: ${eventId}`, 'EVENT_NOT_FOUND', { eventId });
    this.name = 'EventNotFoundError';
  }
}

/**
 * Invalid event type error
 */
export class InvalidEventTypeError extends SemantestError {
  constructor(eventType: string) {
    super(`Invalid event type: ${eventType}`, 'INVALID_EVENT_TYPE', { eventType });
    this.name = 'InvalidEventTypeError';
  }
}