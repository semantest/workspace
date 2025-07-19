import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { HorizontalScalingManager } from '../infrastructure/scaling/horizontal-scaling-manager';
import { ConnectionPoolManager } from '../infrastructure/scaling/connection-pool-manager';
import { ServiceDiscoveryManager } from '../infrastructure/scaling/service-discovery-manager';
import { LoadBalancer } from '../infrastructure/scaling/load-balancer';
import { DistributedStateManager } from '../infrastructure/scaling/distributed-state-manager';
import { KafkaRedisQueueManager } from '../infrastructure/message-queue/kafka-redis-queue-manager';
import { OptimizedWebSocketHandlers } from '../infrastructure/websocket/optimized-websocket-handlers';
import { EventStreamingService } from '../infrastructure/streaming/event-streaming-service';
import { RealTimeMonitoring } from '../infrastructure/monitoring/real-time-monitoring';
import * as cluster from 'cluster';
import * as os from 'os';

export interface ProductionConfig {
  environment: 'production' | 'staging' | 'development';
  deployment: {
    mode: 'cluster' | 'standalone' | 'container';
    workers: number | 'auto';
    gracefulShutdownTimeout: number;
    healthCheckPort: number;
    metricsPort: number;
  };
  scaling: {
    maxConnections: number;
    maxConnectionsPerWorker: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    autoScalingEnabled: boolean;
  };
  monitoring: {
    enabled: boolean;
    prometheusEnabled: boolean;
    grafanaEnabled: boolean;
    alertingEnabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  performance: {
    cpuTarget: number; // percentage
    memoryTarget: number; // percentage
    connectionTarget: number; // per worker
    latencyTarget: number; // milliseconds
  };
  reliability: {
    circuitBreakerEnabled: boolean;
    retryEnabled: boolean;
    backupEnabled: boolean;
    healthCheckInterval: number;
  };
}

interface ServiceStatus {
  name: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  pid?: number;
  port?: number;
  connections?: number;
  uptime?: number;
  lastHealthCheck?: number;
  metrics?: any;
}

export class ProductionOrchestrator extends EventEmitter {
  private config: ProductionConfig;
  private logger: Logger;
  private services: Map<string, ServiceStatus> = new Map();
  private components: {
    scalingManager?: HorizontalScalingManager;
    connectionPool?: ConnectionPoolManager;
    serviceDiscovery?: ServiceDiscoveryManager;
    loadBalancer?: LoadBalancer;
    stateManager?: DistributedStateManager;
    messageQueue?: KafkaRedisQueueManager;
    webSocketHandlers?: OptimizedWebSocketHandlers;
    streamingService?: EventStreamingService;
    monitoring?: RealTimeMonitoring;
  } = {};
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private isStarted: boolean = false;
  private shutdownInProgress: boolean = false;

  constructor(config: ProductionConfig, logger: Logger) {
    super();
    this.config = this.validateConfig(config);
    this.logger = logger;

    // Setup graceful shutdown handlers
    this.setupShutdownHandlers();
  }

  private validateConfig(config: ProductionConfig): ProductionConfig {
    if (!config.environment || !config.deployment || !config.scaling) {
      throw new Error('Invalid production configuration');
    }

    // Auto-detect workers
    if (config.deployment.workers === 'auto') {
      config.deployment.workers = Math.min(os.cpus().length, 8);
    }

    return config;
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('Production orchestrator already started');
    }

    this.logger.info('🚀 Starting production real-time platform', {
      environment: this.config.environment,
      workers: this.config.deployment.workers,
      maxConnections: this.config.scaling.maxConnections
    });

    if (this.config.deployment.mode === 'cluster' && cluster.isPrimary) {
      await this.startAsPrimary();
    } else {
      await this.startAsWorker();
    }

    this.isStarted = true;
    this.logger.info('✅ Production platform started successfully');
  }

  private async startAsPrimary(): Promise<void> {
    this.logger.info('🎯 Starting as primary process', { pid: process.pid });

    // Initialize infrastructure components
    await this.initializeInfrastructure();

    // Start monitoring and health checks
    await this.startMonitoring();

    // Fork worker processes
    await this.forkWorkers();

    // Start primary-specific services
    await this.startPrimaryServices();

    this.logger.info('🎯 Primary process ready', { 
      workers: this.services.size,
      pid: process.pid 
    });
  }

  private async startAsWorker(): Promise<void> {
    const workerId = cluster.worker?.id || 1;
    this.logger.info('👷 Starting as worker process', { 
      workerId, 
      pid: process.pid 
    });

    // Initialize worker components
    await this.initializeWorkerComponents();

    // Start worker services
    await this.startWorkerServices();

    // Register with primary
    process.send?.({
      type: 'worker-ready',
      workerId,
      pid: process.pid,
      port: process.env.WORKER_PORT
    });

    this.logger.info('👷 Worker process ready', { workerId, pid: process.pid });
  }

  private async initializeInfrastructure(): Promise<void> {
    this.logger.info('🏗️ Initializing infrastructure components');

    // Service Discovery (must be first)
    this.components.serviceDiscovery = new ServiceDiscoveryManager({
      service: 'redis',
      endpoints: [process.env.REDIS_URL || 'redis://localhost:6379'],
      namespace: 'realtime-platform',
      serviceName: 'realtime-service',
      serviceVersion: '1.0.0',
      discovery: {
        ttl: 30,
        heartbeatInterval: 10,
        deregisterCriticalAfter: 60,
        enableHealthCheck: true,
        healthCheckInterval: 15,
        healthCheckTimeout: 5
      },
      metadata: {
        environment: this.config.environment,
        datacenter: process.env.DATACENTER || 'default',
        region: process.env.REGION || 'default'
      },
      watch: {
        enabled: true,
        services: ['realtime-service', 'kafka-service', 'redis-service'],
        pollInterval: 5000,
        changeDebounce: 1000
      },
      cache: {
        enabled: true,
        ttl: 300,
        maxSize: 1000
      }
    }, this.logger);

    await this.components.serviceDiscovery.start();

    // Horizontal Scaling Manager
    this.components.scalingManager = new HorizontalScalingManager({
      cluster: {
        workers: this.config.deployment.workers as number,
        minWorkers: 2,
        maxWorkers: 32,
        workerMemoryLimit: 2048, // 2GB per worker
        workerRestartDelay: 5000,
        gracefulShutdownTimeout: this.config.deployment.gracefulShutdownTimeout
      },
      discovery: {
        enabled: true,
        service: 'redis',
        endpoints: [process.env.REDIS_URL || 'redis://localhost:6379'],
        serviceName: 'realtime-worker',
        ttl: 30,
        healthCheckInterval: 15
      },
      sharding: {
        strategy: 'consistent-hash',
        shardCount: this.config.deployment.workers as number,
        replicationFactor: 2,
        virtualNodes: 150
      },
      loadBalancing: {
        algorithm: 'least-connections',
        stickySession: true,
        sessionTimeout: 3600,
        healthCheckPath: '/health'
      },
      performance: {
        maxConnectionsPerWorker: this.config.scaling.maxConnectionsPerWorker,
        connectionPoolSize: 100,
        bufferPoolSize: 1000,
        gcInterval: 60000,
        tcpNoDelay: true,
        keepAlive: true,
        keepAliveInitialDelay: 0
      },
      autoScaling: {
        enabled: this.config.scaling.autoScalingEnabled,
        metrics: {
          cpu: { min: 10, max: 80, target: this.config.performance.cpuTarget },
          memory: { min: 10, max: 85, target: this.config.performance.memoryTarget },
          connections: { min: 100, max: this.config.scaling.maxConnectionsPerWorker, target: this.config.performance.connectionTarget }
        },
        scaleUpThreshold: this.config.scaling.scaleUpThreshold,
        scaleDownThreshold: this.config.scaling.scaleDownThreshold,
        cooldownPeriod: 300000 // 5 minutes
      }
    }, this.logger);

    await this.components.scalingManager.start();

    // Distributed State Manager
    this.components.stateManager = new DistributedStateManager({
      backend: 'redis-cluster',
      clusters: {
        nodes: process.env.REDIS_CLUSTER_NODES?.split(',') || ['localhost:7001', 'localhost:7002', 'localhost:7003'],
        replication: 2,
        shards: 8,
        password: process.env.REDIS_PASSWORD
      },
      caching: {
        localCacheEnabled: true,
        localCacheSize: 512, // 512MB
        localCacheTTL: 300,
        compressionEnabled: true,
        compressionThreshold: 1024
      },
      consistency: {
        model: 'eventual',
        readQuorum: 1,
        writeQuorum: 1,
        syncReplication: false
      },
      partitioning: {
        strategy: 'consistent-hash',
        virtualNodes: 150,
        rebalanceEnabled: true,
        rebalanceThreshold: 20
      },
      performance: {
        batchSize: 1000,
        pipelineLimit: 100,
        connectionPoolSize: 50,
        maxRetries: 3,
        retryDelay: 1000,
        operationTimeout: 5000
      },
      monitoring: {
        metricsEnabled: true,
        metricsInterval: 10000,
        slowQueryThreshold: 1000,
        memoryAlertThreshold: 85
      }
    }, this.logger);

    await this.components.stateManager.start();

    // Load Balancer
    this.components.loadBalancer = new LoadBalancer({
      mode: 'websocket',
      algorithm: 'consistent-hash',
      listen: {
        host: '0.0.0.0',
        port: parseInt(process.env.LB_PORT || '8080'),
        backlog: 1024
      },
      upstream: {
        serviceName: 'realtime-worker',
        healthCheck: {
          enabled: true,
          interval: 10000,
          timeout: 5000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
          path: '/health'
        },
        connectionTimeout: 10000,
        requestTimeout: 30000,
        maxConnections: 10000,
        maxRequestsPerConnection: 1000
      },
      stickySessions: {
        enabled: true,
        type: 'ip',
        ttl: 3600,
        maxSessions: 100000
      },
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
        halfOpenRequests: 3
      },
      rateLimiting: {
        enabled: true,
        windowMs: 60000,
        maxRequests: 1000,
        keyGenerator: 'ip'
      },
      performance: {
        maxHeaderSize: 16384,
        keepAliveTimeout: 65000,
        headersTimeout: 60000,
        requestBufferSize: 65536,
        responseBufferSize: 65536
      }
    }, this.components.serviceDiscovery, this.logger);

    await this.components.loadBalancer.start();

    this.logger.info('🏗️ Infrastructure components initialized');
  }

  private async initializeWorkerComponents(): Promise<void> {
    const workerId = cluster.worker?.id || 1;
    const workerPort = 8080 + workerId;

    this.logger.info('🔧 Initializing worker components', { workerId, port: workerPort });

    // Message Queue
    this.components.messageQueue = new KafkaRedisQueueManager({
      kafka: {
        clientId: `realtime-worker-${workerId}`,
        brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
        producer: {
          maxInFlightRequests: 5,
          idempotent: true,
          compression: 'lz4',
          retry: { retries: 3 },
          acks: 1
        },
        consumer: {
          groupId: `realtime-consumer-${workerId}`,
          sessionTimeout: 30000,
          heartbeatInterval: 3000,
          maxBytesPerPartition: 1048576
        }
      },
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        keyPrefix: `worker-${workerId}:mq:`,
        ttl: 3600
      },
      deduplication: {
        enabled: true,
        strategy: 'combined',
        window: 300000
      },
      deadLetterQueue: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2
      },
      performance: {
        batchSize: 500,
        flushInterval: 100,
        compressionThreshold: 512
      }
    }, this.logger);

    await this.components.messageQueue.start();

    // Connection Pool
    this.components.connectionPool = new ConnectionPoolManager({
      pools: {
        initialSize: 50,
        minSize: 20,
        maxSize: 200,
        maxIdleTime: 300000,
        acquireTimeout: 10000,
        createTimeout: 5000,
        destroyTimeout: 5000,
        validationInterval: 30000,
        maxWaitingClients: 100
      },
      sharding: {
        enabled: true,
        shardKey: 'user-id',
        shardCount: 8,
        rebalanceInterval: 300000
      },
      optimization: {
        preallocateBuffers: true,
        bufferSize: 65536,
        bufferPoolSize: 1000,
        socketNoDelay: true,
        socketKeepAlive: true,
        socketKeepAliveDelay: 0,
        reuseAddress: true
      },
      monitoring: {
        metricsInterval: 10000,
        slowQueryThreshold: 1000,
        connectionLeakDetection: true,
        leakDetectionInterval: 60000
      }
    }, this.logger);

    await this.components.connectionPool.initialize();

    // WebSocket Handlers
    this.components.webSocketHandlers = new OptimizedWebSocketHandlers({
      port: workerPort,
      host: '0.0.0.0',
      compression: {
        enabled: true,
        threshold: 1024,
        algorithm: 'gzip'
      },
      rateLimit: {
        enabled: true,
        maxRequests: 1000,
        windowMs: 60000
      },
      authentication: {
        enabled: false, // Handled by load balancer
        tokenHeader: 'Authorization',
        tokenValidation: 'jwt'
      },
      heartbeat: {
        enabled: true,
        interval: 30000,
        timeout: 5000
      },
      batching: {
        enabled: true,
        maxBatchSize: 100,
        flushInterval: 1000
      },
      security: {
        maxMessageSize: 1048576,
        allowedOrigins: ['*'],
        enableCors: true
      }
    }, this.components.messageQueue, this.logger);

    await this.components.webSocketHandlers.start();

    // Event Streaming Service
    this.components.streamingService = new EventStreamingService({
      routing: {
        strategy: 'content_based',
        rules: [
          {
            condition: { type: 'chat_message' },
            target: 'chat_stream',
            priority: 'high'
          },
          {
            condition: { type: 'notification' },
            target: 'notification_stream',
            priority: 'medium'
          },
          {
            condition: { type: 'system_event' },
            target: 'system_stream',
            priority: 'critical'
          }
        ],
        defaultTarget: 'default_stream'
      },
      filtering: {
        enabled: true,
        rules: [
          {
            field: 'payload.spam',
            operator: 'equals',
            value: true,
            action: 'drop'
          },
          {
            field: 'payload.sensitive',
            operator: 'equals',
            value: true,
            action: 'encrypt'
          }
        ]
      },
      transformation: {
        enabled: true,
        rules: [
          {
            field: 'timestamp',
            operation: 'add_current_time'
          },
          {
            field: 'payload.processed_by',
            operation: 'add_worker_id'
          }
        ]
      },
      aggregation: {
        enabled: true,
        windows: [
          {
            type: 'time',
            duration: 60000,
            operations: ['count', 'avg']
          }
        ]
      },
      persistence: {
        enabled: true,
        storageType: 'redis',
        ttl: 86400,
        batchSize: 1000
      },
      performance: {
        maxConcurrentStreams: 1000,
        bufferSize: 50000,
        flushInterval: 1000
      }
    }, this.components.messageQueue, this.components.webSocketHandlers, this.logger);

    await this.components.streamingService.start();

    this.logger.info('🔧 Worker components initialized', { workerId });
  }

  private async startMonitoring(): Promise<void> {
    if (!this.config.monitoring.enabled) return;

    this.logger.info('📊 Starting production monitoring');

    this.components.monitoring = new RealTimeMonitoring({
      metrics: {
        enabled: true,
        collectInterval: 5000,
        retentionPeriod: 3600000,
        categories: ['system', 'application', 'business']
      },
      alerts: {
        enabled: this.config.monitoring.alertingEnabled,
        thresholds: {
          errorRate: 0.05,
          responseTime: this.config.performance.latencyTarget,
          memoryUsage: this.config.performance.memoryTarget / 100,
          cpuUsage: this.config.performance.cpuTarget / 100,
          queueDepth: 10000
        },
        channels: ['log', 'webhook']
      },
      health: {
        enabled: true,
        checkInterval: 10000,
        endpoints: [
          { name: 'redis', url: process.env.REDIS_URL || 'redis://localhost:6379' },
          { name: 'kafka', url: process.env.KAFKA_BROKERS?.split(',')[0] || 'localhost:9092' }
        ]
      },
      dashboard: {
        enabled: this.config.monitoring.grafanaEnabled,
        refreshInterval: 1000,
        charts: ['throughput', 'latency', 'errors', 'resources', 'connections']
      },
      notifications: {
        webhook: {
          url: process.env.ALERT_WEBHOOK_URL || 'http://localhost:3000/alerts',
          timeout: 5000
        }
      }
    }, this.logger);

    await this.components.monitoring.start();

    // Connect monitoring to all components
    this.components.monitoring.connectServices({
      messageQueue: this.components.messageQueue,
      webSocketHandlers: this.components.webSocketHandlers,
      streamingService: this.components.streamingService
    });

    // Start health checks
    this.startHealthChecks();

    // Start metrics collection
    this.startMetricsCollection();

    this.logger.info('📊 Production monitoring started');
  }

  private async forkWorkers(): Promise<void> {
    const workerCount = this.config.deployment.workers as number;

    this.logger.info('👥 Forking worker processes', { count: workerCount });

    for (let i = 1; i <= workerCount; i++) {
      await this.forkWorker(i);
    }

    // Handle worker events
    cluster.on('exit', this.handleWorkerExit.bind(this));
    cluster.on('message', this.handleWorkerMessage.bind(this));

    this.logger.info('👥 All workers forked', { count: this.services.size });
  }

  private async forkWorker(workerId: number): Promise<void> {
    const env = {
      ...process.env,
      WORKER_ID: workerId.toString(),
      WORKER_PORT: (8080 + workerId).toString(),
      WORKER_SHARD: workerId.toString()
    };

    const worker = cluster.fork(env);
    
    const serviceStatus: ServiceStatus = {
      name: `worker-${workerId}`,
      status: 'starting',
      pid: worker.process.pid,
      port: 8080 + workerId,
      connections: 0,
      uptime: Date.now()
    };

    this.services.set(`worker-${workerId}`, serviceStatus);

    this.logger.info('👷 Worker forked', { 
      workerId, 
      pid: worker.process.pid,
      port: serviceStatus.port 
    });
  }

  private async startPrimaryServices(): Promise<void> {
    // Register primary services
    const primaryService = await this.components.serviceDiscovery!.registerService(
      this.config.deployment.healthCheckPort,
      {
        role: 'primary',
        environment: this.config.environment,
        capabilities: ['load-balancing', 'service-discovery', 'monitoring'],
        maxConnections: this.config.scaling.maxConnections
      }
    );

    this.services.set('primary', {
      name: 'primary',
      status: 'running',
      pid: process.pid,
      port: this.config.deployment.healthCheckPort,
      uptime: Date.now()
    });

    this.logger.info('🎯 Primary services started', { 
      serviceId: primaryService.id 
    });
  }

  private async startWorkerServices(): Promise<void> {
    const workerId = cluster.worker?.id || 1;
    const workerPort = 8080 + workerId;

    // Register worker service
    const workerService = await this.components.serviceDiscovery!.registerService(
      workerPort,
      {
        role: 'worker',
        workerId,
        environment: this.config.environment,
        capabilities: ['websocket', 'streaming', 'messaging'],
        maxConnections: this.config.scaling.maxConnectionsPerWorker
      }
    );

    this.services.set(`worker-${workerId}`, {
      name: `worker-${workerId}`,
      status: 'running',
      pid: process.pid,
      port: workerPort,
      connections: 0,
      uptime: Date.now()
    });

    this.logger.info('👷 Worker services started', { 
      workerId,
      serviceId: workerService.id 
    });
  }

  private handleWorkerExit(worker: cluster.Worker, code: number, signal: string): void {
    const workerId = worker.id;
    
    this.logger.warn('👷 Worker exited', { 
      workerId, 
      code, 
      signal,
      pid: worker.process.pid 
    });

    // Update service status
    const serviceKey = `worker-${workerId}`;
    const service = this.services.get(serviceKey);
    if (service) {
      service.status = 'stopped';
    }

    // Restart worker if not intentional shutdown
    if (!this.shutdownInProgress && code !== 0) {
      this.logger.info('🔄 Restarting worker', { workerId });
      
      setTimeout(() => {
        this.forkWorker(workerId);
      }, 5000); // 5 second delay
    }
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
      case 'health-check':
        this.handleWorkerHealthCheck(workerId, message);
        break;
      case 'connection-count':
        this.handleWorkerConnectionCount(workerId, message);
        break;
      default:
        this.logger.debug('Unknown worker message', { workerId, message });
    }
  }

  private handleWorkerReady(workerId: number, message: any): void {
    const serviceKey = `worker-${workerId}`;
    const service = this.services.get(serviceKey);
    
    if (service) {
      service.status = 'running';
      service.pid = message.pid;
    }

    this.logger.info('✅ Worker ready', { 
      workerId, 
      pid: message.pid,
      port: message.port 
    });

    this.emit('worker-ready', { workerId, pid: message.pid });
  }

  private handleWorkerMetrics(workerId: number, message: any): void {
    const serviceKey = `worker-${workerId}`;
    const service = this.services.get(serviceKey);
    
    if (service) {
      service.metrics = message.metrics;
      service.lastHealthCheck = Date.now();
    }

    // Emit aggregated metrics
    this.emit('metrics', {
      workerId,
      metrics: message.metrics,
      timestamp: Date.now()
    });
  }

  private handleWorkerHealthCheck(workerId: number, message: any): void {
    const serviceKey = `worker-${workerId}`;
    const service = this.services.get(serviceKey);
    
    if (service) {
      service.lastHealthCheck = Date.now();
      
      if (message.status === 'unhealthy') {
        this.logger.warn('⚠️ Worker unhealthy', { 
          workerId, 
          reason: message.reason 
        });
        
        // Trigger recovery actions if needed
        this.handleUnhealthyWorker(workerId, message.reason);
      }
    }
  }

  private handleWorkerConnectionCount(workerId: number, message: any): void {
    const serviceKey = `worker-${workerId}`;
    const service = this.services.get(serviceKey);
    
    if (service) {
      service.connections = message.count;
    }

    // Check if scaling is needed
    this.checkAutoScaling();
  }

  private handleUnhealthyWorker(workerId: number, reason: string): void {
    // Implement recovery strategies
    switch (reason) {
      case 'high-memory':
        this.logger.info('🔄 Restarting worker due to high memory', { workerId });
        this.restartWorker(workerId);
        break;
      case 'high-cpu':
        this.logger.warn('⚠️ Worker CPU usage high', { workerId });
        // Could implement CPU throttling or load redistribution
        break;
      case 'connection-leak':
        this.logger.warn('🔌 Connection leak detected', { workerId });
        // Could implement connection cleanup
        break;
      default:
        this.logger.warn('⚠️ Unknown health issue', { workerId, reason });
    }
  }

  private async restartWorker(workerId: number): Promise<void> {
    const worker = Object.values(cluster.workers || {}).find(w => w?.id === workerId);
    
    if (worker) {
      // Graceful shutdown
      worker.send({ type: 'shutdown' });
      
      // Force kill after timeout
      setTimeout(() => {
        if (!worker.isDead()) {
          worker.kill('SIGKILL');
        }
      }, this.config.deployment.gracefulShutdownTimeout);
    }
  }

  private checkAutoScaling(): void {
    if (!this.config.scaling.autoScalingEnabled || !this.components.scalingManager) {
      return;
    }

    // Get aggregate metrics
    const totalConnections = Array.from(this.services.values())
      .reduce((sum, service) => sum + (service.connections || 0), 0);

    const avgConnectionsPerWorker = totalConnections / this.services.size;
    const targetConnections = this.config.performance.connectionTarget;

    // Scale up if needed
    if (avgConnectionsPerWorker > targetConnections * this.config.scaling.scaleUpThreshold) {
      this.logger.info('📈 Scaling up due to high connection load', {
        avgConnections: avgConnectionsPerWorker,
        target: targetConnections
      });
      
      this.components.scalingManager.scaleUp().catch(error => {
        this.logger.error('Failed to scale up', { error });
      });
    }

    // Scale down if needed
    if (avgConnectionsPerWorker < targetConnections * this.config.scaling.scaleDownThreshold &&
        this.services.size > 2) { // Minimum 2 workers
      
      this.logger.info('📉 Scaling down due to low connection load', {
        avgConnections: avgConnectionsPerWorker,
        target: targetConnections
      });
      
      this.components.scalingManager.scaleDown().catch(error => {
        this.logger.error('Failed to scale down', { error });
      });
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.reliability.healthCheckInterval);
  }

  private async performHealthChecks(): Promise<void> {
    // Check all services
    for (const [serviceKey, service] of this.services) {
      const timeSinceLastCheck = Date.now() - (service.lastHealthCheck || 0);
      
      if (timeSinceLastCheck > this.config.reliability.healthCheckInterval * 2) {
        this.logger.warn('⚠️ Service health check overdue', {
          service: serviceKey,
          lastCheck: service.lastHealthCheck,
          overdue: timeSinceLastCheck
        });
        
        service.status = 'error';
      }
    }

    // Emit health status
    this.emit('health-check', {
      services: Array.from(this.services.values()),
      timestamp: Date.now()
    });
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectAggregateMetrics();
    }, 10000); // Every 10 seconds
  }

  private collectAggregateMetrics(): void {
    const services = Array.from(this.services.values());
    
    const aggregateMetrics = {
      cluster: {
        totalServices: services.length,
        runningServices: services.filter(s => s.status === 'running').length,
        totalConnections: services.reduce((sum, s) => sum + (s.connections || 0), 0),
        avgUptime: services.reduce((sum, s) => {
          const uptime = s.uptime ? Date.now() - s.uptime : 0;
          return sum + uptime;
        }, 0) / services.length
      },
      performance: {
        cpuUsage: process.cpuUsage(),
        memoryUsage: process.memoryUsage(),
        loadAverage: os.loadavg()
      },
      platform: {
        environment: this.config.environment,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      timestamp: Date.now()
    };

    this.emit('aggregate-metrics', aggregateMetrics);
  }

  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      if (this.shutdownInProgress) return;
      
      this.shutdownInProgress = true;
      this.logger.info(`🛑 Received ${signal}, starting graceful shutdown`);
      
      try {
        await this.shutdown();
        process.exit(0);
      } catch (error) {
        this.logger.error('❌ Shutdown error', { error });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // PM2 reload
  }

  async shutdown(): Promise<void> {
    this.logger.info('🛑 Starting production platform shutdown');

    // Stop health checks and metrics
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.metricsInterval) clearInterval(this.metricsInterval);

    if (cluster.isPrimary) {
      // Shutdown workers first
      const workerShutdowns = Object.values(cluster.workers || {}).map(worker => {
        if (worker) {
          return new Promise<void>((resolve) => {
            worker.send({ type: 'shutdown' });
            worker.once('exit', () => resolve());
            
            // Force kill after timeout
            setTimeout(() => {
              if (!worker.isDead()) {
                worker.kill('SIGKILL');
                resolve();
              }
            }, this.config.deployment.gracefulShutdownTimeout);
          });
        }
        return Promise.resolve();
      });

      await Promise.all(workerShutdowns);

      // Shutdown infrastructure components
      if (this.components.loadBalancer) {
        await this.components.loadBalancer.shutdown();
      }
      
      if (this.components.scalingManager) {
        await this.components.scalingManager.shutdown();
      }
      
      if (this.components.stateManager) {
        await this.components.stateManager.shutdown();
      }
      
      if (this.components.serviceDiscovery) {
        await this.components.serviceDiscovery.shutdown();
      }
      
      if (this.components.monitoring) {
        await this.components.monitoring.shutdown();
      }
    } else {
      // Worker shutdown
      if (this.components.streamingService) {
        await this.components.streamingService.shutdown();
      }
      
      if (this.components.webSocketHandlers) {
        await this.components.webSocketHandlers.shutdown();
      }
      
      if (this.components.messageQueue) {
        await this.components.messageQueue.shutdown();
      }
      
      if (this.components.connectionPool) {
        await this.components.connectionPool.shutdown();
      }
    }

    this.isStarted = false;
    this.logger.info('✅ Production platform shutdown complete');
  }

  // Public API
  getStatus(): any {
    return {
      orchestrator: {
        started: this.isStarted,
        environment: this.config.environment,
        deployment: this.config.deployment,
        shutdownInProgress: this.shutdownInProgress
      },
      services: Array.from(this.services.values()),
      cluster: {
        isPrimary: cluster.isPrimary,
        workerId: cluster.worker?.id,
        pid: process.pid
      },
      performance: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      timestamp: Date.now()
    };
  }

  getMetrics(): any {
    const services = Array.from(this.services.values());
    
    return {
      cluster: {
        totalServices: services.length,
        runningServices: services.filter(s => s.status === 'running').length,
        totalConnections: services.reduce((sum, s) => sum + (s.connections || 0), 0)
      },
      components: {
        scalingManager: this.components.scalingManager?.getMetrics(),
        connectionPool: this.components.connectionPool?.getPoolStats(),
        loadBalancer: this.components.loadBalancer?.getMetrics(),
        stateManager: this.components.stateManager?.getMetrics(),
        messageQueue: this.components.messageQueue?.getMetrics(),
        webSocketHandlers: this.components.webSocketHandlers?.getMetrics(),
        streamingService: this.components.streamingService?.getMetrics(),
        monitoring: this.components.monitoring?.getMetrics()
      },
      timestamp: Date.now()
    };
  }
}

export default ProductionOrchestrator;