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
 * @fileoverview Main Entry Point for Kafka + Redis Streaming System
 * @author Semantest Team
 * @module main-kafka-redis-streaming
 */

import { KafkaRedisQueueManager, MessageQueueConfig } from './infrastructure/message-queue/kafka-redis-queue-manager';
import { OptimizedWebSocketHandlers, WebSocketConfig } from './infrastructure/websocket/optimized-websocket-handlers';
import { EventStreamingService, StreamingConfig } from './infrastructure/streaming/event-streaming-service';
import { RealTimeMonitoring, RealTimeMonitoringConfig } from './infrastructure/monitoring/real-time-monitoring';
import { Logger } from '@shared/infrastructure/logger';
import { CompressionTypes } from 'kafkajs';

// Enhanced Configuration for Production Deployment
const messageQueueConfig: MessageQueueConfig = {
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || [
      'localhost:9092',
      'localhost:9093',
      'localhost:9094'
    ],
    clientId: process.env.KAFKA_CLIENT_ID || 'semantest-realtime-streaming',
    ssl: process.env.KAFKA_SSL_ENABLED === 'true' ? {
      rejectUnauthorized: false,
      ca: process.env.KAFKA_SSL_CA,
      key: process.env.KAFKA_SSL_KEY,
      cert: process.env.KAFKA_SSL_CERT
    } : undefined,
    sasl: process.env.KAFKA_SASL_ENABLED === 'true' ? {
      mechanism: 'scram-sha-256' as const,
      username: process.env.KAFKA_SASL_USERNAME!,
      password: process.env.KAFKA_SASL_PASSWORD!
    } : undefined,
    connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT || '3000'),
    requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT || '30000'),
    retry: {
      initialRetryTime: 100,
      retries: 8,
      maxRetryTime: 30000,
      multiplier: 2
    },
    producer: {
      maxInFlightRequests: 5,
      idempotent: true,
      transactionTimeout: 30000,
      allowAutoTopicCreation: true,
      compression: CompressionTypes.LZ4,
      batchSize: 16384,
      lingerMs: 100,
      maxRequestSize: 1048576
    },
    consumer: {
      groupId: process.env.KAFKA_CONSUMER_GROUP || 'semantest-streaming-consumers',
      sessionTimeout: 30000,
      rebalanceTimeout: 60000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576,
      minBytes: 1,
      maxBytes: 10485760,
      maxWaitTimeInMs: 5000,
      allowAutoTopicCreation: true,
      maxInFlightRequests: 5,
      readUncommitted: false
    }
  },
  redis: {
    nodes: JSON.parse(process.env.REDIS_CLUSTER_NODES || JSON.stringify([
      { host: 'localhost', port: 6379 },
      { host: 'localhost', port: 6380 },
      { host: 'localhost', port: 6381 }
    ])),
    options: {
      enableReadyCheck: true,
      redisOptions: {
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        keepAlive: 30000,
        family: 4
      }
    },
    ttl: {
      deduplication: parseInt(process.env.REDIS_DEDUP_TTL || '3600'),
      cache: parseInt(process.env.REDIS_CACHE_TTL || '1800'),
      dlq: parseInt(process.env.REDIS_DLQ_TTL || '86400')
    },
    keyPrefixes: {
      deduplication: 'dedup',
      cache: 'cache',
      dlq: 'dlq',
      metrics: 'metrics'
    }
  },
  deduplication: {
    enabled: process.env.DEDUPLICATION_ENABLED === 'true',
    strategy: (process.env.DEDUPLICATION_STRATEGY as any) || 'combined',
    windowSize: parseInt(process.env.DEDUPLICATION_WINDOW || '3600'),
    hashAlgorithm: (process.env.DEDUPLICATION_HASH as any) || 'sha256',
    includedFields: process.env.DEDUPLICATION_INCLUDE_FIELDS?.split(',') || [],
    excludedFields: process.env.DEDUPLICATION_EXCLUDE_FIELDS?.split(',') || ['timestamp']
  },
  deadLetterQueue: {
    enabled: process.env.DLQ_ENABLED !== 'false',
    maxRetries: parseInt(process.env.DLQ_MAX_RETRIES || '3'),
    retryBackoff: {
      type: (process.env.DLQ_BACKOFF_TYPE as any) || 'exponential',
      baseDelay: parseInt(process.env.DLQ_BASE_DELAY || '1000'),
      maxDelay: parseInt(process.env.DLQ_MAX_DELAY || '300000'),
      multiplier: parseFloat(process.env.DLQ_MULTIPLIER || '2.0')
    },
    topics: {
      retry: process.env.DLQ_RETRY_TOPIC || 'retry-queue',
      deadLetter: process.env.DLQ_DEAD_TOPIC || 'dead-letter-queue'
    },
    persistence: {
      enabled: process.env.DLQ_PERSISTENCE_ENABLED !== 'false',
      retention: parseInt(process.env.DLQ_RETENTION || '604800'),
      compression: process.env.DLQ_COMPRESSION_ENABLED !== 'false'
    },
    alerting: {
      enabled: process.env.DLQ_ALERTING_ENABLED !== 'false',
      threshold: parseInt(process.env.DLQ_ALERT_THRESHOLD || '10'),
      interval: parseInt(process.env.DLQ_ALERT_INTERVAL || '300000')
    }
  },
  performance: {
    batching: {
      enabled: process.env.BATCHING_ENABLED !== 'false',
      maxBatchSize: parseInt(process.env.BATCH_MAX_SIZE || '100'),
      maxWaitTime: parseInt(process.env.BATCH_MAX_WAIT || '100'),
      adaptiveBatching: process.env.ADAPTIVE_BATCHING_ENABLED !== 'false'
    },
    caching: {
      enabled: process.env.CACHING_ENABLED !== 'false',
      strategy: (process.env.CACHE_STRATEGY as any) || 'lru',
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || '10000'),
      ttl: parseInt(process.env.CACHE_TTL || '300000')
    },
    connection: {
      poolSize: parseInt(process.env.CONNECTION_POOL_SIZE || '10'),
      keepAlive: process.env.KEEP_ALIVE_ENABLED !== 'false',
      tcpNoDelay: process.env.TCP_NO_DELAY_ENABLED !== 'false',
      maxConnections: parseInt(process.env.MAX_CONNECTIONS || '1000')
    },
    threading: {
      workerThreads: parseInt(process.env.WORKER_THREADS || '4'),
      maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '100'),
      queueSize: parseInt(process.env.QUEUE_SIZE || '10000')
    }
  },
  routing: {
    strategy: (process.env.ROUTING_STRATEGY as any) || 'hash',
    loadBalancing: {
      enabled: process.env.LOAD_BALANCING_ENABLED !== 'false',
      algorithm: (process.env.LB_ALGORITHM as any) || 'least_connections',
      healthCheck: process.env.LB_HEALTH_CHECK_ENABLED !== 'false'
    },
    topics: {
      default: process.env.DEFAULT_TOPIC || 'default-events',
      events: process.env.EVENTS_TOPIC || 'application-events',
      notifications: process.env.NOTIFICATIONS_TOPIC || 'user-notifications',
      analytics: process.env.ANALYTICS_TOPIC || 'analytics-events'
    }
  },
  monitoring: {
    metrics: {
      enabled: process.env.METRICS_ENABLED !== 'false',
      interval: parseInt(process.env.METRICS_INTERVAL || '10000'),
      retention: parseInt(process.env.METRICS_RETENTION || '86400000')
    },
    alerting: {
      enabled: process.env.ALERTING_ENABLED !== 'false',
      thresholds: {
        latency: parseInt(process.env.ALERT_LATENCY_THRESHOLD || '1000'),
        errorRate: parseFloat(process.env.ALERT_ERROR_RATE_THRESHOLD || '0.05'),
        throughput: parseInt(process.env.ALERT_THROUGHPUT_THRESHOLD || '100'),
        queueDepth: parseInt(process.env.ALERT_QUEUE_DEPTH_THRESHOLD || '10000')
      }
    },
    tracing: {
      enabled: process.env.TRACING_ENABLED === 'true',
      samplingRate: parseFloat(process.env.TRACING_SAMPLING_RATE || '0.1')
    }
  }
};

const webSocketConfig: WebSocketConfig = {
  server: {
    port: parseInt(process.env.WEBSOCKET_PORT || '8080'),
    host: process.env.WEBSOCKET_HOST || '0.0.0.0',
    path: process.env.WEBSOCKET_PATH || '/ws',
    maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS || '10000'),
    perMessageDeflate: {
      threshold: parseInt(process.env.WS_DEFLATE_THRESHOLD || '1024'),
      concurrencyLimit: parseInt(process.env.WS_DEFLATE_CONCURRENCY || '10'),
      serverMaxWindowBits: parseInt(process.env.WS_SERVER_WINDOW_BITS || '15'),
      clientMaxWindowBits: parseInt(process.env.WS_CLIENT_WINDOW_BITS || '15'),
      serverMaxNoContextTakeover: process.env.WS_SERVER_NO_CONTEXT === 'true',
      clientMaxNoContextTakeover: process.env.WS_CLIENT_NO_CONTEXT === 'true'
    },
    clientTracking: process.env.WS_CLIENT_TRACKING !== 'false',
    maxPayload: parseInt(process.env.WS_MAX_PAYLOAD || '16777216'),
    handleProtocols: process.env.WS_PROTOCOLS?.split(',') || ['websocket'],
    verifyClient: process.env.WS_VERIFY_CLIENT === 'true'
  },
  connection: {
    heartbeat: {
      enabled: process.env.WS_HEARTBEAT_ENABLED !== 'false',
      interval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000'),
      timeout: parseInt(process.env.WS_HEARTBEAT_TIMEOUT || '60000'),
      maxMissed: parseInt(process.env.WS_MAX_MISSED_HEARTBEATS || '3')
    },
    authentication: {
      enabled: process.env.WS_AUTH_ENABLED === 'true',
      timeout: parseInt(process.env.WS_AUTH_TIMEOUT || '10000'),
      retries: parseInt(process.env.WS_AUTH_RETRIES || '3')
    },
    session: {
      timeout: parseInt(process.env.WS_SESSION_TIMEOUT || '3600000'),
      maxIdleTime: parseInt(process.env.WS_MAX_IDLE_TIME || '1800000'),
      persistence: process.env.WS_SESSION_PERSISTENCE === 'true'
    },
    reconnection: {
      maxAttempts: parseInt(process.env.WS_RECONNECT_MAX_ATTEMPTS || '5'),
      backoffMultiplier: parseFloat(process.env.WS_RECONNECT_BACKOFF || '1.5'),
      maxBackoffDelay: parseInt(process.env.WS_RECONNECT_MAX_DELAY || '30000')
    }
  },
  message: {
    maxSize: parseInt(process.env.WS_MESSAGE_MAX_SIZE || '1048576'),
    encoding: (process.env.WS_MESSAGE_ENCODING as any) || 'utf8',
    validation: {
      enabled: process.env.WS_MESSAGE_VALIDATION === 'true',
      strictMode: process.env.WS_VALIDATION_STRICT === 'true'
    },
    serialization: {
      format: (process.env.WS_SERIALIZATION_FORMAT as any) || 'json',
      compression: process.env.WS_MESSAGE_COMPRESSION === 'true'
    },
    ordering: {
      enabled: process.env.WS_MESSAGE_ORDERING === 'true',
      bufferSize: parseInt(process.env.WS_ORDER_BUFFER_SIZE || '1000'),
      timeout: parseInt(process.env.WS_ORDER_TIMEOUT || '5000')
    }
  },
  performance: {
    batching: {
      enabled: process.env.WS_BATCHING_ENABLED === 'true',
      maxBatchSize: parseInt(process.env.WS_BATCH_MAX_SIZE || '10'),
      flushInterval: parseInt(process.env.WS_BATCH_FLUSH_INTERVAL || '100'),
      adaptiveBatching: process.env.WS_ADAPTIVE_BATCHING === 'true'
    },
    connection_pooling: {
      enabled: process.env.WS_CONNECTION_POOLING === 'true',
      maxPoolSize: parseInt(process.env.WS_POOL_MAX_SIZE || '100'),
      idleTimeout: parseInt(process.env.WS_POOL_IDLE_TIMEOUT || '60000'),
      keepAlive: process.env.WS_POOL_KEEP_ALIVE !== 'false'
    },
    caching: {
      enabled: process.env.WS_CACHING_ENABLED === 'true',
      strategy: (process.env.WS_CACHE_STRATEGY as any) || 'lru',
      maxSize: parseInt(process.env.WS_CACHE_MAX_SIZE || '1000'),
      ttl: parseInt(process.env.WS_CACHE_TTL || '300000')
    },
    threading: {
      workerThreads: parseInt(process.env.WS_WORKER_THREADS || '2'),
      maxConcurrency: parseInt(process.env.WS_MAX_CONCURRENCY || '50'),
      queueSize: parseInt(process.env.WS_QUEUE_SIZE || '1000')
    }
  },
  security: {
    authentication: {
      required: process.env.WS_AUTH_REQUIRED === 'true',
      method: (process.env.WS_AUTH_METHOD as any) || 'jwt',
      tokenValidation: process.env.WS_TOKEN_VALIDATION !== 'false',
      refreshTokens: process.env.WS_REFRESH_TOKENS === 'true'
    },
    authorization: {
      enabled: process.env.WS_AUTHORIZATION_ENABLED === 'true',
      rbac: process.env.WS_RBAC_ENABLED === 'true',
      permissions: process.env.WS_PERMISSIONS?.split(',') || []
    },
    encryption: {
      enabled: process.env.WS_ENCRYPTION_ENABLED === 'true',
      algorithm: process.env.WS_ENCRYPTION_ALGORITHM || 'aes-256-gcm',
      keyRotation: process.env.WS_KEY_ROTATION === 'true'
    },
    validation: {
      sanitizeInput: process.env.WS_SANITIZE_INPUT !== 'false',
      validateOrigin: process.env.WS_VALIDATE_ORIGIN === 'true',
      csrfProtection: process.env.WS_CSRF_PROTECTION === 'true'
    }
  },
  compression: {
    enabled: process.env.WS_COMPRESSION_ENABLED === 'true',
    algorithm: (process.env.WS_COMPRESSION_ALGORITHM as any) || 'lz4',
    threshold: parseInt(process.env.WS_COMPRESSION_THRESHOLD || '1024'),
    level: parseInt(process.env.WS_COMPRESSION_LEVEL || '6'),
    windowSize: parseInt(process.env.WS_COMPRESSION_WINDOW_SIZE || '15'),
    memLevel: parseInt(process.env.WS_COMPRESSION_MEM_LEVEL || '8')
  },
  rate_limiting: {
    enabled: process.env.WS_RATE_LIMITING_ENABLED !== 'false',
    connection: {
      maxPerIP: parseInt(process.env.WS_MAX_CONNECTIONS_PER_IP || '100'),
      windowMs: parseInt(process.env.WS_CONNECTION_WINDOW_MS || '60000')
    },
    message: {
      maxPerSecond: parseInt(process.env.WS_MAX_MESSAGES_PER_SECOND || '100'),
      maxPerMinute: parseInt(process.env.WS_MAX_MESSAGES_PER_MINUTE || '1000'),
      maxPerHour: parseInt(process.env.WS_MAX_MESSAGES_PER_HOUR || '10000'),
      burstLimit: parseInt(process.env.WS_BURST_LIMIT || '200')
    },
    penalties: {
      slowDown: process.env.WS_PENALTY_SLOW_DOWN === 'true',
      tempBan: process.env.WS_PENALTY_TEMP_BAN === 'true',
      permaBan: process.env.WS_PENALTY_PERMA_BAN === 'true'
    }
  },
  monitoring: {
    metrics: {
      enabled: process.env.WS_METRICS_ENABLED !== 'false',
      interval: parseInt(process.env.WS_METRICS_INTERVAL || '10000'),
      detailed: process.env.WS_METRICS_DETAILED === 'true'
    },
    tracing: {
      enabled: process.env.WS_TRACING_ENABLED === 'true',
      samplingRate: parseFloat(process.env.WS_TRACING_SAMPLING_RATE || '0.1')
    },
    alerting: {
      enabled: process.env.WS_ALERTING_ENABLED !== 'false',
      thresholds: {
        connectionCount: parseInt(process.env.WS_ALERT_CONNECTION_COUNT || '8000'),
        messageRate: parseInt(process.env.WS_ALERT_MESSAGE_RATE || '1000'),
        errorRate: parseFloat(process.env.WS_ALERT_ERROR_RATE || '0.05'),
        latency: parseInt(process.env.WS_ALERT_LATENCY || '1000'),
        memoryUsage: parseInt(process.env.WS_ALERT_MEMORY_USAGE || '90')
      }
    }
  }
};

const streamingConfig: StreamingConfig = {
  service: {
    name: 'semantest-event-streaming',
    version: '1.0.0',
    maxConcurrentStreams: parseInt(process.env.STREAMING_MAX_CONCURRENT_STREAMS || '1000'),
    streamBufferSize: parseInt(process.env.STREAMING_BUFFER_SIZE || '10000'),
    heartbeatInterval: parseInt(process.env.STREAMING_HEARTBEAT_INTERVAL || '30000'),
    gracefulShutdownTimeout: parseInt(process.env.STREAMING_SHUTDOWN_TIMEOUT || '30000')
  },
  routing: {
    strategies: [
      {
        name: 'topic_based',
        type: 'topic',
        rules: [
          {
            id: 'events_to_websocket',
            condition: {
              type: 'equals',
              field: 'type',
              value: 'user_event'
            },
            action: {
              type: 'route',
              target: 'websocket:user_events'
            },
            enabled: true,
            priority: 1
          },
          {
            id: 'notifications_to_websocket',
            condition: {
              type: 'equals',
              field: 'type',
              value: 'notification'
            },
            action: {
              type: 'route',
              target: 'websocket:notifications'
            },
            enabled: true,
            priority: 1
          }
        ],
        enabled: true,
        priority: 1
      }
    ],
    defaultStrategy: 'topic_based',
    failoverStrategy: 'topic_based',
    loadBalancing: {
      enabled: process.env.STREAMING_LOAD_BALANCING === 'true',
      algorithm: (process.env.STREAMING_LB_ALGORITHM as any) || 'round_robin',
      healthChecks: process.env.STREAMING_LB_HEALTH_CHECKS !== 'false'
    },
    circuitBreaker: {
      enabled: process.env.STREAMING_CIRCUIT_BREAKER === 'true',
      failureThreshold: parseInt(process.env.STREAMING_CB_FAILURE_THRESHOLD || '10'),
      recoveryTimeout: parseInt(process.env.STREAMING_CB_RECOVERY_TIMEOUT || '60000'),
      halfOpenRetries: parseInt(process.env.STREAMING_CB_HALF_OPEN_RETRIES || '3')
    }
  },
  filtering: {
    enabled: process.env.STREAMING_FILTERING_ENABLED === 'true',
    strategies: [],
    defaultAction: (process.env.STREAMING_DEFAULT_FILTER_ACTION as any) || 'allow',
    rateLimit: {
      enabled: process.env.STREAMING_RATE_LIMIT_ENABLED === 'true',
      maxMessagesPerSecond: parseInt(process.env.STREAMING_MAX_MESSAGES_PER_SECOND || '10000'),
      burstLimit: parseInt(process.env.STREAMING_BURST_LIMIT || '20000')
    }
  },
  transformation: {
    enabled: process.env.STREAMING_TRANSFORMATION_ENABLED === 'true',
    strategies: [],
    pipeline: []
  },
  aggregation: {
    enabled: process.env.STREAMING_AGGREGATION_ENABLED === 'true',
    strategies: [],
    windows: []
  },
  persistence: {
    enabled: process.env.STREAMING_PERSISTENCE_ENABLED === 'true',
    strategy: (process.env.STREAMING_PERSISTENCE_STRATEGY as any) || 'kafka',
    compression: process.env.STREAMING_PERSISTENCE_COMPRESSION !== 'false',
    encryption: process.env.STREAMING_PERSISTENCE_ENCRYPTION === 'true',
    retention: {
      duration: parseInt(process.env.STREAMING_RETENTION_DURATION || '604800000'),
      maxSize: parseInt(process.env.STREAMING_RETENTION_MAX_SIZE || '1073741824'),
      policy: (process.env.STREAMING_RETENTION_POLICY as any) || 'time'
    },
    backup: {
      enabled: process.env.STREAMING_BACKUP_ENABLED === 'true',
      interval: parseInt(process.env.STREAMING_BACKUP_INTERVAL || '86400000'),
      location: process.env.STREAMING_BACKUP_LOCATION || '/tmp/streaming-backup'
    }
  },
  performance: {
    batching: {
      enabled: process.env.STREAMING_BATCHING_ENABLED !== 'false',
      maxBatchSize: parseInt(process.env.STREAMING_BATCH_MAX_SIZE || '1000'),
      maxWaitTime: parseInt(process.env.STREAMING_BATCH_MAX_WAIT || '100'),
      adaptiveBatching: process.env.STREAMING_ADAPTIVE_BATCHING !== 'false'
    },
    parallelism: {
      enabled: process.env.STREAMING_PARALLELISM_ENABLED !== 'false',
      maxWorkers: parseInt(process.env.STREAMING_MAX_WORKERS || '8'),
      queueSize: parseInt(process.env.STREAMING_QUEUE_SIZE || '10000')
    },
    caching: {
      enabled: process.env.STREAMING_CACHING_ENABLED === 'true',
      strategy: (process.env.STREAMING_CACHE_STRATEGY as any) || 'lru',
      maxSize: parseInt(process.env.STREAMING_CACHE_MAX_SIZE || '10000'),
      ttl: parseInt(process.env.STREAMING_CACHE_TTL || '300000')
    },
    optimization: {
      compression: process.env.STREAMING_OPTIMIZATION_COMPRESSION !== 'false',
      deduplication: process.env.STREAMING_OPTIMIZATION_DEDUPLICATION !== 'false',
      prefetching: process.env.STREAMING_OPTIMIZATION_PREFETCHING === 'true',
      memoryPooling: process.env.STREAMING_OPTIMIZATION_MEMORY_POOLING === 'true'
    }
  },
  monitoring: {
    metrics: {
      enabled: process.env.STREAMING_METRICS_ENABLED !== 'false',
      interval: parseInt(process.env.STREAMING_METRICS_INTERVAL || '10000'),
      retention: parseInt(process.env.STREAMING_METRICS_RETENTION || '86400000'),
      detailed: process.env.STREAMING_METRICS_DETAILED === 'true'
    },
    alerting: {
      enabled: process.env.STREAMING_ALERTING_ENABLED !== 'false',
      thresholds: {
        messageRate: parseInt(process.env.STREAMING_ALERT_MESSAGE_RATE || '5000'),
        errorRate: parseFloat(process.env.STREAMING_ALERT_ERROR_RATE || '0.05'),
        latency: parseInt(process.env.STREAMING_ALERT_LATENCY || '1000'),
        queueDepth: parseInt(process.env.STREAMING_ALERT_QUEUE_DEPTH || '10000'),
        memoryUsage: parseInt(process.env.STREAMING_ALERT_MEMORY_USAGE || '90'),
        connectionCount: parseInt(process.env.STREAMING_ALERT_CONNECTION_COUNT || '8000')
      },
      channels: process.env.STREAMING_ALERT_CHANNELS?.split(',') || ['webhook']
    },
    tracing: {
      enabled: process.env.STREAMING_TRACING_ENABLED === 'true',
      samplingRate: parseFloat(process.env.STREAMING_TRACING_SAMPLING_RATE || '0.1'),
      detailed: process.env.STREAMING_TRACING_DETAILED === 'true'
    },
    logging: {
      level: (process.env.STREAMING_LOG_LEVEL as any) || 'info',
      structured: process.env.STREAMING_LOG_STRUCTURED !== 'false',
      includePayload: process.env.STREAMING_LOG_INCLUDE_PAYLOAD === 'true'
    }
  }
};

const monitoringConfig: RealTimeMonitoringConfig = {
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    interval: parseInt(process.env.MONITORING_INTERVAL || '5000'),
    retention: parseInt(process.env.MONITORING_RETENTION || '86400000'),
    detailed: process.env.MONITORING_DETAILED === 'true',
    realtime: process.env.MONITORING_REALTIME !== 'false',
    sampling: {
      enabled: process.env.MONITORING_SAMPLING_ENABLED === 'true',
      rate: parseFloat(process.env.MONITORING_SAMPLING_RATE || '1.0'),
      adaptive: process.env.MONITORING_ADAPTIVE_SAMPLING === 'true'
    },
    metrics: {
      system: process.env.MONITORING_SYSTEM_METRICS !== 'false',
      application: process.env.MONITORING_APPLICATION_METRICS !== 'false',
      business: process.env.MONITORING_BUSINESS_METRICS === 'true',
      custom: process.env.MONITORING_CUSTOM_METRICS === 'true'
    }
  },
  health: {
    enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'),
    retries: parseInt(process.env.HEALTH_CHECK_RETRIES || '3'),
    degraded_threshold: parseFloat(process.env.HEALTH_DEGRADED_THRESHOLD || '0.8'),
    unhealthy_threshold: parseFloat(process.env.HEALTH_UNHEALTHY_THRESHOLD || '0.5'),
    components: [
      {
        name: 'kafka',
        type: 'queue',
        timeout: 5000,
        critical: true,
        checks: [
          {
            name: 'kafka_connectivity',
            type: 'ping',
            parameters: {},
            expected: 'connected',
            timeout: 3000
          }
        ]
      },
      {
        name: 'redis',
        type: 'cache',
        timeout: 5000,
        critical: true,
        checks: [
          {
            name: 'redis_connectivity',
            type: 'ping',
            parameters: {},
            expected: 'PONG',
            timeout: 3000
          }
        ]
      },
      {
        name: 'websocket',
        type: 'websocket',
        timeout: 5000,
        critical: false,
        checks: [
          {
            name: 'websocket_connections',
            type: 'custom',
            parameters: { max_connections: 10000 },
            expected: true,
            timeout: 1000
          }
        ]
      }
    ],
    dependencies: [
      {
        name: 'external_kafka',
        type: 'kafka',
        connection: process.env.KAFKA_BROKERS?.split(',')[0] || 'localhost:9092',
        timeout: 10000,
        critical: true,
        circuit_breaker: {
          enabled: true,
          failure_threshold: 5,
          recovery_timeout: 60000
        }
      },
      {
        name: 'external_redis',
        type: 'redis',
        connection: process.env.REDIS_CLUSTER_NODES || 'localhost:6379',
        timeout: 10000,
        critical: true,
        circuit_breaker: {
          enabled: true,
          failure_threshold: 5,
          recovery_timeout: 60000
        }
      }
    ]
  },
  alerting: {
    enabled: process.env.ALERTING_ENABLED !== 'false',
    channels: [
      {
        name: 'webhook',
        type: 'webhook',
        config: {
          url: process.env.ALERT_WEBHOOK_URL || 'http://localhost:9093/api/v1/alerts'
        },
        severity_filter: ['medium', 'high', 'critical'],
        enabled: true
      }
    ],
    rules: [
      {
        name: 'high_error_rate',
        condition: {
          metric: 'application.message_queue.error_rate',
          operator: 'gt',
          value: 0.05,
          duration: 60000
        },
        severity: 'high',
        message: 'Message queue error rate is above 5%',
        enabled: true,
        cooldown: 300000
      },
      {
        name: 'high_latency',
        condition: {
          metric: 'application.websocket.latency.p95',
          operator: 'gt',
          value: 1000,
          duration: 30000
        },
        severity: 'medium',
        message: 'WebSocket latency P95 is above 1000ms',
        enabled: true,
        cooldown: 180000
      },
      {
        name: 'high_memory_usage',
        condition: {
          metric: 'system.memory.percentage',
          operator: 'gt',
          value: 90,
          duration: 120000
        },
        severity: 'critical',
        message: 'System memory usage is above 90%',
        enabled: true,
        cooldown: 300000
      }
    ],
    escalation: {
      enabled: process.env.ALERT_ESCALATION_ENABLED === 'true',
      levels: [
        {
          level: 1,
          delay: 300000,
          channels: ['webhook'],
          actions: ['log']
        },
        {
          level: 2,
          delay: 600000,
          channels: ['webhook'],
          actions: ['log', 'notify']
        }
      ],
      timeout: 3600000
    },
    suppression: {
      enabled: process.env.ALERT_SUPPRESSION_ENABLED === 'true',
      window: parseInt(process.env.ALERT_SUPPRESSION_WINDOW || '300000'),
      max_alerts: parseInt(process.env.ALERT_SUPPRESSION_MAX_ALERTS || '10')
    }
  },
  dashboard: {
    enabled: process.env.DASHBOARD_ENABLED === 'true',
    port: parseInt(process.env.DASHBOARD_PORT || '3000'),
    realtime: process.env.DASHBOARD_REALTIME !== 'false',
    refresh_interval: parseInt(process.env.DASHBOARD_REFRESH_INTERVAL || '5000'),
    widgets: [],
    themes: {
      default: 'dark',
      available: ['light', 'dark', 'high-contrast']
    }
  },
  logging: {
    enabled: process.env.LOGGING_ENABLED !== 'false',
    level: (process.env.LOG_LEVEL as any) || 'info',
    structured: process.env.LOG_STRUCTURED !== 'false',
    include_traces: process.env.LOG_INCLUDE_TRACES === 'true',
    destinations: [
      {
        name: 'console',
        type: 'console',
        config: {},
        level_filter: ['info', 'warn', 'error'],
        enabled: true
      }
    ],
    sampling: {
      enabled: process.env.LOG_SAMPLING_ENABLED === 'true',
      rate: parseFloat(process.env.LOG_SAMPLING_RATE || '1.0')
    }
  },
  reporting: {
    enabled: process.env.REPORTING_ENABLED === 'true',
    schedules: [
      {
        name: 'daily_performance',
        type: 'performance',
        frequency: 'daily',
        time: '06:00',
        recipients: process.env.REPORT_RECIPIENTS?.split(',') || [],
        enabled: true
      }
    ],
    formats: ['json', 'csv'],
    delivery: {
      enabled: process.env.REPORT_DELIVERY_ENABLED === 'true',
      channels: ['email']
    }
  }
};

// Logger setup
const logger: Logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
  },
  debug: (message: string, meta?: any) => {
    if (process.env.DEBUG === 'true') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }
};

/**
 * Main application with Kafka + Redis streaming system
 */
async function main(): Promise<void> {
  // Initialize components
  const messageQueue = new KafkaRedisQueueManager(messageQueueConfig, logger);
  const webSocketHandlers = new OptimizedWebSocketHandlers(webSocketConfig, messageQueue, logger);
  const streamingService = new EventStreamingService(streamingConfig, messageQueue, webSocketHandlers, logger);
  const monitoring = new RealTimeMonitoring(monitoringConfig, logger);

  try {
    logger.info('🚀 Starting Kafka + Redis Real-time Streaming System...');

    // Start components in order
    logger.info('📡 Starting message queue...');
    await messageQueue.start();

    logger.info('🔌 Starting WebSocket handlers...');
    await webSocketHandlers.start();

    logger.info('🌊 Starting event streaming service...');
    await streamingService.start();

    logger.info('📊 Starting monitoring system...');
    monitoring.connectServices({
      messageQueue,
      webSocketHandlers,
      streamingService
    });
    await monitoring.start();

    // Create sample streams
    logger.info('🎯 Creating sample event streams...');
    await streamingService.createStream('user_events', {
      source: 'kafka',
      destinations: ['websocket:user_events', 'topic:analytics'],
      routing: 'topic_based'
    });

    await streamingService.createStream('notifications', {
      source: 'websocket',
      destinations: ['websocket:notifications', 'topic:user_notifications'],
      routing: 'topic_based'
    });

    // Print system information
    logger.info('✅ Kafka + Redis Real-time Streaming System started successfully!', {
      messageQueue: {
        brokers: messageQueueConfig.kafka.brokers.length,
        redisNodes: messageQueueConfig.redis.nodes.length,
        deduplication: messageQueueConfig.deduplication.enabled,
        deadLetterQueue: messageQueueConfig.deadLetterQueue.enabled
      },
      webSocket: {
        port: webSocketConfig.server.port,
        maxConnections: webSocketConfig.server.maxConnections,
        compression: webSocketConfig.compression.enabled,
        rateLimiting: webSocketConfig.rate_limiting.enabled
      },
      streaming: {
        maxStreams: streamingConfig.service.maxConcurrentStreams,
        routing: streamingConfig.routing.strategies.length,
        filtering: streamingConfig.filtering.enabled,
        transformation: streamingConfig.transformation.enabled
      },
      monitoring: {
        realtime: monitoringConfig.monitoring.realtime,
        alerting: monitoringConfig.alerting.enabled,
        dashboard: monitoringConfig.dashboard.enabled
      }
    });

    // Start demo/testing if enabled
    if (process.env.RUN_DEMO === 'true') {
      logger.info('🎪 Starting demonstration mode...');
      await runDemo(messageQueue, webSocketHandlers, streamingService, monitoring);
    }

    // Keep the process running
    logger.info('🎧 System running. Press Ctrl+C to stop...');
    
    // Setup graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    async function gracefulShutdown(signal: string): Promise<void> {
      logger.info(`🛑 Received ${signal}, starting graceful shutdown...`);

      try {
        logger.info('📊 Stopping monitoring...');
        await monitoring.stop();

        logger.info('🌊 Stopping streaming service...');
        await streamingService.stop();

        logger.info('🔌 Stopping WebSocket handlers...');
        await webSocketHandlers.stop();

        logger.info('📡 Stopping message queue...');
        await messageQueue.stop();

        logger.info('✅ Graceful shutdown completed');
        process.exit(0);

      } catch (error) {
        logger.error('❌ Error during graceful shutdown', { error: error.message });
        process.exit(1);
      }
    }

    // Keep process alive
    process.stdin.resume();

  } catch (error) {
    logger.error('❌ Failed to start Kafka + Redis streaming system', { 
      error: error.message,
      stack: error.stack 
    });
    process.exit(1);
  }
}

/**
 * Demonstration mode
 */
async function runDemo(
  messageQueue: KafkaRedisQueueManager,
  webSocketHandlers: OptimizedWebSocketHandlers,
  streamingService: EventStreamingService,
  monitoring: RealTimeMonitoring
): Promise<void> {
  
  logger.info('🎪 Demo: Publishing sample messages...');

  // Demo: Publish sample messages
  setInterval(async () => {
    try {
      // Publish user event
      await messageQueue.publish({
        topic: 'user-events',
        value: {
          userId: `user_${Math.floor(Math.random() * 1000)}`,
          event: 'page_view',
          page: '/dashboard',
          timestamp: Date.now()
        },
        priority: 'medium',
        maxRetries: 3,
        metadata: {
          source: 'demo',
          eventType: 'user_interaction',
          version: '1.0',
          compressed: false,
          encrypted: false,
          size: 150,
          checksum: 'demo_checksum'
        }
      });

      // Publish notification
      await messageQueue.publish({
        topic: 'notifications',
        value: {
          userId: `user_${Math.floor(Math.random() * 1000)}`,
          type: 'info',
          title: 'Demo Notification',
          message: 'This is a demo notification from the streaming system',
          timestamp: Date.now()
        },
        priority: 'high',
        maxRetries: 3,
        metadata: {
          source: 'demo',
          eventType: 'notification',
          version: '1.0',
          compressed: false,
          encrypted: false,
          size: 200,
          checksum: 'demo_checksum'
        }
      });

    } catch (error) {
      logger.error('Demo message publishing failed', { error: error.message });
    }
  }, 5000);

  // Demo: Print metrics every 30 seconds
  setInterval(async () => {
    try {
      const queueStats = await messageQueue.getStats();
      const streamingMetrics = streamingService.getMetrics();
      const wsMetrics = webSocketHandlers.getMetrics();
      const monitoringMetrics = monitoring.getCurrentMetrics();

      logger.info('📊 Demo Metrics Summary', {
        messageQueue: {
          messagesProcessed: queueStats.kafka.messagesPerSecond,
          errorRate: queueStats.performance.errorRate,
          deduplication: queueStats.deduplication.duplicates
        },
        webSocket: {
          connections: wsMetrics.connections.active,
          messagesRate: wsMetrics.messages.rate,
          avgLatency: wsMetrics.performance.averageLatency
        },
        streaming: {
          activeStreams: streamingMetrics.streams.active,
          messagesProcessed: streamingMetrics.messages.processed,
          routingDecisions: streamingMetrics.routing.strategies
        },
        system: {
          uptime: monitoring.getUptime(),
          health: monitoring.getCurrentHealth()?.overall
        }
      });

    } catch (error) {
      logger.error('Demo metrics collection failed', { error: error.message });
    }
  }, 30000);

  logger.info('🎪 Demo mode active - publishing sample data every 5 seconds');
}

/**
 * Performance test runner
 */
async function runPerformanceTest(): Promise<void> {
  logger.info('🏁 Running performance test...');
  
  const messageQueue = new KafkaRedisQueueManager(messageQueueConfig, logger);
  const webSocketHandlers = new OptimizedWebSocketHandlers(webSocketConfig, messageQueue, logger);
  const streamingService = new EventStreamingService(streamingConfig, messageQueue, webSocketHandlers, logger);
  
  try {
    await messageQueue.start();
    await webSocketHandlers.start();
    await streamingService.start();

    // Performance test implementation
    const testDuration = parseInt(process.env.PERF_TEST_DURATION || '60000');
    const messageRate = parseInt(process.env.PERF_TEST_MESSAGE_RATE || '1000');
    const testStartTime = Date.now();

    logger.info('🚀 Performance test started', {
      duration: testDuration,
      messageRate,
      estimatedMessages: (testDuration / 1000) * messageRate
    });

    const publishInterval = setInterval(async () => {
      const batchSize = 10;
      const promises = [];

      for (let i = 0; i < batchSize; i++) {
        promises.push(
          messageQueue.publish({
            topic: 'performance-test',
            value: {
              testId: 'perf_test',
              messageId: Math.random().toString(36),
              timestamp: Date.now(),
              data: 'x'.repeat(1000) // 1KB message
            },
            priority: 'medium',
            maxRetries: 3,
            metadata: {
              source: 'performance_test',
              eventType: 'test_message',
              version: '1.0',
              compressed: false,
              encrypted: false,
              size: 1024,
              checksum: 'test_checksum'
            }
          })
        );
      }

      await Promise.allSettled(promises);
    }, (1000 / messageRate) * 10);

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, testDuration));
    clearInterval(publishInterval);

    // Get final stats
    const stats = await messageQueue.getStats();
    const testEndTime = Date.now();
    const actualDuration = testEndTime - testStartTime;

    logger.info('🏁 Performance test completed', {
      duration: actualDuration,
      messagesPublished: stats.kafka.messagesPerSecond * (actualDuration / 1000),
      avgLatency: stats.performance.latency.avg,
      p95Latency: stats.performance.latency.p95,
      p99Latency: stats.performance.latency.p99,
      errorRate: stats.performance.errorRate,
      throughput: stats.performance.throughput
    });

    await streamingService.stop();
    await webSocketHandlers.stop();
    await messageQueue.stop();

  } catch (error) {
    logger.error('Performance test failed', { error: error.message });
    process.exit(1);
  }
}

// Command line handling
const command = process.argv[2];

switch (command) {
  case 'test':
    runPerformanceTest();
    break;
  case 'demo':
    process.env.RUN_DEMO = 'true';
    main();
    break;
  default:
    main();
}

export { main, messageQueueConfig, webSocketConfig, streamingConfig, monitoringConfig, logger };