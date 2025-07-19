import { EventEmitter } from 'events';
import * as cluster from 'cluster';
import * as os from 'os';
import { createHash } from 'crypto';
import { Logger } from 'winston';

export interface ScalingConfig {
  cluster: {
    workers: number | 'auto';
    minWorkers: number;
    maxWorkers: number;
    workerMemoryLimit: number; // MB
    workerRestartDelay: number;
    gracefulShutdownTimeout: number;
  };
  discovery: {
    enabled: boolean;
    service: 'etcd' | 'consul' | 'redis';
    endpoints: string[];
    serviceName: string;
    ttl: number;
    healthCheckInterval: number;
  };
  sharding: {
    strategy: 'consistent-hash' | 'range' | 'modulo';
    shardCount: number;
    replicationFactor: number;
    virtualNodes: number; // For consistent hashing
  };
  loadBalancing: {
    algorithm: 'round-robin' | 'least-connections' | 'ip-hash' | 'weighted';
    stickySession: boolean;
    sessionTimeout: number;
    healthCheckPath: string;
  };
  performance: {
    maxConnectionsPerWorker: number;
    connectionPoolSize: number;
    bufferPoolSize: number;
    gcInterval: number;
    tcpNoDelay: boolean;
    keepAlive: boolean;
    keepAliveInitialDelay: number;
  };
  autoScaling: {
    enabled: boolean;
    metrics: {
      cpu: { min: number; max: number; target: number };
      memory: { min: number; max: number; target: number };
      connections: { min: number; max: number; target: number };
    };
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    cooldownPeriod: number;
  };
}

interface WorkerInfo {
  id: number;
  pid: number;
  state: 'starting' | 'running' | 'stopping' | 'stopped';
  connections: number;
  memory: number;
  cpu: number;
  lastHealthCheck: number;
  shard: number;
}

interface ShardInfo {
  id: number;
  range: { start: string; end: string };
  workers: number[];
  primary: number;
  replicas: number[];
  load: number;
}

export class HorizontalScalingManager extends EventEmitter {
  private config: ScalingConfig;
  private logger: Logger;
  private workers: Map<number, WorkerInfo> = new Map();
  private shards: Map<number, ShardInfo> = new Map();
  private discoveryClient: any;
  private consistentHashRing: ConsistentHashRing;
  private metricsCollector: MetricsCollector;
  private autoScaler: AutoScaler;
  private isStarted: boolean = false;

  constructor(config: ScalingConfig, logger: Logger) {
    super();
    this.config = this.validateConfig(config);
    this.logger = logger;
    
    if (this.config.sharding.strategy === 'consistent-hash') {
      this.consistentHashRing = new ConsistentHashRing(
        this.config.sharding.virtualNodes
      );
    }

    this.metricsCollector = new MetricsCollector(this);
    this.autoScaler = new AutoScaler(this, this.config.autoScaling);
  }

  private validateConfig(config: ScalingConfig): ScalingConfig {
    if (!config.cluster || !config.discovery || !config.sharding) {
      throw new Error('Invalid scaling configuration');
    }

    // Auto-detect optimal worker count
    if (config.cluster.workers === 'auto') {
      config.cluster.workers = os.cpus().length;
    }

    return config;
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('Scaling manager already started');
    }

    this.logger.info('Starting horizontal scaling manager');

    if (cluster.isPrimary) {
      await this.startPrimary();
    } else {
      await this.startWorker();
    }

    this.isStarted = true;
  }

  private async startPrimary(): Promise<void> {
    this.logger.info('Starting primary process', { pid: process.pid });

    // Initialize service discovery
    if (this.config.discovery.enabled) {
      await this.initializeDiscovery();
    }

    // Initialize sharding
    await this.initializeSharding();

    // Fork workers
    const workerCount = this.config.cluster.workers as number;
    for (let i = 0; i < workerCount; i++) {
      await this.forkWorker(i);
    }

    // Setup cluster event handlers
    cluster.on('exit', this.handleWorkerExit.bind(this));
    cluster.on('message', this.handleWorkerMessage.bind(this));

    // Start metrics collection
    this.metricsCollector.start();

    // Start auto-scaling if enabled
    if (this.config.autoScaling.enabled) {
      this.autoScaler.start();
    }

    // Register primary in service discovery
    if (this.config.discovery.enabled) {
      await this.registerService('primary', process.pid);
    }

    this.logger.info('Primary process started successfully');
  }

  private async startWorker(): Promise<void> {
    const workerId = cluster.worker?.id || 0;
    this.logger.info('Starting worker process', { 
      workerId, 
      pid: process.pid 
    });

    // Worker-specific initialization
    process.on('message', this.handlePrimaryMessage.bind(this));
    
    // Send ready signal to primary
    process.send?.({ 
      type: 'worker-ready', 
      workerId,
      pid: process.pid 
    });
  }

  private async forkWorker(shardId: number): Promise<void> {
    const env = {
      ...process.env,
      WORKER_SHARD: shardId.toString(),
      MAX_CONNECTIONS: this.config.performance.maxConnectionsPerWorker.toString()
    };

    const worker = cluster.fork(env);
    const workerId = worker.id;

    const workerInfo: WorkerInfo = {
      id: workerId,
      pid: worker.process.pid || 0,
      state: 'starting',
      connections: 0,
      memory: 0,
      cpu: 0,
      lastHealthCheck: Date.now(),
      shard: shardId
    };

    this.workers.set(workerId, workerInfo);

    // Add worker to shard
    const shard = this.shards.get(shardId);
    if (shard) {
      shard.workers.push(workerId);
      if (!shard.primary) {
        shard.primary = workerId;
      } else {
        shard.replicas.push(workerId);
      }
    }

    this.logger.info('Worker forked', { workerId, shardId });
  }

  private async initializeSharding(): Promise<void> {
    const { shardCount, replicationFactor } = this.config.sharding;

    for (let i = 0; i < shardCount; i++) {
      const shard: ShardInfo = {
        id: i,
        range: this.calculateShardRange(i, shardCount),
        workers: [],
        primary: 0,
        replicas: [],
        load: 0
      };

      this.shards.set(i, shard);
    }

    this.logger.info('Sharding initialized', { shardCount, replicationFactor });
  }

  private calculateShardRange(shardId: number, totalShards: number): { start: string; end: string } {
    const maxHash = 'ffffffffffffffffffffffffffffffff'; // Max MD5 hash
    const shardSize = BigInt(`0x${maxHash}`) / BigInt(totalShards);
    
    const start = (shardSize * BigInt(shardId)).toString(16).padStart(32, '0');
    const end = shardId === totalShards - 1 
      ? maxHash 
      : (shardSize * BigInt(shardId + 1) - BigInt(1)).toString(16).padStart(32, '0');

    return { start, end };
  }

  private async initializeDiscovery(): Promise<void> {
    const { service, endpoints, serviceName } = this.config.discovery;

    switch (service) {
      case 'etcd':
        this.discoveryClient = await this.createEtcdClient(endpoints);
        break;
      case 'consul':
        this.discoveryClient = await this.createConsulClient(endpoints);
        break;
      case 'redis':
        this.discoveryClient = await this.createRedisDiscoveryClient(endpoints);
        break;
      default:
        throw new Error(`Unsupported discovery service: ${service}`);
    }

    this.logger.info('Service discovery initialized', { service, serviceName });
  }

  private async createEtcdClient(endpoints: string[]): Promise<any> {
    // Etcd client implementation
    const { Etcd3 } = await import('etcd3');
    return new Etcd3({ hosts: endpoints });
  }

  private async createConsulClient(endpoints: string[]): Promise<any> {
    // Consul client implementation
    const consul = await import('consul');
    return consul({ host: endpoints[0] });
  }

  private async createRedisDiscoveryClient(endpoints: string[]): Promise<any> {
    // Redis-based discovery implementation
    const { createClient } = await import('redis');
    return createClient({ url: endpoints[0] });
  }

  private async registerService(role: string, pid: number): Promise<void> {
    const { serviceName, ttl } = this.config.discovery;
    
    const serviceInfo = {
      id: `${serviceName}-${role}-${pid}`,
      name: serviceName,
      address: os.hostname(),
      port: this.getServicePort(),
      tags: [role, `pid:${pid}`],
      meta: {
        version: process.env.npm_package_version || '1.0.0',
        startTime: Date.now(),
        shards: Array.from(this.shards.keys())
      }
    };

    // Register with discovery service
    await this.discoveryClient.register(serviceInfo, ttl);

    // Setup heartbeat
    setInterval(async () => {
      await this.discoveryClient.heartbeat(serviceInfo.id);
    }, (ttl / 2) * 1000);

    this.logger.info('Service registered', serviceInfo);
  }

  private getServicePort(): number {
    // Get port from config or environment
    return parseInt(process.env.PORT || '8080');
  }

  private handleWorkerExit(worker: cluster.Worker, code: number, signal: string): void {
    const workerId = worker.id;
    const workerInfo = this.workers.get(workerId);

    this.logger.warn('Worker exited', { 
      workerId, 
      code, 
      signal,
      shard: workerInfo?.shard 
    });

    if (workerInfo && code !== 0 && !worker.exitedAfterDisconnect) {
      // Restart worker after delay
      setTimeout(() => {
        this.forkWorker(workerInfo.shard);
      }, this.config.cluster.workerRestartDelay);
    }

    this.workers.delete(workerId);
  }

  private handleWorkerMessage(worker: cluster.Worker, message: any): void {
    const workerId = worker.id;

    switch (message.type) {
      case 'worker-ready':
        this.handleWorkerReady(workerId, message);
        break;
      case 'metrics':
        this.handleWorkerMetrics(workerId, message);
        break;
      case 'connection-count':
        this.handleConnectionCount(workerId, message);
        break;
      default:
        this.logger.debug('Unknown worker message', { workerId, message });
    }
  }

  private handleWorkerReady(workerId: number, message: any): void {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.state = 'running';
      workerInfo.pid = message.pid;
    }

    this.logger.info('Worker ready', { workerId, pid: message.pid });
  }

  private handleWorkerMetrics(workerId: number, message: any): void {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.memory = message.memory;
      workerInfo.cpu = message.cpu;
      workerInfo.connections = message.connections;
      workerInfo.lastHealthCheck = Date.now();
    }
  }

  private handleConnectionCount(workerId: number, message: any): void {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.connections = message.count;
    }
  }

  private handlePrimaryMessage(message: any): void {
    switch (message.type) {
      case 'shutdown':
        this.gracefulShutdown();
        break;
      case 'update-config':
        this.updateWorkerConfig(message.config);
        break;
      default:
        this.logger.debug('Unknown primary message', message);
    }
  }

  private async gracefulShutdown(): Promise<void> {
    this.logger.info('Starting graceful shutdown');
    
    // Stop accepting new connections
    this.emit('stop-accepting');

    // Wait for existing connections to close
    const timeout = this.config.cluster.gracefulShutdownTimeout;
    const shutdownTimer = setTimeout(() => {
      this.logger.warn('Graceful shutdown timeout, forcing exit');
      process.exit(0);
    }, timeout);

    // Clean shutdown when connections are closed
    this.once('connections-closed', () => {
      clearTimeout(shutdownTimer);
      process.exit(0);
    });
  }

  private updateWorkerConfig(config: any): void {
    // Update worker-specific configuration
    this.emit('config-update', config);
  }

  // Public methods for scaling operations
  async scaleUp(count: number = 1): Promise<void> {
    const currentWorkers = this.workers.size;
    const maxWorkers = this.config.cluster.maxWorkers;

    if (currentWorkers + count > maxWorkers) {
      count = maxWorkers - currentWorkers;
    }

    for (let i = 0; i < count; i++) {
      const shardId = this.selectShardForNewWorker();
      await this.forkWorker(shardId);
    }

    this.logger.info('Scaled up', { count, totalWorkers: this.workers.size });
  }

  async scaleDown(count: number = 1): Promise<void> {
    const currentWorkers = this.workers.size;
    const minWorkers = this.config.cluster.minWorkers;

    if (currentWorkers - count < minWorkers) {
      count = currentWorkers - minWorkers;
    }

    const workersToStop = this.selectWorkersToStop(count);
    
    for (const workerId of workersToStop) {
      await this.stopWorker(workerId);
    }

    this.logger.info('Scaled down', { count, totalWorkers: this.workers.size });
  }

  private selectShardForNewWorker(): number {
    // Select shard with least workers
    let minWorkers = Infinity;
    let selectedShard = 0;

    this.shards.forEach((shard, shardId) => {
      if (shard.workers.length < minWorkers) {
        minWorkers = shard.workers.length;
        selectedShard = shardId;
      }
    });

    return selectedShard;
  }

  private selectWorkersToStop(count: number): number[] {
    // Select workers with least connections
    const workersByConnections = Array.from(this.workers.entries())
      .sort((a, b) => a[1].connections - b[1].connections)
      .slice(0, count)
      .map(([workerId]) => workerId);

    return workersByConnections;
  }

  private async stopWorker(workerId: number): Promise<void> {
    const worker = cluster.workers?.[workerId];
    if (!worker) return;

    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.state = 'stopping';
    }

    // Send graceful shutdown signal
    worker.send({ type: 'shutdown' });

    // Force kill after timeout
    setTimeout(() => {
      if (!worker.isDead()) {
        worker.kill();
      }
    }, this.config.cluster.gracefulShutdownTimeout);
  }

  // Connection routing based on sharding strategy
  getShardForConnection(connectionId: string): number {
    switch (this.config.sharding.strategy) {
      case 'consistent-hash':
        return this.consistentHashRing.getNode(connectionId);
      case 'modulo':
        const hash = createHash('md5').update(connectionId).digest();
        return hash.readUInt32BE(0) % this.config.sharding.shardCount;
      case 'range':
        return this.getRangeBasedShard(connectionId);
      default:
        return 0;
    }
  }

  private getRangeBasedShard(connectionId: string): number {
    const hash = createHash('md5').update(connectionId).digest('hex');
    
    for (const [shardId, shard] of this.shards) {
      if (hash >= shard.range.start && hash <= shard.range.end) {
        return shardId;
      }
    }

    return 0;
  }

  // Metrics and monitoring
  getMetrics(): any {
    const workerMetrics = Array.from(this.workers.values()).map(worker => ({
      id: worker.id,
      state: worker.state,
      connections: worker.connections,
      memory: worker.memory,
      cpu: worker.cpu,
      shard: worker.shard
    }));

    const shardMetrics = Array.from(this.shards.values()).map(shard => ({
      id: shard.id,
      workers: shard.workers.length,
      primary: shard.primary,
      replicas: shard.replicas.length,
      load: shard.load
    }));

    return {
      cluster: {
        workers: this.workers.size,
        totalConnections: workerMetrics.reduce((sum, w) => sum + w.connections, 0),
        avgMemory: workerMetrics.reduce((sum, w) => sum + w.memory, 0) / workerMetrics.length,
        avgCpu: workerMetrics.reduce((sum, w) => sum + w.cpu, 0) / workerMetrics.length
      },
      workers: workerMetrics,
      shards: shardMetrics,
      timestamp: Date.now()
    };
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down scaling manager');

    // Stop auto-scaler
    if (this.autoScaler) {
      this.autoScaler.stop();
    }

    // Stop metrics collector
    if (this.metricsCollector) {
      this.metricsCollector.stop();
    }

    // Gracefully shutdown all workers
    if (cluster.isPrimary) {
      const shutdownPromises = Array.from(this.workers.keys()).map(workerId => 
        this.stopWorker(workerId)
      );
      await Promise.all(shutdownPromises);
    }

    // Deregister from service discovery
    if (this.config.discovery.enabled && this.discoveryClient) {
      await this.discoveryClient.deregister();
    }

    this.isStarted = false;
  }
}

// Consistent Hash Ring implementation
class ConsistentHashRing {
  private ring: Map<string, number> = new Map();
  private sortedKeys: string[] = [];
  private virtualNodes: number;

  constructor(virtualNodes: number) {
    this.virtualNodes = virtualNodes;
  }

  addNode(nodeId: number): void {
    for (let i = 0; i < this.virtualNodes; i++) {
      const virtualKey = `${nodeId}-${i}`;
      const hash = createHash('md5').update(virtualKey).digest('hex');
      this.ring.set(hash, nodeId);
    }
    this.updateSortedKeys();
  }

  removeNode(nodeId: number): void {
    const keysToRemove: string[] = [];
    
    this.ring.forEach((value, key) => {
      if (value === nodeId) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => this.ring.delete(key));
    this.updateSortedKeys();
  }

  getNode(key: string): number {
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
    return this.ring.get(selectedKey) || 0;
  }

  private updateSortedKeys(): void {
    this.sortedKeys = Array.from(this.ring.keys()).sort();
  }
}

// Metrics Collector
class MetricsCollector {
  private manager: HorizontalScalingManager;
  private interval: NodeJS.Timeout | null = null;

  constructor(manager: HorizontalScalingManager) {
    this.manager = manager;
  }

  start(): void {
    this.interval = setInterval(() => {
      this.collectMetrics();
    }, 5000); // Collect every 5 seconds
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private collectMetrics(): void {
    if (cluster.isPrimary) {
      // Request metrics from all workers
      for (const worker of Object.values(cluster.workers || {})) {
        worker.send({ type: 'collect-metrics' });
      }
    } else {
      // Worker collects and sends its metrics
      const metrics = {
        type: 'metrics',
        memory: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        cpu: process.cpuUsage().user / 1000000, // Seconds
        connections: (global as any).connectionCount || 0
      };
      process.send?.(metrics);
    }
  }
}

// Auto Scaler
class AutoScaler {
  private manager: HorizontalScalingManager;
  private config: any;
  private interval: NodeJS.Timeout | null = null;
  private lastScaleAction: number = 0;

  constructor(manager: HorizontalScalingManager, config: any) {
    this.manager = manager;
    this.config = config;
  }

  start(): void {
    this.interval = setInterval(() => {
      this.checkScaling();
    }, 10000); // Check every 10 seconds
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async checkScaling(): Promise<void> {
    // Check cooldown period
    if (Date.now() - this.lastScaleAction < this.config.cooldownPeriod) {
      return;
    }

    const metrics = this.manager.getMetrics();
    const { cpu, memory, connections } = this.config.metrics;

    // Check if scaling is needed
    if (metrics.cluster.avgCpu > cpu.target * this.config.scaleUpThreshold ||
        metrics.cluster.avgMemory > memory.target * this.config.scaleUpThreshold ||
        metrics.cluster.totalConnections > connections.target * this.config.scaleUpThreshold) {
      
      await this.manager.scaleUp();
      this.lastScaleAction = Date.now();
      
    } else if (metrics.cluster.avgCpu < cpu.target * this.config.scaleDownThreshold &&
               metrics.cluster.avgMemory < memory.target * this.config.scaleDownThreshold &&
               metrics.cluster.totalConnections < connections.target * this.config.scaleDownThreshold) {
      
      await this.manager.scaleDown();
      this.lastScaleAction = Date.now();
    }
  }
}

export default HorizontalScalingManager;