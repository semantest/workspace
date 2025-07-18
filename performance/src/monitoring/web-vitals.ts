import { getCLS, getFID, getLCP, getTTFB, getFCP } from 'web-vitals';
import { PerformanceMonitor } from '../core/performance-monitor';

/**
 * Web Vitals monitoring
 */
export class WebVitalsMonitor {
  constructor(private monitor: PerformanceMonitor) {}
  
  /**
   * Start monitoring Web Vitals
   */
  start(): void {
    // Largest Contentful Paint
    getLCP((metric) => {
      this.monitor.recordMetric('web_vitals_lcp', metric.value, 'timing', {
        rating: this.getRating('lcp', metric.value)
      });
    });
    
    // First Input Delay
    getFID((metric) => {
      this.monitor.recordMetric('web_vitals_fid', metric.value, 'timing', {
        rating: this.getRating('fid', metric.value)
      });
    });
    
    // Cumulative Layout Shift
    getCLS((metric) => {
      this.monitor.recordMetric('web_vitals_cls', metric.value, 'score', {
        rating: this.getRating('cls', metric.value)
      });
    });
    
    // Time to First Byte
    getTTFB((metric) => {
      this.monitor.recordMetric('web_vitals_ttfb', metric.value, 'timing', {
        rating: this.getRating('ttfb', metric.value)
      });
    });
    
    // First Contentful Paint
    getFCP((metric) => {
      this.monitor.recordMetric('web_vitals_fcp', metric.value, 'timing', {
        rating: this.getRating('fcp', metric.value)
      });
    });
  }
  
  /**
   * Get rating for metric value
   */
  private getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, { good: number; poor: number }> = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 800, poor: 1800 },
      fcp: { good: 1800, poor: 3000 }
    };
    
    const threshold = thresholds[metric];
    if (!threshold) return 'poor';
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }
}