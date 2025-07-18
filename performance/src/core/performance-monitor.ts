import { Entity, DomainEvent } from '@semantest/core';
import { 
  PerformanceMetric,
  MetricType,
  PerformanceThreshold,
  AlertLevel,
  TimeWindow,
  AggregationMethod
} from '../types';

/**
 * Core performance monitoring system
 */
export class PerformanceMonitor extends Entity<PerformanceMonitor> {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private thresholds: Map<string, PerformanceThreshold> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();
  private resourceObserver?: PerformanceObserver;
  
  constructor() {
    super();
    this.initializeObservers();
  }
  
  /**
   * Start monitoring
   */
  start(): void {
    // Web Vitals monitoring
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.observeWebVitals();
      this.observeResources();
      this.observeLongTasks();
    }
    
    // Node.js monitoring
    if (typeof process !== 'undefined' && process.hrtime) {
      this.observeNodeMetrics();
    }
    
    this.addDomainEvent(new MonitoringStarted({
      correlationId: this.generateCorrelationId(),
      timestamp: new Date()
    }));
  }
  
  /**
   * Stop monitoring
   */
  stop(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    if (this.resourceObserver) {
      this.resourceObserver.disconnect();
    }
    
    this.addDomainEvent(new MonitoringStopped({
      correlationId: this.generateCorrelationId(),
      timestamp: new Date()
    }));
  }
  
  /**
   * Record a custom metric
   */
  recordMetric(
    name: string,
    value: number,
    type: MetricType,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      id: this.generateId(),
      name,
      value,
      type,
      timestamp: new Date(),
      metadata
    };
    
    this.addMetric(metric);
    this.checkThresholds(metric);
  }
  
  /**
   * Set performance threshold
   */
  setThreshold(
    metricName: string,
    threshold: PerformanceThreshold
  ): void {
    this.thresholds.set(metricName, threshold);
  }
  
  /**
   * Get metrics for a time window
   */
  getMetrics(
    name: string,
    window: TimeWindow
  ): PerformanceMetric[] {
    const metrics = this.metrics.get(name) || [];
    const startTime = this.getWindowStartTime(window);
    
    return metrics.filter(m => m.timestamp >= startTime);
  }
  
  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(
    name: string,
    window: TimeWindow,
    method: AggregationMethod
  ): number | null {
    const metrics = this.getMetrics(name, window);
    if (metrics.length === 0) return null;
    
    const values = metrics.map(m => m.value);
    
    switch (method) {
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'p50':
        return this.percentile(values, 0.5);
      case 'p95':
        return this.percentile(values, 0.95);
      case 'p99':
        return this.percentile(values, 0.99);
      default:
        return null;
    }
  }
  
  /**
   * Get performance report
   */
  getReport(window: TimeWindow): PerformanceReport {
    const report: PerformanceReport = {
      timestamp: new Date(),
      window,
      metrics: {},
      violations: [],
      summary: {
        totalMetrics: 0,
        totalViolations: 0,
        criticalViolations: 0,
        warningViolations: 0
      }
    };
    
    // Collect metrics
    this.metrics.forEach((metrics, name) => {
      const windowMetrics = this.getMetrics(name, window);
      if (windowMetrics.length > 0) {
        report.metrics[name] = {
          count: windowMetrics.length,
          avg: this.getAggregatedMetrics(name, window, 'avg')!,
          min: this.getAggregatedMetrics(name, window, 'min')!,
          max: this.getAggregatedMetrics(name, window, 'max')!,
          p50: this.getAggregatedMetrics(name, window, 'p50')!,
          p95: this.getAggregatedMetrics(name, window, 'p95')!,
          p99: this.getAggregatedMetrics(name, window, 'p99')!
        };
        report.summary.totalMetrics += windowMetrics.length;
      }
    });
    
    // Check violations
    this.thresholds.forEach((threshold, metricName) => {
      const metrics = this.getMetrics(metricName, window);
      metrics.forEach(metric => {
        const violation = this.checkThreshold(metric, threshold);
        if (violation) {
          report.violations.push(violation);
          report.summary.totalViolations++;
          if (violation.level === 'critical') {
            report.summary.criticalViolations++;
          } else if (violation.level === 'warning') {
            report.summary.warningViolations++;
          }
        }
      });
    });
    
    return report;
  }
  
  /**
   * Initialize observers
   */
  private initializeObservers(): void {
    // Initialize based on environment
  }
  
  /**
   * Observe Web Vitals
   */
  private observeWebVitals(): void {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric(
          'lcp',
          entry.startTime,
          'timing',
          { element: (entry as any).element }
        );
      }
    });
    
    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);
    } catch (e) {
      // Not supported
    }
    
    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const eventEntry = entry as PerformanceEventTiming;
        this.recordMetric(
          'fid',
          eventEntry.processingStart - eventEntry.startTime,
          'timing',
          { eventType: eventEntry.name }
        );
      }
    });
    
    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', fidObserver);
    } catch (e) {
      // Not supported
    }
    
    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          this.recordMetric('cls', clsValue, 'score');
        }
      }
    });
    
    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', clsObserver);
    } catch (e) {
      // Not supported
    }
  }
  
  /**
   * Observe resource loading
   */
  private observeResources(): void {
    this.resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceTiming;
        
        this.recordMetric(
          'resource_load_time',
          resourceEntry.responseEnd - resourceEntry.startTime,
          'timing',
          {
            name: resourceEntry.name,
            type: resourceEntry.initiatorType,
            size: resourceEntry.transferSize,
            cached: resourceEntry.transferSize === 0
          }
        );
      }
    });
    
    this.resourceObserver.observe({ entryTypes: ['resource'] });
  }
  
  /**
   * Observe long tasks
   */
  private observeLongTasks(): void {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric(
          'long_task',
          entry.duration,
          'timing',
          {
            name: entry.name,
            startTime: entry.startTime
          }
        );
      }
    });
    
    try {
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', longTaskObserver);
    } catch (e) {
      // Not supported
    }
  }
  
  /**
   * Observe Node.js metrics
   */
  private observeNodeMetrics(): void {
    // CPU usage
    setInterval(() => {
      const usage = process.cpuUsage();
      this.recordMetric(
        'cpu_usage',
        (usage.user + usage.system) / 1000000, // Convert to seconds
        'gauge'
      );
    }, 5000);
    
    // Memory usage
    setInterval(() => {
      const usage = process.memoryUsage();
      this.recordMetric('memory_heap_used', usage.heapUsed, 'gauge');
      this.recordMetric('memory_heap_total', usage.heapTotal, 'gauge');
      this.recordMetric('memory_rss', usage.rss, 'gauge');
      this.recordMetric('memory_external', usage.external, 'gauge');
    }, 5000);
    
    // Event loop lag
    let lastCheck = process.hrtime.bigint();
    setInterval(() => {
      const now = process.hrtime.bigint();
      const delay = Number(now - lastCheck) / 1000000 - 100; // Expected 100ms
      if (delay > 0) {
        this.recordMetric('event_loop_lag', delay, 'timing');
      }
      lastCheck = now;
    }, 100);
  }
  
  /**
   * Add metric to storage
   */
  private addMetric(metric: PerformanceMetric): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    
    this.metrics.get(metric.name)!.push(metric);
    
    // Cleanup old metrics (keep last 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const metrics = this.metrics.get(metric.name)!;
    const filtered = metrics.filter(m => m.timestamp > oneHourAgo);
    this.metrics.set(metric.name, filtered);
  }
  
  /**
   * Check if metric violates threshold
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.name);
    if (!threshold) return;
    
    const violation = this.checkThreshold(metric, threshold);
    if (violation) {
      this.addDomainEvent(new ThresholdViolated({
        correlationId: this.generateCorrelationId(),
        violation,
        timestamp: new Date()
      }));
    }
  }
  
  /**
   * Check single threshold
   */
  private checkThreshold(
    metric: PerformanceMetric,
    threshold: PerformanceThreshold
  ): ThresholdViolation | null {
    let level: AlertLevel | null = null;
    
    if (threshold.critical && metric.value > threshold.critical) {
      level = 'critical';
    } else if (threshold.warning && metric.value > threshold.warning) {
      level = 'warning';
    }
    
    if (!level) return null;
    
    return {
      metric: metric.name,
      value: metric.value,
      threshold: level === 'critical' ? threshold.critical! : threshold.warning!,
      level,
      timestamp: metric.timestamp
    };
  }
  
  /**
   * Get window start time
   */
  private getWindowStartTime(window: TimeWindow): Date {
    const now = Date.now();
    const windowMs = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    return new Date(now - (windowMs[window] || 0));
  }
  
  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const pos = (sorted.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
      return sorted[base];
    }
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `metric-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  getId(): string {
    return 'performance-monitor';
  }
}

// Domain Events
export class MonitoringStarted extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

export class MonitoringStopped extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

export class ThresholdViolated extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      violation: ThresholdViolation;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

// Types
export interface PerformanceReport {
  timestamp: Date;
  window: TimeWindow;
  metrics: Record<string, MetricSummary>;
  violations: ThresholdViolation[];
  summary: {
    totalMetrics: number;
    totalViolations: number;
    criticalViolations: number;
    warningViolations: number;
  };
}

export interface MetricSummary {
  count: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface ThresholdViolation {
  metric: string;
  value: number;
  threshold: number;
  level: AlertLevel;
  timestamp: Date;
}

// Performance Event Timing interface
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
  processingEnd: number;
  duration: number;
  cancelable: boolean;
}