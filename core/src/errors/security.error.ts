import { SemantestError } from './base.error';

/**
 * Base class for security-related errors
 */
export abstract class SecurityError extends SemantestError {
  constructor(
    message: string,
    code: string,
    public readonly severity: 'low' | 'medium' | 'high' | 'critical',
    context?: Record<string, any>,
    recoverable: boolean = false
  ) {
    super(
      message,
      `SECURITY_${code}`,
      { ...context, severity },
      recoverable,
      403
    );
  }

  /**
   * Log security incident
   */
  logSecurityIncident(): void {
    // In a real implementation, this would log to a security monitoring system
    console.error(`[SECURITY INCIDENT] ${this.code}: ${this.message}`, {
      severity: this.severity,
      timestamp: this.timestamp,
      context: this.context
    });
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends SecurityError {
  constructor(
    reason: string,
    public readonly authMethod?: string,
    context?: Record<string, any>
  ) {
    super(
      `Authentication failed: ${reason}`,
      'AUTH_FAILED',
      'medium',
      { ...context, authMethod },
      true
    );
    this.statusCode = 401;
  }

  getRecoverySuggestions(): string[] {
    return [
      'Check your credentials',
      'Ensure your account is active',
      'Verify the authentication method',
      'Check if your session has expired'
    ];
  }
}

/**
 * Error thrown when authorization fails
 */
export class AuthorizationError extends SecurityError {
  constructor(
    public readonly resource: string,
    public readonly action: string,
    public readonly requiredPermission?: string,
    context?: Record<string, any>
  ) {
    super(
      `Not authorized to ${action} ${resource}`,
      'AUTH_FORBIDDEN',
      'medium',
      { ...context, resource, action, requiredPermission },
      false
    );
  }

  getRecoverySuggestions(): string[] {
    const suggestions = [
      'Request access from an administrator',
      'Check your role permissions'
    ];
    
    if (this.requiredPermission) {
      suggestions.push(`Required permission: ${this.requiredPermission}`);
    }
    
    return suggestions;
  }
}

/**
 * Error thrown when CSRF token validation fails
 */
export class CSRFError extends SecurityError {
  constructor(
    context?: Record<string, any>
  ) {
    super(
      'CSRF token validation failed',
      'CSRF_VALIDATION_FAILED',
      'high',
      context,
      false
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'Refresh the page and try again',
      'Clear your browser cache',
      'Ensure cookies are enabled',
      'Check if you\'re using the correct domain'
    ];
  }
}

/**
 * Error thrown when input contains potential security threats
 */
export class InputSanitizationError extends SecurityError {
  constructor(
    public readonly field: string,
    public readonly threatType: 'xss' | 'sql_injection' | 'path_traversal' | 'command_injection',
    public readonly input?: string,
    context?: Record<string, any>
  ) {
    super(
      `Potentially malicious input detected in field '${field}'`,
      'INPUT_SANITIZATION_FAILED',
      'high',
      { 
        ...context, 
        field, 
        threatType,
        // Don't include the actual malicious input in logs
        inputLength: input?.length 
      },
      false
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'Remove special characters from your input',
      'Use only alphanumeric characters',
      'Avoid script tags or SQL keywords',
      'Contact support if you believe this is an error'
    ];
  }
}

/**
 * Error thrown when rate limiting for security purposes
 */
export class SecurityRateLimitError extends SecurityError {
  constructor(
    public readonly action: string,
    public readonly limit: number,
    public readonly window: string,
    public readonly resetTime?: Date,
    context?: Record<string, any>
  ) {
    super(
      `Security rate limit exceeded for ${action}. Limited to ${limit} attempts per ${window}`,
      'SECURITY_RATE_LIMIT',
      'medium',
      { ...context, action, limit, window, resetTime: resetTime?.toISOString() },
      true
    );
    this.statusCode = 429;
  }

  getRecoverySuggestions(): string[] {
    const suggestions = ['Wait before retrying'];
    
    if (this.resetTime) {
      const waitTime = Math.ceil((this.resetTime.getTime() - Date.now()) / 1000);
      if (waitTime > 0) {
        suggestions.push(`Try again in ${waitTime} seconds`);
      }
    }
    
    suggestions.push('This limit is in place for security reasons');
    
    return suggestions;
  }
}

/**
 * Error thrown when encryption/decryption fails
 */
export class CryptographyError extends SecurityError {
  constructor(
    operation: 'encrypt' | 'decrypt' | 'sign' | 'verify',
    reason: string,
    context?: Record<string, any>
  ) {
    super(
      `Cryptography operation '${operation}' failed: ${reason}`,
      'CRYPTO_FAILED',
      'critical',
      { ...context, operation },
      false
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'Check encryption keys are valid',
      'Verify the data format is correct',
      'Ensure algorithm compatibility',
      'Contact security team immediately'
    ];
  }
}