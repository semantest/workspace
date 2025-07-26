/*
                        Semantest - Core Errors Tests
                        Emergency test coverage implementation

    This file is part of Semantest.
    Created by Quinn (QA) during test coverage crisis - 2:37 AM
*/

import { 
    BaseError, 
    ValidationError, 
    BusinessRuleError,
    NotFoundError, 
    ConflictError, 
    UnauthorizedError,
    ForbiddenError,
    InternalError,
    ExternalError
} from './errors';
import { ErrorType } from './types';

// Test implementation of BaseError for testing
class TestError extends BaseError {
    constructor(message: string, code?: string, details?: any) {
        super(message, ErrorType.INTERNAL, code, details);
    }
}

describe('BaseError', () => {
    describe('constructor', () => {
        it('should create error with message and type', () => {
            const error = new TestError('Test error');
            expect(error.message).toBe('Test error');
            expect(error.type).toBe(ErrorType.INTERNAL);
            expect(error.name).toBe('TestError');
        });

        it('should include optional code and details', () => {
            const details = { field: 'email', value: 'invalid' };
            const error = new TestError('Validation failed', 'VAL_001', details);
            expect(error.code).toBe('VAL_001');
            expect(error.details).toEqual(details);
        });

        it('should set timestamp on creation', () => {
            const before = Date.now();
            const error = new TestError('Test');
            const after = Date.now();
            
            expect(error.timestamp).toBeInstanceOf(Date);
            expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before);
            expect(error.timestamp.getTime()).toBeLessThanOrEqual(after);
        });

        it('should be instanceof Error', () => {
            const error = new TestError('Test');
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(BaseError);
        });
    });

    describe('toJSON', () => {
        it('should serialize error to JSON format', () => {
            const error = new TestError('Test error', 'TEST_001', { foo: 'bar' });
            const json = error.toJSON();
            
            expect(json).toHaveProperty('name', 'TestError');
            expect(json).toHaveProperty('message', 'Test error');
            expect(json).toHaveProperty('type', ErrorType.INTERNAL);
            expect(json).toHaveProperty('code', 'TEST_001');
            expect(json).toHaveProperty('details', { foo: 'bar' });
            expect(json).toHaveProperty('timestamp');
            expect(json).toHaveProperty('stack');
        });

        it('should handle errors without optional fields', () => {
            const error = new TestError('Simple error');
            const json = error.toJSON();
            
            expect(json.code).toBeUndefined();
            expect(json.details).toBeUndefined();
        });
    });
});

describe('ValidationError', () => {
    it('should create validation error with correct type', () => {
        const error = new ValidationError('Invalid input');
        expect(error.type).toBe(ErrorType.VALIDATION);
        expect(error.message).toBe('Invalid input');
        expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should include validation details', () => {
        const details = { fields: ['email', 'password'], rules: ['required'] };
        const error = new ValidationError('Validation failed', details);
        expect(error.details).toEqual(details);
    });
});

describe('BusinessRuleError', () => {
    it('should create business rule error with correct type', () => {
        const error = new BusinessRuleError('Business rule violated');
        expect(error.type).toBe(ErrorType.BUSINESS_RULE);
        expect(error.message).toBe('Business rule violated');
        expect(error.code).toBe('BUSINESS_RULE_ERROR');
    });

    it('should include rule ID when provided', () => {
        const error = new BusinessRuleError('Invalid operation', 'RULE_001');
        expect(error.code).toBe('RULE_001');
    });

    it('should include business rule details', () => {
        const details = { field: 'amount', min: 0, max: 1000 };
        const error = new BusinessRuleError('Amount out of range', 'RULE_002', details);
        expect(error.details).toEqual(details);
    });
});

describe('UnauthorizedError', () => {
    it('should create unauthorized error with correct type', () => {
        const error = new UnauthorizedError();
        expect(error.type).toBe(ErrorType.UNAUTHORIZED);
        expect(error.message).toBe('Unauthorized');
        expect(error.code).toBe('UNAUTHORIZED_ERROR');
    });

    it('should accept custom message', () => {
        const error = new UnauthorizedError('Invalid token');
        expect(error.message).toBe('Invalid token');
    });
});

describe('ForbiddenError', () => {
    it('should create forbidden error with correct type', () => {
        const error = new ForbiddenError();
        expect(error.type).toBe(ErrorType.FORBIDDEN);
        expect(error.message).toBe('Forbidden');
        expect(error.code).toBe('FORBIDDEN_ERROR');
    });

    it('should accept custom message', () => {
        const error = new ForbiddenError('Access denied to resource');
        expect(error.message).toBe('Access denied to resource');
    });
});

describe('ExternalError', () => {
    it('should create external error with correct type', () => {
        const error = new ExternalError('External service failed');
        expect(error.type).toBe(ErrorType.EXTERNAL);
        expect(error.message).toBe('External service failed');
    });

    it('should include service name', () => {
        const error = new ExternalError('API timeout', 'payment-gateway', { timeout: 30000 });
        expect(error.code).toBe('EXTERNAL_ERROR');
        expect(error.details.service).toBe('payment-gateway');
        expect(error.details.timeout).toBe(30000);
    });
});

describe('NotFoundError', () => {
    it('should create not found error with correct type', () => {
        const error = new NotFoundError('User');
        expect(error.type).toBe(ErrorType.NOT_FOUND);
        expect(error.message).toBe('User not found');
    });

    it('should include resource ID when provided', () => {
        const error = new NotFoundError('User', '12345');
        expect(error.message).toBe("User with id '12345' not found");
    });
});

describe('ConflictError', () => {
    it('should create conflict error with correct type', () => {
        const error = new ConflictError('Resource conflict');
        expect(error.type).toBe(ErrorType.CONFLICT);
        expect(error.code).toBe('CONFLICT_ERROR');
    });

    it('should describe the conflict', () => {
        const details = {
            field: 'email',
            value: 'test@example.com',
            existing: true
        };
        const error = new ConflictError('Duplicate email', details);
        expect(error.details).toEqual(details);
    });
});

describe('InternalError', () => {
    it('should create internal error with correct type', () => {
        const error = new InternalError('Internal server error');
        expect(error.type).toBe(ErrorType.INTERNAL);
        expect(error.code).toBe('INTERNAL_ERROR');
    });

    it('should include error details', () => {
        const details = { component: 'database', operation: 'connect' };
        const error = new InternalError('Database connection failed', details);
        expect(error.details).toEqual(details);
    });
});

// Edge cases for coverage
describe('Error edge cases', () => {
    it('should handle circular references in details', () => {
        const circular: any = { a: 1 };
        circular.self = circular;
        
        const error = new TestError('Circular error', 'CIRC_001', circular);
        expect(() => error.toJSON()).not.toThrow();
    });

    it('should preserve stack trace', () => {
        const error = new TestError('Stack test');
        expect(error.stack).toBeDefined();
        expect(error.stack).toContain('TestError');
        expect(error.stack).toContain('Stack test');
    });

    it('should handle inheritance properly', () => {
        const validation = new ValidationError('Test');
        const notFound = new NotFoundError('Resource');
        const internal = new InternalError('Test');
        
        expect(validation).toBeInstanceOf(BaseError);
        expect(notFound).toBeInstanceOf(BaseError);
        expect(internal).toBeInstanceOf(BaseError);
        expect(validation).not.toBeInstanceOf(NotFoundError);
        expect(notFound).not.toBeInstanceOf(ValidationError);
    });
});