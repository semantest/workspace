/*
                        Semantest - Error Handling Tests
                        Comprehensive tests for error handling system

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { SemantestError } from './base.error';
import { 
  EntityNotFoundError, 
  BusinessRuleViolationError,
  DomainEventError 
} from './domain.error';
import { 
  ImageSearchError, 
  ImageDownloadError,
  NoImagesFoundError,
  RateLimitError 
} from './google-images.error';
import { ValidationError } from './validation.error';
import { SecurityError } from './security.error';
import { ErrorHandler, globalErrorHandler } from './error-handler';
import {
  RetryStrategy,
  FallbackStrategy,
  CircuitBreakerStrategy,
  RecoveryChain,
  RecoveryPatterns
} from './recovery-strategies';

// Mock logger and monitoring
jest.mock('../logging', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

jest.mock('../monitoring', () => ({
  MonitoringService: {
    getInstance: jest.fn().mockReturnValue({
      incrementCounter: jest.fn(),
      recordGauge: jest.fn(),
      startTimer: jest.fn().mockReturnValue({ stop: jest.fn() }),
      sendAlert: jest.fn()
    })
  }
}));

describe('Error Handling System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SemantestError Base Class', () => {
    it('should create error with all properties', () => {
      const error = new EntityNotFoundError('User', '123', 'users');
      
      expect(error.message).toBe("User with ID '123' not found");
      expect(error.code).toBe('USERS_ENTITY_NOT_FOUND');
      expect(error.context).toEqual({
        domain: 'users',
        entityType: 'User',
        entityId: '123'
      });
      expect(error.recoverable).toBe(true);
      expect(error.statusCode).toBe(404);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should serialize to JSON correctly', () => {
      const error = new BusinessRuleViolationError(
        'MinimumOrderAmount',
        'Order amount must be at least $10',
        'orders'
      );
      
      const json = error.toJSON();
      expect(json).toMatchObject({
        name: 'BusinessRuleViolationError',
        message: 'Order amount must be at least $10',
        code: 'ORDERS_BUSINESS_RULE_VIOLATION',
        recoverable: true,
        statusCode: 422
      });
      expect(json.timestamp).toBeDefined();
    });

    it('should set correlation ID', () => {
      const error = new DomainEventError(
        'OrderCreated',
        'Failed to process order created event',
        'orders'
      );
      
      error.setCorrelationId('test-correlation-123');
      expect(error.correlationId).toBe('test-correlation-123');
    });
  });

  describe('Domain-Specific Errors', () => {
    describe('Google Images Errors', () => {
      it('should create ImageSearchError with proper context', () => {
        const originalError = new Error('Network timeout');
        const error = new ImageSearchError(
          'cats',
          'Network timeout occurred',
          originalError
        );
        
        expect(error.code).toBe('GOOGLE-IMAGES_IMAGE_SEARCH_ERROR');
        expect(error.statusCode).toBe(503);
        expect(error.context?.originalError).toBe('Network timeout');
        expect(error.getRecoverySuggestions()).toContain(
          'Check your internet connection'
        );
      });

      it('should create NoImagesFoundError', () => {
        const error = new NoImagesFoundError('rare butterfly', {
          size: 'large',
          type: 'photo'
        });
        
        expect(error.statusCode).toBe(404);
        expect(error.context?.filters).toEqual({
          size: 'large',
          type: 'photo'
        });
      });

      it('should create RateLimitError with reset time', () => {
        const resetTime = new Date(Date.now() + 3600000);
        const error = new RateLimitError(100, resetTime);
        
        expect(error.statusCode).toBe(429);
        expect(error.getRecoverySuggestions()[0]).toContain(
          `Wait until ${resetTime.toISOString()}`
        );
      });
    });
  });

  describe('Error Handler', () => {
    let errorHandler: ErrorHandler;
    let mockLogger: any;
    let mockMonitoring: any;

    beforeEach(() => {
      mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };
      
      mockMonitoring = {
        incrementCounter: jest.fn(),
        recordGauge: jest.fn(),
        startTimer: jest.fn().mockReturnValue({ stop: jest.fn() }),
        sendAlert: jest.fn()
      };
      
      errorHandler = new ErrorHandler(
        { logErrors: true, includeStackTrace: false },
        mockLogger,
        mockMonitoring
      );
    });

    it('should handle SemantestError correctly', () => {
      const error = new ImageDownloadError(
        'https://example.com/image.jpg',
        'Connection refused'
      );
      
      const response = errorHandler.handle(error);
      
      expect(response.error).toMatchObject({
        message: error.getUserMessage(),
        code: 'GOOGLE-IMAGES_IMAGE_DOWNLOAD_ERROR',
        statusCode: 503
      });
      expect(response.error.suggestions).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockMonitoring.incrementCounter).toHaveBeenCalledWith(
        'errors.server',
        expect.any(Object)
      );
    });

    it('should handle validation errors with warning level', () => {
      const error = new ValidationError(
        'Email format is invalid',
        'INVALID_EMAIL',
        { field: 'email', value: 'notanemail' }
      );
      
      errorHandler.handle(error);
      
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockMonitoring.incrementCounter).toHaveBeenCalledWith(
        'errors.validation',
        expect.any(Object)
      );
    });

    it('should handle security errors with alerts', () => {
      const error = new SecurityError(
        'Unauthorized access attempt',
        'UNAUTHORIZED_ACCESS',
        { userId: '123', resource: 'admin' }
      );
      
      errorHandler.handle(error);
      
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockMonitoring.sendAlert).toHaveBeenCalledWith({
        level: 'critical',
        title: 'Security Error Detected',
        message: 'Unauthorized access attempt',
        metadata: expect.any(Object)
      });
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error occurred');
      const response = errorHandler.handle(error);
      
      expect(response.error).toMatchObject({
        message: error.message,
        code: 'UNKNOWN_ERROR',
        statusCode: 500
      });
    });

    it('should generate correlation ID if missing', () => {
      const error = new DomainEventError(
        'TestEvent',
        'Test error',
        'test'
      );
      
      const response = errorHandler.handle(error);
      expect(response.error.correlationId).toBeDefined();
    });
  });

  describe('Recovery Strategies', () => {
    describe('RetryStrategy', () => {
      it('should retry operation with exponential backoff', async () => {
        let attempts = 0;
        const operation = jest.fn().mockImplementation(() => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Temporary failure');
          }
          return Promise.resolve('success');
        });
        
        const strategy = new RetryStrategy(operation, 3, 10);
        const result = await strategy.recover(new Error('Initial error'));
        
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(3);
      });

      it('should fail after max retries', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));
        const strategy = new RetryStrategy(operation, 2, 10);
        
        await expect(strategy.recover(new Error('Initial error')))
          .rejects.toThrow('Persistent failure');
        expect(operation).toHaveBeenCalledTimes(2);
      });
    });

    describe('FallbackStrategy', () => {
      it('should return fallback value', async () => {
        const strategy = new FallbackStrategy('fallback-value');
        const result = await strategy.recover(new Error('Any error'));
        
        expect(result).toBe('fallback-value');
      });

      it('should execute fallback function', async () => {
        const fallbackFn = jest.fn().mockResolvedValue('dynamic-fallback');
        const strategy = new FallbackStrategy(fallbackFn);
        
        const result = await strategy.recover(new Error('Any error'));
        
        expect(result).toBe('dynamic-fallback');
        expect(fallbackFn).toHaveBeenCalled();
      });
    });

    describe('CircuitBreakerStrategy', () => {
      it('should open circuit after failure threshold', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('Service unavailable'));
        const strategy = new CircuitBreakerStrategy(operation, 2, 100);
        
        // First two failures
        for (let i = 0; i < 2; i++) {
          try {
            await strategy.recover(new Error('Initial error'));
          } catch {}
        }
        
        // Circuit should be open now
        await expect(strategy.recover(new Error('Another error')))
          .rejects.toThrow('Circuit breaker is open');
        
        // Operation should not be called when circuit is open
        expect(operation).toHaveBeenCalledTimes(2);
      });
    });

    describe('RecoveryChain', () => {
      it('should try strategies in order', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('Failed'));
        const chain = new RecoveryChain<string>();
        
        chain
          .add(new RetryStrategy(operation, 1, 10))
          .add(new FallbackStrategy('fallback'));
        
        const result = await chain.execute(new Error('Initial error'));
        
        expect(result).toBe('fallback');
        expect(operation).toHaveBeenCalledTimes(1);
      });
    });

    describe('RecoveryPatterns', () => {
      it('should create network error recovery pattern', () => {
        const operation = jest.fn().mockResolvedValue('success');
        const chain = RecoveryPatterns.networkErrorRecovery(operation, 'fallback');
        
        expect(chain).toBeInstanceOf(RecoveryChain);
      });

      it('should create browser automation recovery pattern', () => {
        const operation = jest.fn().mockResolvedValue('success');
        const restartBrowser = jest.fn().mockResolvedValue(undefined);
        
        const chain = RecoveryPatterns.browserAutomationRecovery(
          operation,
          restartBrowser
        );
        
        expect(chain).toBeInstanceOf(RecoveryChain);
      });
    });
  });

  describe('Error Integration', () => {
    it('should integrate error handling with recovery strategies', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new ImageSearchError('cats', 'Timeout'))
        .mockResolvedValueOnce(['image1.jpg', 'image2.jpg']);
      
      const chain = new RecoveryChain<string[]>();
      chain.add(new RetryStrategy(operation, 2, 10));
      
      try {
        const result = await chain.execute(
          new ImageSearchError('cats', 'Initial timeout')
        );
        expect(result).toEqual(['image1.jpg', 'image2.jpg']);
      } catch (error) {
        fail('Should have recovered');
      }
    });
  });
});