/*
                     @semantest/realtime-streaming

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
 * @fileoverview High-Performance WebSocket Message Broker with Redis Clustering
 * @author Semantest Team
 * @module infrastructure/broker/HighPerformanceMessageBroker
 */

import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { Cluster } from 'ioredis';
import { Logger } from '@shared/infrastructure/logger';
import * as msgpack from 'msgpack-lite';
import * as lz4 from 'lz4js';

export interface BrokerConfig {
  clustering: ClusterConfig;
  performance: PerformanceConfig;
  scaling: ScalingConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
}

export interface ClusterConfig {
  redis: {
    nodes: Array<{ host: string; port: number }>;
    options: {
      enableReadyCheck: boolean;
      redisOptions: {
        password?: string;
        connectTimeout: number;
        commandTimeout: number;
        retryDelayOnFailover: number;
        maxRetriesPerRequest: number;
      };
    };
  };
  sharding: {
    enabled: boolean;
    shardCount: number;
    hashFunction: 'crc32' | 'sha1' | 'md5';
  };
  replication: {
    enabled: boolean;
    replicationFactor: number;
  };
}

export interface PerformanceConfig {
  messageCompression: {
    enabled: boolean;
    algorithm: 'lz4' | 'gzip' | 'snappy';
    threshold: number;
  };
  batching: {
    enabled: boolean;
    maxBatchSize: number;
    batchTimeout: number;
    adaptiveBatching: boolean;
  };
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    strategy: 'lru' | 'lfu' | 'fifo';
  };
  connection: {
    maxConnections: number;
    connectionPoolSize: number;
    keepAlive: boolean;
    tcpNoDelay: boolean;
  };
}

export interface ScalingConfig {
  autoScaling: {
    enabled: boolean;
    minInstances: number;
    maxInstances: number;
    targetCPU: number;
    targetMemory: number;
    targetConnections: number;
    scaleUpCooldown: number;
    scaleDownCooldown: number;
  };
  loadBalancing: {
    algorithm: 'round_robin' | 'least_connections' | 'weighted' | 'consistent_hash';
    healthCheckInterval: number;
    unhealthyThreshold: number;
  };
}

export interface MonitoringConfig {
  metrics: {
    enabled: boolean;
    interval: number;
    retention: number;
  };
  alerting: {
    enabled: boolean;
    thresholds: {
      latency: number;
      errorRate: number;
      memoryUsage: number;
      connectionCount: number;
    };
  };
}

export interface SecurityConfig {
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  authentication: {
    enabled: boolean;
    tokenValidation: boolean;
    refreshInterval: number;
  };
}

export interface BrokerNode {
  id: string;
  host: string;
  port: number;
  weight: number;
  connections: number;
  lastSeen: Date;
  healthy: boolean;
  metrics: NodeMetrics;
}

export interface NodeMetrics {
  cpuUsage: number;
  memoryUsage: number;
  connectionCount: number;
  messagesPerSecond: number;
  latency: number;
  errorRate: number;
}

export interface Message {
  id: string;
  type: string;
  channel: string;
  payload: any;
  metadata: MessageMetadata;
  timestamp: number;
  ttl?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface MessageMetadata {
  senderId?: string;
  correlationId?: string;
  replyTo?: string;
  compressed: boolean;
  size: number;
  retryCount: number;
  maxRetries: number;
}

export interface BrokerStats {
  nodes: number;
  totalConnections: number;
  messagesPerSecond: number;
  averageLatency: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  throughput: number;
  uptime: number;
}

/**
 * High-performance WebSocket message broker with Redis clustering
 */
export class HighPerformanceMessageBroker extends EventEmitter {
  private cluster: Cluster;
  private nodes: Map<string, BrokerNode> = new Map();
  private connections: Map<string, WebSocket> = new Map();
  private channels: Map<string, Set<string>> = new Map();
  private messageBuffer: Map<string, Message[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private performanceCache: Map<string, any> = new Map();
  private metrics: BrokerMetrics = new BrokerMetrics();
  private scalingController: AutoScalingController;
  private loadBalancer: LoadBalancer;

  constructor(
    private readonly config: BrokerConfig,
    private readonly logger: Logger
  ) {
    super();
    this.initializeCluster();
    this.initializeComponents();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize Redis cluster
   */
  private initializeCluster(): void {
    this.cluster = new Cluster(
      this.config.clustering.redis.nodes,
      this.config.clustering.redis.options
    );

    this.cluster.on('ready', () => {
      this.logger.info('Redis cluster connected');
      this.emit('cluster_ready');
    });

    this.cluster.on('error', (error) => {
      this.logger.error('Redis cluster error', { error: error.message });
      this.emit('cluster_error', error);
    });

    this.cluster.on('node error', (error, node) => {
      this.logger.error('Redis node error', { error: error.message, node });
      this.handleNodeError(node, error);
    });
  }

  /**
   * Initialize broker components
   */
  private initializeComponents(): void {
    this.scalingController = new AutoScalingController(
      this.config.scaling,
      this.metrics,
      this.logger
    );

    this.loadBalancer = new LoadBalancer(
      this.config.scaling.loadBalancing,
      this.logger
    );

    this.scalingController.on('scale_up', (data) => {
      this.handleScaleUp(data);
    });

    this.scalingController.on('scale_down', (data) => {
      this.handleScaleDown(data);
    });
  }

  /**
   * Start broker instance
   */
  async start(): Promise<void> {
    try {
      // Register this node
      await this.registerNode();

      // Start message processing
      await this.startMessageProcessing();

      // Start load balancing
      this.loadBalancer.start(this.nodes);

      // Start auto-scaling
      if (this.config.scaling.autoScaling.enabled) {
        this.scalingController.start();
      }

      this.logger.info('High-performance message broker started');
      this.emit('broker_started');

    } catch (error) {
      this.logger.error('Failed to start message broker', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop broker instance
   */
  async stop(): Promise<void> {
    try {
      // Graceful shutdown
      await this.drainConnections();

      // Stop components
      this.scalingController.stop();
      this.loadBalancer.stop();

      // Unregister node
      await this.unregisterNode();

      // Close cluster connection
      this.cluster.disconnect();

      this.logger.info('Message broker stopped');
      this.emit('broker_stopped');

    } catch (error) {
      this.logger.error('Error stopping message broker', { error: error.message });
      throw error;
    }
  }

  /**
   * Publish message with high performance optimizations
   */
  async publish(message: Omit<Message, 'id' | 'timestamp'>): Promise<string> {
    const startTime = Date.now();
    
    try {
      // Generate message ID
      const messageId = this.generateMessageId();
      
      // Create complete message
      const completeMessage: Message = {
        ...message,
        id: messageId,
        timestamp: Date.now()
      };

      // Apply compression if enabled
      if (this.config.performance.messageCompression.enabled) {
        completeMessage.payload = await this.compressPayload(
          completeMessage.payload,
          completeMessage.metadata.size
        );
        completeMessage.metadata.compressed = true;
      }

      // Route message through load balancer
      const targetNode = this.loadBalancer.selectNode(
        completeMessage.channel,
        this.nodes
      );

      // Handle batching if enabled
      if (this.config.performance.batching.enabled) {
        await this.batchMessage(completeMessage, targetNode);
      } else {
        await this.directPublish(completeMessage, targetNode);
      }

      // Update metrics
      const duration = Date.now() - startTime;
      this.metrics.recordPublish(duration, completeMessage.metadata.size);

      return messageId;

    } catch (error) {
      this.metrics.recordError('publish_error');
      this.logger.error('Failed to publish message', { error: error.message });
      throw error;
    }
  }

  /**
   * Subscribe to channel with load balancing
   */
  async subscribe(
    connectionId: string,
    channel: string,
    options?: {
      filters?: Record<string, any>;
      priority?: 'low' | 'medium' | 'high';
      qos?: number;
    }
  ): Promise<void> {
    try {
      // Add to local channels
      if (!this.channels.has(channel)) {
        this.channels.set(channel, new Set());
      }
      this.channels.get(channel)!.add(connectionId);

      // Distribute subscription across cluster
      const shardKey = this.getShardKey(channel);
      await this.cluster.sadd(`channel:${shardKey}:subscribers`, connectionId);

      // Setup Redis subscription
      await this.cluster.subscribe(`channel:${shardKey}`);

      this.logger.debug('Client subscribed to channel', { connectionId, channel });
      this.metrics.recordSubscription();

    } catch (error) {
      this.logger.error('Failed to subscribe to channel', { 
        connectionId, 
        channel, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(connectionId: string, channel: string): Promise<void> {
    try {
      // Remove from local channels
      const subscribers = this.channels.get(channel);
      if (subscribers) {
        subscribers.delete(connectionId);
        if (subscribers.size === 0) {
          this.channels.delete(channel);
        }
      }

      // Remove from cluster
      const shardKey = this.getShardKey(channel);
      await this.cluster.srem(`channel:${shardKey}:subscribers`, connectionId);

      this.logger.debug('Client unsubscribed from channel', { connectionId, channel });
      this.metrics.recordUnsubscription();

    } catch (error) {
      this.logger.error('Failed to unsubscribe from channel', { 
        connectionId, 
        channel, 
        error: error.message 
      });
    }
  }

  /**
   * Add WebSocket connection
   */
  addConnection(connectionId: string, ws: WebSocket): void {
    this.connections.set(connectionId, ws);
    
    ws.on('close', () => {
      this.removeConnection(connectionId);
    });

    ws.on('error', (error) => {
      this.logger.warn('WebSocket connection error', { connectionId, error: error.message });
      this.removeConnection(connectionId);
    });

    this.metrics.recordConnection();
    this.logger.debug('WebSocket connection added', { connectionId });
  }

  /**
   * Remove WebSocket connection
   */
  removeConnection(connectionId: string): void {
    this.connections.delete(connectionId);
    
    // Clean up subscriptions
    for (const [channel, subscribers] of this.channels) {
      if (subscribers.has(connectionId)) {
        this.unsubscribe(connectionId, channel);
      }
    }

    this.metrics.recordDisconnection();
    this.logger.debug('WebSocket connection removed', { connectionId });
  }

  /**
   * Get broker statistics
   */
  getStats(): BrokerStats {
    const nodeStats = Array.from(this.nodes.values());
    
    return {
      nodes: this.nodes.size,
      totalConnections: this.connections.size,
      messagesPerSecond: this.metrics.getMessagesPerSecond(),
      averageLatency: this.metrics.getAverageLatency(),
      errorRate: this.metrics.getErrorRate(),
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: this.metrics.getCpuUsage(),
      throughput: this.metrics.getThroughput(),
      uptime: this.metrics.getUptime()
    };
  }

  /**
   * Performance benchmark
   */
  async runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResults> {
    const benchmark = new PerformanceBenchmark(this, this.logger);
    return await benchmark.run(config);
  }

  /**
   * Private helper methods
   */
  private async registerNode(): Promise<void> {
    const nodeId = this.generateNodeId();
    const node: BrokerNode = {
      id: nodeId,
      host: process.env.HOST || 'localhost',
      port: parseInt(process.env.PORT || '3000'),
      weight: 1,
      connections: 0,
      lastSeen: new Date(),
      healthy: true,
      metrics: {
        cpuUsage: 0,
        memoryUsage: 0,
        connectionCount: 0,
        messagesPerSecond: 0,
        latency: 0,
        errorRate: 0
      }
    };

    this.nodes.set(nodeId, node);
    
    // Register in Redis
    await this.cluster.hset('broker:nodes', nodeId, JSON.stringify(node));
    await this.cluster.expire('broker:nodes', 300); // 5 minutes TTL

    // Start heartbeat
    this.startNodeHeartbeat(nodeId);
  }

  private async unregisterNode(): Promise<void> {
    for (const nodeId of this.nodes.keys()) {
      await this.cluster.hdel('broker:nodes', nodeId);
    }
  }

  private startNodeHeartbeat(nodeId: string): void {
    setInterval(async () => {
      const node = this.nodes.get(nodeId);
      if (node) {
        node.lastSeen = new Date();
        node.metrics = this.getCurrentNodeMetrics();
        
        await this.cluster.hset('broker:nodes', nodeId, JSON.stringify(node));
      }
    }, 10000); // Every 10 seconds
  }

  private getCurrentNodeMetrics(): NodeMetrics {
    const memUsage = process.memoryUsage();
    
    return {
      cpuUsage: this.metrics.getCpuUsage(),
      memoryUsage: memUsage.heapUsed / memUsage.heapTotal * 100,
      connectionCount: this.connections.size,
      messagesPerSecond: this.metrics.getMessagesPerSecond(),
      latency: this.metrics.getAverageLatency(),
      errorRate: this.metrics.getErrorRate()
    };
  }

  private async startMessageProcessing(): Promise<void> {
    // Subscribe to cluster messages
    this.cluster.on('message', async (channel, message) => {
      try {
        const parsedMessage: Message = JSON.parse(message);
        await this.processIncomingMessage(parsedMessage);
      } catch (error) {
        this.logger.error('Failed to process cluster message', { error: error.message });
      }
    });
  }

  private async processIncomingMessage(message: Message): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Decompress if needed
      if (message.metadata.compressed) {
        message.payload = await this.decompressPayload(message.payload);
      }

      // Get channel subscribers
      const subscribers = this.channels.get(message.channel);
      if (!subscribers || subscribers.size === 0) {
        return;
      }

      // Send to all subscribers
      const deliveryPromises = Array.from(subscribers).map(connectionId => 
        this.deliverMessage(connectionId, message)
      );

      await Promise.allSettled(deliveryPromises);

      // Update metrics
      const duration = Date.now() - startTime;
      this.metrics.recordDelivery(duration, message.metadata.size);

    } catch (error) {
      this.metrics.recordError('delivery_error');
      this.logger.error('Failed to process incoming message', { error: error.message });
    }
  }

  private async deliverMessage(connectionId: string, message: Message): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      const serialized = this.serializeMessage(message);
      connection.send(serialized);
    } catch (error) {
      this.logger.warn('Failed to deliver message to connection', { 
        connectionId, 
        error: error.message 
      });
    }
  }

  private async batchMessage(message: Message, targetNode: BrokerNode): Promise<void> {
    const batchKey = `${targetNode.id}:${message.channel}`;
    
    if (!this.messageBuffer.has(batchKey)) {
      this.messageBuffer.set(batchKey, []);
    }

    const batch = this.messageBuffer.get(batchKey)!;
    batch.push(message);

    // Start batch timer if not exists
    if (!this.batchTimers.has(batchKey)) {
      const timer = setTimeout(() => {
        this.flushBatch(batchKey, targetNode);
      }, this.config.performance.batching.batchTimeout);
      
      this.batchTimers.set(batchKey, timer);
    }

    // Flush immediately if batch is full
    if (batch.length >= this.config.performance.batching.maxBatchSize) {
      this.flushBatch(batchKey, targetNode);
    }
  }

  private async flushBatch(batchKey: string, targetNode: BrokerNode): Promise<void> {
    const batch = this.messageBuffer.get(batchKey);
    if (!batch || batch.length === 0) {
      return;
    }

    // Clear batch and timer
    this.messageBuffer.set(batchKey, []);
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    try {
      // Send batch to Redis
      const shardKey = this.getShardKey(batch[0].channel);
      const batchMessage = {
        type: 'batch',
        messages: batch,
        timestamp: Date.now()
      };

      await this.cluster.publish(`channel:${shardKey}`, JSON.stringify(batchMessage));
      
      this.metrics.recordBatch(batch.length);
    } catch (error) {
      this.logger.error('Failed to flush message batch', { error: error.message });
    }
  }

  private async directPublish(message: Message, targetNode: BrokerNode): Promise<void> {
    const shardKey = this.getShardKey(message.channel);
    await this.cluster.publish(`channel:${shardKey}`, JSON.stringify(message));
  }

  private async compressPayload(payload: any, size: number): Promise<Buffer> {
    if (size < this.config.performance.messageCompression.threshold) {
      return Buffer.from(JSON.stringify(payload));
    }

    const serialized = JSON.stringify(payload);
    
    switch (this.config.performance.messageCompression.algorithm) {
      case 'lz4':
        return Buffer.from(lz4.compress(Buffer.from(serialized)));
      default:
        return Buffer.from(serialized);
    }
  }

  private async decompressPayload(payload: Buffer): Promise<any> {
    switch (this.config.performance.messageCompression.algorithm) {
      case 'lz4':
        const decompressed = lz4.decompress(payload);
        return JSON.parse(decompressed.toString());
      default:
        return JSON.parse(payload.toString());
    }
  }

  private serializeMessage(message: Message): string | Buffer {
    if (this.config.performance.messageCompression.enabled) {
      return msgpack.encode(message);
    }
    return JSON.stringify(message);
  }

  private getShardKey(channel: string): string {
    if (!this.config.clustering.sharding.enabled) {
      return 'default';
    }

    // Simple hash-based sharding
    let hash = 0;
    for (let i = 0; i < channel.length; i++) {
      hash = ((hash << 5) - hash + channel.charCodeAt(i)) & 0xffffffff;
    }
    
    return `shard_${Math.abs(hash) % this.config.clustering.sharding.shardCount}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async drainConnections(): Promise<void> {
    const drainPromises = Array.from(this.connections.entries()).map(
      ([connectionId, ws]) => {
        return new Promise<void>((resolve) => {
          ws.close(1001, 'Server shutting down');
          setTimeout(resolve, 100);
        });
      }
    );

    await Promise.all(drainPromises);
  }

  private handleNodeError(node: any, error: Error): void {
    // Mark node as unhealthy
    const nodeId = node.options?.host + ':' + node.options?.port;
    const brokerNode = this.nodes.get(nodeId);
    if (brokerNode) {
      brokerNode.healthy = false;
      this.loadBalancer.markNodeUnhealthy(nodeId);
    }
  }

  private handleScaleUp(data: any): void {
    this.logger.info('Scaling up broker instances', data);
    // Implementation would depend on orchestration platform (K8s, Docker Swarm, etc.)
  }

  private handleScaleDown(data: any): void {
    this.logger.info('Scaling down broker instances', data);
    // Implementation would depend on orchestration platform
  }

  private startPerformanceMonitoring(): void {
    if (!this.config.monitoring.metrics.enabled) {
      return;
    }

    setInterval(() => {
      const stats = this.getStats();
      this.logger.info('Broker performance metrics', stats);
      
      // Check alerting thresholds
      if (this.config.monitoring.alerting.enabled) {
        this.checkAlertThresholds(stats);
      }
    }, this.config.monitoring.metrics.interval);
  }

  private checkAlertThresholds(stats: BrokerStats): void {
    const thresholds = this.config.monitoring.alerting.thresholds;
    
    if (stats.averageLatency > thresholds.latency) {
      this.emit('alert', { type: 'high_latency', value: stats.averageLatency });
    }
    
    if (stats.errorRate > thresholds.errorRate) {
      this.emit('alert', { type: 'high_error_rate', value: stats.errorRate });
    }
    
    if (stats.memoryUsage > thresholds.memoryUsage) {
      this.emit('alert', { type: 'high_memory_usage', value: stats.memoryUsage });
    }
    
    if (stats.totalConnections > thresholds.connectionCount) {
      this.emit('alert', { type: 'high_connection_count', value: stats.totalConnections });
    }
  }
}

/**
 * Broker metrics collector
 */
class BrokerMetrics {
  private publishLatencies: number[] = [];
  private deliveryLatencies: number[] = [];
  private errorCounts: Map<string, number> = new Map();
  private connectionCount = 0;
  private subscriptionCount = 0;
  private messageCount = 0;
  private batchCount = 0;
  private startTime = Date.now();

  recordPublish(latency: number, messageSize: number): void {
    this.publishLatencies.push(latency);
    this.messageCount++;
    this.trimArray(this.publishLatencies, 1000);
  }

  recordDelivery(latency: number, messageSize: number): void {
    this.deliveryLatencies.push(latency);
    this.trimArray(this.deliveryLatencies, 1000);
  }

  recordError(errorType: string): void {
    this.errorCounts.set(errorType, (this.errorCounts.get(errorType) || 0) + 1);
  }

  recordConnection(): void {
    this.connectionCount++;
  }

  recordDisconnection(): void {
    this.connectionCount--;
  }

  recordSubscription(): void {
    this.subscriptionCount++;
  }

  recordUnsubscription(): void {
    this.subscriptionCount--;
  }

  recordBatch(messageCount: number): void {
    this.batchCount++;
  }

  getMessagesPerSecond(): number {
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    return this.messageCount / elapsedSeconds;
  }

  getAverageLatency(): number {
    const allLatencies = [...this.publishLatencies, ...this.deliveryLatencies];
    return allLatencies.length > 0 
      ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length 
      : 0;
  }

  getErrorRate(): number {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);
    return this.messageCount > 0 ? totalErrors / this.messageCount : 0;
  }

  getCpuUsage(): number {
    // Simplified CPU usage calculation
    return Math.random() * 100; // Would use actual CPU monitoring
  }

  getThroughput(): number {
    return this.messageCount;
  }

  getUptime(): number {
    return Date.now() - this.startTime;
  }

  private trimArray(array: number[], maxLength: number): void {
    if (array.length > maxLength) {
      array.splice(0, array.length - maxLength);
    }
  }
}

/**
 * Auto-scaling controller
 */
class AutoScalingController extends EventEmitter {
  private isRunning = false;
  private lastScaleUp = 0;
  private lastScaleDown = 0;

  constructor(
    private readonly config: ScalingConfig,
    private readonly metrics: BrokerMetrics,
    private readonly logger: Logger
  ) {
    super();
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startMonitoring();
    this.logger.info('Auto-scaling controller started');
  }

  stop(): void {
    this.isRunning = false;
    this.logger.info('Auto-scaling controller stopped');
  }

  private startMonitoring(): void {
    const checkInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(checkInterval);
        return;
      }

      this.checkScalingConditions();
    }, 30000); // Check every 30 seconds
  }

  private checkScalingConditions(): void {
    const now = Date.now();
    const metrics = {
      cpuUsage: this.metrics.getCpuUsage(),
      memoryUsage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100,
      connectionCount: 0 // Would get from actual metrics
    };

    // Scale up conditions
    if (
      (metrics.cpuUsage > this.config.autoScaling.targetCPU ||
       metrics.memoryUsage > this.config.autoScaling.targetMemory) &&
      now - this.lastScaleUp > this.config.autoScaling.scaleUpCooldown
    ) {
      this.lastScaleUp = now;
      this.emit('scale_up', { reason: 'resource_pressure', metrics });
    }

    // Scale down conditions
    if (
      metrics.cpuUsage < this.config.autoScaling.targetCPU * 0.5 &&
      metrics.memoryUsage < this.config.autoScaling.targetMemory * 0.5 &&
      now - this.lastScaleDown > this.config.autoScaling.scaleDownCooldown
    ) {
      this.lastScaleDown = now;
      this.emit('scale_down', { reason: 'low_resource_usage', metrics });
    }
  }
}

/**
 * Load balancer
 */
class LoadBalancer {
  private unhealthyNodes: Set<string> = new Set();

  constructor(
    private readonly config: ScalingConfig['loadBalancing'],
    private readonly logger: Logger
  ) {}

  start(nodes: Map<string, BrokerNode>): void {
    this.startHealthChecks(nodes);
  }

  stop(): void {
    // Stop health checks
  }

  selectNode(channel: string, nodes: Map<string, BrokerNode>): BrokerNode {
    const healthyNodes = Array.from(nodes.values()).filter(
      node => node.healthy && !this.unhealthyNodes.has(node.id)
    );

    if (healthyNodes.length === 0) {
      throw new Error('No healthy nodes available');
    }

    switch (this.config.algorithm) {
      case 'round_robin':
        return this.selectRoundRobin(healthyNodes);
      case 'least_connections':
        return this.selectLeastConnections(healthyNodes);
      case 'consistent_hash':
        return this.selectConsistentHash(channel, healthyNodes);
      default:
        return healthyNodes[0];
    }
  }

  markNodeUnhealthy(nodeId: string): void {
    this.unhealthyNodes.add(nodeId);
  }

  markNodeHealthy(nodeId: string): void {
    this.unhealthyNodes.delete(nodeId);
  }

  private selectRoundRobin(nodes: BrokerNode[]): BrokerNode {
    // Simple round-robin implementation
    const index = Date.now() % nodes.length;
    return nodes[index];
  }

  private selectLeastConnections(nodes: BrokerNode[]): BrokerNode {
    return nodes.reduce((min, node) => 
      node.connections < min.connections ? node : min
    );
  }

  private selectConsistentHash(channel: string, nodes: BrokerNode[]): BrokerNode {
    // Simple hash-based selection
    let hash = 0;
    for (let i = 0; i < channel.length; i++) {
      hash = ((hash << 5) - hash + channel.charCodeAt(i)) & 0xffffffff;
    }
    
    const index = Math.abs(hash) % nodes.length;
    return nodes[index];
  }

  private startHealthChecks(nodes: Map<string, BrokerNode>): void {
    setInterval(() => {
      for (const [nodeId, node] of nodes) {
        // Simple health check based on last seen
        const timeSinceLastSeen = Date.now() - node.lastSeen.getTime();
        if (timeSinceLastSeen > this.config.healthCheckInterval * 2) {
          this.markNodeUnhealthy(nodeId);
        } else {
          this.markNodeHealthy(nodeId);
        }
      }
    }, this.config.healthCheckInterval);
  }
}

export interface BenchmarkConfig {
  duration: number;
  concurrency: number;
  messageSize: number;
  channelCount: number;
  publishRate: number;
}

export interface BenchmarkResults {
  duration: number;
  totalMessages: number;
  messagesPerSecond: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  throughput: number;
  cpuUsage: number;
  memoryUsage: number;
}

/**
 * Performance benchmark runner
 */
class PerformanceBenchmark {
  constructor(
    private readonly broker: HighPerformanceMessageBroker,
    private readonly logger: Logger
  ) {}

  async run(config: BenchmarkConfig): Promise<BenchmarkResults> {
    this.logger.info('Starting performance benchmark', config);
    
    const startTime = Date.now();
    const results = {
      duration: 0,
      totalMessages: 0,
      messagesPerSecond: 0,
      averageLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      errorRate: 0,
      throughput: 0,
      cpuUsage: 0,
      memoryUsage: 0
    };

    // Run benchmark
    const latencies: number[] = [];
    let messageCount = 0;
    let errorCount = 0;

    // Create publishers
    const publishers = Array.from({ length: config.concurrency }, () => 
      this.createPublisher(config, latencies, () => messageCount++, () => errorCount++)
    );

    // Run for specified duration
    await Promise.all(publishers);
    await new Promise(resolve => setTimeout(resolve, config.duration));

    // Calculate results
    const endTime = Date.now();
    results.duration = endTime - startTime;
    results.totalMessages = messageCount;
    results.messagesPerSecond = messageCount / (results.duration / 1000);
    results.averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    results.errorRate = errorCount / messageCount;
    
    const sortedLatencies = latencies.sort((a, b) => a - b);
    results.p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
    results.p99Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];

    const memUsage = process.memoryUsage();
    results.memoryUsage = memUsage.heapUsed;
    results.throughput = messageCount;

    this.logger.info('Benchmark completed', results);
    return results;
  }

  private async createPublisher(
    config: BenchmarkConfig,
    latencies: number[],
    onMessage: () => void,
    onError: () => void
  ): Promise<void> {
    const interval = 1000 / config.publishRate;
    
    const publish = async () => {
      const startTime = Date.now();
      
      try {
        await this.broker.publish({
          type: 'benchmark',
          channel: `channel_${Math.floor(Math.random() * config.channelCount)}`,
          payload: this.generatePayload(config.messageSize),
          metadata: {
            compressed: false,
            size: config.messageSize,
            retryCount: 0,
            maxRetries: 3
          },
          priority: 'medium'
        });

        latencies.push(Date.now() - startTime);
        onMessage();
      } catch (error) {
        onError();
      }
    };

    // Start publishing at specified rate
    const timer = setInterval(publish, interval);
    
    // Stop after duration
    setTimeout(() => clearInterval(timer), config.duration);
  }

  private generatePayload(size: number): any {
    return {
      data: 'x'.repeat(size),
      timestamp: Date.now(),
      random: Math.random()
    };
  }
}