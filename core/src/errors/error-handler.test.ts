/*
                        Semantest - Error Handler Tests
                        Tests for error handler with monitoring integration

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { ErrorHandler, globalErrorHandler } from './error-handler';
import { SemantestError } from './base.error';
import { ImageSearchError } from './google-images.error';
import { ValidationError } from './validation.error';
import { SecurityError } from './security.error';
import { NetworkError } from './infrastructure.error';

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockMonitoring = {
  incrementCounter: jest.fn(),
  recordGauge: jest.fn(),
  startTimer: jest.fn().mockReturnValue({ stop: jest.fn() }),
  sendAlert: jest.fn()
};

// Create test error class
class TestError extends SemantestError {
  constructor(message: string, code: string, recoverable: boolean = true) {
    super(message, code, {}, recoverable, 500);
  }
  
  getRecoverySuggestions(): string[] {
    return ['Test suggestion'];
  }
}

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    errorHandler = new ErrorHandler(
      {
        logErrors: true,
        includeStackTrace: true,
        sanitizeErrors: false,
        maxErrorLength: 1000
      },
      mockLogger,
      mockMonitoring
    );
  });

  describe('Configuration', () => {
    it('should use default configuration when none provided', () => {
      const handler = new ErrorHandler();
      const response = handler.handle(new Error('Test'));
      
      expect(response.error).toBeDefined();
      expect(response.error.message).toBe('Test');
    });

    it('should respect custom configuration', () => {
      const handler = new ErrorHandler({
        logErrors: false,
        includeStackTrace: false,
        sanitizeErrors: true,
        maxErrorLength: 50
      });
      
      const longMessage = 'A'.repeat(100);
      const response = handler.handle(new Error(longMessage));
      
      expect(response.error.message).toHaveLength(50);
    });
  });

  describe('SemantestError Handling', () => {
    it('should handle domain-specific errors correctly', () => {
      const error = new ImageSearchError('cats', 'Network timeout');
      const response = errorHandler.handle(error);
      
      expect(response.error).toMatchObject({
        message: error.getUserMessage(),
        code: 'GOOGLE-IMAGES_IMAGE_SEARCH_ERROR',
        statusCode: 503,
        recoverable: true
      });
      expect(response.error.suggestions).toContain('Check your internet connection');
      expect(response.error.correlationId).toBeDefined();
    });

    it('should preserve correlation ID if already set', () => {
      const error = new TestError('Test message', 'TEST_ERROR');
      error.setCorrelationId('existing-correlation-123');
      
      const response = errorHandler.handle(error);
      
      expect(response.error.correlationId).toBe('existing-correlation-123');
    });

    it('should generate correlation ID if not set', () => {
      const error = new TestError('Test message', 'TEST_ERROR');
      const response = errorHandler.handle(error);
      
      expect(response.error.correlationId).toBeDefined();
      expect(response.error.correlationId).toMatch(/^[a-f0-9-]+$/);
    });

    it('should include context in response', () => {
      const error = new TestError('Test message', 'TEST_ERROR');
      error.context = { userId: '123', operation: 'search' };
      
      const response = errorHandler.handle(error);
      
      expect(response.error.context).toEqual({ userId: '123', operation: 'search' });
    });
  });

  describe('Generic Error Handling', () => {
    it('should handle generic Error instances', () => {
      const error = new Error('Generic error message');
      const response = errorHandler.handle(error);
      
      expect(response.error).toMatchObject({
        message: 'Generic error message',
        code: 'UNKNOWN_ERROR',
        statusCode: 500,
        recoverable: false
      });
    });

    it('should handle string errors', () => {
      const response = errorHandler.handle('String error');
      
      expect(response.error).toMatchObject({
        message: 'String error',
        code: 'UNKNOWN_ERROR',
        statusCode: 500,
        recoverable: false
      });
    });

    it('should handle null/undefined errors', () => {
      const responseNull = errorHandler.handle(null);
      const responseUndefined = errorHandler.handle(undefined);
      
      expect(responseNull.error.message).toBe('Unknown error occurred');
      expect(responseUndefined.error.message).toBe('Unknown error occurred');
    });
  });

  describe('Logging Integration', () => {
    it('should log client errors as warnings', () => {
      const error = new ValidationError('Invalid input', 'VALIDATION_ERROR');
      errorHandler.handle(error);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Client error occurred',
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Invalid input'
        })
      );
    });

    it('should log server errors as errors', () => {
      const error = new NetworkError('Database connection failed');
      errorHandler.handle(error);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Server error occurred',
        expect.objectContaining({
          code: 'NETWORK_ERROR',
          message: 'Database connection failed'
        })
      );
    });

    it('should include stack trace when configured', () => {
      const error = new TestError('Test error', 'TEST_ERROR');
      errorHandler.handle(error);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Server error occurred',
        expect.objectContaining({
          stack: expect.stringContaining('TestError')
        })
      );
    });

    it('should not log when disabled', () => {
      const handler = new ErrorHandler(
        { logErrors: false },
        mockLogger,
        mockMonitoring
      );
      
      handler.handle(new Error('Test'));
      
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('Monitoring Integration', () => {
    it('should increment error counters', () => {
      const error = new ImageSearchError('test', 'Network error');
      errorHandler.handle(error);
      
      expect(mockMonitoring.incrementCounter).toHaveBeenCalledWith(
        'errors.server',
        expect.objectContaining({
          code: 'GOOGLE-IMAGES_IMAGE_SEARCH_ERROR',
          domain: 'google-images'
        })
      );
    });

    it('should categorize validation errors correctly', () => {
      const error = new ValidationError('Invalid email', 'VALIDATION_ERROR');
      errorHandler.handle(error);
      
      expect(mockMonitoring.incrementCounter).toHaveBeenCalledWith(
        'errors.validation',
        expect.objectContaining({
          code: 'VALIDATION_ERROR'
        })
      );
    });

    it('should send alerts for security errors', () => {
      const error = new SecurityError(
        'Unauthorized access',
        'UNAUTHORIZED_ACCESS',
        { userId: '123' }
      );
      errorHandler.handle(error);
      
      expect(mockMonitoring.sendAlert).toHaveBeenCalledWith({
        level: 'critical',
        title: 'Security Error Detected',
        message: 'Unauthorized access',
        metadata: expect.objectContaining({
          code: 'UNAUTHORIZED_ACCESS',
          userId: '123'
        })
      });
    });

    it('should send alerts for unrecoverable errors', () => {
      const error = new TestError('Critical failure', 'CRITICAL_ERROR', false);
      errorHandler.handle(error);
      
      expect(mockMonitoring.sendAlert).toHaveBeenCalledWith({
        level: 'critical',
        title: 'Unrecoverable Error Detected',
        message: 'Critical failure',
        metadata: expect.objectContaining({
          code: 'CRITICAL_ERROR',
          recoverable: false
        })
      });
    });
  });

  describe('Error Sanitization', () => {
    it('should sanitize errors when configured', () => {
      const handler = new ErrorHandler({
        sanitizeErrors: true,
        maxErrorLength: 100
      });
      
      const error = new TestError('Sensitive data: password123', 'TEST_ERROR');
      const response = handler.handle(error);
      
      expect(response.error.message).toBe('An error occurred');
      expect(response.error.context).toBeUndefined();
      expect(response.error.stack).toBeUndefined();
    });

    it('should limit error message length', () => {
      const handler = new ErrorHandler({
        maxErrorLength: 20
      });
      
      const longMessage = 'This is a very long error message that exceeds the limit';
      const error = new TestError(longMessage, 'TEST_ERROR');
      const response = handler.handle(error);
      
      expect(response.error.message).toHaveLength(20);
    });

    it('should not sanitize in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const handler = new ErrorHandler({
        sanitizeErrors: true
      });
      
      const error = new TestError('Development error', 'TEST_ERROR');
      const response = handler.handle(error);
      
      expect(response.error.message).toBe('Development error');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Global Error Handler', () => {
    it('should use global error handler', () => {
      const error = new TestError('Global test', 'GLOBAL_ERROR');
      const response = globalErrorHandler.handle(error);
      
      expect(response.error).toMatchObject({
        message: 'Global test',
        code: 'GLOBAL_ERROR'
      });
    });
  });

  describe('Error Handler Middleware', () => {
    it('should create Express middleware', () => {
      const { expressErrorHandler } = require('./error-handler');
      const middleware = expressErrorHandler();
      
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(4); // Express error middleware signature
    });

    it('should handle errors in Express middleware', () => {
      const { expressErrorHandler } = require('./error-handler');
      const middleware = expressErrorHandler();
      
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();
      
      const error = new TestError('Express error', 'EXPRESS_ERROR');
      
      middleware(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Express error',
            code: 'EXPRESS_ERROR'
          })
        })
      );
    });
  });

  describe('Performance', () => {
    it('should handle high error volumes efficiently', () => {
      const startTime = Date.now();
      
      // Process 1000 errors
      for (let i = 0; i < 1000; i++) {
        errorHandler.handle(new Error(`Error ${i}`));
      }
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should process 1000 errors in under 1 second
      expect(processingTime).toBeLessThan(1000);
    });

    it('should not cause memory leaks', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process many errors
      for (let i = 0; i < 10000; i++) {
        const error = new TestError(`Memory test ${i}`, 'MEMORY_TEST');
        errorHandler.handle(error);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Edge Cases', () => {
    it('should handle circular references in context', () => {
      const error = new TestError('Circular test', 'CIRCULAR_ERROR');
      const circularObj: any = { name: 'circular' };
      circularObj.self = circularObj;
      error.context = { circular: circularObj };
      
      expect(() => errorHandler.handle(error)).not.toThrow();
    });

    it('should handle very large context objects', () => {
      const error = new TestError('Large context test', 'LARGE_CONTEXT_ERROR');
      const largeContext = {
        data: 'x'.repeat(100000),
        array: new Array(10000).fill('data')
      };
      error.context = largeContext;
      
      expect(() => errorHandler.handle(error)).not.toThrow();
    });

    it('should handle errors thrown during error handling', () => {
      const faultyLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn().mockImplementation(() => {
          throw new Error('Logger failed');
        }),
        debug: jest.fn()
      };
      
      const handler = new ErrorHandler(
        { logErrors: true },
        faultyLogger,
        mockMonitoring
      );
      
      const error = new TestError('Original error', 'ORIGINAL_ERROR');
      
      expect(() => handler.handle(error)).not.toThrow();
    });
  });
});