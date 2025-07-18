import { ErrorType } from './types';
export declare abstract class BaseError extends Error {
    readonly type: ErrorType;
    readonly code?: string;
    readonly details?: any;
    readonly timestamp: Date;
    constructor(message: string, type: ErrorType, code?: string, details?: any);
    toJSON(): any;
}
export declare class ValidationError extends BaseError {
    constructor(message: string, details?: any);
}
export declare class BusinessRuleError extends BaseError {
    constructor(message: string, ruleId?: string, details?: any);
}
export declare class NotFoundError extends BaseError {
    constructor(resource: string, id?: string);
}
export declare class ConflictError extends BaseError {
    constructor(message: string, details?: any);
}
export declare class UnauthorizedError extends BaseError {
    constructor(message?: string);
}
export declare class ForbiddenError extends BaseError {
    constructor(message?: string);
}
export declare class InternalError extends BaseError {
    constructor(message: string, details?: any);
}
export declare class ExternalError extends BaseError {
    constructor(message: string, service?: string, details?: any);
}
export declare class ConfigurationError extends BaseError {
    constructor(message: string, configKey?: string);
}
export declare class NetworkError extends BaseError {
    constructor(message: string, url?: string, status?: number);
}
export declare class TimeoutError extends BaseError {
    constructor(message: string, timeout?: number);
}
export declare class AuthenticationError extends BaseError {
    constructor(message?: string);
}
export declare class AuthorizationError extends BaseError {
    constructor(message?: string, permission?: string);
}
export declare class RateLimitError extends BaseError {
    constructor(message?: string, limit?: number);
}
export declare class BrowserAutomationError extends BaseError {
    constructor(message: string, action?: string, selector?: string);
}
export declare class DownloadError extends BaseError {
    constructor(message: string, url?: string, filename?: string);
}
export declare class StorageError extends BaseError {
    constructor(message: string, operation?: string, key?: string);
}
export declare class SecurityError extends BaseError {
    constructor(message: string, violation?: string);
}
export interface ErrorHandler {
    handle(error: Error): void;
}
export interface ErrorReporter {
    report(error: Error): Promise<void>;
}
export interface ErrorRecovery {
    canRecover(error: Error): boolean;
    recover(error: Error): Promise<void>;
}
export declare class ErrorUtils {
    static isType(error: Error, type: ErrorType): boolean;
    static isValidationError(error: Error): error is ValidationError;
    static isBusinessRuleError(error: Error): error is BusinessRuleError;
    static isNotFoundError(error: Error): error is NotFoundError;
    static isUnauthorizedError(error: Error): error is UnauthorizedError;
    static isForbiddenError(error: Error): error is ForbiddenError;
    static getMessage(error: Error): string;
    static getCode(error: Error): string | undefined;
    static getDetails(error: Error): any;
    static toJSON(error: Error): any;
    static fromJSON(obj: any): Error;
    static wrap(error: Error, type?: ErrorType): BaseError;
    static chain(originalError: Error, newError: Error): Error;
}
export declare class GlobalErrorHandler implements ErrorHandler {
    private handlers;
    private defaultHandler?;
    setHandler(type: ErrorType, handler: ErrorHandler): void;
    setDefaultHandler(handler: ErrorHandler): void;
    handle(error: Error): void;
}
export declare class ErrorRecoveryManager {
    private strategies;
    setStrategy(type: ErrorType, strategy: ErrorRecovery): void;
    recover(error: Error): Promise<boolean>;
}
