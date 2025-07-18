/*
                        Semantest - Recovery Strategies Tests
                        Tests for error recovery patterns and strategies

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import {
  RetryStrategy,
  FallbackStrategy,
  CircuitBreakerStrategy,
  CacheStrategy,
  RecoveryChain,
  RecoveryPatterns
} from './recovery-strategies';
import { SemantestError } from './base.error';
import { NetworkError } from './infrastructure.error';

// Test error for recovery scenarios
class TestRecoverableError extends SemantestError {
  constructor(message: string = 'Test error') {
    super(message, 'TEST_ERROR', {}, true, 503);
  }
  
  getRecoverySuggestions(): string[] {
    return ['Retry the operation'];
  }
}

describe('Recovery Strategies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('RetryStrategy', () => {
    it('should retry operation with exponential backoff', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new TestRecoverableError(`Attempt ${attempts} failed`);
        }
        return 'success';
      });

      const strategy = new RetryStrategy(operation, 3, 100, 1000);
      
      expect(strategy.canHandle(new TestRecoverableError())).toBe(true);
      expect(strategy.getDescription()).toContain('Retry the operation up to 3 times');

      const promise = strategy.recover(new TestRecoverableError());
      
      // First retry after 100ms + jitter
      jest.advanceTimersByTime(150);
      await Promise.resolve();
      
      // Second retry after 200ms + jitter
      jest.advanceTimersByTime(250);
      await Promise.resolve();
      
      jest.runAllTimers();
      
      const result = await promise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should respect max delay limit', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));
      const strategy = new RetryStrategy(operation, 5, 1000, 2000); // Max 2 seconds
      
      const promise = strategy.recover(new Error('Initial'));
      
      // Fast-forward through all retries
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(3000); // More than max delay
        await Promise.resolve();
      }
      
      await expect(promise).rejects.toThrow('Always fails');
      expect(operation).toHaveBeenCalledTimes(5);
    });

    it('should only retry specific error codes when configured', () => {
      const operation = jest.fn();
      const strategy = new RetryStrategy(
        operation, 
        3, 
        100, 
        1000, 
        ['NETWORK_ERROR', 'TIMEOUT']
      );
      
      expect(strategy.canHandle(new NetworkError('Network failed'))).toBe(true);
      expect(strategy.canHandle(new TestRecoverableError())).toBe(false);
      expect(strategy.canHandle(new Error('Generic error'))).toBe(false);
    });

    it('should add jitter to prevent thundering herd', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fail'));
      const strategy = new RetryStrategy(operation, 2, 1000);
      
      // Mock Math.random to return predictable values
      const randomSpy = jest.spyOn(Math, 'random')
        .mockReturnValueOnce(0) // No jitter
        .mockReturnValueOnce(1); // Max jitter (30%)
      
      const promise = strategy.recover(new Error('Initial'));
      
      // First retry: 1000ms + 0 jitter = 1000ms
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      
      // Second retry: 2000ms + 600ms jitter = 2600ms
      jest.advanceTimersByTime(2600);
      await Promise.resolve();
      
      await expect(promise).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(2);
      
      randomSpy.mockRestore();
    });
  });

  describe('FallbackStrategy', () => {
    it('should return static fallback value', async () => {
      const strategy = new FallbackStrategy('fallback-value');
      
      expect(strategy.canHandle(new Error())).toBe(true);
      expect(strategy.getDescription()).toBe('Use a fallback value when the operation fails');
      
      const result = await strategy.recover(new Error('Any error'));
      expect(result).toBe('fallback-value');
    });

    it('should execute fallback function', async () => {
      const fallbackFn = jest.fn().mockResolvedValue('dynamic-fallback');
      const strategy = new FallbackStrategy(fallbackFn);
      
      const result = await strategy.recover(new Error('Any error'));
      
      expect(result).toBe('dynamic-fallback');
      expect(fallbackFn).toHaveBeenCalledTimes(1);
    });

    it('should execute synchronous fallback function', async () => {
      const fallbackFn = jest.fn().mockReturnValue('sync-fallback');
      const strategy = new FallbackStrategy(fallbackFn);
      
      const result = await strategy.recover(new Error('Any error'));
      
      expect(result).toBe('sync-fallback');
    });

    it('should handle specific error codes when configured', () => {
      const strategy = new FallbackStrategy('fallback', ['SPECIFIC_ERROR']);
      
      const specificError = new TestRecoverableError();
      (specificError as any).code = 'SPECIFIC_ERROR';
      
      expect(strategy.canHandle(specificError)).toBe(true);
      expect(strategy.canHandle(new TestRecoverableError())).toBe(false);
      expect(strategy.canHandle(new Error())).toBe(false);
    });
  });

  describe('CircuitBreakerStrategy', () => {
    it('should open circuit after failure threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Service down'));
      const strategy = new CircuitBreakerStrategy(operation, 3, 60000);
      
      // Fail 3 times to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await strategy.recover(new Error(`Attempt ${i + 1}`));
        } catch {
          // Expected to fail
        }
      }
      
      // Circuit should be open now
      await expect(strategy.recover(new Error('Should not call operation')))
        .rejects.toThrow('Circuit breaker is open');
      
      // Operation should not be called when circuit is open
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should move to half-open state after timeout', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockRejectedValueOnce(new Error('Fail 3'))
        .mockResolvedValueOnce('success');
      
      const strategy = new CircuitBreakerStrategy(operation, 3, 1000);
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await strategy.recover(new Error(`Attempt ${i + 1}`));
        } catch {}
      }
      
      // Circuit is open
      await expect(strategy.recover(new Error())).rejects.toThrow('Circuit breaker is open');
      
      // Wait for reset timeout
      jest.advanceTimersByTime(1001);
      
      // Should try operation again (half-open state)
      const result = await strategy.recover(new Error());
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(4);
    });

    it('should reset circuit on successful operation in half-open state', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockRejectedValueOnce(new Error('Fail'))
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success');
      
      const strategy = new CircuitBreakerStrategy(operation, 3, 1000);
      
      // Open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await strategy.recover(new Error());
        } catch {}
      }
      
      // Wait for timeout
      jest.advanceTimersByTime(1001);
      
      // Successful operation in half-open state
      await strategy.recover(new Error());
      
      // Circuit should be closed now, subsequent calls should work
      const result = await strategy.recover(new Error());
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(5);
    });

    it('should handle specific error codes', () => {
      const operation = jest.fn();
      const strategy = new CircuitBreakerStrategy(
        operation,
        5,
        60000,
        ['SERVICE_UNAVAILABLE']
      );
      
      const serviceError = new SemantestError('Service down', 'SERVICE_UNAVAILABLE', {}, true, 503);
      
      expect(strategy.canHandle(serviceError)).toBe(true);
      expect(strategy.canHandle(new Error())).toBe(false);
    });
  });

  describe('CacheStrategy', () => {
    it('should cache successful results', async () => {
      const strategy = new CacheStrategy<string>(
        (ctx) => `cache-${ctx.id}`,
        5000
      );
      
      // Store value in cache
      strategy.store({ id: '123' }, 'cached-value');
      
      // Should recover using cached value
      const result = await strategy.recover(new Error('Any error'), { id: '123' });
      expect(result).toBe('cached-value');
    });

    it('should expire cached values after TTL', async () => {
      const strategy = new CacheStrategy<string>(
        (ctx) => ctx.key,
        1000 // 1 second TTL
      );
      
      strategy.store({ key: 'test' }, 'cached-value');
      
      // Value should be available immediately
      const result1 = await strategy.recover(new Error(), { key: 'test' });
      expect(result1).toBe('cached-value');
      
      // Advance time past TTL
      jest.advanceTimersByTime(1001);
      
      // Should throw error as cache expired
      await expect(strategy.recover(new Error('Expired'), { key: 'test' }))
        .rejects.toThrow('Expired');
    });

    it('should generate unique cache keys', async () => {
      const strategy = new CacheStrategy<string>(
        (ctx) => JSON.stringify({ id: ctx.id, type: ctx.type }),
        5000
      );
      
      strategy.store({ id: '1', type: 'A' }, 'value-1A');
      strategy.store({ id: '1', type: 'B' }, 'value-1B');
      strategy.store({ id: '2', type: 'A' }, 'value-2A');
      
      expect(await strategy.recover(new Error(), { id: '1', type: 'A' })).toBe('value-1A');
      expect(await strategy.recover(new Error(), { id: '1', type: 'B' })).toBe('value-1B');
      expect(await strategy.recover(new Error(), { id: '2', type: 'A' })).toBe('value-2A');
    });

    it('should clear cache', async () => {
      const strategy = new CacheStrategy<string>((ctx) => ctx.id, 5000);
      
      strategy.store({ id: '1' }, 'value1');
      strategy.store({ id: '2' }, 'value2');
      
      // Cache should work
      expect(await strategy.recover(new Error(), { id: '1' })).toBe('value1');
      
      // Clear cache
      strategy.clear();
      
      // Should throw error as cache is empty
      await expect(strategy.recover(new Error('Empty'), { id: '1' }))
        .rejects.toThrow('Empty');
    });
  });

  describe('RecoveryChain', () => {
    it('should try strategies in order', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValueOnce('retry-success');
      
      const chain = new RecoveryChain<string>();
      
      chain
        .add(new RetryStrategy(operation, 2, 10))
        .add(new FallbackStrategy('fallback-value'));
      
      const result = await chain.execute(new Error('Initial error'));
      
      expect(result).toBe('retry-success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should use fallback when all retries fail', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));
      
      const chain = new RecoveryChain<string>();
      chain
        .add(new RetryStrategy(operation, 2, 10))
        .add(new FallbackStrategy('fallback-value'));
      
      jest.runAllTimers();
      const result = await chain.execute(new Error('Initial error'));
      
      expect(result).toBe('fallback-value');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw when all strategies fail', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));
      const fallback = jest.fn().mockRejectedValue(new Error('Fallback fails'));
      
      const chain = new RecoveryChain<string>();
      chain
        .add(new RetryStrategy(operation, 1, 10))
        .add(new FallbackStrategy(fallback));
      
      jest.runAllTimers();
      await expect(chain.execute(new Error('Initial')))
        .rejects.toThrow('Initial');
    });

    it('should skip strategies that cannot handle the error', async () => {
      const networkError = new NetworkError('Network down');
      const genericOperation = jest.fn().mockResolvedValue('should-not-be-called');
      const networkOperation = jest.fn().mockResolvedValue('network-recovery');
      
      const chain = new RecoveryChain<string>();
      chain
        .add(new RetryStrategy(genericOperation, 1, 10, 1000, ['OTHER_ERROR']))
        .add(new RetryStrategy(networkOperation, 1, 10, 1000, ['NETWORK_ERROR']));
      
      const result = await chain.execute(networkError);
      
      expect(result).toBe('network-recovery');
      expect(genericOperation).not.toHaveBeenCalled();
      expect(networkOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('RecoveryPatterns', () => {
    it('should create network error recovery pattern', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const chain = RecoveryPatterns.networkErrorRecovery(operation, 'fallback');
      
      expect(chain).toBeInstanceOf(RecoveryChain);
      
      // Test the chain works
      const result = await chain.execute(new NetworkError('Test'));
      expect(result).toBe('success');
    });

    it('should create rate limit recovery pattern', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const chain = RecoveryPatterns.rateLimitRecovery(operation);
      
      expect(chain).toBeInstanceOf(RecoveryChain);
    });

    it('should create browser automation recovery pattern', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Browser crashed'))
        .mockResolvedValueOnce('success after restart');
      
      const restartBrowser = jest.fn().mockResolvedValue(undefined);
      
      const chain = RecoveryPatterns.browserAutomationRecovery(
        operation,
        restartBrowser
      );
      
      jest.runAllTimers();
      const result = await chain.execute(new Error('Initial browser error'));
      
      // Should have tried operation, failed, restarted browser, and succeeded
      expect(result).toBe('success after restart');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(restartBrowser).toHaveBeenCalledTimes(1);
    });
  });
});