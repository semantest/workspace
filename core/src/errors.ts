/*
                        Semantest - Core Errors
                        Error classes and utilities

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { ErrorType } from './types';

/**
 * Base error class
 */
export abstract class BaseError extends Error {
    public readonly type: ErrorType;
    public readonly code?: string;
    public readonly details?: any;
    public readonly timestamp: Date;

    constructor(
        message: string,
        type: ErrorType,
        code?: string,
        details?: any
    ) {
        super(message);
        this.type = type;
        this.code = code;
        this.details = details;
        this.timestamp = new Date();
        this.name = this.constructor.name;
    }

    toJSON(): any {
        return {
            name: this.name,
            message: this.message,
            type: this.type,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

/**
 * Validation error
 */
export class ValidationError extends BaseError {
    constructor(message: string, details?: any) {
        super(message, ErrorType.VALIDATION, 'VALIDATION_ERROR', details);
    }
}

/**
 * Business rule error
 */
export class BusinessRuleError extends BaseError {
    constructor(message: string, ruleId?: string, details?: any) {
        super(message, ErrorType.BUSINESS_RULE, ruleId || 'BUSINESS_RULE_ERROR', details);
    }
}

/**
 * Not found error
 */
export class NotFoundError extends BaseError {
    constructor(resource: string, id?: string) {
        const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
        super(message, ErrorType.NOT_FOUND, 'NOT_FOUND_ERROR', { resource, id });
    }
}

/**
 * Conflict error
 */
export class ConflictError extends BaseError {
    constructor(message: string, details?: any) {
        super(message, ErrorType.CONFLICT, 'CONFLICT_ERROR', details);
    }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends BaseError {
    constructor(message: string = 'Unauthorized') {
        super(message, ErrorType.UNAUTHORIZED, 'UNAUTHORIZED_ERROR');
    }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends BaseError {
    constructor(message: string = 'Forbidden') {
        super(message, ErrorType.FORBIDDEN, 'FORBIDDEN_ERROR');
    }
}

/**
 * Internal error
 */
export class InternalError extends BaseError {
    constructor(message: string, details?: any) {
        super(message, ErrorType.INTERNAL, 'INTERNAL_ERROR', details);
    }
}

/**
 * External error
 */
export class ExternalError extends BaseError {
    constructor(message: string, service?: string, details?: any) {
        super(message, ErrorType.EXTERNAL, 'EXTERNAL_ERROR', { service, ...details });
    }
}

/**
 * Configuration error
 */
export class ConfigurationError extends BaseError {
    constructor(message: string, configKey?: string) {
        super(message, ErrorType.INTERNAL, 'CONFIGURATION_ERROR', { configKey });
    }
}

/**
 * Network error
 */
export class NetworkError extends BaseError {
    constructor(message: string, url?: string, status?: number) {
        super(message, ErrorType.EXTERNAL, 'NETWORK_ERROR', { url, status });
    }
}

/**
 * Timeout error
 */
export class TimeoutError extends BaseError {
    constructor(message: string, timeout?: number) {
        super(message, ErrorType.INTERNAL, 'TIMEOUT_ERROR', { timeout });
    }
}

/**
 * Authentication error
 */
export class AuthenticationError extends BaseError {
    constructor(message: string = 'Authentication failed') {
        super(message, ErrorType.UNAUTHORIZED, 'AUTHENTICATION_ERROR');
    }
}

/**
 * Authorization error
 */
export class AuthorizationError extends BaseError {
    constructor(message: string = 'Authorization failed', permission?: string) {
        super(message, ErrorType.FORBIDDEN, 'AUTHORIZATION_ERROR', { permission });
    }
}

/**
 * Rate limit error
 */
export class RateLimitError extends BaseError {
    constructor(message: string = 'Rate limit exceeded', limit?: number) {
        super(message, ErrorType.FORBIDDEN, 'RATE_LIMIT_ERROR', { limit });
    }
}

/**
 * Browser automation error
 */
export class BrowserAutomationError extends BaseError {
    constructor(message: string, action?: string, selector?: string) {
        super(message, ErrorType.INTERNAL, 'BROWSER_AUTOMATION_ERROR', { action, selector });
    }
}

/**
 * Download error
 */
export class DownloadError extends BaseError {
    constructor(message: string, url?: string, filename?: string) {
        super(message, ErrorType.EXTERNAL, 'DOWNLOAD_ERROR', { url, filename });
    }
}

/**
 * Storage error
 */
export class StorageError extends BaseError {
    constructor(message: string, operation?: string, key?: string) {
        super(message, ErrorType.INTERNAL, 'STORAGE_ERROR', { operation, key });
    }
}

/**
 * Security error
 */
export class SecurityError extends BaseError {
    constructor(message: string, violation?: string) {
        super(message, ErrorType.FORBIDDEN, 'SECURITY_ERROR', { violation });
    }
}

/**
 * Error handler interface
 */
export interface ErrorHandler {
    handle(error: Error): void;
}

/**
 * Error reporter interface
 */
export interface ErrorReporter {
    report(error: Error): Promise<void>;
}

/**
 * Error recovery interface
 */
export interface ErrorRecovery {
    canRecover(error: Error): boolean;
    recover(error: Error): Promise<void>;
}

/**
 * Error utilities
 */
export class ErrorUtils {
    /**
     * Check if error is of specific type
     */
    static isType(error: Error, type: ErrorType): boolean {
        return error instanceof BaseError && error.type === type;
    }

    /**
     * Check if error is validation error
     */
    static isValidationError(error: Error): error is ValidationError {
        return error instanceof ValidationError;
    }

    /**
     * Check if error is business rule error
     */
    static isBusinessRuleError(error: Error): error is BusinessRuleError {
        return error instanceof BusinessRuleError;
    }

    /**
     * Check if error is not found error
     */
    static isNotFoundError(error: Error): error is NotFoundError {
        return error instanceof NotFoundError;
    }

    /**
     * Check if error is unauthorized error
     */
    static isUnauthorizedError(error: Error): error is UnauthorizedError {
        return error instanceof UnauthorizedError;
    }

    /**
     * Check if error is forbidden error
     */
    static isForbiddenError(error: Error): error is ForbiddenError {
        return error instanceof ForbiddenError;
    }

    /**
     * Get error message
     */
    static getMessage(error: Error): string {
        return error.message || 'Unknown error';
    }

    /**
     * Get error code
     */
    static getCode(error: Error): string | undefined {
        return error instanceof BaseError ? error.code : undefined;
    }

    /**
     * Get error details
     */
    static getDetails(error: Error): any {
        return error instanceof BaseError ? error.details : undefined;
    }

    /**
     * Convert error to JSON
     */
    static toJSON(error: Error): any {
        if (error instanceof BaseError) {
            return error.toJSON();
        }

        return {
            name: error.name,
            message: error.message,
            stack: error.stack
        };
    }

    /**
     * Create error from object
     */
    static fromJSON(obj: any): Error {
        switch (obj.type) {
            case ErrorType.VALIDATION:
                return new ValidationError(obj.message, obj.details);
            case ErrorType.BUSINESS_RULE:
                return new BusinessRuleError(obj.message, obj.code, obj.details);
            case ErrorType.NOT_FOUND:
                return new NotFoundError(obj.details?.resource, obj.details?.id);
            case ErrorType.CONFLICT:
                return new ConflictError(obj.message, obj.details);
            case ErrorType.UNAUTHORIZED:
                return new UnauthorizedError(obj.message);
            case ErrorType.FORBIDDEN:
                return new ForbiddenError(obj.message);
            case ErrorType.INTERNAL:
                return new InternalError(obj.message, obj.details);
            case ErrorType.EXTERNAL:
                return new ExternalError(obj.message, obj.details?.service, obj.details);
            default:
                return new Error(obj.message);
        }
    }

    /**
     * Wrap error in BaseError
     */
    static wrap(error: Error): BaseError {
        if (error instanceof BaseError) {
            return error;
        }

        return new InternalError(error.message, { originalError: error });
    }

    /**
     * Chain errors
     */
    static chain(originalError: Error, newError: Error): Error {
        if (newError instanceof BaseError) {
            // Create a new error with the chained details instead of mutating
            const ErrorClass = newError.constructor as typeof BaseError;
            return new (ErrorClass as any)(newError.message, {
                ...newError.details,
                originalError: originalError
            });
        }

        return newError;
    }
}

/**
 * Global error handler
 */
export class GlobalErrorHandler implements ErrorHandler {
    private handlers: Map<ErrorType, ErrorHandler> = new Map();
    private defaultHandler?: ErrorHandler;

    setHandler(type: ErrorType, handler: ErrorHandler): void {
        this.handlers.set(type, handler);
    }

    setDefaultHandler(handler: ErrorHandler): void {
        this.defaultHandler = handler;
    }

    handle(error: Error): void {
        const errorType = error instanceof BaseError ? error.type : ErrorType.INTERNAL;
        const handler = this.handlers.get(errorType) || this.defaultHandler;

        if (handler) {
            handler.handle(error);
        } else {
            console.error('Unhandled error:', error);
        }
    }
}

/**
 * Error recovery manager
 */
export class ErrorRecoveryManager {
    private strategies: Map<ErrorType, ErrorRecovery> = new Map();

    setStrategy(type: ErrorType, strategy: ErrorRecovery): void {
        this.strategies.set(type, strategy);
    }

    async recover(error: Error): Promise<boolean> {
        const errorType = error instanceof BaseError ? error.type : ErrorType.INTERNAL;
        const strategy = this.strategies.get(errorType);

        if (strategy && strategy.canRecover(error)) {
            await strategy.recover(error);
            return true;
        }

        return false;
    }
}