import { PerformanceMonitor } from '../core/performance-monitor';
import * as os from 'os';

/**
 * Node.js metrics monitoring
 */
export class NodeMetricsMonitor {
  private intervalId?: NodeJS.Timeout;
  
  constructor(
    private monitor: PerformanceMonitor,
    private interval: number = 5000
  ) {}
  
  /**
   * Start monitoring Node.js metrics
   */
  start(): void {
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.interval);
    
    // Collect immediately
    this.collectMetrics();
  }
  
  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
  
  /**
   * Collect all metrics
   */
  private collectMetrics(): void {
    this.collectCPUMetrics();
    this.collectMemoryMetrics();
    this.collectEventLoopMetrics();
    this.collectGCMetrics();
  }
  
  /**
   * Collect CPU metrics
   */
  private collectCPUMetrics(): void {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    
    this.monitor.recordMetric('node_cpu_usage', usage, 'gauge', {
      cores: cpus.length
    });
  }
  
  /**
   * Collect memory metrics
   */
  private collectMemoryMetrics(): void {
    const usage = process.memoryUsage();
    
    this.monitor.recordMetric('node_memory_heap_used', usage.heapUsed, 'gauge');
    this.monitor.recordMetric('node_memory_heap_total', usage.heapTotal, 'gauge');
    this.monitor.recordMetric('node_memory_rss', usage.rss, 'gauge');
    this.monitor.recordMetric('node_memory_external', usage.external, 'gauge');
    
    // Calculate heap usage percentage
    const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
    this.monitor.recordMetric('node_memory_heap_usage_percent', heapUsagePercent, 'gauge');
  }
  
  /**
   * Collect event loop metrics
   */
  private collectEventLoopMetrics(): void {
    const start = process.hrtime.bigint();
    
    setImmediate(() => {
      const end = process.hrtime.bigint();
      const lag = Number(end - start) / 1000000; // Convert to ms
      
      this.monitor.recordMetric('node_event_loop_lag', lag, 'timing');
    });
  }
  
  /**
   * Collect garbage collection metrics
   */
  private collectGCMetrics(): void {
    if (global.gc) {
      const before = process.memoryUsage();
      const startTime = process.hrtime.bigint();
      
      global.gc();
      
      const endTime = process.hrtime.bigint();
      const after = process.memoryUsage();
      
      const duration = Number(endTime - startTime) / 1000000; // ms
      const freed = before.heapUsed - after.heapUsed;
      
      this.monitor.recordMetric('node_gc_duration', duration, 'timing');
      this.monitor.recordMetric('node_gc_freed', freed, 'gauge');
    }
  }
}