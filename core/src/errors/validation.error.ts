import { SemantestError } from './base.error';

/**
 * Error thrown when validation fails
 */
export class ValidationError extends SemantestError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: any,
    public readonly constraints?: Record<string, any>,
    context?: Record<string, any>
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      {
        ...context,
        field,
        value,
        constraints
      },
      true,
      400
    );
  }

  getUserMessage(): string {
    if (this.field) {
      return `Validation failed for field '${this.field}': ${this.message}`;
    }
    return `Validation failed: ${this.message}`;
  }

  getRecoverySuggestions(): string[] {
    const suggestions: string[] = [];
    
    if (this.constraints) {
      if (this.constraints.required) {
        suggestions.push(`Ensure '${this.field}' is provided`);
      }
      if (this.constraints.minLength) {
        suggestions.push(`Ensure '${this.field}' has at least ${this.constraints.minLength} characters`);
      }
      if (this.constraints.maxLength) {
        suggestions.push(`Ensure '${this.field}' has at most ${this.constraints.maxLength} characters`);
      }
      if (this.constraints.pattern) {
        suggestions.push(`Ensure '${this.field}' matches the required pattern`);
      }
      if (this.constraints.enum) {
        suggestions.push(`Ensure '${this.field}' is one of: ${this.constraints.enum.join(', ')}`);
      }
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Check the input data and try again');
      suggestions.push('Refer to the API documentation for valid formats');
    }
    
    return suggestions;
  }
}

/**
 * Error thrown when required field is missing
 */
export class RequiredFieldError extends ValidationError {
  constructor(field: string, context?: Record<string, any>) {
    super(
      `Required field '${field}' is missing`,
      field,
      undefined,
      { required: true },
      context
    );
  }
}

/**
 * Error thrown when field type is invalid
 */
export class InvalidTypeError extends ValidationError {
  constructor(
    field: string,
    expectedType: string,
    actualType: string,
    value?: any,
    context?: Record<string, any>
  ) {
    super(
      `Expected '${field}' to be of type '${expectedType}', but got '${actualType}'`,
      field,
      value,
      { type: expectedType, actualType },
      context
    );
  }
}

/**
 * Error thrown when value is out of range
 */
export class RangeError extends ValidationError {
  constructor(
    field: string,
    value: number,
    min?: number,
    max?: number,
    context?: Record<string, any>
  ) {
    const message = min !== undefined && max !== undefined
      ? `Value ${value} is out of range [${min}, ${max}]`
      : min !== undefined
      ? `Value ${value} is less than minimum ${min}`
      : `Value ${value} is greater than maximum ${max}`;
    
    super(
      message,
      field,
      value,
      { min, max },
      context
    );
  }
}