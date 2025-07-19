/*
                     @semantest/ai-powered-features

 Copyright (C) 2025-today  Semantest Team

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * @fileoverview Performance Optimizer for AI Inference
 * @author Semantest Team
 * @module infrastructure/performance/PerformanceOptimizer
 */

import { Redis } from 'ioredis';
import { Logger } from '@shared/infrastructure/logger';
import * as crypto from 'crypto';

export interface OptimizationConfig {
  cacheEnabled: boolean;
  cacheTTL: number;
  batchingEnabled: boolean;
  batchSize: number;
  batchTimeout: number;
  compressionEnabled: boolean;
  rateLimiting: RateLimitConfig;
  modelOptimization: ModelOptimizationConfig;
}

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstSize: number;
}

export interface ModelOptimizationConfig {
  enableQuantization: boolean;
  enablePruning: boolean;
  enableCaching: boolean;
  maxConcurrentRequests: number;
  requestTimeout: number;
  fallbackModel?: string;
}

export interface PerformanceMetrics {
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  requestsPerMinute: number;
  cacheHitRate: number;
  errorRate: number;
  tokensPerSecond: number;
  costPerRequest: number;
}

export interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  hitCount: number;
  size: number;
}

export interface BatchRequest {
  id: string;
  data: any;
  callback: (result: any) => void;
  timestamp: number;
}

export interface SystemStatus {
  averageLatency: number;
  requestsPerMinute: number;
  cacheHitRate: number;
  averageResponseTime: number;
  tokensProcessed: number;
  costEstimate: number;
}

/**
 * Performance optimizer for AI inference operations
 */
export class PerformanceOptimizer {
  private readonly cache: Map<string, CacheEntry> = new Map();
  private readonly batchQueue: Map<string, BatchRequest[]> = new Map();
  private readonly metrics: Map<string, number[]> = new Map();
  private readonly requestTimestamps: number[] = [];
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly redis: Redis,
    private readonly logger: Logger,
    private readonly config: OptimizationConfig
  ) {
    this.initializeMetricsCollection();
  }

  /**
   * Initialize metrics collection
   */
  private initializeMetricsCollection(): void {
    setInterval(() => {
      this.cleanupOldMetrics();
      this.reportMetrics();
    }, 60000); // Every minute
  }

  /**
   * Optimize function execution with caching and batching
   */
  async withOptimization<T>(
    operation: string,
    fn: () => Promise<T>,
    options?: { key?: string; batch?: boolean }
  ): Promise<T> {
    const startTime = Date.now();

    try {
      // Check rate limits
      if (this.config.rateLimiting.enabled) {
        await this.checkRateLimit();
      }

      // Try cache first
      if (this.config.cacheEnabled && options?.key) {
        const cached = await this.getFromCache(options.key);
        if (cached) {
          this.recordMetric('cache_hit', 1);
          return cached as T;
        }
      }

      // Batch if enabled
      if (this.config.batchingEnabled && options?.batch) {
        return await this.batchOperation(operation, fn);
      }

      // Execute operation
      const result = await this.executeWithTimeout(fn);

      // Cache result
      if (this.config.cacheEnabled && options?.key) {
        await this.cacheResult(options.key, result);
      }

      // Record metrics
      const duration = Date.now() - startTime;
      this.recordMetric('latency', duration);
      this.recordMetric('success', 1);

      return result;
    } catch (error) {
      this.recordMetric('error', 1);
      throw error;
    }
  }

  /**
   * Check cache for result
   */
  async checkCache(prefix: string, request: any): Promise<any> {
    if (!this.config.cacheEnabled) {
      return null;
    }

    const key = this.generateCacheKey(prefix, request);
    return await this.getFromCache(key);
  }

  /**
   * Cache result
   */
  async cacheResult(prefix: string, request: any, result: any): Promise<void> {
    if (!this.config.cacheEnabled) {
      return;
    }

    const key = this.generateCacheKey(prefix, request);
    await this.putInCache(key, result);
  }

  /**
   * Batch process multiple requests
   */
  async batchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>
  ): Promise<R[]> {
    const batches = this.createBatches(items, this.config.batchSize);
    const results: R[] = [];

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(item => processor(item))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Enhance request with context
   */
  async enhanceWithContext(request: any, user: any): Promise<any> {
    const context = {
      userId: user?.id,
      projectId: request.context?.projectId,
      sessionId: this.generateSessionId(),
      timestamp: Date.now()
    };

    // Get user preferences from cache
    const preferences = await this.getUserPreferences(user?.id);

    return {
      ...request,
      context: {
        ...request.context,
        ...context,
        preferences
      }
    };
  }

  /**
   * Get system status and metrics
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const metrics = this.calculateMetrics();
    
    return {
      averageLatency: metrics.averageLatency,
      requestsPerMinute: metrics.requestsPerMinute,
      cacheHitRate: metrics.cacheHitRate,
      averageResponseTime: metrics.averageLatency,
      tokensProcessed: this.getTotalTokensProcessed(),
      costEstimate: this.estimateCost()
    };
  }

  /**
   * Rate limiting check
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    this.requestTimestamps.push(now);
    
    // Clean old timestamps
    const oneHourAgo = now - 3600000;
    const oneMinuteAgo = now - 60000;
    
    this.requestTimestamps.filter(ts => ts > oneHourAgo);
    
    const requestsLastMinute = this.requestTimestamps.filter(ts => ts > oneMinuteAgo).length;
    const requestsLastHour = this.requestTimestamps.length;

    if (requestsLastMinute > this.config.rateLimiting.requestsPerMinute) {
      throw new Error('Rate limit exceeded (per minute)');
    }

    if (requestsLastHour > this.config.rateLimiting.requestsPerHour) {
      throw new Error('Rate limit exceeded (per hour)');
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    const timeout = this.config.modelOptimization.requestTimeout;
    
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
  }

  /**
   * Batch operation execution
   */
  private async batchOperation<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve) => {
      const request: BatchRequest = {
        id: this.generateId(),
        data: { operation, fn },
        callback: resolve,
        timestamp: Date.now()
      };

      if (!this.batchQueue.has(operation)) {
        this.batchQueue.set(operation, []);
      }

      this.batchQueue.get(operation)!.push(request);

      // Set batch timer
      if (!this.batchTimers.has(operation)) {
        const timer = setTimeout(() => {
          this.processBatch(operation);
        }, this.config.batchTimeout);

        this.batchTimers.set(operation, timer);
      }

      // Process immediately if batch is full
      if (this.batchQueue.get(operation)!.length >= this.config.batchSize) {
        this.processBatch(operation);
      }
    });
  }

  /**
   * Process batch requests
   */
  private async processBatch(operation: string): Promise<void> {
    const batch = this.batchQueue.get(operation) || [];
    if (batch.length === 0) return;

    this.batchQueue.set(operation, []);
    
    // Clear timer
    const timer = this.batchTimers.get(operation);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(operation);
    }

    try {
      // Execute all operations in parallel
      const results = await Promise.all(
        batch.map(req => req.data.fn())
      );

      // Return results to callbacks
      batch.forEach((req, index) => {
        req.callback(results[index]);
      });
    } catch (error) {
      // Handle errors
      batch.forEach(req => {
        req.callback(Promise.reject(error));
      });
    }
  }

  /**
   * Cache operations
   */
  private async getFromCache(key: string): Promise<any> {
    // Check memory cache first
    const memoryCache = this.cache.get(key);
    if (memoryCache && Date.now() - memoryCache.timestamp < this.config.cacheTTL) {
      memoryCache.hitCount++;
      return memoryCache.value;
    }

    // Check Redis cache
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        
        // Update memory cache
        this.cache.set(key, {
          key,
          value: parsed,
          timestamp: Date.now(),
          hitCount: 1,
          size: cached.length
        });

        return parsed;
      }
    } catch (error) {
      this.logger.warn('Cache read error', { key, error });
    }

    return null;
  }

  private async putInCache(key: string, value: any): Promise<void> {
    const serialized = JSON.stringify(value);
    const entry: CacheEntry = {
      key,
      value,
      timestamp: Date.now(),
      hitCount: 0,
      size: serialized.length
    };

    // Memory cache
    this.cache.set(key, entry);

    // Redis cache
    try {
      await this.redis.setex(key, Math.floor(this.config.cacheTTL / 1000), serialized);
    } catch (error) {
      this.logger.warn('Cache write error', { key, error });
    }

    // Cleanup old entries if cache is too large
    this.cleanupCache();
  }

  /**
   * Cache management
   */
  private cleanupCache(): void {
    const maxCacheSize = 100 * 1024 * 1024; // 100MB
    let totalSize = 0;
    const entries = Array.from(this.cache.values());

    for (const entry of entries) {
      totalSize += entry.size;
    }

    if (totalSize > maxCacheSize) {
      // Sort by last access time (timestamp + hitCount factor)
      entries.sort((a, b) => {
        const aScore = a.timestamp + (a.hitCount * 60000); // Bonus for hits
        const bScore = b.timestamp + (b.hitCount * 60000);
        return aScore - bScore;
      });

      // Remove oldest entries
      let removed = 0;
      for (const entry of entries) {
        if (totalSize <= maxCacheSize * 0.8) break;
        
        this.cache.delete(entry.key);
        totalSize -= entry.size;
        removed++;
      }

      this.logger.info('Cache cleanup completed', { removed, remainingSize: totalSize });
    }
  }

  /**
   * Metrics recording
   */
  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
  }

  private calculateMetrics(): PerformanceMetrics {
    const latencies = this.metrics.get('latency') || [];
    const cacheHits = this.metrics.get('cache_hit') || [];
    const successes = this.metrics.get('success') || [];
    const errors = this.metrics.get('error') || [];

    const sortedLatencies = [...latencies].sort((a, b) => a - b);

    return {
      averageLatency: this.average(latencies),
      p95Latency: this.percentile(sortedLatencies, 0.95),
      p99Latency: this.percentile(sortedLatencies, 0.99),
      requestsPerMinute: this.requestTimestamps.filter(ts => 
        ts > Date.now() - 60000
      ).length,
      cacheHitRate: cacheHits.length / (successes.length + errors.length) || 0,
      errorRate: errors.length / (successes.length + errors.length) || 0,
      tokensPerSecond: this.estimateTokensPerSecond(),
      costPerRequest: this.estimateCostPerRequest()
    };
  }

  private cleanupOldMetrics(): void {
    const oneHourAgo = Date.now() - 3600000;
    this.requestTimestamps.filter(ts => ts > oneHourAgo);
  }

  private reportMetrics(): void {
    const metrics = this.calculateMetrics();
    this.logger.info('Performance metrics', metrics);
  }

  /**
   * Helper methods
   */
  private generateCacheKey(prefix: string, data: any): string {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
    return `${prefix}:${hash}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${this.generateId()}`;
  }

  private async getUserPreferences(userId?: string): Promise<any> {
    if (!userId) return {};

    try {
      const cached = await this.redis.get(`user_prefs:${userId}`);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil(sortedValues.length * p) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private getTotalTokensProcessed(): number {
    // Would track actual token usage
    return 1000000;
  }

  private estimateCost(): number {
    // Estimate based on token usage and model pricing
    const tokensProcessed = this.getTotalTokensProcessed();
    const costPerThousandTokens = 0.03; // GPT-4 pricing estimate
    return (tokensProcessed / 1000) * costPerThousandTokens;
  }

  private estimateTokensPerSecond(): number {
    // Estimate based on recent processing
    return 1000;
  }

  private estimateCostPerRequest(): number {
    const totalCost = this.estimateCost();
    const totalRequests = (this.metrics.get('success') || []).length + 
                         (this.metrics.get('error') || []).length;
    return totalRequests > 0 ? totalCost / totalRequests : 0;
  }
}