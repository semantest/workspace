/*
                        Semantest - Base Error Tests
                        Tests for base error class functionality

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { SemantestError } from './base.error';

// Create concrete implementation for testing
class TestError extends SemantestError {
  getRecoverySuggestions(): string[] {
    return [
      'Try again later',
      'Check your configuration',
      'Contact support if the issue persists'
    ];
  }
}

describe('SemantestError Base Class', () => {
  describe('Constructor', () => {
    it('should create error with all required properties', () => {
      const error = new TestError(
        'Test error message',
        'TEST_ERROR',
        { userId: '123', action: 'test' },
        true,
        400
      );

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.context).toEqual({ userId: '123', action: 'test' });
      expect(error.recoverable).toBe(true);
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('TestError');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should use default values when not provided', () => {
      const error = new TestError(
        'Test error',
        'TEST_ERROR'
      );

      expect(error.context).toBeUndefined();
      expect(error.recoverable).toBe(true);
      expect(error.statusCode).toBe(500);
    });

    it('should capture stack trace', () => {
      const error = new TestError('Test error', 'TEST_ERROR');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('TestError');
      expect(error.stack).toContain('base.error.test.ts');
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON format', () => {
      const timestamp = new Date();
      const error = new TestError(
        'Test error',
        'TEST_ERROR',
        { data: 'test' },
        false,
        503
      );
      
      // Override timestamp for predictable testing
      (error as any).timestamp = timestamp;
      error.setCorrelationId('test-correlation-123');

      const json = error.toJSON();

      expect(json).toEqual({
        name: 'TestError',
        message: 'Test error',
        code: 'TEST_ERROR',
        timestamp: timestamp.toISOString(),
        correlationId: 'test-correlation-123',
        context: { data: 'test' },
        recoverable: false,
        statusCode: 503,
        stack: error.stack
      });
    });

    it('should handle undefined optional properties', () => {
      const error = new TestError('Test error', 'TEST_ERROR');
      const json = error.toJSON();

      expect(json.correlationId).toBeUndefined();
      expect(json.context).toBeUndefined();
    });
  });

  describe('getUserMessage', () => {
    it('should return the error message', () => {
      const error = new TestError('User-friendly message', 'TEST_ERROR');
      
      expect(error.getUserMessage()).toBe('User-friendly message');
    });
  });

  describe('getDeveloperDetails', () => {
    it('should return detailed error information', () => {
      const error = new TestError(
        'Developer error',
        'DEV_ERROR',
        { debug: true, line: 42 }
      );
      error.setCorrelationId('dev-123');

      const details = error.getDeveloperDetails();

      expect(details).toMatchObject({
        name: 'TestError',
        message: 'Developer error',
        code: 'DEV_ERROR',
        context: { debug: true, line: 42 },
        stack: error.stack,
        correlationId: 'dev-123'
      });
    });
  });

  describe('setCorrelationId', () => {
    it('should set correlation ID', () => {
      const error = new TestError('Test error', 'TEST_ERROR');
      
      expect(error.correlationId).toBeUndefined();
      
      error.setCorrelationId('correlation-456');
      
      expect(error.correlationId).toBe('correlation-456');
    });

    it('should include correlation ID in JSON output', () => {
      const error = new TestError('Test error', 'TEST_ERROR');
      error.setCorrelationId('json-correlation-789');
      
      const json = error.toJSON();
      
      expect(json.correlationId).toBe('json-correlation-789');
    });
  });

  describe('getRecoverySuggestions', () => {
    it('should return recovery suggestions', () => {
      const error = new TestError('Test error', 'TEST_ERROR');
      const suggestions = error.getRecoverySuggestions();

      expect(suggestions).toEqual([
        'Try again later',
        'Check your configuration',
        'Contact support if the issue persists'
      ]);
    });
  });

  describe('Error inheritance', () => {
    it('should be instanceof Error', () => {
      const error = new TestError('Test error', 'TEST_ERROR');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SemantestError);
      expect(error).toBeInstanceOf(TestError);
    });

    it('should work with try-catch blocks', () => {
      const throwError = () => {
        throw new TestError('Caught error', 'CATCH_TEST');
      };

      expect(() => {
        try {
          throwError();
        } catch (error) {
          expect(error).toBeInstanceOf(TestError);
          expect((error as TestError).code).toBe('CATCH_TEST');
        }
      }).not.toThrow();
    });
  });

  describe('Complex scenarios', () => {
    it('should handle nested context objects', () => {
      const complexContext = {
        user: {
          id: '123',
          roles: ['admin', 'user'],
          preferences: {
            theme: 'dark',
            language: 'en'
          }
        },
        request: {
          method: 'POST',
          path: '/api/test',
          headers: {
            'user-agent': 'test-agent'
          }
        }
      };

      const error = new TestError(
        'Complex error',
        'COMPLEX_ERROR',
        complexContext
      );

      const json = error.toJSON();
      expect(json.context).toEqual(complexContext);
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000);
      const error = new TestError(longMessage, 'LONG_ERROR');
      
      expect(error.message).toBe(longMessage);
      expect(error.toJSON().message).toBe(longMessage);
    });

    it('should handle special characters in messages', () => {
      const specialMessage = 'Error with "quotes", \'apostrophes\', and \nnewlines\t\ttabs';
      const error = new TestError(specialMessage, 'SPECIAL_ERROR');
      
      expect(error.message).toBe(specialMessage);
      const json = JSON.stringify(error.toJSON());
      expect(json).toContain(specialMessage);
    });
  });
});