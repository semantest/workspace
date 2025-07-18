import { SemantestError } from './base.error';
import { ValidationError } from './validation.error';
import { SecurityError } from './security.error';
import { Logger } from '../logging';
import { MonitoringService } from '../monitoring';

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
  private logger: Logger;
  private monitoring: MonitoringService;

  constructor(
    config?: Partial<ErrorHandlerConfig>,
    logger?: Logger,
    monitoring?: MonitoringService
  ) {
    this.config = { ...defaultConfig, ...config };
    this.logger = logger || new Logger('ErrorHandler');
    this.monitoring = monitoring || MonitoringService.getInstance();
  }

  /**
   * Handle error and return appropriate response
   */
  handle(error: Error | SemantestError): ErrorResponse {
    // Set correlation ID if not present
    if (error instanceof SemantestError && !error.correlationId) {
      error.setCorrelationId(this.generateCorrelationId());
    }

    // Log security incidents
    if (error instanceof SecurityError) {
      error.logSecurityIncident();
      // Record security metrics
      this.monitoring.recordGauge('security.incidents', 1);
    }

    // Log error if configured
    if (this.config.logErrors) {
      this.logError(error);
    }

    // Track error response time
    const timer = this.monitoring.startTimer('error.handling.duration');

    // Call custom error handler if provided
    if (this.config.onError) {
      try {
        this.config.onError(error);
      } catch (handlerError) {
        this.logger.error('Error in custom error handler', {
          originalError: error.message,
          handlerError: (handlerError as Error).message
        });
      }
    }

    // Convert to response
    const response = this.toErrorResponse(error);
    
    // Stop timer
    timer.stop({ statusCode: response.error.statusCode.toString() });

    return response;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      stack: error.stack,
      ...(error instanceof SemantestError && {
        code: error.code,
        context: error.context,
        correlationId: error.correlationId,
        recoverable: error.recoverable,
        statusCode: error.statusCode
      })
    };

    // Log with appropriate level
    if (error instanceof ValidationError) {
      this.logger.warn('Validation error occurred', logData);
      this.monitoring.incrementCounter('errors.validation', { code: error.code });
    } else if (error instanceof SecurityError) {
      this.logger.error('Security error occurred', logData);
      this.monitoring.incrementCounter('errors.security', { code: error.code });
      // Trigger security alert
      this.monitoring.sendAlert({
        level: 'critical',
        title: 'Security Error Detected',
        message: error.message,
        metadata: logData
      });
    } else if (error instanceof SemantestError && error.statusCode < 500) {
      this.logger.warn('Client error occurred', logData);
      this.monitoring.incrementCounter('errors.client', { 
        code: error.code,
        statusCode: error.statusCode.toString()
      });
    } else {
      this.logger.error('Server error occurred', logData);
      this.monitoring.incrementCounter('errors.server', { 
        code: error instanceof SemantestError ? error.code : 'UNKNOWN'
      });
      
      // Record error rate for monitoring
      this.monitoring.recordGauge('error_rate', 1);
    }

    // Track error by domain if available
    if (error instanceof SemantestError && error.context?.domain) {
      this.monitoring.incrementCounter(`errors.domain.${error.context.domain}`, {
        code: error.code
      });
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