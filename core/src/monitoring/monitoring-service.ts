import {
  IMonitoringService,
  IHealthCheck,
  HealthResponse,
  HealthStatus,
  MetricDataPoint,
  PerformanceMetrics,
  RequestMetrics
} from './interfaces';
import { logger } from '../logging/logger';
import * as os from 'os';

/**
 * Default monitoring service implementation
 */
export class MonitoringService implements IMonitoringService {
  private healthChecks: Map<string, IHealthCheck> = new Map();
  private metrics: Map<string, MetricDataPoint[]> = new Map();
  private startTime: number = Date.now();
  private requestMetrics = {
    totalRequests: 0,
    activeRequests: 0,
    statusCodes: {} as Record<number, number>
  };
  private performanceInterval?: NodeJS.Timer;
  private metricsBuffer: MetricDataPoint[] = [];
  private readonly maxMetricsPerType = 1000;

  constructor(
    private serviceName: string,
    private version: string = '1.0.0'
  ) {}

  registerHealthCheck(check: IHealthCheck): void {
    this.healthChecks.set(check.name, check);
    logger.info(`Health check registered: ${check.name}`, {
      critical: check.critical,
      timeout: check.timeout
    });
  }

  async checkHealth(): Promise<HealthResponse> {
    const checks: Record<string, any> = {};
    const checkPromises: Promise<void>[] = [];
    
    // Run all health checks in parallel
    for (const [name, check] of this.healthChecks) {
      const promise = this.runHealthCheck(check).then(result => {
        checks[name] = result;
      });
      checkPromises.push(promise);
    }
    
    // Wait for all checks to complete
    await Promise.all(checkPromises);
    
    // Determine overall status
    const statuses = Object.values(checks).map(check => check.status);
    let overallStatus = HealthStatus.HEALTHY;
    
    if (statuses.includes(HealthStatus.UNHEALTHY)) {
      overallStatus = HealthStatus.UNHEALTHY;
    } else if (statuses.includes(HealthStatus.DEGRADED)) {
      overallStatus = HealthStatus.DEGRADED;
    }
    
    // Build response
    const response: HealthResponse = {
      status: overallStatus,
      checks,
      service: {
        name: this.serviceName,
        version: this.version,
        uptime: Date.now() - this.startTime
      },
      timestamp: new Date().toISOString()
    };
    
    // Log if unhealthy
    if (overallStatus !== HealthStatus.HEALTHY) {
      logger.warn('Health check failed', {
        status: overallStatus,
        failedChecks: Object.entries(checks)
          .filter(([_, check]) => check.status !== HealthStatus.HEALTHY)
          .map(([name, check]) => ({ name, status: check.status, message: check.message }))
      });
    }
    
    return response;
  }

  private async runHealthCheck(check: IHealthCheck): Promise<any> {
    try {
      // Apply timeout if specified
      if (check.timeout) {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), check.timeout);
        });
        
        return await Promise.race([
          check.check(),
          timeoutPromise
        ]);
      }
      
      return await check.check();
    } catch (error) {
      // Return unhealthy status on error
      return {
        name: check.name,
        status: check.critical ? HealthStatus.UNHEALTHY : HealthStatus.DEGRADED,
        message: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  recordMetric(metric: MetricDataPoint): void {
    const key = this.getMetricKey(metric.name, metric.tags);
    
    // Get or create metric array
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const metricArray = this.metrics.get(key)!;
    metricArray.push(metric);
    
    // Keep only recent metrics to prevent memory growth
    if (metricArray.length > this.maxMetricsPerType) {
      metricArray.splice(0, metricArray.length - this.maxMetricsPerType);
    }
    
    // Buffer for batch processing
    this.metricsBuffer.push(metric);
    
    // Process buffer if it gets too large
    if (this.metricsBuffer.length >= 100) {
      this.flushMetrics();
    }
  }

  getPerformanceMetrics(): PerformanceMetrics {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // Calculate CPU usage
    let totalIdle = 0;
    let totalTick = 0;
    
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }
    
    const cpuUsage = 100 - ~~(100 * totalIdle / totalTick);
    
    return {
      cpu: {
        usage: cpuUsage,
        user: process.cpuUsage().user / 1000000, // Convert to seconds
        system: process.cpuUsage().system / 1000000
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        percentage: (usedMemory / totalMemory) * 100
      },
      eventLoop: this.getEventLoopMetrics(),
      gc: this.getGCMetrics()
    };
  }

  getRequestMetrics(): RequestMetrics {
    const metrics = this.metrics.get('http.request.duration') || [];
    const recentMetrics = metrics.filter(m => 
      new Date(m.timestamp).getTime() > Date.now() - 60000 // Last minute
    );
    
    // Calculate percentiles
    const durations = recentMetrics
      .map(m => m.value)
      .sort((a, b) => a - b);
    
    const getPercentile = (p: number) => {
      if (durations.length === 0) return 0;
      const index = Math.ceil((p / 100) * durations.length) - 1;
      return durations[index];
    };
    
    // Calculate average
    const avgResponseTime = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
    
    return {
      totalRequests: this.requestMetrics.totalRequests,
      activeRequests: this.requestMetrics.activeRequests,
      requestRate: recentMetrics.length / 60, // per second
      avgResponseTime,
      percentiles: {
        p50: getPercentile(50),
        p90: getPercentile(90),
        p95: getPercentile(95),
        p99: getPercentile(99)
      },
      statusCodes: { ...this.requestMetrics.statusCodes }
    };
  }

  start(): void {
    logger.info('Monitoring service started', {
      service: this.serviceName,
      version: this.version
    });
    
    // Start performance monitoring
    this.performanceInterval = setInterval(() => {
      const perfMetrics = this.getPerformanceMetrics();
      
      // Record performance metrics
      this.recordMetric({
        name: 'system.cpu.usage',
        type: MetricType.GAUGE,
        value: perfMetrics.cpu.usage,
        timestamp: new Date().toISOString()
      });
      
      this.recordMetric({
        name: 'system.memory.usage',
        type: MetricType.GAUGE,
        value: perfMetrics.memory.percentage,
        timestamp: new Date().toISOString()
      });
    }, 10000); // Every 10 seconds
  }

  stop(): void {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }
    
    // Flush any remaining metrics
    this.flushMetrics();
    
    logger.info('Monitoring service stopped');
  }

  /**
   * Record request start
   */
  recordRequestStart(): string {
    const requestId = this.generateRequestId();
    this.requestMetrics.activeRequests++;
    return requestId;
  }

  /**
   * Record request end
   */
  recordRequestEnd(requestId: string, statusCode: number, duration: number): void {
    this.requestMetrics.activeRequests--;
    this.requestMetrics.totalRequests++;
    
    // Update status code counts
    this.requestMetrics.statusCodes[statusCode] = 
      (this.requestMetrics.statusCodes[statusCode] || 0) + 1;
    
    // Record duration metric
    this.recordMetric({
      name: 'http.request.duration',
      type: MetricType.HISTOGRAM,
      value: duration,
      tags: {
        status_code: String(statusCode),
        status_class: `${Math.floor(statusCode / 100)}xx`
      },
      timestamp: new Date().toISOString()
    });
  }

  private getMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags) return name;
    
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    
    return `${name}{${tagString}}`;
  }

  private flushMetrics(): void {
    if (this.metricsBuffer.length === 0) return;
    
    // In a real implementation, this would send metrics to a monitoring service
    logger.debug(`Flushing ${this.metricsBuffer.length} metrics`);
    
    // Clear buffer
    this.metricsBuffer = [];
  }

  private getEventLoopMetrics(): PerformanceMetrics['eventLoop'] {
    // This is a placeholder - in production, use proper event loop monitoring
    return {
      delay: 0,
      utilization: 0
    };
  }

  private getGCMetrics(): PerformanceMetrics['gc'] {
    // This is a placeholder - in production, use proper GC monitoring
    return {
      totalCount: 0,
      totalDuration: 0,
      lastDuration: 0
    };
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Import MetricType that was missing
enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

/**
 * Global monitoring instance
 */
export const monitoring = new MonitoringService(
  process.env.SERVICE_NAME || 'semantest',
  process.env.SERVICE_VERSION || '1.0.0'
);