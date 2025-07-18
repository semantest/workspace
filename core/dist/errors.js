"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorRecoveryManager = exports.GlobalErrorHandler = exports.ErrorUtils = exports.SecurityError = exports.StorageError = exports.DownloadError = exports.BrowserAutomationError = exports.RateLimitError = exports.AuthorizationError = exports.AuthenticationError = exports.TimeoutError = exports.NetworkError = exports.ConfigurationError = exports.ExternalError = exports.InternalError = exports.ForbiddenError = exports.UnauthorizedError = exports.ConflictError = exports.NotFoundError = exports.BusinessRuleError = exports.ValidationError = exports.BaseError = void 0;
const types_1 = require("./types");
class BaseError extends Error {
    constructor(message, type, code, details) {
        super(message);
        this.type = type;
        this.code = code;
        this.details = details;
        this.timestamp = new Date();
        this.name = this.constructor.name;
    }
    toJSON() {
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
exports.BaseError = BaseError;
class ValidationError extends BaseError {
    constructor(message, details) {
        super(message, types_1.ErrorType.VALIDATION, 'VALIDATION_ERROR', details);
    }
}
exports.ValidationError = ValidationError;
class BusinessRuleError extends BaseError {
    constructor(message, ruleId, details) {
        super(message, types_1.ErrorType.BUSINESS_RULE, ruleId || 'BUSINESS_RULE_ERROR', details);
    }
}
exports.BusinessRuleError = BusinessRuleError;
class NotFoundError extends BaseError {
    constructor(resource, id) {
        const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
        super(message, types_1.ErrorType.NOT_FOUND, 'NOT_FOUND_ERROR', { resource, id });
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends BaseError {
    constructor(message, details) {
        super(message, types_1.ErrorType.CONFLICT, 'CONFLICT_ERROR', details);
    }
}
exports.ConflictError = ConflictError;
class UnauthorizedError extends BaseError {
    constructor(message = 'Unauthorized') {
        super(message, types_1.ErrorType.UNAUTHORIZED, 'UNAUTHORIZED_ERROR');
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends BaseError {
    constructor(message = 'Forbidden') {
        super(message, types_1.ErrorType.FORBIDDEN, 'FORBIDDEN_ERROR');
    }
}
exports.ForbiddenError = ForbiddenError;
class InternalError extends BaseError {
    constructor(message, details) {
        super(message, types_1.ErrorType.INTERNAL, 'INTERNAL_ERROR', details);
    }
}
exports.InternalError = InternalError;
class ExternalError extends BaseError {
    constructor(message, service, details) {
        super(message, types_1.ErrorType.EXTERNAL, 'EXTERNAL_ERROR', { service, ...details });
    }
}
exports.ExternalError = ExternalError;
class ConfigurationError extends BaseError {
    constructor(message, configKey) {
        super(message, types_1.ErrorType.INTERNAL, 'CONFIGURATION_ERROR', { configKey });
    }
}
exports.ConfigurationError = ConfigurationError;
class NetworkError extends BaseError {
    constructor(message, url, status) {
        super(message, types_1.ErrorType.EXTERNAL, 'NETWORK_ERROR', { url, status });
    }
}
exports.NetworkError = NetworkError;
class TimeoutError extends BaseError {
    constructor(message, timeout) {
        super(message, types_1.ErrorType.INTERNAL, 'TIMEOUT_ERROR', { timeout });
    }
}
exports.TimeoutError = TimeoutError;
class AuthenticationError extends BaseError {
    constructor(message = 'Authentication failed') {
        super(message, types_1.ErrorType.UNAUTHORIZED, 'AUTHENTICATION_ERROR');
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends BaseError {
    constructor(message = 'Authorization failed', permission) {
        super(message, types_1.ErrorType.FORBIDDEN, 'AUTHORIZATION_ERROR', { permission });
    }
}
exports.AuthorizationError = AuthorizationError;
class RateLimitError extends BaseError {
    constructor(message = 'Rate limit exceeded', limit) {
        super(message, types_1.ErrorType.FORBIDDEN, 'RATE_LIMIT_ERROR', { limit });
    }
}
exports.RateLimitError = RateLimitError;
class BrowserAutomationError extends BaseError {
    constructor(message, action, selector) {
        super(message, types_1.ErrorType.INTERNAL, 'BROWSER_AUTOMATION_ERROR', { action, selector });
    }
}
exports.BrowserAutomationError = BrowserAutomationError;
class DownloadError extends BaseError {
    constructor(message, url, filename) {
        super(message, types_1.ErrorType.EXTERNAL, 'DOWNLOAD_ERROR', { url, filename });
    }
}
exports.DownloadError = DownloadError;
class StorageError extends BaseError {
    constructor(message, operation, key) {
        super(message, types_1.ErrorType.INTERNAL, 'STORAGE_ERROR', { operation, key });
    }
}
exports.StorageError = StorageError;
class SecurityError extends BaseError {
    constructor(message, violation) {
        super(message, types_1.ErrorType.FORBIDDEN, 'SECURITY_ERROR', { violation });
    }
}
exports.SecurityError = SecurityError;
class ErrorUtils {
    static isType(error, type) {
        return error instanceof BaseError && error.type === type;
    }
    static isValidationError(error) {
        return error instanceof ValidationError;
    }
    static isBusinessRuleError(error) {
        return error instanceof BusinessRuleError;
    }
    static isNotFoundError(error) {
        return error instanceof NotFoundError;
    }
    static isUnauthorizedError(error) {
        return error instanceof UnauthorizedError;
    }
    static isForbiddenError(error) {
        return error instanceof ForbiddenError;
    }
    static getMessage(error) {
        return error.message || 'Unknown error';
    }
    static getCode(error) {
        return error instanceof BaseError ? error.code : undefined;
    }
    static getDetails(error) {
        return error instanceof BaseError ? error.details : undefined;
    }
    static toJSON(error) {
        if (error instanceof BaseError) {
            return error.toJSON();
        }
        return {
            name: error.name,
            message: error.message,
            stack: error.stack
        };
    }
    static fromJSON(obj) {
        switch (obj.type) {
            case types_1.ErrorType.VALIDATION:
                return new ValidationError(obj.message, obj.details);
            case types_1.ErrorType.BUSINESS_RULE:
                return new BusinessRuleError(obj.message, obj.code, obj.details);
            case types_1.ErrorType.NOT_FOUND:
                return new NotFoundError(obj.details?.resource, obj.details?.id);
            case types_1.ErrorType.CONFLICT:
                return new ConflictError(obj.message, obj.details);
            case types_1.ErrorType.UNAUTHORIZED:
                return new UnauthorizedError(obj.message);
            case types_1.ErrorType.FORBIDDEN:
                return new ForbiddenError(obj.message);
            case types_1.ErrorType.INTERNAL:
                return new InternalError(obj.message, obj.details);
            case types_1.ErrorType.EXTERNAL:
                return new ExternalError(obj.message, obj.details?.service, obj.details);
            default:
                return new Error(obj.message);
        }
    }
    static wrap(error, type = types_1.ErrorType.INTERNAL) {
        if (error instanceof BaseError) {
            return error;
        }
        return new InternalError(error.message, { originalError: error });
    }
    static chain(originalError, newError) {
        if (newError instanceof BaseError) {
            newError.details = {
                ...newError.details,
                originalError: originalError
            };
        }
        return newError;
    }
}
exports.ErrorUtils = ErrorUtils;
class GlobalErrorHandler {
    constructor() {
        this.handlers = new Map();
    }
    setHandler(type, handler) {
        this.handlers.set(type, handler);
    }
    setDefaultHandler(handler) {
        this.defaultHandler = handler;
    }
    handle(error) {
        const errorType = error instanceof BaseError ? error.type : types_1.ErrorType.INTERNAL;
        const handler = this.handlers.get(errorType) || this.defaultHandler;
        if (handler) {
            handler.handle(error);
        }
        else {
            console.error('Unhandled error:', error);
        }
    }
}
exports.GlobalErrorHandler = GlobalErrorHandler;
class ErrorRecoveryManager {
    constructor() {
        this.strategies = new Map();
    }
    setStrategy(type, strategy) {
        this.strategies.set(type, strategy);
    }
    async recover(error) {
        const errorType = error instanceof BaseError ? error.type : types_1.ErrorType.INTERNAL;
        const strategy = this.strategies.get(errorType);
        if (strategy && strategy.canRecover(error)) {
            await strategy.recover(error);
            return true;
        }
        return false;
    }
}
exports.ErrorRecoveryManager = ErrorRecoveryManager;
//# sourceMappingURL=errors.js.map