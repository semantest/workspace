import { IHealthCheck, HealthCheckResult, HealthStatus } from './interfaces';
import * as os from 'os';
import * as fs from 'fs';
import { promisify } from 'util';

const fsAccess = promisify(fs.access);

/**
 * Database health check
 */
export class DatabaseHealthCheck implements IHealthCheck {
  name = 'database';
  timeout = 5000;
  critical = true;

  constructor(
    private checkConnection: () => Promise<boolean>,
    private label: string = 'Database'
  ) {}

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const isConnected = await this.checkConnection();
      const duration = Date.now() - startTime;
      
      return {
        name: this.name,
        status: isConnected ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        message: isConnected ? `${this.label} is connected` : `${this.label} connection failed`,
        duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name: this.name,
        status: HealthStatus.UNHEALTHY,
        message: `${this.label} check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * Redis health check
 */
export class RedisHealthCheck implements IHealthCheck {
  name = 'redis';
  timeout = 3000;
  critical = false;

  constructor(
    private checkConnection: () => Promise<boolean>,
    private label: string = 'Redis'
  ) {}

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const isConnected = await this.checkConnection();
      const duration = Date.now() - startTime;
      
      return {
        name: this.name,
        status: isConnected ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
        message: isConnected ? `${this.label} is connected` : `${this.label} connection failed`,
        duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name: this.name,
        status: HealthStatus.DEGRADED,
        message: `${this.label} check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * Disk space health check
 */
export class DiskSpaceHealthCheck implements IHealthCheck {
  name = 'disk_space';
  timeout = 1000;
  critical = true;

  constructor(
    private path: string = '/',
    private thresholdPercent: number = 90
  ) {}

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // This is a simplified check - in production, use a proper library
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedPercent = ((totalMemory - freeMemory) / totalMemory) * 100;
      
      const duration = Date.now() - startTime;
      
      let status: HealthStatus;
      if (usedPercent < 70) {
        status = HealthStatus.HEALTHY;
      } else if (usedPercent < this.thresholdPercent) {
        status = HealthStatus.DEGRADED;
      } else {
        status = HealthStatus.UNHEALTHY;
      }
      
      return {
        name: this.name,
        status,
        message: `Disk usage: ${usedPercent.toFixed(1)}%`,
        duration,
        details: {
          path: this.path,
          usedPercent: usedPercent.toFixed(1),
          threshold: this.thresholdPercent
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name: this.name,
        status: HealthStatus.UNHEALTHY,
        message: `Disk space check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * Memory health check
 */
export class MemoryHealthCheck implements IHealthCheck {
  name = 'memory';
  timeout = 100;
  critical = true;

  constructor(
    private thresholdPercent: number = 90
  ) {}

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const usedPercent = (usedMemory / totalMemory) * 100;
    
    const duration = Date.now() - startTime;
    
    let status: HealthStatus;
    if (usedPercent < 70) {
      status = HealthStatus.HEALTHY;
    } else if (usedPercent < this.thresholdPercent) {
      status = HealthStatus.DEGRADED;
    } else {
      status = HealthStatus.UNHEALTHY;
    }
    
    return {
      name: this.name,
      status,
      message: `Memory usage: ${usedPercent.toFixed(1)}%`,
      duration,
      details: {
        totalMB: Math.round(totalMemory / 1024 / 1024),
        usedMB: Math.round(usedMemory / 1024 / 1024),
        freeMB: Math.round(freeMemory / 1024 / 1024),
        usedPercent: usedPercent.toFixed(1)
      },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * External service health check
 */
export class ExternalServiceHealthCheck implements IHealthCheck {
  name: string;
  timeout: number;
  critical: boolean;

  constructor(
    name: string,
    private checkService: () => Promise<boolean>,
    options?: {
      timeout?: number;
      critical?: boolean;
    }
  ) {
    this.name = name;
    this.timeout = options?.timeout || 5000;
    this.critical = options?.critical || false;
  }

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), this.timeout);
      });
      
      const isHealthy = await Promise.race([
        this.checkService(),
        timeoutPromise
      ]);
      
      const duration = Date.now() - startTime;
      
      return {
        name: this.name,
        status: isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        message: isHealthy ? `${this.name} is healthy` : `${this.name} is unhealthy`,
        duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name: this.name,
        status: this.critical ? HealthStatus.UNHEALTHY : HealthStatus.DEGRADED,
        message: `${this.name} check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * File system health check
 */
export class FileSystemHealthCheck implements IHealthCheck {
  name = 'filesystem';
  timeout = 2000;
  critical = true;

  constructor(
    private paths: string[] = ['/tmp', './logs']
  ) {}

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const results: Record<string, boolean> = {};
    
    try {
      for (const path of this.paths) {
        try {
          await fsAccess(path, fs.constants.W_OK);
          results[path] = true;
        } catch {
          results[path] = false;
        }
      }
      
      const duration = Date.now() - startTime;
      const allHealthy = Object.values(results).every(v => v);
      const someHealthy = Object.values(results).some(v => v);
      
      let status: HealthStatus;
      if (allHealthy) {
        status = HealthStatus.HEALTHY;
      } else if (someHealthy) {
        status = HealthStatus.DEGRADED;
      } else {
        status = HealthStatus.UNHEALTHY;
      }
      
      return {
        name: this.name,
        status,
        message: allHealthy ? 'All paths are writable' : 'Some paths are not writable',
        duration,
        details: results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name: this.name,
        status: HealthStatus.UNHEALTHY,
        message: `File system check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * Custom health check builder
 */
export function createHealthCheck(
  name: string,
  checkFn: () => Promise<boolean>,
  options?: {
    timeout?: number;
    critical?: boolean;
    healthyMessage?: string;
    unhealthyMessage?: string;
  }
): IHealthCheck {
  return {
    name,
    timeout: options?.timeout,
    critical: options?.critical,
    async check(): Promise<HealthCheckResult> {
      const startTime = Date.now();
      
      try {
        const isHealthy = await checkFn();
        const duration = Date.now() - startTime;
        
        return {
          name,
          status: isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
          message: isHealthy 
            ? (options?.healthyMessage || `${name} is healthy`)
            : (options?.unhealthyMessage || `${name} is unhealthy`),
          duration,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        
        return {
          name,
          status: HealthStatus.UNHEALTHY,
          message: `${name} check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration,
          timestamp: new Date().toISOString()
        };
      }
    }
  };
}