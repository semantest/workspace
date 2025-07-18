/**
 * Performance metric types
 */
export type MetricType = 'counter' | 'gauge' | 'timing' | 'histogram' | 'score';

/**
 * Time window for metrics
 */
export type TimeWindow = '1m' | '5m' | '15m' | '30m' | '1h' | '6h' | '12h' | '24h' | '7d' | '30d';

/**
 * Aggregation methods
 */
export type AggregationMethod = 'avg' | 'min' | 'max' | 'sum' | 'p50' | 'p95' | 'p99';

/**
 * Alert levels
 */
export type AlertLevel = 'info' | 'warning' | 'critical';

/**
 * Cache strategies
 */
export type CacheStrategy = 'memory' | 'redis' | 'hybrid';

/**
 * Eviction policies
 */
export type EvictionPolicy = 'lru' | 'lfu' | 'fifo' | 'random';

/**
 * Serialization formats
 */
export type SerializationFormat = 'json' | 'msgpack' | 'binary' | 'raw';

/**
 * Performance metric
 */
export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  type: MetricType;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Performance threshold
 */
export interface PerformanceThreshold {
  warning?: number;
  critical?: number;
  window?: TimeWindow;
  aggregation?: AggregationMethod;
}

/**
 * Cache entry
 */
export interface CacheEntry {
  key: string;
  value: any;
  size: number;
  format: SerializationFormat;
  createdAt: Date;
  expiresAt?: Date;
  accessedAt?: Date;
  accessCount?: number;
  metadata?: Record<string, any>;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  defaultStrategy: CacheStrategy;
  defaultTTL?: number; // seconds
  maxSize?: number; // bytes
  maxEntries?: number;
  evictionPolicy?: EvictionPolicy;
  compression?: boolean;
  encryption?: boolean;
  
  // Redis specific
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    cluster?: boolean;
  };
  
  // Named cache configurations
  caches?: Record<string, {
    strategy: CacheStrategy;
    ttl?: number;
    maxSize?: number;
    maxEntries?: number;
  }>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  entries: number;
  hitRate?: number;
  missRate?: number;
  evictionRate?: number;
}

/**
 * Performance optimization configuration
 */
export interface PerformanceConfig {
  monitoring: {
    enabled: boolean;
    webVitals?: boolean;
    resources?: boolean;
    longTasks?: boolean;
    nodeMetrics?: boolean;
    customMetrics?: boolean;
  };
  
  thresholds: {
    // Web Vitals
    lcp?: PerformanceThreshold;
    fid?: PerformanceThreshold;
    cls?: PerformanceThreshold;
    
    // Resources
    resourceLoadTime?: PerformanceThreshold;
    bundleSize?: PerformanceThreshold;
    
    // Node.js
    cpuUsage?: PerformanceThreshold;
    memoryUsage?: PerformanceThreshold;
    eventLoopLag?: PerformanceThreshold;
    
    // Custom
    [key: string]: PerformanceThreshold | undefined;
  };
  
  optimization: {
    bundling?: {
      enabled: boolean;
      splitChunks?: boolean;
      treeShaking?: boolean;
      minification?: boolean;
      compression?: 'gzip' | 'brotli' | 'both';
    };
    
    caching?: {
      enabled: boolean;
      strategy?: CacheStrategy;
      ttl?: number;
    };
    
    lazyLoading?: {
      enabled: boolean;
      routes?: boolean;
      images?: boolean;
      components?: boolean;
    };
    
    preloading?: {
      enabled: boolean;
      priority?: string[];
      prefetch?: boolean;
      preconnect?: string[];
    };
  };
}

/**
 * Performance report
 */
export interface PerformanceReport {
  id: string;
  timestamp: Date;
  duration: TimeWindow;
  metrics: Record<string, MetricReport>;
  webVitals?: WebVitalsReport;
  resources?: ResourceReport;
  violations: ViolationReport[];
  recommendations: string[];
  score: number; // 0-100
}

/**
 * Metric report
 */
export interface MetricReport {
  name: string;
  type: MetricType;
  count: number;
  current: number;
  average: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  trend: 'improving' | 'stable' | 'degrading';
}

/**
 * Web Vitals report
 */
export interface WebVitalsReport {
  lcp: {
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
  };
  fid: {
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
  };
  cls: {
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
  };
  ttfb?: {
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
  };
  inp?: {
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
  };
}

/**
 * Resource report
 */
export interface ResourceReport {
  totalSize: number;
  totalCount: number;
  byType: Record<string, {
    size: number;
    count: number;
    avgLoadTime: number;
  }>;
  slowest: Array<{
    url: string;
    size: number;
    loadTime: number;
    type: string;
  }>;
  largest: Array<{
    url: string;
    size: number;
    loadTime: number;
    type: string;
  }>;
}

/**
 * Violation report
 */
export interface ViolationReport {
  metric: string;
  threshold: number;
  actual: number;
  severity: AlertLevel;
  duration: number; // ms
  timestamp: Date;
  impact: string;
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  id: string;
  type: 'bundle' | 'cache' | 'lazy-load' | 'preload' | 'compression';
  before: {
    size?: number;
    loadTime?: number;
    metrics?: Record<string, number>;
  };
  after: {
    size?: number;
    loadTime?: number;
    metrics?: Record<string, number>;
  };
  improvement: {
    percentage: number;
    absolute: number;
    impact: 'high' | 'medium' | 'low';
  };
  applied: boolean;
  timestamp: Date;
}