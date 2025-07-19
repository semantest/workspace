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
 * @fileoverview High-Performance WebSocket Server with Auto-Scaling
 * @author Semantest Team
 * @module infrastructure/server/HighPerformanceServer
 */

import { createServer, Server } from 'http';
import { WebSocketServer } from 'ws';
import { Cluster } from 'ioredis';
import { Logger } from '@shared/infrastructure/logger';
import { HighPerformanceMessageBroker, BrokerConfig } from '../broker/high-performance-message-broker';
import { RedisClusterManager, RedisClusterConfig } from '../cluster/redis-cluster-manager';
import { PerformanceMonitor, MonitoringConfig } from '../monitoring/performance-monitor';

export interface HighPerformanceServerConfig {
  server: ServerConfig;
  broker: BrokerConfig;
  cluster: RedisClusterConfig;
  monitoring: MonitoringConfig;
  autoScaling: AutoScalingConfig;
  healthCheck: HealthCheckConfig;
}

export interface ServerConfig {
  port: number;
  host: string;
  workers: number;
  maxConnections: number;
  keepAliveTimeout: number;
  headersTimeout: number;
  requestTimeout: number;
  ssl?: {
    enabled: boolean;
    cert: string;
    key: string;
    ca?: string;
  };
}

export interface AutoScalingConfig {
  enabled: boolean;
  minInstances: number;
  maxInstances: number;
  scaleUpThreshold: {
    cpu: number;
    memory: number;
    connections: number;
  };
  scaleDownThreshold: {
    cpu: number;
    memory: number;
    connections: number;
  };
  cooldownPeriod: number;
  healthCheckGracePeriod: number;
}

export interface HealthCheckConfig {
  enabled: boolean;
  path: string;
  interval: number;
  timeout: number;
  retries: number;
  gracefulShutdownTimeout: number;
}

export interface ServerMetrics {
  uptime: number;
  connections: number;
  messagesPerSecond: number;
  latency: {
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  };
  throughput: number;
  errors: number;
  cpu: number;
  memory: number;
  cluster: {
    nodes: number;
    healthyNodes: number;
    shards: number;
  };
  broker: {
    queues: number;
    publishers: number;
    consumers: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  version: string;
  components: ComponentHealth[];
  metrics: ServerMetrics;
  checks: HealthCheck[];
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  lastCheck: number;
  dependencies?: string[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  duration: number;
  message?: string;
  output?: any;
}

/**
 * High-performance WebSocket server with auto-scaling and monitoring
 */
export class HighPerformanceServer {
  private httpServer: Server;
  private wsServer: WebSocketServer;
  private messageBroker: HighPerformanceMessageBroker;
  private clusterManager: RedisClusterManager;
  private performanceMonitor: PerformanceMonitor;
  private autoScaler: AutoScaler;
  private healthChecker: HealthChecker;
  private redis: Cluster;
  private isRunning = false;
  private startTime = Date.now();

  constructor(
    private readonly config: HighPerformanceServerConfig,
    private readonly logger: Logger
  ) {
    this.initializeComponents();
    this.setupEventHandlers();
  }

  /**
   * Initialize server components
   */
  private initializeComponents(): void {
    // Initialize Redis cluster
    this.redis = new Cluster(
      this.config.cluster.nodes.map(node => ({ host: node.host, port: node.port })),
      this.config.cluster.options
    );

    // Initialize cluster manager
    this.clusterManager = new RedisClusterManager(
      this.config.cluster,
      this.logger
    );

    // Initialize message broker
    this.messageBroker = new HighPerformanceMessageBroker(
      this.config.broker,
      this.logger
    );

    // Initialize performance monitor
    this.performanceMonitor = new PerformanceMonitor(
      this.config.monitoring,
      this.redis,
      this.logger
    );

    // Initialize auto-scaler
    this.autoScaler = new AutoScaler(
      this.config.autoScaling,
      this.logger
    );

    // Initialize health checker
    this.healthChecker = new HealthChecker(
      this.config.healthCheck,
      this.logger
    );

    // Create HTTP server
    this.httpServer = createServer();
    
    // Configure server settings
    this.httpServer.keepAliveTimeout = this.config.server.keepAliveTimeout;
    this.httpServer.headersTimeout = this.config.server.headersTimeout;
    this.httpServer.requestTimeout = this.config.server.requestTimeout;
    this.httpServer.maxConnections = this.config.server.maxConnections;

    // Create WebSocket server
    this.wsServer = new WebSocketServer({ 
      server: this.httpServer,
      perMessageDeflate: {
        threshold: 1024,
        concurrencyLimit: 10,
        clientMaxWindowBits: 15,
        serverMaxWindowBits: 15
      },
      clientTracking: true,
      maxPayload: 16 * 1024 * 1024 // 16MB
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // HTTP server events
    this.httpServer.on('request', (req, res) => {
      this.handleHttpRequest(req, res);
    });

    this.httpServer.on('upgrade', (request, socket, head) => {
      this.handleWebSocketUpgrade(request, socket, head);
    });

    this.httpServer.on('error', (error) => {
      this.logger.error('HTTP server error', { error: error.message });
    });

    // WebSocket server events
    this.wsServer.on('connection', (ws, request) => {
      this.handleWebSocketConnection(ws, request);
    });

    this.wsServer.on('error', (error) => {
      this.logger.error('WebSocket server error', { error: error.message });
    });

    // Component events
    this.clusterManager.on('cluster_degraded', (stats) => {
      this.handleClusterDegraded(stats);
    });

    this.performanceMonitor.on('alert', (alert) => {
      this.handlePerformanceAlert(alert);
    });

    this.autoScaler.on('scale_up', (data) => {
      this.handleScaleUp(data);
    });

    this.autoScaler.on('scale_down', (data) => {
      this.handleScaleDown(data);
    });

    // Process events
    process.on('SIGTERM', () => {
      this.gracefulShutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      this.gracefulShutdown('SIGINT');
    });

    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      this.gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      this.logger.error('Unhandled rejection', { reason });
    });
  }

  /**
   * Start the high-performance server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    try {
      this.logger.info('Starting high-performance WebSocket server...');

      // Start components in order
      await this.clusterManager.start();
      await this.messageBroker.start();
      await this.performanceMonitor.start();
      
      if (this.config.autoScaling.enabled) {
        await this.autoScaler.start();
      }

      if (this.config.healthCheck.enabled) {
        await this.healthChecker.start();
      }

      // Start HTTP server
      await this.startHttpServer();

      this.isRunning = true;
      this.startTime = Date.now();

      this.logger.info('High-performance WebSocket server started successfully', {
        host: this.config.server.host,
        port: this.config.server.port,
        workers: this.config.server.workers,
        maxConnections: this.config.server.maxConnections
      });

    } catch (error) {
      this.logger.error('Failed to start server', { error: error.message });
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.logger.info('Stopping high-performance WebSocket server...');
      
      this.isRunning = false;

      // Stop accepting new connections
      this.httpServer.close();
      this.wsServer.close();

      // Stop components
      await this.healthChecker.stop();
      await this.autoScaler.stop();
      await this.performanceMonitor.stop();
      await this.messageBroker.stop();
      await this.clusterManager.stop();

      // Close Redis connection
      this.redis.disconnect();

      this.logger.info('High-performance WebSocket server stopped');

    } catch (error) {
      this.logger.error('Error stopping server', { error: error.message });
      throw error;
    }
  }

  /**
   * Get server metrics
   */
  async getMetrics(): Promise<ServerMetrics> {
    const brokerStats = this.messageBroker.getStats();
    const clusterStats = await this.clusterManager.getClusterStats();
    const currentMetrics = await this.performanceMonitor.getCurrentMetrics();

    return {
      uptime: Date.now() - this.startTime,
      connections: this.wsServer.clients.size,
      messagesPerSecond: brokerStats.messagesPerSecond,
      latency: {
        min: 0,
        max: 0,
        avg: brokerStats.averageLatency,
        p95: 0,
        p99: 0
      },
      throughput: brokerStats.throughput,
      errors: 0,
      cpu: currentMetrics.system.cpu.usage,
      memory: currentMetrics.system.memory.percentage,
      cluster: {
        nodes: clusterStats.totalNodes,
        healthyNodes: clusterStats.healthyNodes,
        shards: clusterStats.masterNodes
      },
      broker: {
        queues: 0,
        publishers: 0,
        consumers: brokerStats.totalConnections
      }
    };
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const metrics = await this.getMetrics();
    const components = await this.getComponentHealth();
    const checks = await this.runHealthChecks();

    const unhealthyComponents = components.filter(c => c.status === 'unhealthy').length;
    const degradedComponents = components.filter(c => c.status === 'degraded').length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyComponents > 0) {
      status = 'unhealthy';
    } else if (degradedComponents > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      timestamp: Date.now(),
      uptime: metrics.uptime,
      version: process.env.npm_package_version || '1.0.0',
      components,
      metrics,
      checks
    };
  }

  /**
   * Run performance benchmark
   */
  async runBenchmark(config: any): Promise<any> {
    return this.messageBroker.runBenchmark(config);
  }

  /**
   * Scale server instances
   */
  async scaleInstances(targetCount: number): Promise<void> {
    return this.autoScaler.scaleToTarget(targetCount);
  }

  /**
   * Private helper methods
   */
  private async startHttpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.config.server.port, this.config.server.host, () => {
        resolve();
      });

      this.httpServer.on('error', (error) => {
        reject(error);
      });
    });
  }

  private handleHttpRequest(req: any, res: any): void {
    const url = req.url;
    const method = req.method;

    // Handle health check endpoint
    if (url === this.config.healthCheck.path && method === 'GET') {
      this.handleHealthCheckRequest(req, res);
      return;
    }

    // Handle metrics endpoint
    if (url === '/metrics' && method === 'GET') {
      this.handleMetricsRequest(req, res);
      return;
    }

    // Handle benchmark endpoint
    if (url === '/benchmark' && method === 'POST') {
      this.handleBenchmarkRequest(req, res);
      return;
    }

    // Handle scaling endpoint
    if (url === '/scale' && method === 'POST') {
      this.handleScalingRequest(req, res);
      return;
    }

    // Default response
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  private async handleHealthCheckRequest(req: any, res: any): Promise<void> {
    try {
      const healthStatus = await this.getHealthStatus();
      const statusCode = healthStatus.status === 'healthy' ? 200 : 
                        healthStatus.status === 'degraded' ? 200 : 503;

      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(healthStatus, null, 2));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Health check failed', message: error.message }));
    }
  }

  private async handleMetricsRequest(req: any, res: any): Promise<void> {
    try {
      const metrics = await this.getMetrics();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(metrics, null, 2));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Metrics collection failed', message: error.message }));
    }
  }

  private async handleBenchmarkRequest(req: any, res: any): Promise<void> {
    try {
      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        const config = JSON.parse(body);
        const results = await this.runBenchmark(config);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results, null, 2));
      });
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Benchmark failed', message: error.message }));
    }
  }

  private async handleScalingRequest(req: any, res: any): Promise<void> {
    try {
      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        const { targetInstances } = JSON.parse(body);
        await this.scaleInstances(targetInstances);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, targetInstances }));
      });
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Scaling failed', message: error.message }));
    }
  }

  private handleWebSocketUpgrade(request: any, socket: any, head: Buffer): void {
    // Custom WebSocket upgrade handling if needed
    this.wsServer.handleUpgrade(request, socket, head, (ws) => {
      this.wsServer.emit('connection', ws, request);
    });
  }

  private handleWebSocketConnection(ws: any, request: any): void {
    const connectionId = this.generateConnectionId();
    
    try {
      // Add connection to message broker
      this.messageBroker.addConnection(connectionId, ws);

      // Record connection metrics
      this.performanceMonitor.recordCustomMetric('websocket_connections', this.wsServer.clients.size);

      this.logger.debug('WebSocket connection established', { 
        connectionId, 
        totalConnections: this.wsServer.clients.size 
      });

      // Handle messages
      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleWebSocketMessage(connectionId, message);
        } catch (error) {
          this.logger.error('Invalid WebSocket message', { connectionId, error: error.message });
        }
      });

      // Handle errors
      ws.on('error', (error: Error) => {
        this.logger.warn('WebSocket connection error', { connectionId, error: error.message });
      });

      // Handle close
      ws.on('close', () => {
        this.messageBroker.removeConnection(connectionId);
        this.performanceMonitor.recordCustomMetric('websocket_connections', this.wsServer.clients.size);
        this.logger.debug('WebSocket connection closed', { connectionId });
      });

    } catch (error) {
      this.logger.error('Error handling WebSocket connection', { error: error.message });
      ws.close(1011, 'Internal server error');
    }
  }

  private async handleWebSocketMessage(connectionId: string, message: any): Promise<void> {
    const startTime = Date.now();

    try {
      switch (message.type) {
        case 'subscribe':
          await this.messageBroker.subscribe(connectionId, message.channel, message.options);
          break;

        case 'unsubscribe':
          await this.messageBroker.unsubscribe(connectionId, message.channel);
          break;

        case 'publish':
          await this.messageBroker.publish({
            type: message.messageType,
            channel: message.channel,
            payload: message.payload,
            metadata: {
              compressed: false,
              size: JSON.stringify(message.payload).length,
              retryCount: 0,
              maxRetries: 3
            },
            priority: message.priority || 'medium'
          });
          break;

        default:
          this.logger.warn('Unknown message type', { connectionId, type: message.type });
      }

      // Record message processing metrics
      const duration = Date.now() - startTime;
      this.performanceMonitor.recordCustomMetric('message_processing_latency', duration);

    } catch (error) {
      this.logger.error('Error handling WebSocket message', { 
        connectionId, 
        messageType: message.type, 
        error: error.message 
      });
    }
  }

  private async getComponentHealth(): Promise<ComponentHealth[]> {
    const components: ComponentHealth[] = [];

    // Check cluster health
    try {
      const clusterHealth = await this.clusterManager.getHealthStatus();
      components.push({
        name: 'redis_cluster',
        status: clusterHealth.status,
        message: clusterHealth.issues.join(', '),
        lastCheck: Date.now(),
        dependencies: ['redis']
      });
    } catch (error) {
      components.push({
        name: 'redis_cluster',
        status: 'unhealthy',
        message: error.message,
        lastCheck: Date.now()
      });
    }

    // Check message broker health
    try {
      const brokerStats = this.messageBroker.getStats();
      components.push({
        name: 'message_broker',
        status: brokerStats.errorRate < 0.01 ? 'healthy' : 'degraded',
        message: `Error rate: ${brokerStats.errorRate}`,
        lastCheck: Date.now(),
        dependencies: ['redis_cluster']
      });
    } catch (error) {
      components.push({
        name: 'message_broker',
        status: 'unhealthy',
        message: error.message,
        lastCheck: Date.now()
      });
    }

    // Check performance monitor health
    components.push({
      name: 'performance_monitor',
      status: 'healthy',
      lastCheck: Date.now()
    });

    return components;
  }

  private async runHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Memory check
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    checks.push({
      name: 'memory_usage',
      status: memUsagePercent < 90 ? 'pass' : 'fail',
      duration: 1,
      message: `Memory usage: ${memUsagePercent.toFixed(2)}%`,
      output: { heapUsed: memUsage.heapUsed, heapTotal: memUsage.heapTotal }
    });

    // Connection check
    const connectionCount = this.wsServer.clients.size;
    checks.push({
      name: 'websocket_connections',
      status: connectionCount < this.config.server.maxConnections * 0.9 ? 'pass' : 'warn',
      duration: 1,
      message: `Active connections: ${connectionCount}`,
      output: { connections: connectionCount, maxConnections: this.config.server.maxConnections }
    });

    // Redis connectivity check
    try {
      const startTime = Date.now();
      await this.redis.ping();
      const duration = Date.now() - startTime;
      
      checks.push({
        name: 'redis_connectivity',
        status: duration < 100 ? 'pass' : 'warn',
        duration,
        message: `Redis ping: ${duration}ms`
      });
    } catch (error) {
      checks.push({
        name: 'redis_connectivity',
        status: 'fail',
        duration: 0,
        message: `Redis connection failed: ${error.message}`
      });
    }

    return checks;
  }

  private handleClusterDegraded(stats: any): void {
    this.logger.warn('Redis cluster degraded', stats);
  }

  private handlePerformanceAlert(alert: any): void {
    this.logger.warn('Performance alert', alert);
  }

  private handleScaleUp(data: any): void {
    this.logger.info('Auto-scaling: scaling up', data);
  }

  private handleScaleDown(data: any): void {
    this.logger.info('Auto-scaling: scaling down', data);
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    this.logger.info(`Received ${signal}, starting graceful shutdown...`);

    try {
      // Stop accepting new connections
      this.httpServer.close();

      // Give existing connections time to finish
      const shutdownTimeout = this.config.healthCheck.gracefulShutdownTimeout;
      setTimeout(async () => {
        await this.stop();
        process.exit(0);
      }, shutdownTimeout);

    } catch (error) {
      this.logger.error('Error during graceful shutdown', { error: error.message });
      process.exit(1);
    }
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Auto-scaling controller
 */
class AutoScaler {
  private isRunning = false;
  private lastScaleAction = 0;

  constructor(
    private readonly config: AutoScalingConfig,
    private readonly logger: Logger
  ) {}

  async start(): Promise<void> {
    if (this.isRunning || !this.config.enabled) return;

    this.isRunning = true;
    this.startMonitoring();
    this.logger.info('Auto-scaler started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.logger.info('Auto-scaler stopped');
  }

  async scaleToTarget(targetCount: number): Promise<void> {
    // Implementation would depend on orchestration platform
    this.logger.info('Manual scaling triggered', { targetCount });
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
    
    // Check if cooldown period has passed
    if (now - this.lastScaleAction < this.config.cooldownPeriod) {
      return;
    }

    // Get current metrics
    const metrics = this.getCurrentResourceMetrics();

    // Check scale up conditions
    if (this.shouldScaleUp(metrics)) {
      this.lastScaleAction = now;
      this.emit('scale_up', { reason: 'resource_pressure', metrics });
    }

    // Check scale down conditions
    if (this.shouldScaleDown(metrics)) {
      this.lastScaleAction = now;
      this.emit('scale_down', { reason: 'low_resource_usage', metrics });
    }
  }

  private getCurrentResourceMetrics(): any {
    const memUsage = process.memoryUsage();
    
    return {
      cpu: Math.random() * 100, // Would use actual CPU monitoring
      memory: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      connections: 0 // Would get from actual connection count
    };
  }

  private shouldScaleUp(metrics: any): boolean {
    return (
      metrics.cpu > this.config.scaleUpThreshold.cpu ||
      metrics.memory > this.config.scaleUpThreshold.memory ||
      metrics.connections > this.config.scaleUpThreshold.connections
    );
  }

  private shouldScaleDown(metrics: any): boolean {
    return (
      metrics.cpu < this.config.scaleDownThreshold.cpu &&
      metrics.memory < this.config.scaleDownThreshold.memory &&
      metrics.connections < this.config.scaleDownThreshold.connections
    );
  }

  private emit(event: string, data: any): void {
    // EventEmitter implementation
  }
}

/**
 * Health checker
 */
class HealthChecker {
  private isRunning = false;

  constructor(
    private readonly config: HealthCheckConfig,
    private readonly logger: Logger
  ) {}

  async start(): Promise<void> {
    if (this.isRunning || !this.config.enabled) return;

    this.isRunning = true;
    this.startHealthChecks();
    this.logger.info('Health checker started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.logger.info('Health checker stopped');
  }

  private startHealthChecks(): void {
    const checkInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(checkInterval);
        return;
      }

      this.performHealthCheck();
    }, this.config.interval);
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Perform various health checks
      const checks = await this.runChecks();
      const failedChecks = checks.filter(c => c.status === 'fail');

      if (failedChecks.length > 0) {
        this.logger.warn('Health check failures detected', { failedChecks });
      } else {
        this.logger.debug('All health checks passed');
      }

    } catch (error) {
      this.logger.error('Health check failed', { error: error.message });
    }
  }

  private async runChecks(): Promise<HealthCheck[]> {
    // Implementation would include actual health checks
    return [];
  }
}