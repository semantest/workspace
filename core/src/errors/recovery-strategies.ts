/*
                        Semantest - Error Recovery Strategies
                        Patterns and strategies for error recovery

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { SemantestError } from './base.error';

/**
 * Recovery strategy interface
 */
export interface IRecoveryStrategy<T = any> {
  /**
   * Check if this strategy can handle the error
   */
  canHandle(error: Error): boolean;
  
  /**
   * Attempt to recover from the error
   */
  recover(error: Error, context?: any): Promise<T>;
  
  /**
   * Get human-readable description of the strategy
   */
  getDescription(): string;
}

/**
 * Base recovery strategy implementation
 */
export abstract class BaseRecoveryStrategy<T = any> implements IRecoveryStrategy<T> {
  constructor(
    protected readonly name: string,
    protected readonly description: string
  ) {}

  abstract canHandle(error: Error): boolean;
  abstract recover(error: Error, context?: any): Promise<T>;
  
  getDescription(): string {
    return this.description;
  }
}

/**
 * Retry recovery strategy with exponential backoff
 */
export class RetryStrategy<T> extends BaseRecoveryStrategy<T> {
  constructor(
    private readonly operation: () => Promise<T>,
    private readonly maxRetries: number = 3,
    private readonly baseDelay: number = 1000,
    private readonly maxDelay: number = 30000,
    private readonly errorCodes: string[] = []
  ) {
    super(
      'Retry',
      `Retry the operation up to ${maxRetries} times with exponential backoff`
    );
  }

  canHandle(error: Error): boolean {
    if (this.errorCodes.length === 0) {
      return true;
    }
    
    if (error instanceof SemantestError) {
      return this.errorCodes.includes(error.code);
    }
    
    return false;
  }

  async recover(error: Error, context?: any): Promise<T> {
    let lastError: Error = error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt - 1),
          this.maxDelay
        );
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.3 * delay;
        const totalDelay = delay + jitter;
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, totalDelay));
        
        // Attempt operation
        return await this.operation();
      } catch (err) {
        lastError = err as Error;
        
        // Log retry attempt
        console.warn(
          `Retry attempt ${attempt}/${this.maxRetries} failed:`,
          err
        );
        
        // If it's the last attempt, throw
        if (attempt === this.maxRetries) {
          throw lastError;
        }
      }
    }
    
    throw lastError;
  }
}

/**
 * Fallback recovery strategy
 */
export class FallbackStrategy<T> extends BaseRecoveryStrategy<T> {
  constructor(
    private readonly fallbackValue: T | (() => T | Promise<T>),
    private readonly errorCodes: string[] = []
  ) {
    super(
      'Fallback',
      'Use a fallback value when the operation fails'
    );
  }

  canHandle(error: Error): boolean {
    if (this.errorCodes.length === 0) {
      return true;
    }
    
    if (error instanceof SemantestError) {
      return this.errorCodes.includes(error.code);
    }
    
    return false;
  }

  async recover(error: Error, context?: any): Promise<T> {
    if (typeof this.fallbackValue === 'function') {
      return await (this.fallbackValue as () => T | Promise<T>)();
    }
    
    return this.fallbackValue;
  }
}

/**
 * Circuit breaker recovery strategy
 */
export class CircuitBreakerStrategy<T> extends BaseRecoveryStrategy<T> {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly operation: () => Promise<T>,
    private readonly failureThreshold: number = 5,
    private readonly resetTimeout: number = 60000,
    private readonly errorCodes: string[] = []
  ) {
    super(
      'CircuitBreaker',
      `Circuit breaker with threshold ${failureThreshold} and timeout ${resetTimeout}ms`
    );
  }

  canHandle(error: Error): boolean {
    if (this.errorCodes.length === 0) {
      return true;
    }
    
    if (error instanceof SemantestError) {
      return this.errorCodes.includes(error.code);
    }
    
    return false;
  }

  async recover(error: Error, context?: any): Promise<T> {
    // Check circuit state
    const now = Date.now();
    
    if (this.state === 'open') {
      if (now - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await this.operation();
      
      // Success - reset circuit
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailureTime = now;
      
      if (this.failures >= this.failureThreshold) {
        this.state = 'open';
        throw new Error('Circuit breaker opened due to repeated failures');
      }
      
      throw err;
    }
  }
}

/**
 * Cache recovery strategy
 */
export class CacheStrategy<T> extends BaseRecoveryStrategy<T> {
  private cache: Map<string, { value: T; timestamp: number }> = new Map();

  constructor(
    private readonly getCacheKey: (context: any) => string,
    private readonly ttl: number = 300000, // 5 minutes default
    private readonly errorCodes: string[] = []
  ) {
    super(
      'Cache',
      `Use cached value if available (TTL: ${ttl}ms)`
    );
  }

  canHandle(error: Error): boolean {
    if (this.errorCodes.length === 0) {
      return true;
    }
    
    if (error instanceof SemantestError) {
      return this.errorCodes.includes(error.code);
    }
    
    return false;
  }

  async recover(error: Error, context?: any): Promise<T> {
    const key = this.getCacheKey(context);
    const cached = this.cache.get(key);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < this.ttl) {
        console.info(`Using cached value for key: ${key}`);
        return cached.value;
      }
      
      // Remove expired entry
      this.cache.delete(key);
    }
    
    throw error;
  }

  /**
   * Store value in cache
   */
  store(context: any, value: T): void {
    const key = this.getCacheKey(context);
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * Recovery strategy chain
 */
export class RecoveryChain<T> {
  private strategies: IRecoveryStrategy<T>[] = [];

  /**
   * Add a recovery strategy to the chain
   */
  add(strategy: IRecoveryStrategy<T>): RecoveryChain<T> {
    this.strategies.push(strategy);
    return this;
  }

  /**
   * Execute recovery chain
   */
  async execute(error: Error, context?: any): Promise<T> {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(error)) {
        try {
          return await strategy.recover(error, context);
        } catch (recoveryError) {
          // Log recovery failure and try next strategy
          console.warn(
            `Recovery strategy failed:`,
            strategy.getDescription(),
            recoveryError
          );
        }
      }
    }
    
    // No recovery strategy succeeded
    throw error;
  }
}

/**
 * Common recovery patterns
 */
export class RecoveryPatterns {
  /**
   * Network error recovery pattern
   */
  static networkErrorRecovery<T>(
    operation: () => Promise<T>,
    fallback?: T
  ): RecoveryChain<T> {
    const chain = new RecoveryChain<T>();
    
    // First try retry with exponential backoff
    chain.add(new RetryStrategy(
      operation,
      3,
      1000,
      10000,
      ['NETWORK_ERROR', 'TIMEOUT', 'CONNECTION_REFUSED']
    ));
    
    // Then try cache if available
    chain.add(new CacheStrategy(
      (ctx) => JSON.stringify(ctx),
      300000,
      ['NETWORK_ERROR']
    ));
    
    // Finally use fallback if provided
    if (fallback !== undefined) {
      chain.add(new FallbackStrategy(fallback));
    }
    
    return chain;
  }

  /**
   * Rate limit recovery pattern
   */
  static rateLimitRecovery<T>(
    operation: () => Promise<T>
  ): RecoveryChain<T> {
    const chain = new RecoveryChain<T>();
    
    // Use circuit breaker to prevent overwhelming the service
    chain.add(new CircuitBreakerStrategy(
      operation,
      3,
      60000,
      ['RATE_LIMIT_EXCEEDED']
    ));
    
    return chain;
  }

  /**
   * Browser automation recovery pattern
   */
  static browserAutomationRecovery<T>(
    operation: () => Promise<T>,
    restartBrowser: () => Promise<void>
  ): RecoveryChain<T> {
    const chain = new RecoveryChain<T>();
    
    // First try simple retry
    chain.add(new RetryStrategy(
      operation,
      2,
      2000,
      5000,
      ['BROWSER_AUTOMATION_ERROR', 'ELEMENT_NOT_FOUND']
    ));
    
    // Then try restarting browser and retry
    chain.add(new RetryStrategy(
      async () => {
        await restartBrowser();
        return await operation();
      },
      1,
      5000,
      5000,
      ['BROWSER_AUTOMATION_ERROR']
    ));
    
    return chain;
  }
}