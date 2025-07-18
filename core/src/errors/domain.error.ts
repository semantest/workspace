import { SemantestError } from './base.error';

/**
 * Base class for domain-specific errors
 */
export abstract class DomainError extends SemantestError {
  constructor(
    message: string,
    code: string,
    public readonly domain: string,
    context?: Record<string, any>,
    recoverable: boolean = true,
    statusCode: number = 500
  ) {
    super(
      message,
      `${domain.toUpperCase()}_${code}`,
      { ...context, domain },
      recoverable,
      statusCode
    );
  }
}

/**
 * Error thrown when entity is not found
 */
export class EntityNotFoundError extends DomainError {
  constructor(
    entityType: string,
    entityId: string,
    domain: string,
    context?: Record<string, any>
  ) {
    super(
      `${entityType} with ID '${entityId}' not found`,
      'ENTITY_NOT_FOUND',
      domain,
      { ...context, entityType, entityId },
      true,
      404
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'Verify the ID is correct',
      'Check if the entity exists',
      'Ensure you have permission to access this entity'
    ];
  }
}

/**
 * Error thrown when business rule is violated
 */
export class BusinessRuleViolationError extends DomainError {
  constructor(
    rule: string,
    message: string,
    domain: string,
    context?: Record<string, any>
  ) {
    super(
      message,
      'BUSINESS_RULE_VIOLATION',
      domain,
      { ...context, rule },
      true,
      422
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'Review the business rules for this operation',
      'Check the current state of the entity',
      'Ensure all preconditions are met'
    ];
  }
}

/**
 * Error thrown when aggregate invariant is violated
 */
export class AggregateInvariantError extends DomainError {
  constructor(
    aggregate: string,
    invariant: string,
    message: string,
    domain: string,
    context?: Record<string, any>
  ) {
    super(
      message,
      'AGGREGATE_INVARIANT_VIOLATION',
      domain,
      { ...context, aggregate, invariant },
      false,
      422
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'This operation would violate system integrity',
      'Consider breaking this into multiple operations',
      'Contact support if you believe this is an error'
    ];
  }
}

/**
 * Error thrown when domain event handling fails
 */
export class DomainEventError extends DomainError {
  constructor(
    eventType: string,
    message: string,
    domain: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(
      message,
      'DOMAIN_EVENT_ERROR',
      domain,
      { 
        ...context, 
        eventType,
        originalError: originalError?.message 
      },
      true,
      500
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'Retry the operation',
      'Check event handler configuration',
      'Verify event payload is correct'
    ];
  }
}