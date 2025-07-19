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
 * @fileoverview High-Performance Kafka + Redis Message Queue Manager
 * @author Semantest Team
 * @module infrastructure/message-queue/KafkaRedisQueueManager
 */

import { EventEmitter } from 'events';
import { Kafka, Producer, Consumer, EachMessagePayload, CompressionTypes } from 'kafkajs';
import { Redis, Cluster } from 'ioredis';
import { Logger } from '@shared/infrastructure/logger';
import * as crypto from 'crypto';
import * as LZ4 from 'lz4';

export interface MessageQueueConfig {
  kafka: KafkaConfig;
  redis: RedisConfig;
  deduplication: DeduplicationConfig;
  deadLetterQueue: DeadLetterQueueConfig;
  performance: PerformanceConfig;
  routing: RoutingConfig;
  monitoring: MonitoringConfig;
}

export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  ssl?: {
    rejectUnauthorized: boolean;
    ca?: string;
    key?: string;
    cert?: string;
  };
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
  connectionTimeout: number;
  requestTimeout: number;
  retry: {
    initialRetryTime: number;
    retries: number;
    maxRetryTime: number;
    multiplier: number;
  };
  producer: ProducerConfig;
  consumer: ConsumerConfig;
}

export interface ProducerConfig {
  maxInFlightRequests: number;
  idempotent: boolean;
  transactionTimeout: number;
  allowAutoTopicCreation: boolean;
  compression: CompressionTypes;
  batchSize: number;
  lingerMs: number;
  maxRequestSize: number;
}

export interface ConsumerConfig {
  groupId: string;
  sessionTimeout: number;
  rebalanceTimeout: number;
  heartbeatInterval: number;
  maxBytesPerPartition: number;
  minBytes: number;
  maxBytes: number;
  maxWaitTimeInMs: number;
  allowAutoTopicCreation: boolean;
  maxInFlightRequests: number;
  readUncommitted: boolean;
}

export interface RedisConfig {
  nodes: Array<{ host: string; port: number }>;
  options: {
    enableReadyCheck: boolean;
    redisOptions: {
      password?: string;
      connectTimeout: number;
      commandTimeout: number;
      retryDelayOnFailover: number;
      maxRetriesPerRequest: number;
      keepAlive: number;
      family: number;
    };
  };
  ttl: {
    deduplication: number;
    cache: number;
    dlq: number;
  };
  keyPrefixes: {
    deduplication: string;
    cache: string;
    dlq: string;
    metrics: string;
  };
}

export interface DeduplicationConfig {
  enabled: boolean;
  strategy: 'hash' | 'content' | 'key' | 'combined';
  windowSize: number;
  hashAlgorithm: 'sha256' | 'sha1' | 'md5' | 'blake2b';
  includedFields: string[];
  excludedFields: string[];
  customKeyGenerator?: (message: QueueMessage) => string;
}

export interface DeadLetterQueueConfig {
  enabled: boolean;
  maxRetries: number;
  retryBackoff: {
    type: 'fixed' | 'exponential' | 'linear';
    baseDelay: number;
    maxDelay: number;
    multiplier: number;
  };
  topics: {
    retry: string;
    deadLetter: string;
  };
  persistence: {
    enabled: boolean;
    retention: number;
    compression: boolean;
  };
  alerting: {
    enabled: boolean;
    threshold: number;
    interval: number;
  };
}

export interface PerformanceConfig {
  batching: {
    enabled: boolean;
    maxBatchSize: number;
    maxWaitTime: number;
    compression: boolean;
  };
  caching: {
    enabled: boolean;
    strategy: 'lru' | 'lfu' | 'ttl';
    maxSize: number;
    ttl: number;
  };
  connection: {
    poolSize: number;
    keepAlive: boolean;
    tcpNoDelay: boolean;
    maxConnections: number;
  };
  threading: {
    workerThreads: number;
    maxConcurrency: number;
    queueSize: number;
  };
}

export interface RoutingConfig {
  strategy: 'round_robin' | 'hash' | 'sticky' | 'priority' | 'custom';
  partitioner?: (message: QueueMessage) => number;
  loadBalancing: {
    enabled: boolean;
    algorithm: 'least_connections' | 'round_robin' | 'weighted';
    healthCheck: boolean;
  };
  topics: {
    default: string;
    events: string;
    notifications: string;
    analytics: string;
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
      throughput: number;
      queueDepth: number;
    };
  };
  tracing: {
    enabled: boolean;
    samplingRate: number;
  };
}

export interface QueueMessage {
  id: string;
  topic: string;
  partition?: number;
  key?: string;
  value: any;
  headers?: Record<string, string>;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  ttl?: number;
  retryCount: number;
  maxRetries: number;
  metadata: MessageMetadata;
}

export interface MessageMetadata {
  source: string;
  correlationId?: string;
  causationId?: string;
  eventType: string;
  version: string;
  compressed: boolean;
  encrypted: boolean;
  size: number;
  checksum: string;
  deduplicationKey?: string;
}

export interface ProcessingResult {
  success: boolean;
  messageId: string;
  processingTime: number;
  error?: Error;
  retryAfter?: number;
  dead?: boolean;
}

export interface QueueStats {
  kafka: {
    topics: number;
    partitions: number;
    producers: number;
    consumers: number;
    messagesPerSecond: number;
    bytesPerSecond: number;
    lag: number;
    errors: number;
  };
  redis: {
    connections: number;
    memory: number;
    operations: number;
    hitRate: number;
    errors: number;
  };
  deduplication: {
    checked: number;
    duplicates: number;
    hitRate: number;
  };
  deadLetterQueue: {
    messages: number;
    retries: number;
    failures: number;
  };
  performance: {
    latency: LatencyMetrics;
    throughput: number;
    errorRate: number;
    uptime: number;
  };
}

export interface LatencyMetrics {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  p999: number;
}

/**
 * High-performance Kafka + Redis message queue manager with advanced features
 */
export class KafkaRedisQueueManager extends EventEmitter {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private redis: Cluster;
  private deduplicator: MessageDeduplicator;
  private deadLetterQueue: DeadLetterQueueManager;
  private performanceOptimizer: PerformanceOptimizer;
  private routingManager: RoutingManager;
  private metricsCollector: MetricsCollector;
  private messageCache: Map<string, QueueMessage> = new Map();
  private processingQueue: Map<string, Promise<ProcessingResult>> = new Map();
  private isRunning = false;
  private stats: QueueStats;

  constructor(
    private readonly config: MessageQueueConfig,
    private readonly logger: Logger
  ) {
    super();
    this.initializeComponents();
    this.setupEventHandlers();
    this.initializeStats();
  }

  /**
   * Initialize all components
   */
  private initializeComponents(): void {
    // Initialize Kafka
    this.kafka = new Kafka({
      clientId: this.config.kafka.clientId,
      brokers: this.config.kafka.brokers,
      ssl: this.config.kafka.ssl,
      sasl: this.config.kafka.sasl,
      connectionTimeout: this.config.kafka.connectionTimeout,
      requestTimeout: this.config.kafka.requestTimeout,
      retry: this.config.kafka.retry
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: this.config.kafka.producer.maxInFlightRequests,
      idempotent: this.config.kafka.producer.idempotent,
      transactionTimeout: this.config.kafka.producer.transactionTimeout,
      allowAutoTopicCreation: this.config.kafka.producer.allowAutoTopicCreation
    });

    this.consumer = this.kafka.consumer({
      groupId: this.config.kafka.consumer.groupId,
      sessionTimeout: this.config.kafka.consumer.sessionTimeout,
      rebalanceTimeout: this.config.kafka.consumer.rebalanceTimeout,
      heartbeatInterval: this.config.kafka.consumer.heartbeatInterval,
      maxBytesPerPartition: this.config.kafka.consumer.maxBytesPerPartition,
      minBytes: this.config.kafka.consumer.minBytes,
      maxBytes: this.config.kafka.consumer.maxBytes,
      maxWaitTimeInMs: this.config.kafka.consumer.maxWaitTimeInMs,
      allowAutoTopicCreation: this.config.kafka.consumer.allowAutoTopicCreation,
      maxInFlightRequests: this.config.kafka.consumer.maxInFlightRequests,
      readUncommitted: this.config.kafka.consumer.readUncommitted
    });

    // Initialize Redis
    this.redis = new Cluster(
      this.config.redis.nodes,
      this.config.redis.options
    );

    // Initialize specialized components
    this.deduplicator = new MessageDeduplicator(
      this.config.deduplication,
      this.redis,
      this.logger
    );

    this.deadLetterQueue = new DeadLetterQueueManager(
      this.config.deadLetterQueue,
      this.kafka,
      this.redis,
      this.logger
    );

    this.performanceOptimizer = new PerformanceOptimizer(
      this.config.performance,
      this.logger
    );

    this.routingManager = new RoutingManager(
      this.config.routing,
      this.logger
    );

    this.metricsCollector = new MetricsCollector(
      this.config.monitoring,
      this.redis,
      this.logger
    );
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Kafka events
    this.producer.on('producer.connect', () => {
      this.logger.info('Kafka producer connected');
      this.emit('producer_connected');
    });

    this.producer.on('producer.disconnect', () => {
      this.logger.info('Kafka producer disconnected');
      this.emit('producer_disconnected');
    });

    this.consumer.on('consumer.connect', () => {
      this.logger.info('Kafka consumer connected');
      this.emit('consumer_connected');
    });

    this.consumer.on('consumer.disconnect', () => {
      this.logger.info('Kafka consumer disconnected');
      this.emit('consumer_disconnected');
    });

    this.consumer.on('consumer.crash', ({ payload }) => {
      this.logger.error('Kafka consumer crashed', { error: payload.error.message });
      this.emit('consumer_crashed', payload.error);
    });

    // Redis events
    this.redis.on('ready', () => {
      this.logger.info('Redis cluster ready');
      this.emit('redis_ready');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis cluster error', { error: error.message });
      this.emit('redis_error', error);
    });

    // Component events
    this.deduplicator.on('duplicate_detected', (messageId) => {
      this.stats.deduplication.duplicates++;
      this.emit('duplicate_message', messageId);
    });

    this.deadLetterQueue.on('message_dead', (messageId) => {
      this.stats.deadLetterQueue.failures++;
      this.emit('message_dead', messageId);
    });

    this.performanceOptimizer.on('performance_alert', (alert) => {
      this.logger.warn('Performance alert', alert);
      this.emit('performance_alert', alert);
    });
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): void {
    this.stats = {
      kafka: {
        topics: 0,
        partitions: 0,
        producers: 0,
        consumers: 0,
        messagesPerSecond: 0,
        bytesPerSecond: 0,
        lag: 0,
        errors: 0
      },
      redis: {
        connections: 0,
        memory: 0,
        operations: 0,
        hitRate: 0,
        errors: 0
      },
      deduplication: {
        checked: 0,
        duplicates: 0,
        hitRate: 0
      },
      deadLetterQueue: {
        messages: 0,
        retries: 0,
        failures: 0
      },
      performance: {
        latency: {
          min: 0, max: 0, avg: 0,
          p50: 0, p95: 0, p99: 0, p999: 0
        },
        throughput: 0,
        errorRate: 0,
        uptime: 0
      }
    };
  }

  /**
   * Start the message queue manager
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Message queue manager is already running');
    }

    try {
      this.logger.info('Starting Kafka + Redis message queue manager...');

      // Start components in order
      await this.producer.connect();
      await this.consumer.connect();
      await this.waitForRedisReady();

      await this.deduplicator.start();
      await this.deadLetterQueue.start();
      await this.performanceOptimizer.start();
      await this.routingManager.start();
      await this.metricsCollector.start();

      // Subscribe to topics
      await this.subscribeToTopics();

      // Start message processing
      await this.startMessageProcessing();

      this.isRunning = true;
      this.emit('queue_manager_started');

      this.logger.info('Kafka + Redis message queue manager started successfully');

    } catch (error) {
      this.logger.error('Failed to start message queue manager', { error: error.message });
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop the message queue manager
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.logger.info('Stopping Kafka + Redis message queue manager...');

      this.isRunning = false;

      // Stop components
      await this.metricsCollector.stop();
      await this.routingManager.stop();
      await this.performanceOptimizer.stop();
      await this.deadLetterQueue.stop();
      await this.deduplicator.stop();

      // Disconnect Kafka
      await this.consumer.disconnect();
      await this.producer.disconnect();

      // Disconnect Redis
      this.redis.disconnect();

      this.emit('queue_manager_stopped');

      this.logger.info('Kafka + Redis message queue manager stopped');

    } catch (error) {
      this.logger.error('Error stopping message queue manager', { error: error.message });
      throw error;
    }
  }

  /**
   * Publish message to queue
   */
  async publish(message: Omit<QueueMessage, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const startTime = Date.now();

    try {
      // Generate message ID and add metadata
      const completeMessage: QueueMessage = {
        id: this.generateMessageId(),
        timestamp: Date.now(),
        retryCount: 0,
        ...message
      };

      // Add deduplication key if enabled
      if (this.config.deduplication.enabled) {
        completeMessage.metadata.deduplicationKey = 
          await this.deduplicator.generateDeduplicationKey(completeMessage);

        // Check for duplicates
        const isDuplicate = await this.deduplicator.checkDuplicate(completeMessage);
        if (isDuplicate) {
          this.logger.debug('Duplicate message detected', { messageId: completeMessage.id });
          return completeMessage.id;
        }
      }

      // Apply performance optimizations
      const optimizedMessage = await this.performanceOptimizer.optimizeMessage(completeMessage);

      // Route message to appropriate topic/partition
      const routingInfo = this.routingManager.routeMessage(optimizedMessage);

      // Publish to Kafka
      await this.producer.send({
        topic: routingInfo.topic,
        messages: [{
          key: optimizedMessage.key,
          value: JSON.stringify(optimizedMessage),
          partition: routingInfo.partition,
          headers: optimizedMessage.headers,
          timestamp: optimizedMessage.timestamp.toString()
        }],
        compression: this.config.kafka.producer.compression
      });

      // Cache message if enabled
      if (this.config.performance.caching.enabled) {
        this.messageCache.set(completeMessage.id, completeMessage);
      }

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.metricsCollector.recordMessagePublished(processingTime, optimizedMessage.metadata.size);

      this.logger.debug('Message published successfully', {
        messageId: completeMessage.id,
        topic: routingInfo.topic,
        partition: routingInfo.partition,
        processingTime
      });

      this.emit('message_published', {
        messageId: completeMessage.id,
        topic: routingInfo.topic,
        processingTime
      });

      return completeMessage.id;

    } catch (error) {
      this.logger.error('Failed to publish message', { error: error.message });
      this.stats.kafka.errors++;
      throw error;
    }
  }

  /**
   * Subscribe to topics and start consuming
   */
  private async subscribeToTopics(): Promise<void> {
    const topics = [
      this.config.routing.topics.default,
      this.config.routing.topics.events,
      this.config.routing.topics.notifications,
      this.config.routing.topics.analytics
    ];

    await this.consumer.subscribe({
      topics,
      fromBeginning: false
    });

    this.logger.info('Subscribed to topics', { topics });
  }

  /**
   * Start message processing loop
   */
  private async startMessageProcessing(): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        await this.processMessage(topic, partition, message);
      },
      eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
        if (this.config.performance.batching.enabled) {
          await this.processBatch(batch, resolveOffset, heartbeat, isRunning, isStale);
        }
      }
    });
  }

  /**
   * Process individual message
   */
  private async processMessage(topic: string, partition: number, kafkaMessage: any): Promise<void> {
    const startTime = Date.now();
    let queueMessage: QueueMessage;

    try {
      // Parse message
      queueMessage = JSON.parse(kafkaMessage.value.toString());

      // Check if message is already being processed
      if (this.processingQueue.has(queueMessage.id)) {
        this.logger.debug('Message already being processed', { messageId: queueMessage.id });
        return;
      }

      // Add to processing queue
      const processingPromise = this.executeMessageProcessing(queueMessage);
      this.processingQueue.set(queueMessage.id, processingPromise);

      // Wait for processing to complete
      const result = await processingPromise;

      // Remove from processing queue
      this.processingQueue.delete(queueMessage.id);

      // Handle processing result
      await this.handleProcessingResult(queueMessage, result);

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.metricsCollector.recordMessageProcessed(processingTime, result.success);

      this.logger.debug('Message processed', {
        messageId: queueMessage.id,
        topic,
        partition,
        success: result.success,
        processingTime
      });

    } catch (error) {
      this.logger.error('Message processing failed', {
        messageId: queueMessage?.id,
        topic,
        partition,
        error: error.message
      });

      if (queueMessage) {
        await this.handleProcessingFailure(queueMessage, error);
      }

      this.stats.kafka.errors++;
    }
  }

  /**
   * Execute message processing with retries and error handling
   */
  private async executeMessageProcessing(message: QueueMessage): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      // Validate message
      this.validateMessage(message);

      // Apply deduplication if enabled
      if (this.config.deduplication.enabled) {
        const isDuplicate = await this.deduplicator.checkDuplicate(message);
        if (isDuplicate) {
          return {
            success: true,
            messageId: message.id,
            processingTime: Date.now() - startTime
          };
        }
      }

      // Process message based on type
      const result = await this.routeAndProcessMessage(message);

      // Mark as processed in deduplication store
      if (this.config.deduplication.enabled) {
        await this.deduplicator.markProcessed(message);
      }

      return {
        success: true,
        messageId: message.id,
        processingTime: Date.now() - startTime,
        ...result
      };

    } catch (error) {
      return {
        success: false,
        messageId: message.id,
        processingTime: Date.now() - startTime,
        error
      };
    }
  }

  /**
   * Route and process message based on type and content
   */
  private async routeAndProcessMessage(message: QueueMessage): Promise<any> {
    // This is where you'd implement your business logic
    // For now, we'll simulate processing
    
    this.emit('message_processing', message);

    // Simulate async processing
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

    this.emit('message_processed', message);

    return { processed: true };
  }

  /**
   * Process message batch for improved performance
   */
  private async processBatch(batch: any, resolveOffset: any, heartbeat: any, isRunning: any, isStale: any): Promise<void> {
    const batchStartTime = Date.now();

    try {
      const processingPromises = batch.messages.map(async (message: any) => {
        await this.processMessage(batch.topic, batch.partition, message);
        resolveOffset(message.offset);
      });

      // Process messages in parallel with concurrency limit
      const concurrency = this.config.performance.threading.maxConcurrency;
      for (let i = 0; i < processingPromises.length; i += concurrency) {
        const chunk = processingPromises.slice(i, i + concurrency);
        await Promise.all(chunk);
        
        // Send heartbeat to prevent rebalancing
        await heartbeat();
      }

      const batchProcessingTime = Date.now() - batchStartTime;
      this.logger.debug('Batch processed', {
        topic: batch.topic,
        partition: batch.partition,
        messages: batch.messages.length,
        processingTime: batchProcessingTime
      });

    } catch (error) {
      this.logger.error('Batch processing failed', {
        topic: batch.topic,
        partition: batch.partition,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handle successful/failed message processing
   */
  private async handleProcessingResult(message: QueueMessage, result: ProcessingResult): Promise<void> {
    if (result.success) {
      this.emit('message_success', { messageId: message.id, result });
      return;
    }

    // Handle failure
    await this.handleProcessingFailure(message, result.error!);
  }

  /**
   * Handle message processing failure with retry logic
   */
  private async handleProcessingFailure(message: QueueMessage, error: Error): Promise<void> {
    const canRetry = message.retryCount < message.maxRetries;

    if (canRetry) {
      // Send to retry queue
      await this.deadLetterQueue.sendToRetryQueue({
        ...message,
        retryCount: message.retryCount + 1
      }, error);

      this.stats.deadLetterQueue.retries++;
      this.emit('message_retry', { messageId: message.id, retryCount: message.retryCount + 1 });

    } else {
      // Send to dead letter queue
      await this.deadLetterQueue.sendToDeadLetterQueue(message, error);

      this.stats.deadLetterQueue.messages++;
      this.emit('message_dead_letter', { messageId: message.id, error: error.message });
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    // Update real-time stats
    await this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Array<{ name: string; status: string; details?: any }>;
  }> {
    const components = [];

    // Check Kafka health
    try {
      const kafkaAdmin = this.kafka.admin();
      await kafkaAdmin.connect();
      const metadata = await kafkaAdmin.fetchTopicMetadata();
      await kafkaAdmin.disconnect();

      components.push({
        name: 'kafka',
        status: 'healthy',
        details: { topics: Object.keys(metadata.topics).length }
      });
    } catch (error) {
      components.push({
        name: 'kafka',
        status: 'unhealthy',
        details: { error: error.message }
      });
    }

    // Check Redis health
    try {
      await this.redis.ping();
      components.push({
        name: 'redis',
        status: 'healthy'
      });
    } catch (error) {
      components.push({
        name: 'redis',
        status: 'unhealthy',
        details: { error: error.message }
      });
    }

    // Determine overall status
    const unhealthy = components.filter(c => c.status === 'unhealthy');
    const degraded = components.filter(c => c.status === 'degraded');

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthy.length > 0) {
      status = 'unhealthy';
    } else if (degraded.length > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return { status, components };
  }

  /**
   * Private helper methods
   */
  private async waitForRedisReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.redis.status === 'ready') {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout'));
      }, 30000);

      this.redis.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private validateMessage(message: QueueMessage): void {
    if (!message.id || !message.topic || !message.value) {
      throw new Error('Invalid message format');
    }

    if (message.metadata.size > this.config.kafka.producer.maxRequestSize) {
      throw new Error('Message size exceeds maximum allowed');
    }
  }

  private async updateStats(): Promise<void> {
    try {
      // Update Kafka stats
      const kafkaAdmin = this.kafka.admin();
      await kafkaAdmin.connect();
      const metadata = await kafkaAdmin.fetchTopicMetadata();
      await kafkaAdmin.disconnect();

      this.stats.kafka.topics = Object.keys(metadata.topics).length;
      this.stats.kafka.partitions = Object.values(metadata.topics)
        .reduce((sum: number, topic: any) => sum + topic.partitions.length, 0);

      // Update Redis stats
      const redisInfo = await this.redis.info();
      this.stats.redis.memory = this.parseRedisInfo(redisInfo, 'used_memory') || 0;
      this.stats.redis.connections = this.parseRedisInfo(redisInfo, 'connected_clients') || 0;

      // Update performance stats
      this.stats.performance.uptime = Date.now() - this.startTime;

    } catch (error) {
      this.logger.error('Failed to update stats', { error: error.message });
    }
  }

  private parseRedisInfo(info: string, key: string): number {
    const line = info.split('\n').find(l => l.startsWith(key + ':'));
    return line ? parseInt(line.split(':')[1]) : 0;
  }

  private startTime = Date.now();
}

/**
 * Message deduplication component
 */
class MessageDeduplicator extends EventEmitter {
  constructor(
    private readonly config: DeduplicationConfig,
    private readonly redis: Cluster,
    private readonly logger: Logger
  ) {
    super();
  }

  async start(): Promise<void> {
    this.logger.info('Message deduplicator started');
  }

  async stop(): Promise<void> {
    this.logger.info('Message deduplicator stopped');
  }

  async generateDeduplicationKey(message: QueueMessage): Promise<string> {
    if (this.config.customKeyGenerator) {
      return this.config.customKeyGenerator(message);
    }

    switch (this.config.strategy) {
      case 'hash':
        return this.generateHashKey(message);
      case 'content':
        return this.generateContentKey(message);
      case 'key':
        return message.key || message.id;
      case 'combined':
        return this.generateCombinedKey(message);
      default:
        return message.id;
    }
  }

  async checkDuplicate(message: QueueMessage): Promise<boolean> {
    if (!this.config.enabled || !message.metadata.deduplicationKey) {
      return false;
    }

    const key = `${this.getRedisPrefix()}:${message.metadata.deduplicationKey}`;
    const exists = await this.redis.exists(key);

    if (exists) {
      this.emit('duplicate_detected', message.id);
      return true;
    }

    return false;
  }

  async markProcessed(message: QueueMessage): Promise<void> {
    if (!this.config.enabled || !message.metadata.deduplicationKey) {
      return;
    }

    const key = `${this.getRedisPrefix()}:${message.metadata.deduplicationKey}`;
    await this.redis.setex(key, this.config.windowSize, message.id);
  }

  private generateHashKey(message: QueueMessage): string {
    const content = JSON.stringify({
      topic: message.topic,
      value: message.value,
      key: message.key
    });

    return crypto.createHash(this.config.hashAlgorithm).update(content).digest('hex');
  }

  private generateContentKey(message: QueueMessage): string {
    const filteredContent = this.filterContent(message.value);
    return crypto.createHash(this.config.hashAlgorithm).update(JSON.stringify(filteredContent)).digest('hex');
  }

  private generateCombinedKey(message: QueueMessage): string {
    const components = [
      message.topic,
      message.key || '',
      this.generateContentKey(message)
    ];

    return crypto.createHash(this.config.hashAlgorithm).update(components.join('|')).digest('hex');
  }

  private filterContent(content: any): any {
    if (this.config.includedFields.length > 0) {
      const filtered: any = {};
      for (const field of this.config.includedFields) {
        if (content[field] !== undefined) {
          filtered[field] = content[field];
        }
      }
      return filtered;
    }

    if (this.config.excludedFields.length > 0) {
      const filtered = { ...content };
      for (const field of this.config.excludedFields) {
        delete filtered[field];
      }
      return filtered;
    }

    return content;
  }

  private getRedisPrefix(): string {
    return 'dedup';
  }
}

/**
 * Dead letter queue manager
 */
class DeadLetterQueueManager extends EventEmitter {
  constructor(
    private readonly config: DeadLetterQueueConfig,
    private readonly kafka: Kafka,
    private readonly redis: Cluster,
    private readonly logger: Logger
  ) {
    super();
  }

  async start(): Promise<void> {
    this.logger.info('Dead letter queue manager started');
  }

  async stop(): Promise<void> {
    this.logger.info('Dead letter queue manager stopped');
  }

  async sendToRetryQueue(message: QueueMessage, error: Error): Promise<void> {
    if (!this.config.enabled) {
      throw error;
    }

    const retryDelay = this.calculateRetryDelay(message.retryCount);
    const retryMessage = {
      ...message,
      headers: {
        ...message.headers,
        'x-retry-count': message.retryCount.toString(),
        'x-retry-delay': retryDelay.toString(),
        'x-original-error': error.message
      }
    };

    // Store in Redis with delay
    const key = `retry:${message.id}:${message.retryCount}`;
    await this.redis.setex(key, retryDelay / 1000, JSON.stringify(retryMessage));

    // Schedule retry
    setTimeout(async () => {
      await this.republishMessage(retryMessage);
    }, retryDelay);

    this.logger.info('Message sent to retry queue', {
      messageId: message.id,
      retryCount: message.retryCount,
      retryDelay
    });
  }

  async sendToDeadLetterQueue(message: QueueMessage, error: Error): Promise<void> {
    if (!this.config.enabled) {
      throw error;
    }

    const deadMessage = {
      ...message,
      headers: {
        ...message.headers,
        'x-dead-letter-reason': error.message,
        'x-dead-letter-timestamp': Date.now().toString(),
        'x-final-retry-count': message.retryCount.toString()
      }
    };

    // Send to dead letter topic
    const producer = this.kafka.producer();
    await producer.connect();

    await producer.send({
      topic: this.config.topics.deadLetter,
      messages: [{
        key: message.key,
        value: JSON.stringify(deadMessage),
        headers: deadMessage.headers
      }]
    });

    await producer.disconnect();

    // Store in Redis for persistence if enabled
    if (this.config.persistence.enabled) {
      const key = `dlq:${message.id}`;
      await this.redis.setex(key, this.config.persistence.retention, JSON.stringify(deadMessage));
    }

    this.emit('message_dead', message.id);

    this.logger.warn('Message sent to dead letter queue', {
      messageId: message.id,
      retryCount: message.retryCount,
      error: error.message
    });
  }

  private calculateRetryDelay(retryCount: number): number {
    switch (this.config.retryBackoff.type) {
      case 'fixed':
        return this.config.retryBackoff.baseDelay;
      case 'linear':
        return this.config.retryBackoff.baseDelay * retryCount;
      case 'exponential':
        return Math.min(
          this.config.retryBackoff.baseDelay * Math.pow(this.config.retryBackoff.multiplier, retryCount),
          this.config.retryBackoff.maxDelay
        );
      default:
        return this.config.retryBackoff.baseDelay;
    }
  }

  private async republishMessage(message: QueueMessage): Promise<void> {
    try {
      const producer = this.kafka.producer();
      await producer.connect();

      await producer.send({
        topic: message.topic,
        messages: [{
          key: message.key,
          value: JSON.stringify(message),
          headers: message.headers
        }]
      });

      await producer.disconnect();

      this.logger.info('Message republished from retry queue', { messageId: message.id });

    } catch (error) {
      this.logger.error('Failed to republish message from retry queue', {
        messageId: message.id,
        error: error.message
      });
    }
  }
}

/**
 * Performance optimizer
 */
class PerformanceOptimizer extends EventEmitter {
  constructor(
    private readonly config: PerformanceConfig,
    private readonly logger: Logger
  ) {
    super();
  }

  async start(): Promise<void> {
    this.logger.info('Performance optimizer started');
  }

  async stop(): Promise<void> {
    this.logger.info('Performance optimizer stopped');
  }

  async optimizeMessage(message: QueueMessage): Promise<QueueMessage> {
    let optimizedMessage = { ...message };

    // Apply compression if enabled and message size exceeds threshold
    if (this.config.batching.compression && message.metadata.size > 1024) {
      optimizedMessage = await this.compressMessage(optimizedMessage);
    }

    // Add performance metadata
    optimizedMessage.metadata = {
      ...optimizedMessage.metadata,
      optimized: true,
      optimizationTimestamp: Date.now()
    };

    return optimizedMessage;
  }

  private async compressMessage(message: QueueMessage): Promise<QueueMessage> {
    try {
      const originalData = JSON.stringify(message.value);
      const compressed = LZ4.encode(Buffer.from(originalData));

      return {
        ...message,
        value: compressed.toString('base64'),
        metadata: {
          ...message.metadata,
          compressed: true,
          originalSize: message.metadata.size,
          size: compressed.length
        }
      };

    } catch (error) {
      this.logger.warn('Message compression failed', { messageId: message.id, error: error.message });
      return message;
    }
  }
}

/**
 * Routing manager
 */
class RoutingManager {
  constructor(
    private readonly config: RoutingConfig,
    private readonly logger: Logger
  ) {}

  async start(): Promise<void> {
    this.logger.info('Routing manager started');
  }

  async stop(): Promise<void> {
    this.logger.info('Routing manager stopped');
  }

  routeMessage(message: QueueMessage): { topic: string; partition?: number } {
    let topic = message.topic || this.config.topics.default;

    // Apply routing strategy
    let partition: number | undefined;

    if (this.config.partitioner) {
      partition = this.config.partitioner(message);
    } else {
      partition = this.calculatePartition(message);
    }

    return { topic, partition };
  }

  private calculatePartition(message: QueueMessage): number | undefined {
    switch (this.config.strategy) {
      case 'hash':
        return this.hashPartition(message.key || message.id);
      case 'round_robin':
        return undefined; // Let Kafka handle round-robin
      case 'priority':
        return this.priorityPartition(message.priority);
      default:
        return undefined;
    }
  }

  private hashPartition(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash + key.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash) % 10; // Assume 10 partitions
  }

  private priorityPartition(priority: string): number {
    switch (priority) {
      case 'critical': return 0;
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
      default: return 2;
    }
  }
}

/**
 * Metrics collector
 */
class MetricsCollector {
  private publishedCount = 0;
  private processedCount = 0;
  private errorCount = 0;
  private latencies: number[] = [];

  constructor(
    private readonly config: MonitoringConfig,
    private readonly redis: Cluster,
    private readonly logger: Logger
  ) {}

  async start(): Promise<void> {
    if (this.config.metrics.enabled) {
      this.startMetricsCollection();
    }
    this.logger.info('Metrics collector started');
  }

  async stop(): Promise<void> {
    this.logger.info('Metrics collector stopped');
  }

  recordMessagePublished(latency: number, size: number): void {
    this.publishedCount++;
    this.latencies.push(latency);
  }

  recordMessageProcessed(latency: number, success: boolean): void {
    this.processedCount++;
    this.latencies.push(latency);
    
    if (!success) {
      this.errorCount++;
    }
  }

  private startMetricsCollection(): void {
    setInterval(async () => {
      await this.collectAndStoreMetrics();
    }, this.config.metrics.interval);
  }

  private async collectAndStoreMetrics(): Promise<void> {
    try {
      const metrics = {
        timestamp: Date.now(),
        published: this.publishedCount,
        processed: this.processedCount,
        errors: this.errorCount,
        latency: this.calculateLatencyMetrics()
      };

      const key = `metrics:${Math.floor(Date.now() / 60000)}`;
      await this.redis.setex(key, this.config.metrics.retention, JSON.stringify(metrics));

      // Reset counters
      this.publishedCount = 0;
      this.processedCount = 0;
      this.errorCount = 0;
      this.latencies = [];

    } catch (error) {
      this.logger.error('Failed to collect metrics', { error: error.message });
    }
  }

  private calculateLatencyMetrics(): LatencyMetrics {
    if (this.latencies.length === 0) {
      return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, p999: 0 };
    }

    const sorted = this.latencies.sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      p999: sorted[Math.floor(sorted.length * 0.999)]
    };
  }
}

export { KafkaRedisQueueManager };