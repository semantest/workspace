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
 * @fileoverview Real-time Monitoring and Health Check System
 * @author Semantest Team
 * @module infrastructure/monitoring/RealTimeMonitoring
 */

import { EventEmitter } from 'events';
import { Logger } from '@shared/infrastructure/logger';
import { KafkaRedisQueueManager } from '../message-queue/kafka-redis-queue-manager';
import { OptimizedWebSocketHandlers } from '../websocket/optimized-websocket-handlers';
import { EventStreamingService } from '../streaming/event-streaming-service';
import * as os from 'os';
import * as process from 'process';

export interface RealTimeMonitoringConfig {
  monitoring: MonitoringSettings;
  health: HealthCheckSettings;
  alerting: AlertingSettings;
  dashboard: DashboardSettings;
  logging: LoggingSettings;
  reporting: ReportingSettings;
}

export interface MonitoringSettings {
  enabled: boolean;
  interval: number;
  retention: number;
  detailed: boolean;
  realtime: boolean;
  sampling: {
    enabled: boolean;
    rate: number;
    adaptive: boolean;
  };
  metrics: {
    system: boolean;
    application: boolean;
    business: boolean;
    custom: boolean;
  };
}

export interface HealthCheckSettings {
  enabled: boolean;
  interval: number;
  timeout: number;
  retries: number;
  degraded_threshold: number;
  unhealthy_threshold: number;
  components: ComponentHealthConfig[];
  dependencies: DependencyHealthConfig[];
}

export interface ComponentHealthConfig {
  name: string;
  type: 'service' | 'database' | 'cache' | 'queue' | 'websocket' | 'stream';
  endpoint?: string;
  timeout: number;
  critical: boolean;
  checks: HealthCheck[];
}

export interface DependencyHealthConfig {
  name: string;
  type: 'external_api' | 'database' | 'redis' | 'kafka' | 'websocket';
  connection: string;
  timeout: number;
  critical: boolean;
  circuit_breaker: {
    enabled: boolean;
    failure_threshold: number;
    recovery_timeout: number;
  };
}

export interface HealthCheck {
  name: string;
  type: 'ping' | 'query' | 'custom';
  parameters: Record<string, any>;
  expected: any;
  timeout: number;
}

export interface AlertingSettings {
  enabled: boolean;
  channels: AlertChannel[];
  rules: AlertRule[];
  escalation: EscalationPolicy;
  suppression: {
    enabled: boolean;
    window: number;
    max_alerts: number;
  };
}

export interface AlertChannel {
  name: string;
  type: 'webhook' | 'email' | 'slack' | 'pagerduty' | 'custom';
  config: Record<string, any>;
  severity_filter: AlertSeverity[];
  enabled: boolean;
}

export interface AlertRule {
  name: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  message: string;
  enabled: boolean;
  cooldown: number;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  value: number;
  duration: number;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

export interface EscalationPolicy {
  enabled: boolean;
  levels: EscalationLevel[];
  timeout: number;
}

export interface EscalationLevel {
  level: number;
  delay: number;
  channels: string[];
  actions: string[];
}

export interface DashboardSettings {
  enabled: boolean;
  port: number;
  realtime: boolean;
  refresh_interval: number;
  widgets: DashboardWidget[];
  themes: {
    default: string;
    available: string[];
  };
}

export interface DashboardWidget {
  name: string;
  type: 'chart' | 'gauge' | 'table' | 'log' | 'alert' | 'custom';
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
  data_source: string;
  enabled: boolean;
}

export interface LoggingSettings {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  structured: boolean;
  include_traces: boolean;
  destinations: LogDestination[];
  sampling: {
    enabled: boolean;
    rate: number;
  };
}

export interface LogDestination {
  name: string;
  type: 'file' | 'console' | 'syslog' | 'elasticsearch' | 'custom';
  config: Record<string, any>;
  level_filter: string[];
  enabled: boolean;
}

export interface ReportingSettings {
  enabled: boolean;
  schedules: ReportSchedule[];
  formats: ('json' | 'csv' | 'pdf' | 'html')[];
  delivery: {
    enabled: boolean;
    channels: string[];
  };
}

export interface ReportSchedule {
  name: string;
  type: 'performance' | 'health' | 'business' | 'custom';
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  time: string;
  recipients: string[];
  enabled: boolean;
}

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SystemMetrics {
  timestamp: number;
  system: {
    cpu: {
      usage: number;
      load_average: number[];
      cores: number;
    };
    memory: {
      total: number;
      used: number;
      free: number;
      percentage: number;
      heap: {
        used: number;
        total: number;
        percentage: number;
      };
    };
    disk: {
      usage: number;
      free: number;
      total: number;
      io: {
        reads: number;
        writes: number;
      };
    };
    network: {
      bytes_in: number;
      bytes_out: number;
      packets_in: number;
      packets_out: number;
      errors: number;
    };
  };
  process: {
    pid: number;
    uptime: number;
    threads: number;
    handles: number;
    gc: {
      collections: number;
      duration: number;
    };
  };
}

export interface ApplicationMetrics {
  timestamp: number;
  message_queue: {
    messages_published: number;
    messages_consumed: number;
    messages_failed: number;
    queue_depth: number;
    processing_time: LatencyMetrics;
    error_rate: number;
  };
  websocket: {
    connections: number;
    messages_sent: number;
    messages_received: number;
    bytes_transferred: number;
    latency: LatencyMetrics;
    error_rate: number;
  };
  streaming: {
    streams_active: number;
    messages_processed: number;
    transformations: number;
    routing_decisions: number;
    latency: LatencyMetrics;
    error_rate: number;
  };
}

export interface BusinessMetrics {
  timestamp: number;
  user_engagement: {
    active_users: number;
    session_duration: number;
    page_views: number;
    bounce_rate: number;
  };
  performance: {
    response_time: LatencyMetrics;
    throughput: number;
    availability: number;
    error_rate: number;
  };
  custom: Record<string, any>;
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

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  components: ComponentStatus[];
  dependencies: DependencyStatus[];
  alerts: Alert[];
  summary: {
    healthy_components: number;
    total_components: number;
    critical_issues: number;
    warnings: number;
  };
}

export interface ComponentStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  last_check: number;
  response_time: number;
  checks: HealthCheckResult[];
  critical: boolean;
}

export interface DependencyStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  last_check: number;
  response_time: number;
  circuit_breaker_state?: 'closed' | 'open' | 'half_open';
  critical: boolean;
}

export interface HealthCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  duration: number;
  timestamp: number;
}

export interface Alert {
  id: string;
  timestamp: number;
  severity: AlertSeverity;
  title: string;
  message: string;
  source: string;
  status: 'open' | 'acknowledged' | 'resolved';
  escalation_level: number;
  metadata: Record<string, any>;
}

export interface MonitoringReport {
  period: { start: number; end: number };
  type: 'performance' | 'health' | 'business' | 'custom';
  summary: ReportSummary;
  metrics: MetricsSummary;
  alerts: AlertSummary;
  recommendations: Recommendation[];
  charts: ChartData[];
}

export interface ReportSummary {
  uptime: number;
  availability: number;
  performance_score: number;
  health_score: number;
  total_alerts: number;
  critical_incidents: number;
}

export interface MetricsSummary {
  system: SystemMetrics[];
  application: ApplicationMetrics[];
  business: BusinessMetrics[];
}

export interface AlertSummary {
  total: number;
  by_severity: Record<AlertSeverity, number>;
  by_component: Record<string, number>;
  resolution_time: LatencyMetrics;
}

export interface Recommendation {
  type: 'performance' | 'reliability' | 'cost' | 'security';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  impact: string;
  effort: string;
  implementation: string[];
}

export interface ChartData {
  name: string;
  type: 'line' | 'bar' | 'pie' | 'gauge';
  data: any[];
  config: Record<string, any>;
}

/**
 * Real-time monitoring and health check system
 */
export class RealTimeMonitoring extends EventEmitter {
  private messageQueue?: KafkaRedisQueueManager;
  private webSocketHandlers?: OptimizedWebSocketHandlers;
  private streamingService?: EventStreamingService;
  
  private systemMetricsCollector: SystemMetricsCollector;
  private applicationMetricsCollector: ApplicationMetricsCollector;
  private businessMetricsCollector: BusinessMetricsCollector;
  private healthChecker: HealthChecker;
  private alertManager: AlertManager;
  private dashboardServer: DashboardServer;
  private reportGenerator: ReportGenerator;
  
  private isRunning = false;
  private startTime = Date.now();
  private currentMetrics: {
    system?: SystemMetrics;
    application?: ApplicationMetrics;
    business?: BusinessMetrics;
  } = {};
  private currentHealth?: HealthStatus;
  private activeAlerts: Map<string, Alert> = new Map();

  constructor(
    private readonly config: RealTimeMonitoringConfig,
    private readonly logger: Logger
  ) {
    super();
    this.initializeComponents();
    this.setupEventHandlers();
  }

  /**
   * Initialize monitoring components
   */
  private initializeComponents(): void {
    this.systemMetricsCollector = new SystemMetricsCollector(
      this.config.monitoring,
      this.logger
    );

    this.applicationMetricsCollector = new ApplicationMetricsCollector(
      this.config.monitoring,
      this.logger
    );

    this.businessMetricsCollector = new BusinessMetricsCollector(
      this.config.monitoring,
      this.logger
    );

    this.healthChecker = new HealthChecker(
      this.config.health,
      this.logger
    );

    this.alertManager = new AlertManager(
      this.config.alerting,
      this.logger
    );

    this.dashboardServer = new DashboardServer(
      this.config.dashboard,
      this.logger
    );

    this.reportGenerator = new ReportGenerator(
      this.config.reporting,
      this.logger
    );
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Metrics events
    this.systemMetricsCollector.on('metrics', (metrics: SystemMetrics) => {
      this.currentMetrics.system = metrics;
      this.emit('system_metrics', metrics);
      this.checkAlertConditions('system', metrics);
    });

    this.applicationMetricsCollector.on('metrics', (metrics: ApplicationMetrics) => {
      this.currentMetrics.application = metrics;
      this.emit('application_metrics', metrics);
      this.checkAlertConditions('application', metrics);
    });

    this.businessMetricsCollector.on('metrics', (metrics: BusinessMetrics) => {
      this.currentMetrics.business = metrics;
      this.emit('business_metrics', metrics);
      this.checkAlertConditions('business', metrics);
    });

    // Health events
    this.healthChecker.on('health_status', (status: HealthStatus) => {
      this.currentHealth = status;
      this.emit('health_status', status);
      this.checkHealthAlerts(status);
    });

    this.healthChecker.on('component_degraded', (component: ComponentStatus) => {
      this.handleComponentDegraded(component);
    });

    this.healthChecker.on('dependency_failed', (dependency: DependencyStatus) => {
      this.handleDependencyFailed(dependency);
    });

    // Alert events
    this.alertManager.on('alert_triggered', (alert: Alert) => {
      this.activeAlerts.set(alert.id, alert);
      this.emit('alert_triggered', alert);
      this.logger.warn('Alert triggered', {
        id: alert.id,
        severity: alert.severity,
        title: alert.title
      });
    });

    this.alertManager.on('alert_resolved', (alert: Alert) => {
      this.activeAlerts.delete(alert.id);
      this.emit('alert_resolved', alert);
      this.logger.info('Alert resolved', {
        id: alert.id,
        title: alert.title
      });
    });

    // Dashboard events
    this.dashboardServer.on('client_connected', (clientId: string) => {
      this.handleDashboardClientConnected(clientId);
    });

    this.dashboardServer.on('client_disconnected', (clientId: string) => {
      this.handleDashboardClientDisconnected(clientId);
    });
  }

  /**
   * Connect monitored services
   */
  connectServices(services: {
    messageQueue?: KafkaRedisQueueManager;
    webSocketHandlers?: OptimizedWebSocketHandlers;
    streamingService?: EventStreamingService;
  }): void {
    this.messageQueue = services.messageQueue;
    this.webSocketHandlers = services.webSocketHandlers;
    this.streamingService = services.streamingService;

    // Connect to service events
    if (this.messageQueue) {
      this.messageQueue.on('message_published', (data: any) => {
        this.applicationMetricsCollector.recordMessagePublished(data);
      });

      this.messageQueue.on('message_processed', (data: any) => {
        this.applicationMetricsCollector.recordMessageProcessed(data);
      });

      this.messageQueue.on('message_failed', (data: any) => {
        this.applicationMetricsCollector.recordMessageFailed(data);
      });
    }

    if (this.webSocketHandlers) {
      this.webSocketHandlers.on('connection_established', (data: any) => {
        this.applicationMetricsCollector.recordWebSocketConnection(data);
      });

      this.webSocketHandlers.on('message_sent', (data: any) => {
        this.applicationMetricsCollector.recordWebSocketMessage(data, 'sent');
      });

      this.webSocketHandlers.on('message_received', (data: any) => {
        this.applicationMetricsCollector.recordWebSocketMessage(data, 'received');
      });
    }

    if (this.streamingService) {
      this.streamingService.on('message_processed', (data: any) => {
        this.applicationMetricsCollector.recordStreamMessage(data);
      });

      this.streamingService.on('stream_created', (data: any) => {
        this.applicationMetricsCollector.recordStreamCreated(data);
      });
    }

    this.logger.info('Monitoring services connected', {
      messageQueue: !!this.messageQueue,
      webSocketHandlers: !!this.webSocketHandlers,
      streamingService: !!this.streamingService
    });
  }

  /**
   * Start real-time monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Real-time monitoring is already running');
    }

    try {
      this.logger.info('Starting real-time monitoring system...');

      // Start components
      await this.systemMetricsCollector.start();
      await this.applicationMetricsCollector.start();
      await this.businessMetricsCollector.start();
      await this.healthChecker.start();
      await this.alertManager.start();
      
      if (this.config.dashboard.enabled) {
        await this.dashboardServer.start();
      }

      await this.reportGenerator.start();

      // Start periodic tasks
      this.startPeriodicTasks();

      this.isRunning = true;
      this.startTime = Date.now();

      this.emit('monitoring_started');

      this.logger.info('Real-time monitoring system started successfully', {
        dashboard: this.config.dashboard.enabled,
        alerting: this.config.alerting.enabled,
        reporting: this.config.reporting.enabled
      });

    } catch (error) {
      this.logger.error('Failed to start real-time monitoring', { error: error.message });
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop real-time monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.logger.info('Stopping real-time monitoring system...');

      this.isRunning = false;

      // Stop components
      await this.reportGenerator.stop();
      await this.dashboardServer.stop();
      await this.alertManager.stop();
      await this.healthChecker.stop();
      await this.businessMetricsCollector.stop();
      await this.applicationMetricsCollector.stop();
      await this.systemMetricsCollector.stop();

      this.emit('monitoring_stopped');

      this.logger.info('Real-time monitoring system stopped');

    } catch (error) {
      this.logger.error('Error stopping real-time monitoring', { error: error.message });
      throw error;
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): {
    system?: SystemMetrics;
    application?: ApplicationMetrics;
    business?: BusinessMetrics;
  } {
    return { ...this.currentMetrics };
  }

  /**
   * Get current health status
   */
  getCurrentHealth(): HealthStatus | undefined {
    return this.currentHealth ? { ...this.currentHealth } : undefined;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get system uptime
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Generate monitoring report
   */
  async generateReport(
    type: 'performance' | 'health' | 'business' | 'custom',
    period: { start: number; end: number },
    format: 'json' | 'csv' | 'pdf' | 'html' = 'json'
  ): Promise<MonitoringReport> {
    return this.reportGenerator.generate(type, period, format);
  }

  /**
   * Create custom alert
   */
  createCustomAlert(rule: AlertRule): void {
    this.alertManager.addRule(rule);
    this.logger.info('Custom alert rule created', { ruleName: rule.name });
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string, message?: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      this.alertManager.resolveAlert(alertId, message);
    }
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'acknowledged';
      this.alertManager.acknowledgeAlert(alertId, acknowledgedBy);
    }
  }

  /**
   * Private helper methods
   */
  private startPeriodicTasks(): void {
    // Start real-time dashboard updates
    if (this.config.dashboard.enabled && this.config.dashboard.realtime) {
      setInterval(() => {
        if (this.isRunning) {
          this.broadcastRealtimeUpdate();
        }
      }, this.config.dashboard.refresh_interval);
    }

    // Start alert suppression cleanup
    if (this.config.alerting.suppression.enabled) {
      setInterval(() => {
        if (this.isRunning) {
          this.cleanupSuppressedAlerts();
        }
      }, 60000); // Every minute
    }
  }

  private broadcastRealtimeUpdate(): void {
    const update = {
      timestamp: Date.now(),
      metrics: this.currentMetrics,
      health: this.currentHealth,
      alerts: this.getActiveAlerts()
    };

    this.dashboardServer.broadcast('realtime_update', update);
  }

  private cleanupSuppressedAlerts(): void {
    // Implementation for cleaning up suppressed alerts
    // Based on suppression window and max alerts configuration
  }

  private checkAlertConditions(source: string, metrics: any): void {
    // Check if any alert conditions are met
    for (const rule of this.config.alerting.rules) {
      if (this.evaluateAlertCondition(rule.condition, metrics)) {
        this.alertManager.triggerAlert(rule, source, metrics);
      }
    }
  }

  private evaluateAlertCondition(condition: AlertCondition, metrics: any): boolean {
    const value = this.getMetricValue(condition.metric, metrics);
    if (value === undefined) {
      return false;
    }

    switch (condition.operator) {
      case 'gt': return value > condition.value;
      case 'lt': return value < condition.value;
      case 'eq': return value === condition.value;
      case 'ne': return value !== condition.value;
      case 'gte': return value >= condition.value;
      case 'lte': return value <= condition.value;
      default: return false;
    }
  }

  private getMetricValue(metric: string, data: any): number | undefined {
    const parts = metric.split('.');
    let value = data;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return typeof value === 'number' ? value : undefined;
  }

  private checkHealthAlerts(status: HealthStatus): void {
    // Trigger alerts based on health status
    if (status.overall === 'unhealthy') {
      this.alertManager.triggerHealthAlert('critical', 'System unhealthy', status);
    } else if (status.overall === 'degraded') {
      this.alertManager.triggerHealthAlert('high', 'System degraded', status);
    }

    // Check for critical component failures
    for (const component of status.components) {
      if (component.critical && component.status === 'unhealthy') {
        this.alertManager.triggerHealthAlert(
          'critical',
          `Critical component ${component.name} is unhealthy`,
          { component }
        );
      }
    }
  }

  private handleComponentDegraded(component: ComponentStatus): void {
    this.logger.warn('Component degraded', {
      component: component.name,
      status: component.status,
      message: component.message
    });

    this.emit('component_degraded', component);
  }

  private handleDependencyFailed(dependency: DependencyStatus): void {
    this.logger.error('Dependency failed', {
      dependency: dependency.name,
      status: dependency.status,
      message: dependency.message
    });

    this.emit('dependency_failed', dependency);
  }

  private handleDashboardClientConnected(clientId: string): void {
    // Send current state to new client
    const currentState = {
      metrics: this.currentMetrics,
      health: this.currentHealth,
      alerts: this.getActiveAlerts(),
      uptime: this.getUptime()
    };

    this.dashboardServer.sendToClient(clientId, 'initial_state', currentState);
  }

  private handleDashboardClientDisconnected(clientId: string): void {
    this.logger.debug('Dashboard client disconnected', { clientId });
  }
}

/**
 * System metrics collector
 */
class SystemMetricsCollector extends EventEmitter {
  private isRunning = false;
  private collectionTimer?: NodeJS.Timeout;

  constructor(
    private readonly config: MonitoringSettings,
    private readonly logger: Logger
  ) {
    super();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startCollection();
    this.logger.info('System metrics collector started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
    }
    this.logger.info('System metrics collector stopped');
  }

  private startCollection(): void {
    this.collectionTimer = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        const metrics = await this.collectMetrics();
        this.emit('metrics', metrics);
      } catch (error) {
        this.logger.error('System metrics collection failed', { error: error.message });
      }
    }, this.config.interval);
  }

  private async collectMetrics(): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp: Date.now(),
      system: {
        cpu: {
          usage: await this.getCpuUsage(),
          load_average: os.loadavg(),
          cores: os.cpus().length
        },
        memory: {
          total: os.totalmem(),
          used: os.totalmem() - os.freemem(),
          free: os.freemem(),
          percentage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
          heap: {
            used: memUsage.heapUsed,
            total: memUsage.heapTotal,
            percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
          }
        },
        disk: {
          usage: 0, // Would implement actual disk monitoring
          free: 0,
          total: 0,
          io: {
            reads: 0,
            writes: 0
          }
        },
        network: {
          bytes_in: 0, // Would implement actual network monitoring
          bytes_out: 0,
          packets_in: 0,
          packets_out: 0,
          errors: 0
        }
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        threads: 0, // Would implement actual thread monitoring
        handles: 0,
        gc: {
          collections: 0,
          duration: 0
        }
      }
    };
  }

  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const totalUsage = currentUsage.user + currentUsage.system;
        const usage = totalUsage / 1000000; // Convert to seconds
        resolve(Math.min(usage * 100, 100));
      }, 100);
    });
  }
}

/**
 * Application metrics collector
 */
class ApplicationMetricsCollector extends EventEmitter {
  private metrics: ApplicationMetrics;
  private isRunning = false;
  private collectionTimer?: NodeJS.Timeout;

  constructor(
    private readonly config: MonitoringSettings,
    private readonly logger: Logger
  ) {
    super();
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics = {
      timestamp: Date.now(),
      message_queue: {
        messages_published: 0,
        messages_consumed: 0,
        messages_failed: 0,
        queue_depth: 0,
        processing_time: { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, p999: 0 },
        error_rate: 0
      },
      websocket: {
        connections: 0,
        messages_sent: 0,
        messages_received: 0,
        bytes_transferred: 0,
        latency: { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, p999: 0 },
        error_rate: 0
      },
      streaming: {
        streams_active: 0,
        messages_processed: 0,
        transformations: 0,
        routing_decisions: 0,
        latency: { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, p999: 0 },
        error_rate: 0
      }
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startCollection();
    this.logger.info('Application metrics collector started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
    }
    this.logger.info('Application metrics collector stopped');
  }

  recordMessagePublished(data: any): void {
    this.metrics.message_queue.messages_published++;
  }

  recordMessageProcessed(data: any): void {
    this.metrics.message_queue.messages_consumed++;
  }

  recordMessageFailed(data: any): void {
    this.metrics.message_queue.messages_failed++;
  }

  recordWebSocketConnection(data: any): void {
    this.metrics.websocket.connections++;
  }

  recordWebSocketMessage(data: any, direction: 'sent' | 'received'): void {
    if (direction === 'sent') {
      this.metrics.websocket.messages_sent++;
    } else {
      this.metrics.websocket.messages_received++;
    }
  }

  recordStreamMessage(data: any): void {
    this.metrics.streaming.messages_processed++;
  }

  recordStreamCreated(data: any): void {
    this.metrics.streaming.streams_active++;
  }

  private startCollection(): void {
    this.collectionTimer = setInterval(() => {
      if (!this.isRunning) return;

      this.metrics.timestamp = Date.now();
      this.emit('metrics', { ...this.metrics });
    }, this.config.interval);
  }
}

/**
 * Business metrics collector
 */
class BusinessMetricsCollector extends EventEmitter {
  private metrics: BusinessMetrics;
  private isRunning = false;
  private collectionTimer?: NodeJS.Timeout;

  constructor(
    private readonly config: MonitoringSettings,
    private readonly logger: Logger
  ) {
    super();
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics = {
      timestamp: Date.now(),
      user_engagement: {
        active_users: 0,
        session_duration: 0,
        page_views: 0,
        bounce_rate: 0
      },
      performance: {
        response_time: { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, p999: 0 },
        throughput: 0,
        availability: 100,
        error_rate: 0
      },
      custom: {}
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startCollection();
    this.logger.info('Business metrics collector started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
    }
    this.logger.info('Business metrics collector stopped');
  }

  private startCollection(): void {
    this.collectionTimer = setInterval(() => {
      if (!this.isRunning) return;

      this.metrics.timestamp = Date.now();
      this.emit('metrics', { ...this.metrics });
    }, this.config.interval);
  }
}

/**
 * Health checker
 */
class HealthChecker extends EventEmitter {
  private isRunning = false;
  private checkTimer?: NodeJS.Timeout;

  constructor(
    private readonly config: HealthCheckSettings,
    private readonly logger: Logger
  ) {
    super();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startHealthChecks();
    this.logger.info('Health checker started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }
    this.logger.info('Health checker stopped');
  }

  private startHealthChecks(): void {
    this.checkTimer = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        const status = await this.performHealthCheck();
        this.emit('health_status', status);
      } catch (error) {
        this.logger.error('Health check failed', { error: error.message });
      }
    }, this.config.interval);
  }

  private async performHealthCheck(): Promise<HealthStatus> {
    const componentStatuses = await this.checkComponents();
    const dependencyStatuses = await this.checkDependencies();

    const healthyComponents = componentStatuses.filter(c => c.status === 'healthy').length;
    const totalComponents = componentStatuses.length;
    const criticalIssues = componentStatuses.filter(c => c.critical && c.status === 'unhealthy').length;
    const warnings = componentStatuses.filter(c => c.status === 'degraded').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (criticalIssues > 0) {
      overall = 'unhealthy';
    } else if (warnings > 0 || healthyComponents / totalComponents < this.config.degraded_threshold) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    return {
      overall,
      timestamp: Date.now(),
      uptime: process.uptime(),
      components: componentStatuses,
      dependencies: dependencyStatuses,
      alerts: [],
      summary: {
        healthy_components: healthyComponents,
        total_components: totalComponents,
        critical_issues: criticalIssues,
        warnings
      }
    };
  }

  private async checkComponents(): Promise<ComponentStatus[]> {
    const statuses: ComponentStatus[] = [];

    for (const component of this.config.components) {
      const status = await this.checkComponent(component);
      statuses.push(status);

      if (status.status === 'degraded') {
        this.emit('component_degraded', status);
      }
    }

    return statuses;
  }

  private async checkComponent(component: ComponentHealthConfig): Promise<ComponentStatus> {
    const startTime = Date.now();
    const checks: HealthCheckResult[] = [];

    try {
      for (const check of component.checks) {
        const result = await this.performCheck(check);
        checks.push(result);
      }

      const failedChecks = checks.filter(c => c.status === 'fail');
      const status = failedChecks.length > 0 ? 'unhealthy' : 'healthy';

      return {
        name: component.name,
        status,
        last_check: Date.now(),
        response_time: Date.now() - startTime,
        checks,
        critical: component.critical
      };

    } catch (error) {
      return {
        name: component.name,
        status: 'unhealthy',
        message: error.message,
        last_check: Date.now(),
        response_time: Date.now() - startTime,
        checks,
        critical: component.critical
      };
    }
  }

  private async performCheck(check: HealthCheck): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Implement actual health check logic based on check type
      switch (check.type) {
        case 'ping':
          // Implement ping check
          break;
        case 'query':
          // Implement query check
          break;
        case 'custom':
          // Implement custom check
          break;
      }

      return {
        name: check.name,
        status: 'pass',
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        name: check.name,
        status: 'fail',
        message: error.message,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  private async checkDependencies(): Promise<DependencyStatus[]> {
    const statuses: DependencyStatus[] = [];

    for (const dependency of this.config.dependencies) {
      const status = await this.checkDependency(dependency);
      statuses.push(status);

      if (status.status !== 'healthy') {
        this.emit('dependency_failed', status);
      }
    }

    return statuses;
  }

  private async checkDependency(dependency: DependencyHealthConfig): Promise<DependencyStatus> {
    const startTime = Date.now();

    try {
      // Implement dependency check logic
      return {
        name: dependency.name,
        status: 'healthy',
        last_check: Date.now(),
        response_time: Date.now() - startTime,
        critical: dependency.critical
      };

    } catch (error) {
      return {
        name: dependency.name,
        status: 'unhealthy',
        message: error.message,
        last_check: Date.now(),
        response_time: Date.now() - startTime,
        critical: dependency.critical
      };
    }
  }
}

/**
 * Alert manager
 */
class AlertManager extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private suppressedAlerts: Set<string> = new Set();

  constructor(
    private readonly config: AlertingSettings,
    private readonly logger: Logger
  ) {
    super();
    this.loadRules();
  }

  async start(): Promise<void> {
    this.logger.info('Alert manager started');
  }

  async stop(): Promise<void> {
    this.logger.info('Alert manager stopped');
  }

  private loadRules(): void {
    for (const rule of this.config.rules) {
      this.rules.set(rule.name, rule);
    }
  }

  addRule(rule: AlertRule): void {
    this.rules.set(rule.name, rule);
  }

  triggerAlert(rule: AlertRule, source: string, context: any): void {
    const alertId = `${rule.name}_${Date.now()}`;

    if (this.suppressedAlerts.has(rule.name)) {
      return;
    }

    const alert: Alert = {
      id: alertId,
      timestamp: Date.now(),
      severity: rule.severity,
      title: rule.name,
      message: rule.message,
      source,
      status: 'open',
      escalation_level: 0,
      metadata: { rule: rule.name, context }
    };

    this.activeAlerts.set(alertId, alert);
    this.emit('alert_triggered', alert);

    // Send notifications
    this.sendNotifications(alert);

    // Apply suppression
    if (this.config.suppression.enabled) {
      this.suppressedAlerts.add(rule.name);
      setTimeout(() => {
        this.suppressedAlerts.delete(rule.name);
      }, this.config.suppression.window);
    }
  }

  triggerHealthAlert(severity: AlertSeverity, message: string, context: any): void {
    const rule: AlertRule = {
      name: 'health_alert',
      condition: { metric: '', operator: 'gt', value: 0, duration: 0 },
      severity,
      message,
      enabled: true,
      cooldown: 0
    };

    this.triggerAlert(rule, 'health_checker', context);
  }

  resolveAlert(alertId: string, message?: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      this.activeAlerts.delete(alertId);
      this.emit('alert_resolved', alert);
    }
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'acknowledged';
      alert.metadata.acknowledgedBy = acknowledgedBy;
      alert.metadata.acknowledgedAt = Date.now();
      this.emit('alert_acknowledged', alert);
    }
  }

  private sendNotifications(alert: Alert): void {
    for (const channel of this.config.channels) {
      if (channel.enabled && channel.severity_filter.includes(alert.severity)) {
        this.sendNotification(channel, alert);
      }
    }
  }

  private sendNotification(channel: AlertChannel, alert: Alert): void {
    try {
      // Implement notification sending based on channel type
      switch (channel.type) {
        case 'webhook':
          this.sendWebhookNotification(channel, alert);
          break;
        case 'email':
          this.sendEmailNotification(channel, alert);
          break;
        case 'slack':
          this.sendSlackNotification(channel, alert);
          break;
        default:
          this.logger.warn('Unknown notification channel type', { type: channel.type });
      }
    } catch (error) {
      this.logger.error('Failed to send notification', {
        channel: channel.name,
        alert: alert.id,
        error: error.message
      });
    }
  }

  private sendWebhookNotification(channel: AlertChannel, alert: Alert): void {
    // Implement webhook notification
  }

  private sendEmailNotification(channel: AlertChannel, alert: Alert): void {
    // Implement email notification
  }

  private sendSlackNotification(channel: AlertChannel, alert: Alert): void {
    // Implement Slack notification
  }
}

/**
 * Dashboard server
 */
class DashboardServer extends EventEmitter {
  private clients: Map<string, any> = new Map();

  constructor(
    private readonly config: DashboardSettings,
    private readonly logger: Logger
  ) {
    super();
  }

  async start(): Promise<void> {
    if (!this.config.enabled) return;

    // Start dashboard web server
    this.logger.info('Dashboard server started', { port: this.config.port });
  }

  async stop(): Promise<void> {
    this.logger.info('Dashboard server stopped');
  }

  broadcast(event: string, data: any): void {
    for (const [clientId, client] of this.clients) {
      try {
        this.sendToClient(clientId, event, data);
      } catch (error) {
        this.logger.error('Failed to broadcast to client', {
          clientId,
          error: error.message
        });
      }
    }
  }

  sendToClient(clientId: string, event: string, data: any): void {
    const client = this.clients.get(clientId);
    if (client) {
      // Send data to specific client
      this.logger.debug('Sent data to dashboard client', {
        clientId,
        event,
        dataSize: JSON.stringify(data).length
      });
    }
  }
}

/**
 * Report generator
 */
class ReportGenerator {
  constructor(
    private readonly config: ReportingSettings,
    private readonly logger: Logger
  ) {}

  async start(): Promise<void> {
    if (this.config.enabled) {
      this.scheduleReports();
    }
    this.logger.info('Report generator started');
  }

  async stop(): Promise<void> {
    this.logger.info('Report generator stopped');
  }

  async generate(
    type: 'performance' | 'health' | 'business' | 'custom',
    period: { start: number; end: number },
    format: 'json' | 'csv' | 'pdf' | 'html'
  ): Promise<MonitoringReport> {
    // Generate monitoring report
    const report: MonitoringReport = {
      period,
      type,
      summary: {
        uptime: 0,
        availability: 0,
        performance_score: 0,
        health_score: 0,
        total_alerts: 0,
        critical_incidents: 0
      },
      metrics: {
        system: [],
        application: [],
        business: []
      },
      alerts: {
        total: 0,
        by_severity: { low: 0, medium: 0, high: 0, critical: 0 },
        by_component: {},
        resolution_time: { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, p999: 0 }
      },
      recommendations: [],
      charts: []
    };

    this.logger.info('Monitoring report generated', {
      type,
      format,
      period: `${new Date(period.start).toISOString()} - ${new Date(period.end).toISOString()}`
    });

    return report;
  }

  private scheduleReports(): void {
    for (const schedule of this.config.schedules) {
      if (schedule.enabled) {
        // Schedule report generation
        this.logger.info('Report scheduled', {
          name: schedule.name,
          frequency: schedule.frequency
        });
      }
    }
  }
}

export { RealTimeMonitoring };