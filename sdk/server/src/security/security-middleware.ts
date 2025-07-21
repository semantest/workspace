import { BaseEvent } from '@semantest/core';
import { SecurityPolicy, ValidationResult } from '../types/orchestration';
import { EventValidator } from './event-validator';
import { RateLimiter } from './rate-limiter';
import { AccessController } from './access-controller';

/**
 * Security middleware for event validation and access control
 */
export class SecurityMiddleware {
  private validator: EventValidator;
  private rateLimiter: RateLimiter;
  private accessController: AccessController;
  private policy: SecurityPolicy;

  constructor(policy?: Partial<SecurityPolicy>) {
    this.policy = {
      maxEventsPerSecond: 100,
      maxEventSize: 1024 * 1024, // 1MB
      allowedEventTypes: undefined, // Allow all by default
      blockedEventTypes: [],
      requireAuthentication: false,
      allowedClients: undefined, // Allow all by default
      ...policy
    };

    this.validator = new EventValidator(this.policy);
    this.rateLimiter = new RateLimiter(this.policy.maxEventsPerSecond);
    this.accessController = new AccessController(this.policy);
  }

  /**
   * Check if authentication is required
   */
  requiresAuthentication(): boolean {
    return this.policy.requireAuthentication || false;
  }

  /**
   * Validate an event
   */
  async validateEvent(event: BaseEvent): Promise<ValidationResult> {
    // Check rate limit
    const clientId = event.metadata?.source || 'unknown';
    if (!this.rateLimiter.checkLimit(clientId)) {
      return {
        valid: false,
        errors: [{
          field: 'rate_limit',
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED'
        }]
      };
    }

    // Check access control
    const accessResult = await this.accessController.checkAccess(clientId, event.type);
    if (!accessResult.allowed) {
      return {
        valid: false,
        errors: [{
          field: 'access',
          message: accessResult.reason || 'Access denied',
          code: 'ACCESS_DENIED'
        }]
      };
    }

    // Validate event structure and content
    return this.validator.validate(event);
  }

  /**
   * Update security policy
   */
  updatePolicy(policy: Partial<SecurityPolicy>): void {
    this.policy = { ...this.policy, ...policy };
    
    // Update components with new policy
    this.validator.updatePolicy(this.policy);
    this.rateLimiter.updateLimit(this.policy.maxEventsPerSecond);
    this.accessController.updatePolicy(this.policy);
  }

  /**
   * Get current policy
   */
  getPolicy(): SecurityPolicy {
    return { ...this.policy };
  }

  /**
   * Reset rate limits for a client
   */
  resetRateLimit(clientId: string): void {
    this.rateLimiter.reset(clientId);
  }

  /**
   * Add allowed client
   */
  addAllowedClient(clientId: string): void {
    if (!this.policy.allowedClients) {
      this.policy.allowedClients = [];
    }
    if (!this.policy.allowedClients.includes(clientId)) {
      this.policy.allowedClients.push(clientId);
      this.accessController.updatePolicy(this.policy);
    }
  }

  /**
   * Remove allowed client
   */
  removeAllowedClient(clientId: string): void {
    if (this.policy.allowedClients) {
      this.policy.allowedClients = this.policy.allowedClients.filter(id => id !== clientId);
      this.accessController.updatePolicy(this.policy);
    }
  }

  /**
   * Add blocked event type
   */
  addBlockedEventType(eventType: string): void {
    if (!this.policy.blockedEventTypes) {
      this.policy.blockedEventTypes = [];
    }
    if (!this.policy.blockedEventTypes.includes(eventType)) {
      this.policy.blockedEventTypes.push(eventType);
      this.validator.updatePolicy(this.policy);
    }
  }

  /**
   * Remove blocked event type
   */
  removeBlockedEventType(eventType: string): void {
    if (this.policy.blockedEventTypes) {
      this.policy.blockedEventTypes = this.policy.blockedEventTypes.filter(type => type !== eventType);
      this.validator.updatePolicy(this.policy);
    }
  }

  /**
   * Get rate limit stats
   */
  getRateLimitStats(clientId: string): {
    count: number;
    remaining: number;
    resetTime: number;
  } {
    return this.rateLimiter.getStats(clientId);
  }

  /**
   * Get security metrics
   */
  getMetrics(): {
    totalValidations: number;
    validEvents: number;
    invalidEvents: number;
    rateLimitExceeded: number;
    accessDenied: number;
  } {
    return {
      totalValidations: this.validator.getMetrics().totalValidations,
      validEvents: this.validator.getMetrics().validEvents,
      invalidEvents: this.validator.getMetrics().invalidEvents,
      rateLimitExceeded: this.rateLimiter.getMetrics().exceeded,
      accessDenied: this.accessController.getMetrics().denied
    };
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.validator.resetMetrics();
    this.rateLimiter.resetMetrics();
    this.accessController.resetMetrics();
  }
}