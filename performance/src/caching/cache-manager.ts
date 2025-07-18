import { Entity, DomainEvent } from '@semantest/core';
import { 
  CacheStrategy,
  CacheEntry,
  CacheConfig,
  CacheStats,
  EvictionPolicy,
  SerializationFormat
} from '../types';

/**
 * Advanced caching system with multiple strategies
 */
export class CacheManager extends Entity<CacheManager> {
  private caches: Map<string, Cache> = new Map();
  private globalStats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    entries: 0
  };
  
  constructor(private config: CacheConfig) {
    super();
    this.initializeCaches();
  }
  
  /**
   * Get or create cache with strategy
   */
  getCache(name: string, strategy?: CacheStrategy): Cache {
    if (!this.caches.has(name)) {
      this.createCache(name, strategy || this.config.defaultStrategy);
    }
    return this.caches.get(name)!;
  }
  
  /**
   * Get value from cache
   */
  async get<T>(
    cacheName: string,
    key: string,
    options?: GetOptions
  ): Promise<T | null> {
    const cache = this.getCache(cacheName);
    const entry = await cache.get(key);
    
    if (!entry) {
      this.globalStats.misses++;
      this.addDomainEvent(new CacheMiss({
        correlationId: this.generateCorrelationId(),
        cacheName,
        key,
        timestamp: new Date()
      }));
      return null;
    }
    
    // Check TTL
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      await cache.delete(key);
      this.globalStats.misses++;
      return null;
    }
    
    this.globalStats.hits++;
    this.addDomainEvent(new CacheHit({
      correlationId: this.generateCorrelationId(),
      cacheName,
      key,
      timestamp: new Date()
    }));
    
    return this.deserialize<T>(entry.value, entry.format);
  }
  
  /**
   * Set value in cache
   */
  async set<T>(
    cacheName: string,
    key: string,
    value: T,
    options?: SetOptions
  ): Promise<void> {
    const cache = this.getCache(cacheName);
    const ttl = options?.ttl || cache.config.defaultTTL;
    
    const entry: CacheEntry = {
      key,
      value: await this.serialize(value, options?.format || 'json'),
      size: this.estimateSize(value),
      format: options?.format || 'json',
      createdAt: new Date(),
      expiresAt: ttl ? new Date(Date.now() + ttl * 1000) : undefined,
      metadata: options?.metadata
    };
    
    await cache.set(key, entry);
    
    this.addDomainEvent(new CacheSet({
      correlationId: this.generateCorrelationId(),
      cacheName,
      key,
      size: entry.size,
      timestamp: new Date()
    }));
  }
  
  /**
   * Delete value from cache
   */
  async delete(cacheName: string, key: string): Promise<boolean> {
    const cache = this.getCache(cacheName);
    const deleted = await cache.delete(key);
    
    if (deleted) {
      this.addDomainEvent(new CacheEvicted({
        correlationId: this.generateCorrelationId(),
        cacheName,
        key,
        reason: 'manual',
        timestamp: new Date()
      }));
    }
    
    return deleted;
  }
  
  /**
   * Clear entire cache
   */
  async clear(cacheName?: string): Promise<void> {
    if (cacheName) {
      const cache = this.getCache(cacheName);
      await cache.clear();
    } else {
      // Clear all caches
      for (const cache of this.caches.values()) {
        await cache.clear();
      }
    }
    
    this.addDomainEvent(new CacheCleared({
      correlationId: this.generateCorrelationId(),
      cacheName,
      timestamp: new Date()
    }));
  }
  
  /**
   * Get cache statistics
   */
  getStats(cacheName?: string): CacheStats {
    if (cacheName) {
      const cache = this.getCache(cacheName);
      return cache.getStats();
    }
    return { ...this.globalStats };
  }
  
  /**
   * Warm up cache with data
   */
  async warmUp(
    cacheName: string,
    data: Array<{ key: string; value: any; options?: SetOptions }>
  ): Promise<void> {
    const cache = this.getCache(cacheName);
    
    for (const item of data) {
      await this.set(cacheName, item.key, item.value, item.options);
    }
    
    this.addDomainEvent(new CacheWarmedUp({
      correlationId: this.generateCorrelationId(),
      cacheName,
      entries: data.length,
      timestamp: new Date()
    }));
  }
  
  /**
   * Initialize caches based on config
   */
  private initializeCaches(): void {
    if (this.config.caches) {
      for (const [name, config] of Object.entries(this.config.caches)) {
        this.createCache(name, config.strategy);
      }
    }
  }
  
  /**
   * Create cache with strategy
   */
  private createCache(name: string, strategy: CacheStrategy): void {
    let cache: Cache;
    
    switch (strategy) {
      case 'memory':
        cache = new MemoryCache(name, this.config);
        break;
      case 'redis':
        cache = new RedisCache(name, this.config);
        break;
      case 'hybrid':
        cache = new HybridCache(name, this.config);
        break;
      default:
        cache = new MemoryCache(name, this.config);
    }
    
    this.caches.set(name, cache);
  }
  
  /**
   * Serialize value
   */
  private async serialize(value: any, format: SerializationFormat): Promise<any> {
    switch (format) {
      case 'json':
        return JSON.stringify(value);
      case 'msgpack':
        // Would use msgpack library
        return JSON.stringify(value);
      case 'binary':
        // Would use buffer
        return Buffer.from(JSON.stringify(value));
      default:
        return value;
    }
  }
  
  /**
   * Deserialize value
   */
  private deserialize<T>(value: any, format: SerializationFormat): T {
    switch (format) {
      case 'json':
        return JSON.parse(value);
      case 'msgpack':
        // Would use msgpack library
        return JSON.parse(value);
      case 'binary':
        // Would use buffer
        return JSON.parse(value.toString());
      default:
        return value;
    }
  }
  
  /**
   * Estimate size of value
   */
  private estimateSize(value: any): number {
    const str = JSON.stringify(value);
    return new Blob([str]).size;
  }
  
  getId(): string {
    return 'cache-manager';
  }
}

/**
 * Base cache implementation
 */
abstract class Cache {
  protected stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    entries: 0
  };
  
  constructor(
    public name: string,
    public config: CacheConfig
  ) {}
  
  abstract get(key: string): Promise<CacheEntry | null>;
  abstract set(key: string, entry: CacheEntry): Promise<void>;
  abstract delete(key: string): Promise<boolean>;
  abstract clear(): Promise<void>;
  
  getStats(): CacheStats {
    return { ...this.stats };
  }
}

/**
 * In-memory cache implementation
 */
class MemoryCache extends Cache {
  private store: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = [];
  
  async get(key: string): Promise<CacheEntry | null> {
    const entry = this.store.get(key);
    
    if (entry) {
      // Update access order for LRU
      this.updateAccessOrder(key);
      return entry;
    }
    
    return null;
  }
  
  async set(key: string, entry: CacheEntry): Promise<void> {
    // Check size limit
    if (this.config.maxSize && this.stats.size + entry.size > this.config.maxSize) {
      await this.evict(entry.size);
    }
    
    // Check entry limit
    if (this.config.maxEntries && this.stats.entries >= this.config.maxEntries) {
      await this.evictOne();
    }
    
    this.store.set(key, entry);
    this.stats.entries++;
    this.stats.size += entry.size;
    this.updateAccessOrder(key);
  }
  
  async delete(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    
    this.store.delete(key);
    this.stats.entries--;
    this.stats.size -= entry.size;
    this.removeFromAccessOrder(key);
    
    return true;
  }
  
  async clear(): Promise<void> {
    this.store.clear();
    this.accessOrder = [];
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      entries: 0
    };
  }
  
  private async evict(requiredSize: number): Promise<void> {
    const policy = this.config.evictionPolicy || 'lru';
    
    while (this.stats.size + requiredSize > this.config.maxSize!) {
      const keyToEvict = this.selectEvictionCandidate(policy);
      if (!keyToEvict) break;
      
      await this.delete(keyToEvict);
      this.stats.evictions++;
    }
  }
  
  private async evictOne(): Promise<void> {
    const policy = this.config.evictionPolicy || 'lru';
    const keyToEvict = this.selectEvictionCandidate(policy);
    
    if (keyToEvict) {
      await this.delete(keyToEvict);
      this.stats.evictions++;
    }
  }
  
  private selectEvictionCandidate(policy: EvictionPolicy): string | null {
    switch (policy) {
      case 'lru':
        return this.accessOrder[0] || null;
      
      case 'lfu':
        // Would track frequency
        return this.accessOrder[0] || null;
      
      case 'fifo':
        const entries = Array.from(this.store.entries());
        if (entries.length === 0) return null;
        entries.sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime());
        return entries[0][0];
      
      case 'random':
        const keys = Array.from(this.store.keys());
        if (keys.length === 0) return null;
        return keys[Math.floor(Math.random() * keys.length)];
      
      default:
        return null;
    }
  }
  
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }
  
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }
}

/**
 * Redis cache implementation
 */
class RedisCache extends Cache {
  // Would implement Redis client integration
  async get(key: string): Promise<CacheEntry | null> {
    // Redis implementation
    return null;
  }
  
  async set(key: string, entry: CacheEntry): Promise<void> {
    // Redis implementation
  }
  
  async delete(key: string): Promise<boolean> {
    // Redis implementation
    return false;
  }
  
  async clear(): Promise<void> {
    // Redis implementation
  }
}

/**
 * Hybrid cache implementation (memory + Redis)
 */
class HybridCache extends Cache {
  private memoryCache: MemoryCache;
  private redisCache: RedisCache;
  
  constructor(name: string, config: CacheConfig) {
    super(name, config);
    this.memoryCache = new MemoryCache(name + '-memory', config);
    this.redisCache = new RedisCache(name + '-redis', config);
  }
  
  async get(key: string): Promise<CacheEntry | null> {
    // Try memory first
    let entry = await this.memoryCache.get(key);
    if (entry) return entry;
    
    // Try Redis
    entry = await this.redisCache.get(key);
    if (entry) {
      // Promote to memory
      await this.memoryCache.set(key, entry);
    }
    
    return entry;
  }
  
  async set(key: string, entry: CacheEntry): Promise<void> {
    // Set in both
    await Promise.all([
      this.memoryCache.set(key, entry),
      this.redisCache.set(key, entry)
    ]);
  }
  
  async delete(key: string): Promise<boolean> {
    const results = await Promise.all([
      this.memoryCache.delete(key),
      this.redisCache.delete(key)
    ]);
    return results.some(r => r);
  }
  
  async clear(): Promise<void> {
    await Promise.all([
      this.memoryCache.clear(),
      this.redisCache.clear()
    ]);
  }
}

// Domain Events
export class CacheHit extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      cacheName: string;
      key: string;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

export class CacheMiss extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      cacheName: string;
      key: string;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

export class CacheSet extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      cacheName: string;
      key: string;
      size: number;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

export class CacheEvicted extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      cacheName: string;
      key: string;
      reason: 'manual' | 'size' | 'ttl' | 'policy';
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

export class CacheCleared extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      cacheName?: string;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

export class CacheWarmedUp extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      cacheName: string;
      entries: number;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

// Types
export interface GetOptions {
  format?: SerializationFormat;
}

export interface SetOptions {
  ttl?: number; // seconds
  format?: SerializationFormat;
  metadata?: Record<string, any>;
}