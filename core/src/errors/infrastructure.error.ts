import { SemantestError } from './base.error';

/**
 * Base class for infrastructure-related errors
 */
export abstract class InfrastructureError extends SemantestError {
  constructor(
    message: string,
    code: string,
    public readonly service?: string,
    context?: Record<string, any>,
    recoverable: boolean = true,
    statusCode: number = 500
  ) {
    super(
      message,
      `INFRA_${code}`,
      { ...context, service },
      recoverable,
      statusCode
    );
  }
}

/**
 * Error thrown when network request fails
 */
export class NetworkError extends InfrastructureError {
  constructor(
    message: string,
    public readonly url?: string,
    public readonly method?: string,
    public readonly statusCode?: number,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(
      message,
      'NETWORK_ERROR',
      'network',
      {
        ...context,
        url,
        method,
        httpStatusCode: statusCode,
        originalError: originalError?.message
      },
      true,
      503
    );
  }

  getRecoverySuggestions(): string[] {
    const suggestions = ['Check your network connection', 'Retry the request'];
    
    if (this.statusCode) {
      if (this.statusCode >= 400 && this.statusCode < 500) {
        suggestions.push('Check the request parameters');
        suggestions.push('Verify authentication credentials');
      } else if (this.statusCode >= 500) {
        suggestions.push('The server is experiencing issues');
        suggestions.push('Try again later');
      }
    }
    
    return suggestions;
  }
}

/**
 * Error thrown when database operation fails
 */
export class DatabaseError extends InfrastructureError {
  constructor(
    message: string,
    public readonly operation?: string,
    public readonly table?: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(
      message,
      'DATABASE_ERROR',
      'database',
      {
        ...context,
        operation,
        table,
        originalError: originalError?.message
      },
      true,
      503
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'Check database connection',
      'Verify database credentials',
      'Ensure database server is running',
      'Check for database locks or conflicts'
    ];
  }
}

/**
 * Error thrown when external service is unavailable
 */
export class ServiceUnavailableError extends InfrastructureError {
  constructor(
    service: string,
    reason?: string,
    context?: Record<string, any>
  ) {
    super(
      `Service '${service}' is currently unavailable${reason ? `: ${reason}` : ''}`,
      'SERVICE_UNAVAILABLE',
      service,
      context,
      true,
      503
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'Wait and retry the operation',
      'Check service health status',
      'Use fallback service if available',
      'Contact support if issue persists'
    ];
  }
}

/**
 * Error thrown when timeout occurs
 */
export class TimeoutError extends InfrastructureError {
  constructor(
    operation: string,
    timeoutMs: number,
    service?: string,
    context?: Record<string, any>
  ) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      'TIMEOUT_ERROR',
      service,
      { ...context, operation, timeoutMs },
      true,
      504
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'Retry with a longer timeout',
      'Check if the operation is taking longer than expected',
      'Consider breaking the operation into smaller chunks',
      'Check system performance and resources'
    ];
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends InfrastructureError {
  constructor(
    public readonly limit: number,
    public readonly resetTime?: Date,
    service?: string,
    context?: Record<string, any>
  ) {
    const resetMessage = resetTime 
      ? ` Resets at ${resetTime.toISOString()}`
      : '';
    
    super(
      `Rate limit exceeded. Limit: ${limit} requests${resetMessage}`,
      'RATE_LIMIT_EXCEEDED',
      service,
      { ...context, limit, resetTime: resetTime?.toISOString() },
      true,
      429
    );
  }

  getRecoverySuggestions(): string[] {
    const suggestions = ['Wait before retrying'];
    
    if (this.resetTime) {
      const waitTime = this.resetTime.getTime() - Date.now();
      if (waitTime > 0) {
        suggestions.push(`Wait ${Math.ceil(waitTime / 1000)} seconds before retrying`);
      }
    }
    
    suggestions.push('Consider implementing request throttling');
    suggestions.push('Upgrade your API plan for higher limits');
    
    return suggestions;
  }
}