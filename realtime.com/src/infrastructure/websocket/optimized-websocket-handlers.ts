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
 * @fileoverview Performance-Optimized WebSocket Handlers with Advanced Features
 * @author Semantest Team
 * @module infrastructure/websocket/OptimizedWebSocketHandlers
 */

import { EventEmitter } from 'events';
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { Logger } from '@shared/infrastructure/logger';
import { KafkaRedisQueueManager, QueueMessage } from '../message-queue/kafka-redis-queue-manager';
import * as crypto from 'crypto';
import * as LZ4 from 'lz4';

export interface WebSocketConfig {
  server: WebSocketServerConfig;
  connection: ConnectionConfig;
  message: MessageConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  compression: CompressionConfig;
  rate_limiting: RateLimitingConfig;
  monitoring: MonitoringConfig;
}

export interface WebSocketServerConfig {
  port: number;
  host: string;
  path: string;
  maxConnections: number;
  perMessageDeflate: {
    threshold: number;
    concurrencyLimit: number;
    serverMaxWindowBits: number;
    clientMaxWindowBits: number;
    serverMaxNoContextTakeover: boolean;
    clientMaxNoContextTakeover: boolean;
  };
  clientTracking: boolean;
  maxPayload: number;
  handleProtocols: string[];
  verifyClient: boolean;
}

export interface ConnectionConfig {
  heartbeat: {
    enabled: boolean;
    interval: number;
    timeout: number;
    maxMissed: number;
  };
  authentication: {
    enabled: boolean;
    timeout: number;
    retries: number;
  };
  session: {
    timeout: number;
    maxIdleTime: number;
    persistence: boolean;
  };
  reconnection: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxBackoffDelay: number;
  };
}

export interface MessageConfig {
  maxSize: number;
  encoding: 'utf8' | 'binary' | 'base64';
  validation: {
    enabled: boolean;
    schema?: any;
    strictMode: boolean;
  };
  serialization: {
    format: 'json' | 'msgpack' | 'protobuf';
    compression: boolean;
  };
  ordering: {
    enabled: boolean;
    bufferSize: number;
    timeout: number;
  };
}

export interface PerformanceConfig {
  batching: {
    enabled: boolean;
    maxBatchSize: number;
    flushInterval: number;
    adaptiveBatching: boolean;
  };
  connection_pooling: {
    enabled: boolean;
    maxPoolSize: number;
    idleTimeout: number;
    keepAlive: boolean;
  };
  caching: {
    enabled: boolean;
    strategy: 'lru' | 'lfu' | 'ttl';
    maxSize: number;
    ttl: number;
  };
  threading: {
    workerThreads: number;
    maxConcurrency: number;
    queueSize: number;
  };
}

export interface SecurityConfig {
  authentication: {
    required: boolean;
    method: 'jwt' | 'oauth' | 'api_key' | 'custom';
    tokenValidation: boolean;
    refreshTokens: boolean;
  };
  authorization: {
    enabled: boolean;
    rbac: boolean;
    permissions: string[];
  };
  encryption: {
    enabled: boolean;
    algorithm: string;
    keyRotation: boolean;
  };
  validation: {
    sanitizeInput: boolean;
    validateOrigin: boolean;
    csrfProtection: boolean;
  };
}

export interface CompressionConfig {
  enabled: boolean;
  algorithm: 'gzip' | 'deflate' | 'lz4' | 'brotli';
  threshold: number;
  level: number;
  windowSize: number;
  memLevel: number;
}

export interface RateLimitingConfig {
  enabled: boolean;
  connection: {
    maxPerIP: number;
    windowMs: number;
  };
  message: {
    maxPerSecond: number;
    maxPerMinute: number;
    maxPerHour: number;
    burstLimit: number;
  };
  penalties: {
    slowDown: boolean;
    tempBan: boolean;
    permaBan: boolean;
  };
}

export interface MonitoringConfig {
  metrics: {
    enabled: boolean;
    interval: number;
    detailed: boolean;
  };
  tracing: {
    enabled: boolean;
    samplingRate: number;
  };
  alerting: {
    enabled: boolean;
    thresholds: AlertThresholds;
  };
}

export interface AlertThresholds {
  connectionCount: number;
  messageRate: number;
  errorRate: number;
  latency: number;
  memoryUsage: number;
}

export interface WebSocketConnection {
  id: string;
  socket: WebSocket;
  authenticated: boolean;
  userId?: string;
  sessionId: string;
  connectedAt: Date;
  lastActivity: Date;
  heartbeatCount: number;
  missedHeartbeats: number;
  messageCount: number;
  bytesReceived: number;
  bytesSent: number;
  subscriptions: Set<string>;
  metadata: Record<string, any>;
  rateLimiter: ConnectionRateLimiter;
}

export interface WebSocketMessage {
  id: string;
  type: string;
  payload: any;
  headers?: Record<string, string>;
  timestamp: number;
  connectionId: string;
  compressed: boolean;
  encrypted: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  ttl?: number;
  sequenceNumber?: number;
}

export interface HandlerMetrics {
  connections: {
    total: number;
    active: number;
    authenticated: number;
    peak: number;
  };
  messages: {
    received: number;
    sent: number;
    queued: number;
    processed: number;
    failed: number;
    rate: number;
  };
  performance: {
    averageLatency: number;
    p95Latency: number;
    p99Latency: number;
    throughput: number;
    errorRate: number;
  };
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    networkIO: number;
  };
}

/**
 * High-performance WebSocket handler with advanced optimizations
 */
export class OptimizedWebSocketHandlers extends EventEmitter {
  private wsServer: WebSocketServer;
  private connections: Map<string, WebSocketConnection> = new Map();
  private messageQueue: KafkaRedisQueueManager;
  private rateLimiters: Map<string, GlobalRateLimiter> = new Map();
  private messageCache: Map<string, WebSocketMessage> = new Map();
  private metricsCollector: WebSocketMetricsCollector;
  private compressionManager: CompressionManager;
  private securityManager: SecurityManager;
  private isRunning = false;
  private metrics: HandlerMetrics;

  constructor(
    private readonly config: WebSocketConfig,
    messageQueue: KafkaRedisQueueManager,
    private readonly logger: Logger
  ) {
    super();
    this.messageQueue = messageQueue;
    this.initializeComponents();
    this.setupEventHandlers();
    this.initializeMetrics();
  }

  /**
   * Initialize components
   */
  private initializeComponents(): void {
    // Initialize WebSocket server
    this.wsServer = new WebSocketServer({
      port: this.config.server.port,
      host: this.config.server.host,
      path: this.config.server.path,
      perMessageDeflate: this.config.server.perMessageDeflate,
      clientTracking: this.config.server.clientTracking,
      maxPayload: this.config.server.maxPayload,
      handleProtocols: this.config.server.handleProtocols,
      verifyClient: this.config.server.verifyClient ? this.verifyClient.bind(this) : undefined
    });

    // Initialize specialized components
    this.metricsCollector = new WebSocketMetricsCollector(
      this.config.monitoring,
      this.logger
    );

    this.compressionManager = new CompressionManager(
      this.config.compression,
      this.logger
    );

    this.securityManager = new SecurityManager(
      this.config.security,
      this.logger
    );
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // WebSocket server events
    this.wsServer.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    this.wsServer.on('error', (error: Error) => {
      this.logger.error('WebSocket server error', { error: error.message });
      this.emit('server_error', error);
    });

    this.wsServer.on('headers', (headers: string[], request: IncomingMessage) => {
      this.handleHeaders(headers, request);
    });

    // Message queue events
    this.messageQueue.on('message_processed', (message: QueueMessage) => {
      this.handleQueueMessage(message);
    });

    this.messageQueue.on('message_failed', (message: QueueMessage, error: Error) => {
      this.handleQueueMessageFailure(message, error);
    });

    // Metrics events
    this.metricsCollector.on('metrics_collected', (metrics: any) => {
      this.updateMetrics(metrics);
    });

    this.metricsCollector.on('alert_triggered', (alert: any) => {
      this.handleAlert(alert);
    });
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): void {
    this.metrics = {
      connections: {
        total: 0,
        active: 0,
        authenticated: 0,
        peak: 0
      },
      messages: {
        received: 0,
        sent: 0,
        queued: 0,
        processed: 0,
        failed: 0,
        rate: 0
      },
      performance: {
        averageLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        throughput: 0,
        errorRate: 0
      },
      resources: {
        memoryUsage: 0,
        cpuUsage: 0,
        networkIO: 0
      }
    };
  }

  /**
   * Start WebSocket handlers
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('WebSocket handlers are already running');
    }

    try {
      this.logger.info('Starting optimized WebSocket handlers...');

      // Start components
      await this.metricsCollector.start();
      await this.compressionManager.start();
      await this.securityManager.start();

      // Start heartbeat system
      if (this.config.connection.heartbeat.enabled) {
        this.startHeartbeatSystem();
      }

      // Start rate limiting cleanup
      if (this.config.rate_limiting.enabled) {
        this.startRateLimitingCleanup();
      }

      // Start metrics collection
      this.startMetricsCollection();

      this.isRunning = true;
      this.emit('handlers_started');

      this.logger.info('Optimized WebSocket handlers started successfully', {
        port: this.config.server.port,
        maxConnections: this.config.server.maxConnections
      });

    } catch (error) {
      this.logger.error('Failed to start WebSocket handlers', { error: error.message });
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop WebSocket handlers
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.logger.info('Stopping optimized WebSocket handlers...');

      this.isRunning = false;

      // Close all connections
      for (const [connectionId, connection] of this.connections) {
        this.closeConnection(connectionId, 1001, 'Server shutting down');
      }

      // Close WebSocket server
      this.wsServer.close();

      // Stop components
      await this.metricsCollector.stop();
      await this.compressionManager.stop();
      await this.securityManager.stop();

      this.emit('handlers_stopped');

      this.logger.info('Optimized WebSocket handlers stopped');

    } catch (error) {
      this.logger.error('Error stopping WebSocket handlers', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WebSocket, request: IncomingMessage): Promise<void> {
    const connectionId = this.generateConnectionId();
    
    try {
      // Check connection limits
      if (this.connections.size >= this.config.server.maxConnections) {
        ws.close(1013, 'Server overloaded');
        return;
      }

      // Apply rate limiting
      if (this.config.rate_limiting.enabled) {
        const clientIP = this.getClientIP(request);
        if (!this.checkConnectionRateLimit(clientIP)) {
          ws.close(1008, 'Rate limit exceeded');
          return;
        }
      }

      // Create connection object
      const connection: WebSocketConnection = {
        id: connectionId,
        socket: ws,
        authenticated: !this.config.security.authentication.required,
        sessionId: this.generateSessionId(),
        connectedAt: new Date(),
        lastActivity: new Date(),
        heartbeatCount: 0,
        missedHeartbeats: 0,
        messageCount: 0,
        bytesReceived: 0,
        bytesSent: 0,
        subscriptions: new Set(),
        metadata: {},
        rateLimiter: new ConnectionRateLimiter(this.config.rate_limiting.message, this.logger)
      };

      // Store connection
      this.connections.set(connectionId, connection);

      // Setup connection event handlers
      this.setupConnectionHandlers(connection);

      // Update metrics
      this.metrics.connections.total++;
      this.metrics.connections.active++;
      this.metrics.connections.peak = Math.max(this.metrics.connections.peak, this.metrics.connections.active);

      // Send connection established message
      await this.sendMessage(connection, {
        type: 'connection_established',
        payload: {
          connectionId,
          sessionId: connection.sessionId,
          serverTime: Date.now()
        },
        priority: 'high'
      });

      this.logger.info('WebSocket connection established', {
        connectionId,
        clientIP: this.getClientIP(request),
        totalConnections: this.connections.size
      });

      this.emit('connection_established', { connectionId, connection });

    } catch (error) {
      this.logger.error('Error handling WebSocket connection', {
        connectionId,
        error: error.message
      });

      ws.close(1011, 'Internal server error');
    }
  }

  /**
   * Setup connection-specific event handlers
   */
  private setupConnectionHandlers(connection: WebSocketConnection): void {
    const { socket, id: connectionId } = connection;

    // Message handler
    socket.on('message', async (data: Buffer) => {
      await this.handleMessage(connection, data);
    });

    // Close handler
    socket.on('close', (code: number, reason: string) => {
      this.handleConnectionClose(connectionId, code, reason.toString());
    });

    // Error handler
    socket.on('error', (error: Error) => {
      this.handleConnectionError(connectionId, error);
    });

    // Pong handler (heartbeat response)
    socket.on('pong', () => {
      this.handlePong(connectionId);
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(connection: WebSocketConnection, data: Buffer): Promise<void> {
    const startTime = Date.now();

    try {
      // Update connection activity
      connection.lastActivity = new Date();
      connection.messageCount++;
      connection.bytesReceived += data.length;

      // Apply rate limiting
      if (this.config.rate_limiting.enabled) {
        if (!connection.rateLimiter.checkRateLimit()) {
          await this.sendError(connection, 'rate_limit_exceeded', 'Message rate limit exceeded');
          return;
        }
      }

      // Parse message
      const message = await this.parseMessage(connection, data);
      if (!message) {
        return;
      }

      // Validate message
      if (this.config.message.validation.enabled) {
        const isValid = await this.validateMessage(message);
        if (!isValid) {
          await this.sendError(connection, 'invalid_message', 'Message validation failed');
          return;
        }
      }

      // Check authentication for protected messages
      if (this.config.security.authentication.required && !connection.authenticated) {
        if (message.type !== 'authenticate') {
          await this.sendError(connection, 'authentication_required', 'Authentication required');
          return;
        }
      }

      // Route message based on type
      await this.routeMessage(connection, message);

      // Update metrics
      this.metrics.messages.received++;
      const processingTime = Date.now() - startTime;
      this.metricsCollector.recordMessageProcessed(processingTime, true);

      this.logger.debug('Message processed', {
        connectionId: connection.id,
        messageType: message.type,
        processingTime
      });

    } catch (error) {
      this.logger.error('Error handling WebSocket message', {
        connectionId: connection.id,
        error: error.message
      });

      this.metrics.messages.failed++;
      await this.sendError(connection, 'processing_error', 'Message processing failed');
    }
  }

  /**
   * Route message to appropriate handler
   */
  private async routeMessage(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case 'authenticate':
        await this.handleAuthentication(connection, message);
        break;

      case 'subscribe':
        await this.handleSubscription(connection, message);
        break;

      case 'unsubscribe':
        await this.handleUnsubscription(connection, message);
        break;

      case 'publish':
        await this.handlePublish(connection, message);
        break;

      case 'ping':
        await this.handlePing(connection, message);
        break;

      case 'heartbeat':
        await this.handleHeartbeat(connection, message);
        break;

      default:
        await this.handleCustomMessage(connection, message);
    }
  }

  /**
   * Handle authentication message
   */
  private async handleAuthentication(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    try {
      const authResult = await this.securityManager.authenticate(message.payload);

      if (authResult.success) {
        connection.authenticated = true;
        connection.userId = authResult.userId;
        connection.metadata.permissions = authResult.permissions;

        this.metrics.connections.authenticated++;

        await this.sendMessage(connection, {
          type: 'authentication_success',
          payload: {
            userId: authResult.userId,
            permissions: authResult.permissions
          },
          priority: 'high'
        });

        this.logger.info('WebSocket authentication successful', {
          connectionId: connection.id,
          userId: authResult.userId
        });

      } else {
        await this.sendError(connection, 'authentication_failed', authResult.error);
        
        // Close connection after failed authentication
        setTimeout(() => {
          this.closeConnection(connection.id, 1008, 'Authentication failed');
        }, 1000);
      }

    } catch (error) {
      this.logger.error('Authentication error', {
        connectionId: connection.id,
        error: error.message
      });

      await this.sendError(connection, 'authentication_error', 'Authentication failed');
    }
  }

  /**
   * Handle subscription message
   */
  private async handleSubscription(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    try {
      const { channel, options } = message.payload;

      // Check permissions
      if (this.config.security.authorization.enabled) {
        const hasPermission = await this.securityManager.checkPermission(
          connection.userId,
          'subscribe',
          channel
        );

        if (!hasPermission) {
          await this.sendError(connection, 'permission_denied', `No permission to subscribe to ${channel}`);
          return;
        }
      }

      // Add subscription
      connection.subscriptions.add(channel);

      // Send confirmation
      await this.sendMessage(connection, {
        type: 'subscription_confirmed',
        payload: { channel, options },
        priority: 'medium'
      });

      this.logger.info('WebSocket subscription added', {
        connectionId: connection.id,
        channel,
        totalSubscriptions: connection.subscriptions.size
      });

      this.emit('subscription_added', { connectionId: connection.id, channel });

    } catch (error) {
      this.logger.error('Subscription error', {
        connectionId: connection.id,
        error: error.message
      });

      await this.sendError(connection, 'subscription_error', 'Failed to subscribe');
    }
  }

  /**
   * Handle unsubscription message
   */
  private async handleUnsubscription(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    try {
      const { channel } = message.payload;

      // Remove subscription
      connection.subscriptions.delete(channel);

      // Send confirmation
      await this.sendMessage(connection, {
        type: 'unsubscription_confirmed',
        payload: { channel },
        priority: 'medium'
      });

      this.logger.info('WebSocket subscription removed', {
        connectionId: connection.id,
        channel,
        totalSubscriptions: connection.subscriptions.size
      });

      this.emit('subscription_removed', { connectionId: connection.id, channel });

    } catch (error) {
      this.logger.error('Unsubscription error', {
        connectionId: connection.id,
        error: error.message
      });

      await this.sendError(connection, 'unsubscription_error', 'Failed to unsubscribe');
    }
  }

  /**
   * Handle publish message
   */
  private async handlePublish(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    try {
      const { channel, data } = message.payload;

      // Check permissions
      if (this.config.security.authorization.enabled) {
        const hasPermission = await this.securityManager.checkPermission(
          connection.userId,
          'publish',
          channel
        );

        if (!hasPermission) {
          await this.sendError(connection, 'permission_denied', `No permission to publish to ${channel}`);
          return;
        }
      }

      // Create queue message
      const queueMessage: Omit<QueueMessage, 'id' | 'timestamp' | 'retryCount'> = {
        topic: channel,
        value: data,
        key: connection.userId || connection.id,
        headers: {
          'x-connection-id': connection.id,
          'x-user-id': connection.userId || '',
          'x-source': 'websocket'
        },
        priority: message.priority || 'medium',
        maxRetries: 3,
        metadata: {
          source: 'websocket',
          correlationId: message.id,
          eventType: 'websocket_publish',
          version: '1.0',
          compressed: message.compressed,
          encrypted: message.encrypted,
          size: JSON.stringify(data).length,
          checksum: this.calculateChecksum(data)
        }
      };

      // Publish to message queue
      const messageId = await this.messageQueue.publish(queueMessage);

      // Send confirmation
      await this.sendMessage(connection, {
        type: 'publish_confirmed',
        payload: { 
          channel, 
          messageId,
          timestamp: Date.now() 
        },
        priority: 'medium'
      });

      this.metrics.messages.queued++;

      this.logger.info('Message published to queue', {
        connectionId: connection.id,
        channel,
        messageId
      });

    } catch (error) {
      this.logger.error('Publish error', {
        connectionId: connection.id,
        error: error.message
      });

      await this.sendError(connection, 'publish_error', 'Failed to publish message');
    }
  }

  /**
   * Handle ping message
   */
  private async handlePing(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    await this.sendMessage(connection, {
      type: 'pong',
      payload: {
        timestamp: Date.now(),
        originalTimestamp: message.payload.timestamp
      },
      priority: 'high'
    });
  }

  /**
   * Handle heartbeat message
   */
  private async handleHeartbeat(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    connection.heartbeatCount++;
    connection.missedHeartbeats = 0;

    await this.sendMessage(connection, {
      type: 'heartbeat_ack',
      payload: {
        timestamp: Date.now(),
        heartbeatCount: connection.heartbeatCount
      },
      priority: 'high'
    });
  }

  /**
   * Handle custom message types
   */
  private async handleCustomMessage(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    // Emit event for custom handling
    this.emit('custom_message', { connection, message });

    // Default: echo the message back
    await this.sendMessage(connection, {
      type: 'message_received',
      payload: {
        originalType: message.type,
        timestamp: Date.now()
      },
      priority: 'low'
    });
  }

  /**
   * Send message to WebSocket connection
   */
  async sendMessage(
    connection: WebSocketConnection, 
    message: Omit<WebSocketMessage, 'id' | 'timestamp' | 'connectionId' | 'compressed' | 'encrypted'>
  ): Promise<void> {
    if (connection.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket connection is not open');
    }

    try {
      // Create complete message
      const completeMessage: WebSocketMessage = {
        id: this.generateMessageId(),
        timestamp: Date.now(),
        connectionId: connection.id,
        compressed: false,
        encrypted: false,
        ...message
      };

      // Apply compression if enabled and message is large enough
      let messageData = JSON.stringify(completeMessage);
      if (this.config.compression.enabled && messageData.length > this.config.compression.threshold) {
        messageData = await this.compressionManager.compress(messageData);
        completeMessage.compressed = true;
      }

      // Apply encryption if enabled
      if (this.config.security.encryption.enabled) {
        messageData = await this.securityManager.encrypt(messageData);
        completeMessage.encrypted = true;
      }

      // Send message
      connection.socket.send(messageData);

      // Update metrics
      connection.bytesSent += messageData.length;
      this.metrics.messages.sent++;

      this.logger.debug('Message sent', {
        connectionId: connection.id,
        messageType: message.type,
        size: messageData.length,
        compressed: completeMessage.compressed,
        encrypted: completeMessage.encrypted
      });

    } catch (error) {
      this.logger.error('Error sending message', {
        connectionId: connection.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send error message to connection
   */
  private async sendError(connection: WebSocketConnection, code: string, message: string): Promise<void> {
    await this.sendMessage(connection, {
      type: 'error',
      payload: {
        code,
        message,
        timestamp: Date.now()
      },
      priority: 'high'
    });
  }

  /**
   * Broadcast message to multiple connections
   */
  async broadcast(
    channels: string[], 
    message: Omit<WebSocketMessage, 'id' | 'timestamp' | 'connectionId' | 'compressed' | 'encrypted'>
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [connectionId, connection] of this.connections) {
      // Check if connection has subscriptions to any of the channels
      const hasSubscription = channels.some(channel => connection.subscriptions.has(channel));
      
      if (hasSubscription && connection.socket.readyState === WebSocket.OPEN) {
        promises.push(
          this.sendMessage(connection, message).catch(error => {
            this.logger.error('Broadcast error', {
              connectionId,
              error: error.message
            });
          })
        );
      }
    }

    await Promise.allSettled(promises);

    this.logger.info('Message broadcasted', {
      channels,
      recipientCount: promises.length,
      messageType: message.type
    });
  }

  /**
   * Close WebSocket connection
   */
  closeConnection(connectionId: string, code: number = 1000, reason: string = 'Normal closure'): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    try {
      connection.socket.close(code, reason);
      this.connections.delete(connectionId);

      // Update metrics
      this.metrics.connections.active--;
      if (connection.authenticated) {
        this.metrics.connections.authenticated--;
      }

      this.logger.info('WebSocket connection closed', {
        connectionId,
        code,
        reason,
        totalConnections: this.connections.size
      });

      this.emit('connection_closed', { connectionId, code, reason });

    } catch (error) {
      this.logger.error('Error closing connection', {
        connectionId,
        error: error.message
      });
    }
  }

  /**
   * Get handler metrics
   */
  getMetrics(): HandlerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): WebSocketConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all connections
   */
  getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connections by user ID
   */
  getConnectionsByUser(userId: string): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.userId === userId);
  }

  /**
   * Private helper methods
   */
  private async parseMessage(connection: WebSocketConnection, data: Buffer): Promise<WebSocketMessage | null> {
    try {
      let messageData = data.toString();

      // Decrypt if needed
      if (this.config.security.encryption.enabled) {
        messageData = await this.securityManager.decrypt(messageData);
      }

      // Decompress if needed
      if (messageData.startsWith('compressed:')) {
        messageData = await this.compressionManager.decompress(messageData.substring(11));
      }

      // Parse JSON
      const message = JSON.parse(messageData);

      // Add connection metadata
      message.connectionId = connection.id;
      message.timestamp = message.timestamp || Date.now();
      message.id = message.id || this.generateMessageId();

      return message;

    } catch (error) {
      this.logger.error('Message parsing failed', {
        connectionId: connection.id,
        error: error.message
      });

      await this.sendError(connection, 'parse_error', 'Invalid message format');
      return null;
    }
  }

  private async validateMessage(message: WebSocketMessage): Promise<boolean> {
    // Basic validation
    if (!message.type || typeof message.type !== 'string') {
      return false;
    }

    if (message.payload === undefined || message.payload === null) {
      return false;
    }

    // Size validation
    const messageSize = JSON.stringify(message).length;
    if (messageSize > this.config.message.maxSize) {
      return false;
    }

    // Schema validation if configured
    if (this.config.message.validation.schema) {
      // Implement schema validation here
      return true;
    }

    return true;
  }

  private verifyClient(info: any): boolean {
    // Custom client verification logic
    const origin = info.origin;
    const userAgent = info.req.headers['user-agent'];

    // Add your verification logic here
    return true;
  }

  private getClientIP(request: IncomingMessage): string {
    return (request.headers['x-forwarded-for'] as string) ||
           (request.headers['x-real-ip'] as string) ||
           request.socket.remoteAddress ||
           'unknown';
  }

  private checkConnectionRateLimit(clientIP: string): boolean {
    const key = `conn:${clientIP}`;
    let limiter = this.rateLimiters.get(key);

    if (!limiter) {
      limiter = new GlobalRateLimiter(
        this.config.rate_limiting.connection.maxPerIP,
        this.config.rate_limiting.connection.windowMs
      );
      this.rateLimiters.set(key, limiter);
    }

    return limiter.checkLimit();
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private calculateChecksum(data: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private handleConnectionClose(connectionId: string, code: number, reason: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);

      // Update metrics
      this.metrics.connections.active--;
      if (connection.authenticated) {
        this.metrics.connections.authenticated--;
      }

      this.logger.info('WebSocket connection closed', {
        connectionId,
        code,
        reason,
        duration: Date.now() - connection.connectedAt.getTime(),
        totalConnections: this.connections.size
      });

      this.emit('connection_closed', { connectionId, code, reason });
    }
  }

  private handleConnectionError(connectionId: string, error: Error): void {
    this.logger.error('WebSocket connection error', {
      connectionId,
      error: error.message
    });

    this.emit('connection_error', { connectionId, error });

    // Close connection on error
    this.closeConnection(connectionId, 1011, 'Internal error');
  }

  private handlePong(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.missedHeartbeats = 0;
      connection.lastActivity = new Date();
    }
  }

  private handleHeaders(headers: string[], request: IncomingMessage): void {
    // Add custom headers if needed
    headers.push('X-WebSocket-Server: OptimizedWebSocketHandlers/1.0');
  }

  private async handleQueueMessage(message: QueueMessage): Promise<void> {
    // Broadcast message to subscribed connections
    const channels = [message.topic];
    
    await this.broadcast(channels, {
      type: 'queue_message',
      payload: {
        topic: message.topic,
        data: message.value,
        messageId: message.id
      },
      priority: message.priority as any
    });
  }

  private async handleQueueMessageFailure(message: QueueMessage, error: Error): Promise<void> {
    this.logger.error('Queue message processing failed', {
      messageId: message.id,
      topic: message.topic,
      error: error.message
    });

    // Notify relevant connections about the failure
    // Implementation depends on your requirements
  }

  private startHeartbeatSystem(): void {
    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }

      this.performHeartbeatCheck();
    }, this.config.connection.heartbeat.interval);
  }

  private performHeartbeatCheck(): void {
    const now = Date.now();

    for (const [connectionId, connection] of this.connections) {
      if (connection.socket.readyState !== WebSocket.OPEN) {
        continue;
      }

      const timeSinceLastActivity = now - connection.lastActivity.getTime();
      
      if (timeSinceLastActivity > this.config.connection.heartbeat.timeout) {
        connection.missedHeartbeats++;

        if (connection.missedHeartbeats >= this.config.connection.heartbeat.maxMissed) {
          this.closeConnection(connectionId, 1001, 'Heartbeat timeout');
        } else {
          // Send ping
          connection.socket.ping();
        }
      }
    }
  }

  private startRateLimitingCleanup(): void {
    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }

      // Clean up expired rate limiters
      for (const [key, limiter] of this.rateLimiters) {
        if (limiter.isExpired()) {
          this.rateLimiters.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  private startMetricsCollection(): void {
    if (!this.config.monitoring.metrics.enabled) {
      return;
    }

    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }

      this.collectMetrics();
    }, this.config.monitoring.metrics.interval);
  }

  private collectMetrics(): void {
    // Update connection metrics
    this.metrics.connections.active = this.connections.size;
    this.metrics.connections.authenticated = Array.from(this.connections.values())
      .filter(conn => conn.authenticated).length;

    // Calculate message rate
    const now = Date.now();
    // Implementation depends on your rate calculation needs

    // Emit metrics
    this.emit('metrics_updated', this.metrics);
  }

  private updateMetrics(metrics: any): void {
    // Update metrics from collector
    Object.assign(this.metrics.performance, metrics.performance);
    Object.assign(this.metrics.resources, metrics.resources);
  }

  private handleAlert(alert: any): void {
    this.logger.warn('WebSocket alert triggered', alert);
    this.emit('alert', alert);
  }
}

/**
 * Connection-specific rate limiter
 */
class ConnectionRateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly config: any,
    private readonly logger: Logger
  ) {
    this.tokens = config.maxPerSecond;
    this.lastRefill = Date.now();
  }

  checkRateLimit(): boolean {
    this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }

    return false;
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = (timePassed / 1000) * this.config.maxPerSecond;

    this.tokens = Math.min(this.config.maxPerSecond, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

/**
 * Global rate limiter
 */
class GlobalRateLimiter {
  private requests: number[] = [];

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  checkLimit(): boolean {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }

    return false;
  }

  isExpired(): boolean {
    const now = Date.now();
    return this.requests.length === 0 || 
           (now - Math.max(...this.requests)) > this.windowMs * 2;
  }
}

/**
 * WebSocket metrics collector
 */
class WebSocketMetricsCollector extends EventEmitter {
  private latencies: number[] = [];
  private isRunning = false;

  constructor(
    private readonly config: MonitoringConfig,
    private readonly logger: Logger
  ) {
    super();
  }

  async start(): Promise<void> {
    this.isRunning = true;
    
    if (this.config.metrics.enabled) {
      this.startCollection();
    }
    
    this.logger.info('WebSocket metrics collector started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.logger.info('WebSocket metrics collector stopped');
  }

  recordMessageProcessed(latency: number, success: boolean): void {
    this.latencies.push(latency);
    
    // Keep only recent latencies
    if (this.latencies.length > 1000) {
      this.latencies = this.latencies.slice(-1000);
    }
  }

  private startCollection(): void {
    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }

      this.collectAndEmitMetrics();
    }, this.config.metrics.interval);
  }

  private collectAndEmitMetrics(): void {
    const metrics = {
      performance: {
        averageLatency: this.calculateAverageLatency(),
        p95Latency: this.calculatePercentile(95),
        p99Latency: this.calculatePercentile(99)
      },
      resources: {
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: 0, // Would need actual CPU monitoring
        networkIO: 0  // Would need actual network monitoring
      }
    };

    this.emit('metrics_collected', metrics);
  }

  private calculateAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    return this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
  }

  private calculatePercentile(percentile: number): number {
    if (this.latencies.length === 0) return 0;
    
    const sorted = this.latencies.sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * sorted.length);
    return sorted[index] || 0;
  }
}

/**
 * Compression manager
 */
class CompressionManager {
  constructor(
    private readonly config: CompressionConfig,
    private readonly logger: Logger
  ) {}

  async start(): Promise<void> {
    this.logger.info('Compression manager started');
  }

  async stop(): Promise<void> {
    this.logger.info('Compression manager stopped');
  }

  async compress(data: string): Promise<string> {
    if (!this.config.enabled) {
      return data;
    }

    try {
      switch (this.config.algorithm) {
        case 'lz4':
          const compressed = LZ4.encode(Buffer.from(data));
          return `compressed:${compressed.toString('base64')}`;
        default:
          return data;
      }
    } catch (error) {
      this.logger.warn('Compression failed', { error: error.message });
      return data;
    }
  }

  async decompress(data: string): Promise<string> {
    if (!this.config.enabled) {
      return data;
    }

    try {
      switch (this.config.algorithm) {
        case 'lz4':
          const buffer = Buffer.from(data, 'base64');
          const decompressed = LZ4.decode(buffer);
          return decompressed.toString();
        default:
          return data;
      }
    } catch (error) {
      this.logger.warn('Decompression failed', { error: error.message });
      return data;
    }
  }
}

/**
 * Security manager
 */
class SecurityManager {
  constructor(
    private readonly config: SecurityConfig,
    private readonly logger: Logger
  ) {}

  async start(): Promise<void> {
    this.logger.info('Security manager started');
  }

  async stop(): Promise<void> {
    this.logger.info('Security manager stopped');
  }

  async authenticate(credentials: any): Promise<{ success: boolean; userId?: string; permissions?: string[]; error?: string }> {
    // Implement your authentication logic here
    // This is a simplified example
    
    if (credentials.token) {
      // Validate token
      return {
        success: true,
        userId: 'user123',
        permissions: ['read', 'write']
      };
    }

    return {
      success: false,
      error: 'Invalid credentials'
    };
  }

  async checkPermission(userId: string | undefined, action: string, resource: string): Promise<boolean> {
    if (!this.config.authorization.enabled) {
      return true;
    }

    // Implement your authorization logic here
    return true;
  }

  async encrypt(data: string): Promise<string> {
    if (!this.config.encryption.enabled) {
      return data;
    }

    // Implement encryption
    return data;
  }

  async decrypt(data: string): Promise<string> {
    if (!this.config.encryption.enabled) {
      return data;
    }

    // Implement decryption
    return data;
  }
}

export { OptimizedWebSocketHandlers };