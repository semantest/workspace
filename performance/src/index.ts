// Core
export { PerformanceMonitor } from './core/performance-monitor';
export { CacheManager } from './caching/cache-manager';

// Types
export * from './types';

// Monitoring
export { WebVitalsMonitor } from './monitoring/web-vitals';
export { NodeMetricsMonitor } from './monitoring/node-metrics';
export { CustomMetricsCollector } from './monitoring/custom-metrics';

// Optimization
export { OptimizationEngine } from './optimization/optimization-engine';
export { BundleOptimizer } from './optimization/bundler';
export { LazyLoader } from './optimization/lazy-loader';
export { ResourcePreloader } from './optimization/preloader';

// Reporting
export { PerformanceDashboard } from './reporting/dashboard';
export { PerformanceAnalyzer } from './reporting/analyzer';

// Utilities
export { performanceCheck } from './tools/performance-check';
export { generateReport } from './tools/report-generator';

/**
 * Create performance monitor with default configuration
 */
import { PerformanceConfig } from './types';
import { PerformanceMonitor } from './core/performance-monitor';
import { CacheManager } from './caching/cache-manager';

export function createPerformanceMonitor(config?: Partial<PerformanceConfig>): PerformanceMonitor {
  const monitor = new PerformanceMonitor();
  
  // Apply configuration
  if (config?.thresholds) {
    Object.entries(config.thresholds).forEach(([metric, threshold]) => {
      if (threshold) {
        monitor.setThreshold(metric, threshold);
      }
    });
  }
  
  return monitor;
}

/**
 * Create cache manager with default configuration
 */
export function createCacheManager(config?: any): CacheManager {
  return new CacheManager({
    defaultStrategy: 'memory',
    defaultTTL: 3600,
    maxSize: 50 * 1024 * 1024, // 50MB
    evictionPolicy: 'lru',
    ...config
  });
}

/**
 * Default performance thresholds
 */
export const defaultThresholds = {
  // Web Vitals
  lcp: { warning: 2500, critical: 4000 },
  fid: { warning: 100, critical: 300 },
  cls: { warning: 0.1, critical: 0.25 },
  
  // Resources
  resourceLoadTime: { warning: 1000, critical: 3000 },
  bundleSize: { warning: 200000, critical: 500000 },
  
  // Node.js
  cpuUsage: { warning: 70, critical: 90 },
  memoryUsage: { warning: 80, critical: 95 },
  eventLoopLag: { warning: 50, critical: 100 }
};