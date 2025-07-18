import { SemantestError } from './base.error';
import { ValidationError } from './validation.error';
import { SecurityError } from './security.error';

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  logErrors: boolean;
  includeStackTrace: boolean;
  sanitizeErrors: boolean;
  defaultMessage: string;
  onError?: (error: Error) => void;
}

/**
 * Default error handler configuration
 */
const defaultConfig: ErrorHandlerConfig = {
  logErrors: true,
  includeStackTrace: process.env.NODE_ENV !== 'production',
  sanitizeErrors: true,
  defaultMessage: 'An unexpected error occurred'
};

/**
 * Global error handler for Semantest applications
 */
export class ErrorHandler {
  private config: ErrorHandlerConfig;

  constructor(config?: Partial<ErrorHandlerConfig>) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Handle error and return appropriate response
   */
  handle(error: Error | SemantestError): ErrorResponse {
    // Log security incidents
    if (error instanceof SecurityError) {
      error.logSecurityIncident();
    }

    // Log error if configured
    if (this.config.logErrors) {
      this.logError(error);
    }

    // Call custom error handler if provided
    if (this.config.onError) {
      this.config.onError(error);
    }

    // Convert to response
    return this.toErrorResponse(error);
  }

  /**
   * Handle async errors (for Promise rejections)
   */
  handleAsync<T>(promise: Promise<T>): Promise<T> {
    return promise.catch(error => {
      this.handle(error);
      throw error;
    });
  }

  /**
   * Create error response from error
   */
  private toErrorResponse(error: Error | SemantestError): ErrorResponse {
    if (error instanceof SemantestError) {
      return {
        error: {
          message: this.config.sanitizeErrors ? error.getUserMessage() : error.message,
          code: error.code,
          statusCode: error.statusCode,
          timestamp: error.timestamp.toISOString(),
          correlationId: error.correlationId,
          ...(this.config.includeStackTrace && { stack: error.stack }),
          ...(error.recoverable && { suggestions: error.getRecoverySuggestions() }),
          ...(!this.config.sanitizeErrors && { context: error.context })
        }
      };
    }

    // Handle unknown errors
    return {
      error: {
        message: this.config.sanitizeErrors ? this.config.defaultMessage : error.message,
        code: 'UNKNOWN_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        ...(this.config.includeStackTrace && { stack: error.stack })
      }
    };
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: Error | SemantestError): void {
    const logData = {
      timestamp: new Date().toISOString(),
      error: error.message,
      ...(error instanceof SemantestError && {
        code: error.code,
        context: error.context,
        correlationId: error.correlationId
      })
    };

    if (error instanceof ValidationError) {
      console.warn('[VALIDATION ERROR]', logData);
    } else if (error instanceof SecurityError) {
      console.error('[SECURITY ERROR]', logData);
    } else if (error instanceof SemantestError && error.statusCode < 500) {
      console.warn('[CLIENT ERROR]', logData);
    } else {
      console.error('[SERVER ERROR]', logData);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Error response format
 */
export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    timestamp: string;
    correlationId?: string;
    suggestions?: string[];
    context?: Record<string, any>;
    stack?: string;
  };
}

/**
 * Global error handler instance
 */
export const globalErrorHandler = new ErrorHandler();

/**
 * Express error middleware
 */
export function expressErrorHandler(config?: Partial<ErrorHandlerConfig>) {
  const handler = new ErrorHandler(config);
  
  return (err: Error, req: any, res: any, next: any) => {
    const response = handler.handle(err);
    res.status(response.error.statusCode).json(response);
  };
}

/**
 * Async error wrapper for Express routes
 */
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Error serializer for structured logging
 */
export function serializeError(error: Error | SemantestError): Record<string, any> {
  if (error instanceof SemantestError) {
    return error.toJSON();
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  };
}

/**
 * Check if error is recoverable
 */
export function isRecoverable(error: Error | SemantestError): boolean {
  return error instanceof SemantestError ? error.recoverable : false;
}

/**
 * Get HTTP status code from error
 */
export function getStatusCode(error: Error | SemantestError): number {
  return error instanceof SemantestError ? error.statusCode : 500;
}