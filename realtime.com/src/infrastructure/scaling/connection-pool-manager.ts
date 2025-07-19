import { EventEmitter } from 'events';
import * as net from 'net';
import * as tls from 'tls';
import { createHash } from 'crypto';
import { Logger } from 'winston';

export interface ConnectionPoolConfig {
  pools: {
    initialSize: number;
    minSize: number;
    maxSize: number;
    maxIdleTime: number;
    acquireTimeout: number;
    createTimeout: number;
    destroyTimeout: number;
    validationInterval: number;
    maxWaitingClients: number;
  };
  sharding: {
    enabled: boolean;
    shardKey: 'user-id' | 'client-ip' | 'session-id' | 'custom';
    shardCount: number;
    rebalanceInterval: number;
  };
  optimization: {
    preallocateBuffers: boolean;
    bufferSize: number;
    bufferPoolSize: number;
    socketNoDelay: boolean;
    socketKeepAlive: boolean;
    socketKeepAliveDelay: number;
    reuseAddress: boolean;
  };
  monitoring: {
    metricsInterval: number;
    slowQueryThreshold: number;
    connectionLeakDetection: boolean;
    leakDetectionInterval: number;
  };
}

interface PooledConnection {
  id: string;
  socket: net.Socket | tls.TLSSocket;
  poolId: number;
  shardId: number;
  createdAt: number;
  lastUsedAt: number;
  useCount: number;
  state: 'idle' | 'active' | 'validating' | 'destroying';
  metadata: {
    userId?: string;
    clientIp?: string;
    sessionId?: string;
    [key: string]: any;
  };
}

interface ConnectionPool {
  id: number;
  shardId: number;
  connections: Map<string, PooledConnection>;
  idleConnections: Set<string>;
  activeConnections: Set<string>;
  waitingQueue: Array<{
    resolve: (conn: PooledConnection) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>;
  metrics: {
    created: number;
    destroyed: number;
    acquired: number;
    released: number;
    timeouts: number;
    errors: number;
    avgAcquireTime: number;
    avgHoldTime: number;
  };
}

interface BufferPool {
  buffers: Buffer[];
  available: number[];
  inUse: Set<number>;
  size: number;
  bufferSize: number;
}

export class ConnectionPoolManager extends EventEmitter {
  private config: ConnectionPoolConfig;
  private logger: Logger;
  private pools: Map<number, ConnectionPool> = new Map();
  private shardMap: Map<string, number> = new Map();
  private bufferPool?: BufferPool;
  private metricsInterval?: NodeJS.Timeout;
  private validationInterval?: NodeJS.Timeout;
  private leakDetectionInterval?: NodeJS.Timeout;
  private globalMetrics = {
    totalConnections: 0,
    totalPools: 0,
    acquireLatency: [] as number[],
    releaseLatency: [] as number[],
    connectionLifetime: [] as number[],
    memoryUsage: 0,
    bufferUtilization: 0
  };

  constructor(config: ConnectionPoolConfig, logger: Logger) {
    super();
    this.config = this.validateConfig(config);
    this.logger = logger;
    
    if (this.config.optimization.preallocateBuffers) {
      this.initializeBufferPool();
    }
  }

  private validateConfig(config: ConnectionPoolConfig): ConnectionPoolConfig {
    if (!config.pools || !config.sharding || !config.optimization) {
      throw new Error('Invalid connection pool configuration');
    }

    // Validate pool sizes
    if (config.pools.maxSize < config.pools.minSize) {
      throw new Error('Max pool size must be greater than min size');
    }

    return config;
  }

  private initializeBufferPool(): void {
    const { bufferSize, bufferPoolSize } = this.config.optimization;
    
    this.bufferPool = {
      buffers: [],
      available: [],
      inUse: new Set(),
      size: bufferPoolSize,
      bufferSize
    };

    // Preallocate buffers
    for (let i = 0; i < bufferPoolSize; i++) {
      this.bufferPool.buffers.push(Buffer.allocUnsafe(bufferSize));
      this.bufferPool.available.push(i);
    }

    this.logger.info('Buffer pool initialized', { 
      bufferSize, 
      poolSize: bufferPoolSize,
      totalMemory: bufferSize * bufferPoolSize 
    });
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing connection pool manager');

    // Create initial pools based on shard configuration
    const { shardCount } = this.config.sharding;
    
    for (let shardId = 0; shardId < shardCount; shardId++) {
      await this.createPool(shardId);
    }

    // Start monitoring
    this.startMonitoring();
    
    // Start validation
    this.startValidation();
    
    // Start leak detection if enabled
    if (this.config.monitoring.connectionLeakDetection) {
      this.startLeakDetection();
    }

    this.logger.info('Connection pool manager initialized', {
      pools: this.pools.size,
      shards: shardCount
    });
  }

  private async createPool(shardId: number): Promise<ConnectionPool> {
    const poolId = this.pools.size;
    
    const pool: ConnectionPool = {
      id: poolId,
      shardId,
      connections: new Map(),
      idleConnections: new Set(),
      activeConnections: new Set(),
      waitingQueue: [],
      metrics: {
        created: 0,
        destroyed: 0,
        acquired: 0,
        released: 0,
        timeouts: 0,
        errors: 0,
        avgAcquireTime: 0,
        avgHoldTime: 0
      }
    };

    this.pools.set(poolId, pool);
    
    // Create initial connections
    const { initialSize } = this.config.pools;
    const createPromises = [];
    
    for (let i = 0; i < initialSize; i++) {
      createPromises.push(this.createConnection(pool));
    }

    await Promise.all(createPromises);
    
    this.logger.debug('Pool created', { poolId, shardId, initialSize });
    
    return pool;
  }

  private async createConnection(pool: ConnectionPool): Promise<PooledConnection> {
    const connectionId = this.generateConnectionId();
    
    const socket = await this.createSocket();
    
    // Apply optimizations
    if (this.config.optimization.socketNoDelay) {
      socket.setNoDelay(true);
    }
    
    if (this.config.optimization.socketKeepAlive) {
      socket.setKeepAlive(true, this.config.optimization.socketKeepAliveDelay);
    }

    const connection: PooledConnection = {
      id: connectionId,
      socket,
      poolId: pool.id,
      shardId: pool.shardId,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      useCount: 0,
      state: 'idle',
      metadata: {}
    };

    // Attach buffer from pool if available
    if (this.bufferPool) {
      const bufferIndex = this.acquireBuffer();
      if (bufferIndex !== -1) {
        (socket as any).pooledBufferIndex = bufferIndex;
        (socket as any).pooledBuffer = this.bufferPool.buffers[bufferIndex];
      }
    }

    pool.connections.set(connectionId, connection);
    pool.idleConnections.add(connectionId);
    pool.metrics.created++;
    
    this.globalMetrics.totalConnections++;

    return connection;
  }

  private async createSocket(): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket creation timeout'));
      }, this.config.pools.createTimeout);

      // Create socket with optimizations
      const socket = new net.Socket({
        allowHalfOpen: false,
        readable: true,
        writable: true
      });

      socket.once('connect', () => {
        clearTimeout(timeout);
        resolve(socket);
      });

      socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Connect to upstream service
      // This would be configured based on your architecture
      socket.connect({
        port: parseInt(process.env.UPSTREAM_PORT || '9000'),
        host: process.env.UPSTREAM_HOST || 'localhost'
      });
    });
  }

  async acquire(shardKey?: string, metadata?: any): Promise<PooledConnection> {
    const startTime = Date.now();
    
    // Determine shard
    const shardId = this.getShardId(shardKey);
    const pool = this.getPoolForShard(shardId);
    
    if (!pool) {
      throw new Error(`No pool available for shard ${shardId}`);
    }

    // Try to get idle connection
    let connection = this.getIdleConnection(pool);
    
    if (!connection) {
      // Check if we can create new connection
      if (pool.connections.size < this.config.pools.maxSize) {
        connection = await this.createConnection(pool);
      } else {
        // Wait for available connection
        connection = await this.waitForConnection(pool);
      }
    }

    // Mark as active
    connection.state = 'active';
    connection.lastUsedAt = Date.now();
    connection.useCount++;
    
    if (metadata) {
      Object.assign(connection.metadata, metadata);
    }

    pool.idleConnections.delete(connection.id);
    pool.activeConnections.add(connection.id);
    pool.metrics.acquired++;

    // Track metrics
    const acquireTime = Date.now() - startTime;
    this.globalMetrics.acquireLatency.push(acquireTime);
    pool.metrics.avgAcquireTime = this.calculateAverage(
      pool.metrics.avgAcquireTime,
      acquireTime,
      pool.metrics.acquired
    );

    this.emit('connection-acquired', { 
      connectionId: connection.id, 
      poolId: pool.id,
      shardId,
      acquireTime 
    });

    return connection;
  }

  async release(connection: PooledConnection): Promise<void> {
    const startTime = Date.now();
    const pool = this.pools.get(connection.poolId);
    
    if (!pool) {
      throw new Error(`Pool ${connection.poolId} not found`);
    }

    // Check connection health
    if (!this.isConnectionHealthy(connection)) {
      await this.destroyConnection(connection);
      
      // Create replacement if below minimum
      if (pool.connections.size < this.config.pools.minSize) {
        await this.createConnection(pool);
      }
      return;
    }

    // Reset connection state
    connection.state = 'idle';
    connection.lastUsedAt = Date.now();
    
    // Clear metadata
    connection.metadata = {};

    // Move to idle pool
    pool.activeConnections.delete(connection.id);
    pool.idleConnections.add(connection.id);
    pool.metrics.released++;

    // Track metrics
    const releaseTime = Date.now() - startTime;
    this.globalMetrics.releaseLatency.push(releaseTime);

    // Process waiting queue
    if (pool.waitingQueue.length > 0) {
      const waiter = pool.waitingQueue.shift();
      if (waiter) {
        clearTimeout(waiter.timeout);
        waiter.resolve(connection);
      }
    }

    this.emit('connection-released', { 
      connectionId: connection.id, 
      poolId: pool.id,
      releaseTime 
    });
  }

  private isConnectionHealthy(connection: PooledConnection): boolean {
    // Check if socket is still connected
    if (connection.socket.destroyed || !connection.socket.readable || !connection.socket.writable) {
      return false;
    }

    // Check idle time
    const idleTime = Date.now() - connection.lastUsedAt;
    if (idleTime > this.config.pools.maxIdleTime) {
      return false;
    }

    // Check use count (prevent connection fatigue)
    const maxUseCount = 10000; // Configurable
    if (connection.useCount > maxUseCount) {
      return false;
    }

    return true;
  }

  private async destroyConnection(connection: PooledConnection): Promise<void> {
    const pool = this.pools.get(connection.poolId);
    if (!pool) return;

    connection.state = 'destroying';
    
    // Release buffer if pooled
    if (this.bufferPool && (connection.socket as any).pooledBufferIndex !== undefined) {
      this.releaseBuffer((connection.socket as any).pooledBufferIndex);
    }

    // Close socket
    connection.socket.destroy();
    
    // Remove from pool
    pool.connections.delete(connection.id);
    pool.idleConnections.delete(connection.id);
    pool.activeConnections.delete(connection.id);
    pool.metrics.destroyed++;
    
    this.globalMetrics.totalConnections--;
    
    // Track lifetime
    const lifetime = Date.now() - connection.createdAt;
    this.globalMetrics.connectionLifetime.push(lifetime);

    this.emit('connection-destroyed', { 
      connectionId: connection.id, 
      poolId: pool.id,
      lifetime 
    });
  }

  private getIdleConnection(pool: ConnectionPool): PooledConnection | null {
    if (pool.idleConnections.size === 0) {
      return null;
    }

    // Get first idle connection
    const connectionId = pool.idleConnections.values().next().value;
    return pool.connections.get(connectionId) || null;
  }

  private async waitForConnection(pool: ConnectionPool): Promise<PooledConnection> {
    return new Promise((resolve, reject) => {
      // Check queue limit
      if (pool.waitingQueue.length >= this.config.pools.maxWaitingClients) {
        reject(new Error('Connection pool queue is full'));
        return;
      }

      // Setup timeout
      const timeout = setTimeout(() => {
        const index = pool.waitingQueue.findIndex(w => w.timeout === timeout);
        if (index !== -1) {
          pool.waitingQueue.splice(index, 1);
        }
        pool.metrics.timeouts++;
        reject(new Error('Connection acquire timeout'));
      }, this.config.pools.acquireTimeout);

      // Add to waiting queue
      pool.waitingQueue.push({ resolve, reject, timeout });
    });
  }

  private getShardId(shardKey?: string): number {
    if (!this.config.sharding.enabled || !shardKey) {
      // Round-robin if no sharding
      return Math.floor(Math.random() * this.config.sharding.shardCount);
    }

    // Check cache
    const cached = this.shardMap.get(shardKey);
    if (cached !== undefined) {
      return cached;
    }

    // Calculate shard
    const hash = createHash('md5').update(shardKey).digest();
    const shardId = hash.readUInt32BE(0) % this.config.sharding.shardCount;
    
    // Cache result
    this.shardMap.set(shardKey, shardId);
    
    // Limit cache size
    if (this.shardMap.size > 10000) {
      const firstKey = this.shardMap.keys().next().value;
      this.shardMap.delete(firstKey);
    }

    return shardId;
  }

  private getPoolForShard(shardId: number): ConnectionPool | null {
    // Find pool with matching shard
    for (const pool of this.pools.values()) {
      if (pool.shardId === shardId) {
        return pool;
      }
    }
    return null;
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private acquireBuffer(): number {
    if (!this.bufferPool || this.bufferPool.available.length === 0) {
      return -1;
    }

    const index = this.bufferPool.available.pop()!;
    this.bufferPool.inUse.add(index);
    return index;
  }

  private releaseBuffer(index: number): void {
    if (!this.bufferPool) return;

    this.bufferPool.inUse.delete(index);
    this.bufferPool.available.push(index);
  }

  private calculateAverage(current: number, value: number, count: number): number {
    return (current * (count - 1) + value) / count;
  }

  private startMonitoring(): void {
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring.metricsInterval);
  }

  private startValidation(): void {
    this.validationInterval = setInterval(() => {
      this.validateConnections();
    }, this.config.pools.validationInterval);
  }

  private startLeakDetection(): void {
    this.leakDetectionInterval = setInterval(() => {
      this.detectLeaks();
    }, this.config.monitoring.leakDetectionInterval);
  }

  private collectMetrics(): void {
    const metrics = {
      pools: [] as any[],
      global: {
        totalConnections: this.globalMetrics.totalConnections,
        totalPools: this.pools.size,
        avgAcquireLatency: this.calculateArrayAverage(this.globalMetrics.acquireLatency),
        avgReleaseLatency: this.calculateArrayAverage(this.globalMetrics.releaseLatency),
        avgConnectionLifetime: this.calculateArrayAverage(this.globalMetrics.connectionLifetime),
        memoryUsage: process.memoryUsage().heapUsed,
        bufferUtilization: this.bufferPool 
          ? this.bufferPool.inUse.size / this.bufferPool.size 
          : 0
      }
    };

    for (const pool of this.pools.values()) {
      metrics.pools.push({
        id: pool.id,
        shardId: pool.shardId,
        total: pool.connections.size,
        idle: pool.idleConnections.size,
        active: pool.activeConnections.size,
        waiting: pool.waitingQueue.length,
        metrics: pool.metrics
      });
    }

    this.emit('metrics', metrics);
    
    // Reset latency arrays to prevent memory growth
    this.globalMetrics.acquireLatency = [];
    this.globalMetrics.releaseLatency = [];
    this.globalMetrics.connectionLifetime = [];
  }

  private async validateConnections(): Promise<void> {
    for (const pool of this.pools.values()) {
      const connectionsToValidate = Array.from(pool.idleConnections).slice(0, 10);
      
      for (const connectionId of connectionsToValidate) {
        const connection = pool.connections.get(connectionId);
        if (!connection) continue;

        connection.state = 'validating';
        
        if (!this.isConnectionHealthy(connection)) {
          await this.destroyConnection(connection);
          
          // Create replacement
          if (pool.connections.size < this.config.pools.minSize) {
            await this.createConnection(pool);
          }
        } else {
          connection.state = 'idle';
        }
      }
    }
  }

  private detectLeaks(): void {
    const suspiciousConnections: PooledConnection[] = [];
    const holdTimeThreshold = 300000; // 5 minutes

    for (const pool of this.pools.values()) {
      for (const connectionId of pool.activeConnections) {
        const connection = pool.connections.get(connectionId);
        if (!connection) continue;

        const holdTime = Date.now() - connection.lastUsedAt;
        if (holdTime > holdTimeThreshold) {
          suspiciousConnections.push(connection);
        }
      }
    }

    if (suspiciousConnections.length > 0) {
      this.logger.warn('Potential connection leaks detected', {
        count: suspiciousConnections.length,
        connections: suspiciousConnections.map(c => ({
          id: c.id,
          poolId: c.poolId,
          holdTime: Date.now() - c.lastUsedAt,
          metadata: c.metadata
        }))
      });

      this.emit('leak-detected', suspiciousConnections);
    }
  }

  private calculateArrayAverage(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  async rebalance(): Promise<void> {
    this.logger.info('Starting connection pool rebalancing');
    
    // Clear shard cache
    this.shardMap.clear();
    
    // Rebalance connections across pools
    for (const pool of this.pools.values()) {
      const targetSize = this.config.pools.initialSize;
      const currentSize = pool.connections.size;
      
      if (currentSize > targetSize && pool.idleConnections.size > 0) {
        // Destroy excess idle connections
        const toDestroy = Math.min(
          currentSize - targetSize,
          pool.idleConnections.size
        );
        
        const connectionsToDestroy = Array.from(pool.idleConnections).slice(0, toDestroy);
        
        for (const connectionId of connectionsToDestroy) {
          const connection = pool.connections.get(connectionId);
          if (connection) {
            await this.destroyConnection(connection);
          }
        }
      } else if (currentSize < targetSize) {
        // Create missing connections
        const toCreate = targetSize - currentSize;
        
        for (let i = 0; i < toCreate; i++) {
          await this.createConnection(pool);
        }
      }
    }
    
    this.logger.info('Connection pool rebalancing completed');
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down connection pool manager');
    
    // Stop intervals
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
    }
    
    if (this.leakDetectionInterval) {
      clearInterval(this.leakDetectionInterval);
    }

    // Destroy all connections
    const destroyPromises: Promise<void>[] = [];
    
    for (const pool of this.pools.values()) {
      // Clear waiting queue
      for (const waiter of pool.waitingQueue) {
        clearTimeout(waiter.timeout);
        waiter.reject(new Error('Pool shutting down'));
      }
      pool.waitingQueue = [];
      
      // Destroy all connections
      for (const connection of pool.connections.values()) {
        destroyPromises.push(this.destroyConnection(connection));
      }
    }

    await Promise.all(destroyPromises);
    
    this.pools.clear();
    this.shardMap.clear();
    
    this.logger.info('Connection pool manager shut down');
  }

  getPoolStats(): any {
    const stats = {
      pools: [] as any[],
      shards: this.config.sharding.shardCount,
      global: {
        totalConnections: this.globalMetrics.totalConnections,
        totalPools: this.pools.size,
        bufferPoolUtilization: this.bufferPool 
          ? this.bufferPool.inUse.size / this.bufferPool.size 
          : 0
      }
    };

    for (const pool of this.pools.values()) {
      stats.pools.push({
        id: pool.id,
        shardId: pool.shardId,
        connections: {
          total: pool.connections.size,
          idle: pool.idleConnections.size,
          active: pool.activeConnections.size,
          waiting: pool.waitingQueue.length
        },
        metrics: pool.metrics
      });
    }

    return stats;
  }
}

export default ConnectionPoolManager;