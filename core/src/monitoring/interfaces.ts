/**
 * Monitoring interfaces for Semantest platform
 */

/**
 * Health check status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  /**
   * Name of the check
   */
  name: string;
  
  /**
   * Current status
   */
  status: HealthStatus;
  
  /**
   * Optional message
   */
  message?: string;
  
  /**
   * Check duration in milliseconds
   */
  duration?: number;
  
  /**
   * Additional details
   */
  details?: Record<string, any>;
  
  /**
   * Last check timestamp
   */
  timestamp: string;
}

/**
 * Overall health response
 */
export interface HealthResponse {
  /**
   * Overall status (worst of all checks)
   */
  status: HealthStatus;
  
  /**
   * Individual check results
   */
  checks: Record<string, HealthCheckResult>;
  
  /**
   * Service information
   */
  service: {
    name: string;
    version: string;
    uptime: number;
  };
  
  /**
   * Response timestamp
   */
  timestamp: string;
}

/**
 * Health check interface
 */
export interface IHealthCheck {
  /**
   * Check name
   */
  name: string;
  
  /**
   * Perform the health check
   */
  check(): Promise<HealthCheckResult>;
  
  /**
   * Optional timeout for the check
   */
  timeout?: number;
  
  /**
   * Whether this check is critical
   */
  critical?: boolean;
}

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

/**
 * Metric data point
 */
export interface MetricDataPoint {
  /**
   * Metric name
   */
  name: string;
  
  /**
   * Metric type
   */
  type: MetricType;
  
  /**
   * Metric value
   */
  value: number;
  
  /**
   * Optional tags
   */
  tags?: Record<string, string>;
  
  /**
   * Timestamp
   */
  timestamp: string;
}

/**
 * Metric options
 */
export interface MetricOptions {
  /**
   * Metric description
   */
  description?: string;
  
  /**
   * Metric unit
   */
  unit?: string;
  
  /**
   * Default tags
   */
  tags?: Record<string, string>;
  
  /**
   * Histogram buckets
   */
  buckets?: number[];
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /**
   * CPU usage percentage
   */
  cpu: {
    usage: number;
    user: number;
    system: number;
  };
  
  /**
   * Memory usage
   */
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  
  /**
   * Event loop metrics (Node.js specific)
   */
  eventLoop?: {
    delay: number;
    utilization: number;
  };
  
  /**
   * Garbage collection metrics
   */
  gc?: {
    totalCount: number;
    totalDuration: number;
    lastDuration: number;
  };
}

/**
 * Request metrics
 */
export interface RequestMetrics {
  /**
   * Total request count
   */
  totalRequests: number;
  
  /**
   * Active request count
   */
  activeRequests: number;
  
  /**
   * Request rate (per second)
   */
  requestRate: number;
  
  /**
   * Average response time
   */
  avgResponseTime: number;
  
  /**
   * Response time percentiles
   */
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  
  /**
   * Status code distribution
   */
  statusCodes: Record<number, number>;
}

/**
 * Monitoring service interface
 */
export interface IMonitoringService {
  /**
   * Register a health check
   */
  registerHealthCheck(check: IHealthCheck): void;
  
  /**
   * Perform all health checks
   */
  checkHealth(): Promise<HealthResponse>;
  
  /**
   * Record a metric
   */
  recordMetric(metric: MetricDataPoint): void;
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics;
  
  /**
   * Get request metrics
   */
  getRequestMetrics(): RequestMetrics;
  
  /**
   * Start collecting metrics
   */
  start(): void;
  
  /**
   * Stop collecting metrics
   */
  stop(): void;
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Alert condition
 */
export interface AlertCondition {
  /**
   * Metric name to monitor
   */
  metric: string;
  
  /**
   * Condition operator
   */
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  
  /**
   * Threshold value
   */
  threshold: number;
  
  /**
   * Duration before triggering (seconds)
   */
  duration?: number;
}

/**
 * Alert definition
 */
export interface Alert {
  /**
   * Alert ID
   */
  id: string;
  
  /**
   * Alert name
   */
  name: string;
  
  /**
   * Alert severity
   */
  severity: AlertSeverity;
  
  /**
   * Alert condition
   */
  condition: AlertCondition;
  
  /**
   * Alert message template
   */
  message: string;
  
  /**
   * Notification channels
   */
  channels: string[];
  
  /**
   * Whether alert is enabled
   */
  enabled: boolean;
}