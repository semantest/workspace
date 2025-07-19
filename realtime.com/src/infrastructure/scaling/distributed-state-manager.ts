import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { Logger } from 'winston';
import * as msgpack from 'msgpack-lite';

export interface DistributedStateConfig {
  backend: 'redis-cluster' | 'hazelcast' | 'ignite';
  clusters: {
    nodes: string[];
    replication: number;
    shards: number;
    password?: string;
  };
  caching: {
    localCacheEnabled: boolean;
    localCacheSize: number; // MB
    localCacheTTL: number; // seconds
    compressionEnabled: boolean;
    compressionThreshold: number; // bytes
  };
  consistency: {
    model: 'strong' | 'eventual' | 'causal';
    readQuorum: number;
    writeQuorum: number;
    syncReplication: boolean;
  };
  partitioning: {
    strategy: 'consistent-hash' | 'range' | 'custom';
    virtualNodes: number;
    rebalanceEnabled: boolean;
    rebalanceThreshold: number;
  };
  performance: {
    batchSize: number;
    pipelineLimit: number;
    connectionPoolSize: number;
    maxRetries: number;
    retryDelay: number;
    operationTimeout: number;
  };
  monitoring: {
    metricsEnabled: boolean;
    metricsInterval: number;
    slowQueryThreshold: number;
    memoryAlertThreshold: number; // percentage
  };
}

interface StateEntry {
  key: string;
  value: any;
  version: number;
  timestamp: number;
  ttl?: number;
  metadata?: {
    userId?: string;
    sessionId?: string;
    serverId?: string;
    [key: string]: any;
  };
}

interface LocalCacheEntry {
  data: any;
  timestamp: number;
  version: number;
  compressed: boolean;
}

interface ShardInfo {
  id: number;
  nodes: string[];
  primary: string;
  replicas: string[];
  keyRange: { start: string; end: string };
  size: number;
  operations: number;
}

interface BatchOperation {
  type: 'get' | 'set' | 'delete' | 'expire';
  key: string;
  value?: any;
  ttl?: number;
  options?: any;
}

export class DistributedStateManager extends EventEmitter {
  private config: DistributedStateConfig;
  private logger: Logger;
  private backend: any;
  private localCache: Map<string, LocalCacheEntry> = new Map();
  private shards: Map<number, ShardInfo> = new Map();
  private consistentHashRing: ConsistentHashRing;
  private pendingOperations: Map<string, BatchOperation[]> = new Map();
  private metricsInterval?: NodeJS.Timeout;
  private rebalanceInterval?: NodeJS.Timeout;
  private isStarted: boolean = false;
  private metrics = {
    operations: {
      get: { count: 0, hits: 0, misses: 0, latency: [] as number[] },
      set: { count: 0, success: 0, failures: 0, latency: [] as number[] },
      delete: { count: 0, success: 0, failures: 0, latency: [] as number[] }
    },
    cache: {
      size: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
      compressionRatio: 0
    },
    cluster: {
      nodes: 0,
      shards: 0,
      rebalances: 0,
      failures: 0
    },
    memory: {
      used: 0,
      allocated: 0,
      fragmentation: 0
    }
  };

  constructor(config: DistributedStateConfig, logger: Logger) {
    super();
    this.config = this.validateConfig(config);
    this.logger = logger;
    this.consistentHashRing = new ConsistentHashRing(
      this.config.partitioning.virtualNodes
    );
  }

  private validateConfig(config: DistributedStateConfig): DistributedStateConfig {
    if (!config.backend || !config.clusters || !config.clusters.nodes.length) {
      throw new Error('Invalid distributed state configuration');
    }

    // Set defaults
    config.caching.localCacheSize = config.caching.localCacheSize || 1024; // 1GB default
    config.performance.batchSize = config.performance.batchSize || 1000;
    config.performance.pipelineLimit = config.performance.pipelineLimit || 100;

    return config;
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('Distributed state manager already started');
    }

    this.logger.info('Starting distributed state manager', {
      backend: this.config.backend,
      nodes: this.config.clusters.nodes.length,
      shards: this.config.clusters.shards
    });

    // Initialize backend
    await this.initializeBackend();

    // Initialize sharding
    await this.initializeSharding();

    // Start monitoring
    if (this.config.monitoring.metricsEnabled) {
      this.startMetricsCollection();
    }

    // Start rebalancing if enabled
    if (this.config.partitioning.rebalanceEnabled) {
      this.startRebalancing();
    }

    this.isStarted = true;
    this.logger.info('Distributed state manager started');
  }

  private async initializeBackend(): Promise<void> {
    switch (this.config.backend) {
      case 'redis-cluster':
        await this.initializeRedisCluster();
        break;
      case 'hazelcast':
        await this.initializeHazelcast();
        break;
      case 'ignite':
        await this.initializeApacheIgnite();
        break;
    }
  }

  private async initializeRedisCluster(): Promise<void> {
    const Redis = await import('ioredis');
    
    this.backend = new Redis.Cluster(
      this.config.clusters.nodes.map(node => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port) };
      }),
      {
        redisOptions: {
          password: this.config.clusters.password,
          connectionPoolSize: this.config.performance.connectionPoolSize,
          enableOfflineQueue: true,
          maxRetriesPerRequest: this.config.performance.maxRetries,
          retryStrategy: (times: number) => {
            const delay = Math.min(times * this.config.performance.retryDelay, 5000);
            return delay;
          }
        },
        clusterRetryStrategy: (times: number) => {
          return Math.min(100 * times, 3000);
        },
        enableReadyCheck: true,
        scaleReads: 'slave',
        maxRedirections: 16,
        slotsRefreshTimeout: 10000
      }
    );

    // Set up event handlers
    this.backend.on('error', (error: Error) => {
      this.logger.error('Redis cluster error', { error });
      this.metrics.cluster.failures++;
    });

    this.backend.on('node error', (error: Error, node: string) => {
      this.logger.error('Redis node error', { error, node });
    });

    this.backend.on('ready', () => {
      this.logger.info('Redis cluster ready');
    });

    // Wait for cluster to be ready
    await this.backend.ping();
  }

  private async initializeHazelcast(): Promise<void> {
    // Hazelcast implementation
    const { Client } = await import('hazelcast-client');
    
    this.backend = await Client.newHazelcastClient({
      clusterName: 'realtime-state',
      network: {
        clusterMembers: this.config.clusters.nodes
      },
      connectionStrategy: {
        asyncStart: false,
        reconnectMode: 'ON',
        connectionRetry: {
          initialBackoffMillis: 1000,
          maxBackoffMillis: 30000,
          multiplier: 2,
          clusterConnectTimeoutMillis: 60000
        }
      }
    });
  }

  private async initializeApacheIgnite(): Promise<void> {
    // Apache Ignite implementation placeholder
    throw new Error('Apache Ignite backend not yet implemented');
  }

  private async initializeSharding(): Promise<void> {
    const { shards, replication } = this.config.clusters;
    
    // Create shard info
    for (let i = 0; i < shards; i++) {
      const shardInfo: ShardInfo = {
        id: i,
        nodes: [],
        primary: '',
        replicas: [],
        keyRange: this.calculateShardRange(i, shards),
        size: 0,
        operations: 0
      };

      // Assign nodes to shards (simple round-robin for now)
      const nodesPerShard = Math.ceil(this.config.clusters.nodes.length / shards);
      const startIndex = i * nodesPerShard;
      
      for (let j = 0; j < replication && startIndex + j < this.config.clusters.nodes.length; j++) {
        const node = this.config.clusters.nodes[startIndex + j];
        shardInfo.nodes.push(node);
        
        if (j === 0) {
          shardInfo.primary = node;
        } else {
          shardInfo.replicas.push(node);
        }
      }

      this.shards.set(i, shardInfo);
      
      // Add to consistent hash ring
      this.consistentHashRing.addNode(i, shardInfo);
    }

    this.logger.info('Sharding initialized', { 
      shards: this.shards.size,
      replication 
    });
  }

  private calculateShardRange(shardId: number, totalShards: number): { start: string; end: string } {
    const maxHash = 'ffffffffffffffffffffffffffffffff';
    const shardSize = BigInt(`0x${maxHash}`) / BigInt(totalShards);
    
    const start = (shardSize * BigInt(shardId)).toString(16).padStart(32, '0');
    const end = shardId === totalShards - 1 
      ? maxHash 
      : (shardSize * BigInt(shardId + 1) - BigInt(1)).toString(16).padStart(32, '0');

    return { start, end };
  }

  // Core state operations
  async get(key: string, options: { useCache?: boolean } = {}): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Check local cache first
      if (options.useCache !== false && this.config.caching.localCacheEnabled) {
        const cached = this.getFromLocalCache(key);
        if (cached !== undefined) {
          this.metrics.operations.get.hits++;
          this.metrics.cache.hits++;
          return cached;
        }
        this.metrics.cache.misses++;
      }

      // Get from distributed store
      const value = await this.getFromBackend(key);
      
      if (value !== null && this.config.caching.localCacheEnabled) {
        this.setLocalCache(key, value);
      }

      this.metrics.operations.get.count++;
      this.metrics.operations.get.latency.push(Date.now() - startTime);
      
      return value;
    } catch (error) {
      this.metrics.operations.get.misses++;
      throw error;
    }
  }

  async set(
    key: string, 
    value: any, 
    options: { ttl?: number; metadata?: any } = {}
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Prepare state entry
      const entry: StateEntry = {
        key,
        value,
        version: Date.now(),
        timestamp: Date.now(),
        ttl: options.ttl,
        metadata: options.metadata
      };

      // Set in distributed store
      await this.setInBackend(entry);
      
      // Update local cache
      if (this.config.caching.localCacheEnabled) {
        this.setLocalCache(key, value);
      }

      this.metrics.operations.set.count++;
      this.metrics.operations.set.success++;
      this.metrics.operations.set.latency.push(Date.now() - startTime);
      
      this.emit('state-changed', { key, value });
    } catch (error) {
      this.metrics.operations.set.failures++;
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      // Delete from distributed store
      const result = await this.deleteFromBackend(key);
      
      // Remove from local cache
      this.localCache.delete(key);
      
      this.metrics.operations.delete.count++;
      this.metrics.operations.delete.success++;
      this.metrics.operations.delete.latency.push(Date.now() - startTime);
      
      this.emit('state-deleted', { key });
      
      return result;
    } catch (error) {
      this.metrics.operations.delete.failures++;
      throw error;
    }
  }

  async mget(keys: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    // Check local cache first
    const missingKeys: string[] = [];
    
    if (this.config.caching.localCacheEnabled) {
      for (const key of keys) {
        const cached = this.getFromLocalCache(key);
        if (cached !== undefined) {
          results.set(key, cached);
          this.metrics.cache.hits++;
        } else {
          missingKeys.push(key);
          this.metrics.cache.misses++;
        }
      }
    } else {
      missingKeys.push(...keys);
    }

    // Get missing keys from backend
    if (missingKeys.length > 0) {
      const backendResults = await this.mgetFromBackend(missingKeys);
      
      for (const [key, value] of backendResults) {
        results.set(key, value);
        
        // Update local cache
        if (value !== null && this.config.caching.localCacheEnabled) {
          this.setLocalCache(key, value);
        }
      }
    }

    return results;
  }

  async mset(entries: Map<string, any>, options: { ttl?: number } = {}): Promise<void> {
    const operations: BatchOperation[] = [];
    
    for (const [key, value] of entries) {
      operations.push({
        type: 'set',
        key,
        value,
        ttl: options.ttl
      });
    }

    await this.executeBatch(operations);
    
    // Update local cache
    if (this.config.caching.localCacheEnabled) {
      for (const [key, value] of entries) {
        this.setLocalCache(key, value);
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    // Check local cache first
    if (this.config.caching.localCacheEnabled && this.localCache.has(key)) {
      return true;
    }

    return this.existsInBackend(key);
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    const result = await this.expireInBackend(key, ttl);
    
    // Update local cache TTL
    const cached = this.localCache.get(key);
    if (cached) {
      // Re-cache with new expiry
      setTimeout(() => {
        this.localCache.delete(key);
      }, ttl * 1000);
    }

    return result;
  }

  // Backend operations
  private async getFromBackend(key: string): Promise<any> {
    if (this.config.backend === 'redis-cluster') {
      const data = await this.backend.get(key);
      
      if (!data) return null;
      
      // Decompress if needed
      if (this.config.caching.compressionEnabled) {
        return this.decompress(data);
      }
      
      return JSON.parse(data);
    }
    
    throw new Error(`Backend ${this.config.backend} not implemented`);
  }

  private async setInBackend(entry: StateEntry): Promise<void> {
    if (this.config.backend === 'redis-cluster') {
      let data = JSON.stringify(entry.value);
      
      // Compress if needed
      if (this.config.caching.compressionEnabled && 
          data.length > this.config.caching.compressionThreshold) {
        data = await this.compress(data);
      }

      if (entry.ttl) {
        await this.backend.setex(entry.key, entry.ttl, data);
      } else {
        await this.backend.set(entry.key, data);
      }
      
      // Store metadata separately if needed
      if (entry.metadata) {
        await this.backend.hset(
          `${entry.key}:meta`,
          'version', entry.version,
          'timestamp', entry.timestamp,
          'metadata', JSON.stringify(entry.metadata)
        );
      }
    } else {
      throw new Error(`Backend ${this.config.backend} not implemented`);
    }
  }

  private async deleteFromBackend(key: string): Promise<boolean> {
    if (this.config.backend === 'redis-cluster') {
      const result = await this.backend.del(key);
      
      // Also delete metadata
      await this.backend.del(`${key}:meta`);
      
      return result > 0;
    }
    
    throw new Error(`Backend ${this.config.backend} not implemented`);
  }

  private async mgetFromBackend(keys: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    if (this.config.backend === 'redis-cluster') {
      // Use pipeline for efficiency
      const pipeline = this.backend.pipeline();
      
      for (const key of keys) {
        pipeline.get(key);
      }
      
      const values = await pipeline.exec();
      
      for (let i = 0; i < keys.length; i++) {
        const [error, data] = values[i];
        
        if (!error && data) {
          const value = this.config.caching.compressionEnabled
            ? await this.decompress(data)
            : JSON.parse(data);
          
          results.set(keys[i], value);
        } else {
          results.set(keys[i], null);
        }
      }
    } else {
      throw new Error(`Backend ${this.config.backend} not implemented`);
    }
    
    return results;
  }

  private async existsInBackend(key: string): Promise<boolean> {
    if (this.config.backend === 'redis-cluster') {
      const result = await this.backend.exists(key);
      return result > 0;
    }
    
    throw new Error(`Backend ${this.config.backend} not implemented`);
  }

  private async expireInBackend(key: string, ttl: number): Promise<boolean> {
    if (this.config.backend === 'redis-cluster') {
      const result = await this.backend.expire(key, ttl);
      return result > 0;
    }
    
    throw new Error(`Backend ${this.config.backend} not implemented`);
  }

  // Batch operations
  async executeBatch(operations: BatchOperation[]): Promise<void> {
    if (this.config.backend === 'redis-cluster') {
      const pipeline = this.backend.pipeline();
      
      for (const op of operations) {
        switch (op.type) {
          case 'get':
            pipeline.get(op.key);
            break;
          case 'set':
            const data = this.config.caching.compressionEnabled && 
                       JSON.stringify(op.value).length > this.config.caching.compressionThreshold
              ? await this.compress(JSON.stringify(op.value))
              : JSON.stringify(op.value);
            
            if (op.ttl) {
              pipeline.setex(op.key, op.ttl, data);
            } else {
              pipeline.set(op.key, data);
            }
            break;
          case 'delete':
            pipeline.del(op.key);
            break;
          case 'expire':
            pipeline.expire(op.key, op.ttl!);
            break;
        }
      }
      
      await pipeline.exec();
    } else {
      throw new Error(`Backend ${this.config.backend} not implemented`);
    }
  }

  // Local cache operations
  private getFromLocalCache(key: string): any {
    const entry = this.localCache.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (this.config.caching.localCacheTTL > 0) {
      const age = (Date.now() - entry.timestamp) / 1000;
      if (age > this.config.caching.localCacheTTL) {
        this.localCache.delete(key);
        this.metrics.cache.evictions++;
        return undefined;
      }
    }

    return entry.compressed ? this.decompress(entry.data) : entry.data;
  }

  private setLocalCache(key: string, value: any): void {
    // Check cache size limit
    if (this.localCache.size * 50 > this.config.caching.localCacheSize * 1024 * 1024) {
      // Evict oldest entries (simple LRU)
      const entriesToEvict = Math.floor(this.localCache.size * 0.1);
      const sortedEntries = Array.from(this.localCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (let i = 0; i < entriesToEvict; i++) {
        this.localCache.delete(sortedEntries[i][0]);
        this.metrics.cache.evictions++;
      }
    }

    const entry: LocalCacheEntry = {
      data: value,
      timestamp: Date.now(),
      version: Date.now(),
      compressed: false
    };

    this.localCache.set(key, entry);
    this.metrics.cache.size = this.localCache.size;
  }

  // Compression utilities
  private async compress(data: string): Promise<string> {
    const buffer = Buffer.from(data, 'utf8');
    const compressed = msgpack.encode(buffer);
    
    this.metrics.cache.compressionRatio = 
      compressed.length / buffer.length;
    
    return compressed.toString('base64');
  }

  private async decompress(data: string): Promise<any> {
    const buffer = Buffer.from(data, 'base64');
    const decompressed = msgpack.decode(buffer);
    return JSON.parse(decompressed.toString('utf8'));
  }

  // Monitoring and metrics
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring.metricsInterval);
  }

  private collectMetrics(): void {
    // Calculate averages
    const calculateAverage = (arr: number[]) => 
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const metrics = {
      operations: {
        get: {
          ...this.metrics.operations.get,
          avgLatency: calculateAverage(this.metrics.operations.get.latency)
        },
        set: {
          ...this.metrics.operations.set,
          avgLatency: calculateAverage(this.metrics.operations.set.latency)
        },
        delete: {
          ...this.metrics.operations.delete,
          avgLatency: calculateAverage(this.metrics.operations.delete.latency)
        }
      },
      cache: this.metrics.cache,
      cluster: {
        ...this.metrics.cluster,
        nodes: this.config.clusters.nodes.length,
        shards: this.shards.size
      },
      memory: {
        used: process.memoryUsage().heapUsed,
        allocated: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        cacheSize: this.localCache.size * 50 // Rough estimate
      }
    };

    this.emit('metrics', metrics);

    // Reset latency arrays
    this.metrics.operations.get.latency = [];
    this.metrics.operations.set.latency = [];
    this.metrics.operations.delete.latency = [];

    // Check memory usage
    const memoryUsagePercent = 
      (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;
    
    if (memoryUsagePercent > this.config.monitoring.memoryAlertThreshold) {
      this.logger.warn('High memory usage detected', { 
        usage: `${memoryUsagePercent.toFixed(2)}%` 
      });
      this.emit('memory-alert', { usage: memoryUsagePercent });
    }
  }

  // Rebalancing
  private startRebalancing(): void {
    this.rebalanceInterval = setInterval(() => {
      this.checkRebalance();
    }, 60000); // Check every minute
  }

  private async checkRebalance(): Promise<void> {
    // Get shard sizes
    const shardSizes = new Map<number, number>();
    
    for (const [shardId, shard] of this.shards) {
      // This would query actual shard size from backend
      // For now, using operation count as proxy
      shardSizes.set(shardId, shard.operations);
    }

    // Calculate if rebalancing is needed
    const sizes = Array.from(shardSizes.values());
    const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const maxDeviation = Math.max(...sizes.map(size => Math.abs(size - avg)));
    const deviationPercent = (maxDeviation / avg) * 100;

    if (deviationPercent > this.config.partitioning.rebalanceThreshold) {
      this.logger.info('Rebalancing needed', { 
        deviation: `${deviationPercent.toFixed(2)}%` 
      });
      
      await this.performRebalance();
      this.metrics.cluster.rebalances++;
    }
  }

  private async performRebalance(): Promise<void> {
    // Rebalancing implementation would:
    // 1. Calculate new shard assignments
    // 2. Migrate keys between shards
    // 3. Update consistent hash ring
    // 4. Update shard info
    
    this.emit('rebalance-started');
    
    // Placeholder for actual rebalancing logic
    
    this.emit('rebalance-completed');
  }

  // Session management for 1M+ connections
  async getSession(sessionId: string): Promise<any> {
    return this.get(`session:${sessionId}`, { useCache: true });
  }

  async setSession(
    sessionId: string, 
    data: any, 
    ttl: number = 3600
  ): Promise<void> {
    await this.set(`session:${sessionId}`, data, { 
      ttl,
      metadata: { type: 'session', timestamp: Date.now() }
    });
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.delete(`session:${sessionId}`);
  }

  async getUserSessions(userId: string): Promise<string[]> {
    // This would use secondary indexing in production
    // For now, using a simple set
    const sessions = await this.get(`user_sessions:${userId}`);
    return sessions || [];
  }

  async addUserSession(userId: string, sessionId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    sessions.push(sessionId);
    
    await this.set(`user_sessions:${userId}`, sessions, {
      ttl: 86400 // 24 hours
    });
  }

  // Pub/Sub for state changes
  async subscribe(pattern: string, callback: (channel: string, message: any) => void): Promise<void> {
    if (this.config.backend === 'redis-cluster') {
      await this.backend.psubscribe(pattern);
      
      this.backend.on('pmessage', (pattern: string, channel: string, message: string) => {
        try {
          const data = JSON.parse(message);
          callback(channel, data);
        } catch (error) {
          this.logger.error('Failed to parse pub/sub message', { error });
        }
      });
    }
  }

  async publish(channel: string, message: any): Promise<void> {
    if (this.config.backend === 'redis-cluster') {
      await this.backend.publish(channel, JSON.stringify(message));
    }
  }

  // Cleanup and shutdown
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down distributed state manager');

    // Stop intervals
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.rebalanceInterval) clearInterval(this.rebalanceInterval);

    // Clear local cache
    this.localCache.clear();

    // Disconnect from backend
    if (this.backend) {
      if (this.config.backend === 'redis-cluster') {
        await this.backend.quit();
      }
    }

    this.isStarted = false;
    this.logger.info('Distributed state manager shut down');
  }

  getMetrics(): any {
    return {
      ...this.metrics,
      shards: Array.from(this.shards.values()).map(shard => ({
        id: shard.id,
        nodes: shard.nodes.length,
        primary: shard.primary,
        operations: shard.operations
      }))
    };
  }
}

// Consistent Hash Ring for sharding
class ConsistentHashRing {
  private ring: Map<string, any> = new Map();
  private sortedKeys: string[] = [];
  private virtualNodes: number;

  constructor(virtualNodes: number) {
    this.virtualNodes = virtualNodes;
  }

  addNode(nodeId: number, data: any): void {
    for (let i = 0; i < this.virtualNodes; i++) {
      const virtualKey = `${nodeId}-${i}`;
      const hash = createHash('md5').update(virtualKey).digest('hex');
      this.ring.set(hash, data);
    }
    this.updateSortedKeys();
  }

  removeNode(nodeId: number): void {
    const keysToRemove: string[] = [];
    
    for (const [hash, data] of this.ring) {
      if (data.id === nodeId) {
        keysToRemove.push(hash);
      }
    }

    keysToRemove.forEach(key => this.ring.delete(key));
    this.updateSortedKeys();
  }

  getNode(key: string): any {
    if (this.ring.size === 0) {
      throw new Error('No nodes in hash ring');
    }

    const hash = createHash('md5').update(key).digest('hex');
    
    // Binary search for the next node
    let left = 0;
    let right = this.sortedKeys.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.sortedKeys[mid] < hash) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    // Wrap around if necessary
    const selectedKey = this.sortedKeys[left] || this.sortedKeys[0];
    return this.ring.get(selectedKey);
  }

  private updateSortedKeys(): void {
    this.sortedKeys = Array.from(this.ring.keys()).sort();
  }
}

export default DistributedStateManager;