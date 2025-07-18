import { Request, Response, NextFunction } from 'express';
import { monitoring } from './monitoring-service';
import { logger } from '../logging/logger';

/**
 * Express middleware for request monitoring
 */
export function requestMonitoring() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = monitoring.recordRequestStart();
    
    // Attach request ID to request object
    (req as any).requestId = requestId;
    
    // Log request start
    logger.info('Request started', {
      requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    
    // Capture response finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      // Record request metrics
      monitoring.recordRequestEnd(requestId, res.statusCode, duration);
      
      // Log request completion
      logger.info('Request completed', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('content-length')
      });
    });
    
    // Capture response close (client disconnect)
    res.on('close', () => {
      if (!res.finished) {
        const duration = Date.now() - startTime;
        
        logger.warn('Request closed prematurely', {
          requestId,
          method: req.method,
          path: req.path,
          duration
        });
      }
    });
    
    next();
  };
}

/**
 * Health check endpoint middleware
 */
export function healthCheckEndpoint(path: string = '/health') {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.path !== path) {
      return next();
    }
    
    try {
      const health = await monitoring.checkHealth();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Health check failed', error as Error);
      
      res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Metrics endpoint middleware
 */
export function metricsEndpoint(path: string = '/metrics') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path !== path) {
      return next();
    }
    
    try {
      const performanceMetrics = monitoring.getPerformanceMetrics();
      const requestMetrics = monitoring.getRequestMetrics();
      
      res.json({
        performance: performanceMetrics,
        requests: requestMetrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Metrics collection failed', error as Error);
      
      res.status(500).json({
        error: 'Metrics collection failed',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Performance monitoring middleware
 */
export function performanceMonitoring() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startCpu = process.cpuUsage();
    const startMem = process.memoryUsage();
    
    res.on('finish', () => {
      const endCpu = process.cpuUsage(startCpu);
      const endMem = process.memoryUsage();
      
      // Only log if request took significant resources
      const cpuTime = (endCpu.user + endCpu.system) / 1000; // Convert to ms
      
      if (cpuTime > 100 || endMem.heapUsed - startMem.heapUsed > 10 * 1024 * 1024) {
        logger.debug('Request resource usage', {
          requestId: (req as any).requestId,
          cpu: {
            user: endCpu.user / 1000,
            system: endCpu.system / 1000,
            total: cpuTime
          },
          memory: {
            heapUsedDelta: endMem.heapUsed - startMem.heapUsed,
            externalDelta: endMem.external - startMem.external
          }
        });
      }
    });
    
    next();
  };
}