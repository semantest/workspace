/**
 * Base error class for all Semantest errors
 * Provides structured error handling with context and recovery information
 */
export abstract class SemantestError extends Error {
  public readonly timestamp: Date;
  public readonly correlationId?: string;
  
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, any>,
    public readonly recoverable: boolean = true,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON-serializable format
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId,
      context: this.context,
      recoverable: this.recoverable,
      statusCode: this.statusCode,
      stack: this.stack
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.message;
  }

  /**
   * Get developer-friendly error details
   */
  getDeveloperDetails(): Record<string, any> {
    return {
      ...this.toJSON(),
      stack: this.stack,
      context: this.context
    };
  }

  /**
   * Set correlation ID for distributed tracing
   */
  setCorrelationId(correlationId: string): void {
    (this as any).correlationId = correlationId;
  }

  /**
   * Get recovery suggestions for this error
   */
  abstract getRecoverySuggestions(): string[];
}