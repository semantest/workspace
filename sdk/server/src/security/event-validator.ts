import { BaseEvent } from '@semantest/core';
import { SecurityPolicy, ValidationResult } from '../types/orchestration';
import { TestEventTypes, SystemEventTypes, UIEventTypes, BrowserEventTypes } from '@semantest/contracts';

/**
 * Event validator for schema and content validation
 */
export class EventValidator {
  private policy: SecurityPolicy;
  private knownEventTypes: Set<string>;
  private metrics = {
    totalValidations: 0,
    validEvents: 0,
    invalidEvents: 0
  };

  constructor(policy: SecurityPolicy) {
    this.policy = policy;
    
    // Initialize known event types
    this.knownEventTypes = new Set([
      ...Object.values(TestEventTypes),
      ...Object.values(SystemEventTypes),
      ...Object.values(UIEventTypes),
      ...Object.values(BrowserEventTypes)
    ]);
  }

  /**
   * Validate an event
   */
  validate(event: BaseEvent): ValidationResult {
    this.metrics.totalValidations++;
    
    const errors: ValidationResult['errors'] = [];

    // Check event size
    const eventSize = JSON.stringify(event).length;
    if (eventSize > this.policy.maxEventSize) {
      errors.push({
        field: 'size',
        message: `Event size ${eventSize} exceeds maximum ${this.policy.maxEventSize}`,
        code: 'EVENT_TOO_LARGE'
      });
    }

    // Validate required fields
    if (!event.id) {
      errors.push({
        field: 'id',
        message: 'Event ID is required',
        code: 'MISSING_ID'
      });
    }

    if (!event.type) {
      errors.push({
        field: 'type',
        message: 'Event type is required',
        code: 'MISSING_TYPE'
      });
    }

    if (!event.timestamp) {
      errors.push({
        field: 'timestamp',
        message: 'Event timestamp is required',
        code: 'MISSING_TIMESTAMP'
      });
    }

    // Validate event type
    if (event.type) {
      // Check if event type is blocked
      if (this.policy.blockedEventTypes?.includes(event.type)) {
        errors.push({
          field: 'type',
          message: `Event type ${event.type} is blocked`,
          code: 'EVENT_TYPE_BLOCKED'
        });
      }

      // Check if event type is allowed (if allowlist is defined)
      if (this.policy.allowedEventTypes && !this.policy.allowedEventTypes.includes(event.type)) {
        errors.push({
          field: 'type',
          message: `Event type ${event.type} is not allowed`,
          code: 'EVENT_TYPE_NOT_ALLOWED'
        });
      }

      // Warn about unknown event types (but don't reject)
      if (!this.knownEventTypes.has(event.type) && !event.type.startsWith('custom/')) {
        console.warn(`Unknown event type: ${event.type}`);
      }
    }

    // Validate timestamp
    if (event.timestamp) {
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      const fiveMinutesFromNow = now + (5 * 60 * 1000);

      if (event.timestamp < fiveMinutesAgo || event.timestamp > fiveMinutesFromNow) {
        errors.push({
          field: 'timestamp',
          message: 'Event timestamp is outside acceptable range',
          code: 'INVALID_TIMESTAMP'
        });
      }
    }

    // Validate payload based on event type
    if (event.type && event.payload) {
      const payloadErrors = this.validatePayload(event.type, event.payload);
      errors.push(...payloadErrors);
    }

    // Check for potential security issues
    const securityErrors = this.checkSecurity(event);
    errors.push(...securityErrors);

    const valid = errors.length === 0;
    
    if (valid) {
      this.metrics.validEvents++;
    } else {
      this.metrics.invalidEvents++;
    }

    return { valid, errors: errors.length > 0 ? errors : undefined };
  }

  /**
   * Validate payload based on event type
   */
  private validatePayload(eventType: string, payload: any): ValidationResult['errors'] {
    const errors: NonNullable<ValidationResult['errors']> = [];

    // Type-specific validation
    switch (eventType) {
      case TestEventTypes.START_TEST:
        if (!payload.testId) {
          errors.push({
            field: 'payload.testId',
            message: 'Test ID is required for test start event',
            code: 'MISSING_TEST_ID'
          });
        }
        if (!payload.testName) {
          errors.push({
            field: 'payload.testName',
            message: 'Test name is required for test start event',
            code: 'MISSING_TEST_NAME'
          });
        }
        break;

      case TestEventTypes.END_TEST:
        if (!payload.testId) {
          errors.push({
            field: 'payload.testId',
            message: 'Test ID is required for test end event',
            code: 'MISSING_TEST_ID'
          });
        }
        if (!payload.status) {
          errors.push({
            field: 'payload.status',
            message: 'Test status is required for test end event',
            code: 'MISSING_TEST_STATUS'
          });
        }
        if (typeof payload.duration !== 'number' || payload.duration < 0) {
          errors.push({
            field: 'payload.duration',
            message: 'Valid duration is required for test end event',
            code: 'INVALID_DURATION'
          });
        }
        break;

      case SystemEventTypes.CLIENT_CONNECT:
        if (!payload.clientId) {
          errors.push({
            field: 'payload.clientId',
            message: 'Client ID is required for client connect event',
            code: 'MISSING_CLIENT_ID'
          });
        }
        if (!payload.clientType) {
          errors.push({
            field: 'payload.clientType',
            message: 'Client type is required for client connect event',
            code: 'MISSING_CLIENT_TYPE'
          });
        }
        break;
    }

    return errors;
  }

  /**
   * Check for security issues
   */
  private checkSecurity(event: BaseEvent): ValidationResult['errors'] {
    const errors: NonNullable<ValidationResult['errors']> = [];

    // Check for potential injection attacks
    const stringFields = this.extractStringFields(event);
    for (const { path, value } of stringFields) {
      if (this.containsSuspiciousContent(value)) {
        errors.push({
          field: path,
          message: 'Field contains potentially malicious content',
          code: 'SUSPICIOUS_CONTENT'
        });
      }
    }

    return errors;
  }

  /**
   * Extract all string fields from an object
   */
  private extractStringFields(obj: any, path: string = ''): Array<{ path: string; value: string }> {
    const fields: Array<{ path: string; value: string }> = [];

    if (typeof obj === 'string') {
      fields.push({ path, value: obj });
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        fields.push(...this.extractStringFields(item, `${path}[${index}]`));
      });
    } else if (obj && typeof obj === 'object') {
      for (const key in obj) {
        const newPath = path ? `${path}.${key}` : key;
        fields.push(...this.extractStringFields(obj[key], newPath));
      }
    }

    return fields;
  }

  /**
   * Check if content contains suspicious patterns
   */
  private containsSuspiciousContent(value: string): boolean {
    const suspiciousPatterns = [
      /<script[\s\S]*?<\/script>/gi,  // Script tags
      /javascript:/gi,                 // JavaScript protocol
      /on\w+\s*=/gi,                  // Event handlers
      /<iframe/gi,                     // Iframes
      /\beval\s*\(/gi,                // eval() calls
      /\balert\s*\(/gi,               // alert() calls
      /\bdocument\s*\./gi,            // document access
      /\bwindow\s*\./gi,              // window access
      /';\s*DROP\s+TABLE/gi,          // SQL injection
      /UNION\s+SELECT/gi,             // SQL injection
      /\.\.\//g                       // Path traversal
    ];

    return suspiciousPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Update policy
   */
  updatePolicy(policy: SecurityPolicy): void {
    this.policy = policy;
  }

  /**
   * Get metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalValidations: 0,
      validEvents: 0,
      invalidEvents: 0
    };
  }
}