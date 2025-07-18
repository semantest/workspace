import { PerformanceMonitor } from '../core/performance-monitor';
import { MetricType } from '../types';

/**
 * Custom metrics collector
 */
export class CustomMetricsCollector {
  constructor(private monitor: PerformanceMonitor) {}
  
  /**
   * Record API response time
   */
  recordAPIResponseTime(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number
  ): void {
    this.monitor.recordMetric('api_response_time', duration, 'timing', {
      endpoint,
      method,
      statusCode,
      success: statusCode >= 200 && statusCode < 300
    });
  }
  
  /**
   * Record database query time
   */
  recordDatabaseQueryTime(
    query: string,
    duration: number,
    rowCount?: number
  ): void {
    this.monitor.recordMetric('db_query_time', duration, 'timing', {
      query: query.substring(0, 100), // Truncate for safety
      rowCount
    });
  }
  
  /**
   * Record cache performance
   */
  recordCachePerformance(
    operation: 'hit' | 'miss' | 'set' | 'evict',
    cacheName: string,
    duration?: number
  ): void {
    this.monitor.recordMetric(`cache_${operation}`, 1, 'counter', {
      cacheName
    });
    
    if (duration) {
      this.monitor.recordMetric('cache_operation_time', duration, 'timing', {
        operation,
        cacheName
      });
    }
  }
  
  /**
   * Record test execution time
   */
  recordTestExecutionTime(
    testId: string,
    duration: number,
    status: 'passed' | 'failed' | 'skipped'
  ): void {
    this.monitor.recordMetric('test_execution_time', duration, 'timing', {
      testId,
      status
    });
  }
  
  /**
   * Record bundle size
   */
  recordBundleSize(
    bundleName: string,
    size: number,
    compressed?: number
  ): void {
    this.monitor.recordMetric('bundle_size', size, 'gauge', {
      bundleName,
      compressed,
      compressionRatio: compressed ? (1 - compressed / size) * 100 : 0
    });
  }
  
  /**
   * Record user action
   */
  recordUserAction(
    action: string,
    duration: number,
    success: boolean
  ): void {
    this.monitor.recordMetric('user_action_time', duration, 'timing', {
      action,
      success
    });
  }
  
  /**
   * Record business metric
   */
  recordBusinessMetric(
    name: string,
    value: number,
    type: MetricType = 'gauge',
    metadata?: Record<string, any>
  ): void {
    this.monitor.recordMetric(`business_${name}`, value, type, metadata);
  }
}