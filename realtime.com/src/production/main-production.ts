#!/usr/bin/env node

import { createLogger, format, transports } from 'winston';
import { ProductionOrchestrator } from './production-orchestrator';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Production configuration
const PRODUCTION_CONFIG = {
  environment: (process.env.NODE_ENV || 'production') as 'production' | 'staging' | 'development',
  deployment: {
    mode: 'cluster' as const,
    workers: process.env.WORKERS ? parseInt(process.env.WORKERS) : 'auto' as const,
    gracefulShutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT || '30000'),
    healthCheckPort: parseInt(process.env.HEALTH_PORT || '9090'),
    metricsPort: parseInt(process.env.METRICS_PORT || '9091')
  },
  scaling: {
    maxConnections: parseInt(process.env.MAX_CONNECTIONS || '1000000'),
    maxConnectionsPerWorker: parseInt(process.env.MAX_CONNECTIONS_PER_WORKER || '50000'),
    scaleUpThreshold: parseFloat(process.env.SCALE_UP_THRESHOLD || '0.8'),
    scaleDownThreshold: parseFloat(process.env.SCALE_DOWN_THRESHOLD || '0.3'),
    autoScalingEnabled: process.env.AUTO_SCALING === 'true'
  },
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
    grafanaEnabled: process.env.GRAFANA_ENABLED === 'true',
    alertingEnabled: process.env.ALERTING_ENABLED === 'true',
    logLevel: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error'
  },
  performance: {
    cpuTarget: parseInt(process.env.CPU_TARGET || '70'),
    memoryTarget: parseInt(process.env.MEMORY_TARGET || '80'),
    connectionTarget: parseInt(process.env.CONNECTION_TARGET || '40000'),
    latencyTarget: parseInt(process.env.LATENCY_TARGET || '100')
  },
  reliability: {
    circuitBreakerEnabled: process.env.CIRCUIT_BREAKER_ENABLED !== 'false',
    retryEnabled: process.env.RETRY_ENABLED !== 'false',
    backupEnabled: process.env.BACKUP_ENABLED === 'true',
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '10000')
  }
};

// Create production logger
const logger = createLogger({
  level: PRODUCTION_CONFIG.monitoring.logLevel,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json(),
    format.printf(({ timestamp, level, message, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        pid: process.pid,
        worker: process.env.WORKER_ID || 'primary',
        environment: PRODUCTION_CONFIG.environment,
        ...meta
      });
    })
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}] ${message}${metaStr}`;
        })
      )
    }),
    new transports.File({
      filename: path.join(process.cwd(), 'logs', 'production.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    new transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true
    })
  ],
  exceptionHandlers: [
    new transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log')
    })
  ],
  rejectionHandlers: [
    new transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log')
    })
  ]
});

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

async function main(): Promise<void> {
  logger.info('🚀 Starting Real-Time Platform Production Deployment', {
    version: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    config: PRODUCTION_CONFIG
  });

  // Validate environment
  validateEnvironment();

  // Create and start orchestrator
  const orchestrator = new ProductionOrchestrator(PRODUCTION_CONFIG, logger);

  // Setup event handlers
  setupEventHandlers(orchestrator);

  try {
    await orchestrator.start();
    
    logger.info('✅ Production deployment completed successfully', {
      status: 'RUNNING',
      maxConnections: PRODUCTION_CONFIG.scaling.maxConnections,
      workers: PRODUCTION_CONFIG.deployment.workers,
      environment: PRODUCTION_CONFIG.environment
    });

    // Start health check endpoint
    startHealthEndpoint(orchestrator);

    // Start metrics endpoint
    if (PRODUCTION_CONFIG.monitoring.prometheusEnabled) {
      startMetricsEndpoint(orchestrator);
    }

    // Production readiness signal
    if (process.send) {
      process.send({ type: 'ready' });
    }

  } catch (error) {
    logger.error('❌ Production deployment failed', { error });
    process.exit(1);
  }
}

function validateEnvironment(): void {
  const requiredEnvVars = [
    'REDIS_URL',
    'KAFKA_BROKERS'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error('❌ Missing required environment variables', {
      missing: missingVars,
      available: Object.keys(process.env).filter(key => 
        key.startsWith('REDIS_') || 
        key.startsWith('KAFKA_') ||
        key.startsWith('NODE_')
      )
    });
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate configuration values
  if (PRODUCTION_CONFIG.scaling.maxConnections < 1000) {
    logger.warn('⚠️ Low max connections configured', {
      configured: PRODUCTION_CONFIG.scaling.maxConnections,
      recommended: 100000
    });
  }

  if (PRODUCTION_CONFIG.scaling.maxConnectionsPerWorker < 1000) {
    logger.warn('⚠️ Low connections per worker configured', {
      configured: PRODUCTION_CONFIG.scaling.maxConnectionsPerWorker,
      recommended: 25000
    });
  }

  logger.info('✅ Environment validation passed');
}

function setupEventHandlers(orchestrator: ProductionOrchestrator): void {
  // Worker ready events
  orchestrator.on('worker-ready', (data) => {
    logger.info('👷 Worker ready', data);
  });

  // Metrics events
  orchestrator.on('metrics', (data) => {
    logger.debug('📊 Metrics collected', {
      workerId: data.workerId,
      timestamp: data.timestamp,
      connections: data.metrics?.activeConnections || 0,
      memory: data.metrics?.memoryUsage || 0
    });
  });

  // Aggregate metrics
  orchestrator.on('aggregate-metrics', (data) => {
    logger.info('📈 Aggregate metrics', {
      totalServices: data.cluster.totalServices,
      runningServices: data.cluster.runningServices,
      totalConnections: data.cluster.totalConnections,
      memoryUsage: Math.round(data.performance.memoryUsage.heapUsed / 1024 / 1024),
      loadAverage: data.performance.loadAverage[0].toFixed(2)
    });
  });

  // Health check events
  orchestrator.on('health-check', (data) => {
    const healthyServices = data.services.filter((s: any) => s.status === 'running').length;
    const totalServices = data.services.length;
    
    if (healthyServices < totalServices) {
      logger.warn('⚠️ Some services unhealthy', {
        healthy: healthyServices,
        total: totalServices,
        unhealthyServices: data.services
          .filter((s: any) => s.status !== 'running')
          .map((s: any) => ({ name: s.name, status: s.status }))
      });
    }
  });

  // Error events
  orchestrator.on('error', (error) => {
    logger.error('❌ Orchestrator error', { error });
  });

  // Scaling events
  orchestrator.on('scale-up', (data) => {
    logger.info('📈 Scaling up', data);
  });

  orchestrator.on('scale-down', (data) => {
    logger.info('📉 Scaling down', data);
  });
}

function startHealthEndpoint(orchestrator: ProductionOrchestrator): void {
  const http = require('http');
  
  const healthServer = http.createServer((req: any, res: any) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    if (url.pathname === '/health') {
      const status = orchestrator.getStatus();
      const isHealthy = status.services.every((s: any) => s.status === 'running');
      
      res.writeHead(isHealthy ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: Date.now(),
        services: status.services.length,
        runningServices: status.services.filter((s: any) => s.status === 'running').length,
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      }));
    } else if (url.pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(orchestrator.getStatus(), null, 2));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  healthServer.listen(PRODUCTION_CONFIG.deployment.healthCheckPort, () => {
    logger.info('🏥 Health check endpoint started', {
      port: PRODUCTION_CONFIG.deployment.healthCheckPort,
      endpoints: ['/health', '/status']
    });
  });
}

function startMetricsEndpoint(orchestrator: ProductionOrchestrator): void {
  const http = require('http');
  
  const metricsServer = http.createServer((req: any, res: any) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    if (url.pathname === '/metrics') {
      const metrics = orchestrator.getMetrics();
      
      // Convert to Prometheus format
      const prometheusMetrics = convertToPrometheusFormat(metrics);
      
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(prometheusMetrics);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  metricsServer.listen(PRODUCTION_CONFIG.deployment.metricsPort, () => {
    logger.info('📊 Metrics endpoint started', {
      port: PRODUCTION_CONFIG.deployment.metricsPort,
      format: 'prometheus',
      endpoint: '/metrics'
    });
  });
}

function convertToPrometheusFormat(metrics: any): string {
  const timestamp = Date.now();
  let output = '';

  // Cluster metrics
  if (metrics.cluster) {
    output += `# HELP realtime_cluster_services Total number of services\n`;
    output += `# TYPE realtime_cluster_services gauge\n`;
    output += `realtime_cluster_services{type="total"} ${metrics.cluster.totalServices} ${timestamp}\n`;
    output += `realtime_cluster_services{type="running"} ${metrics.cluster.runningServices} ${timestamp}\n`;
    
    output += `# HELP realtime_cluster_connections Total connections\n`;
    output += `# TYPE realtime_cluster_connections gauge\n`;
    output += `realtime_cluster_connections ${metrics.cluster.totalConnections || 0} ${timestamp}\n`;
  }

  // Component metrics
  if (metrics.components) {
    const components = metrics.components;

    // WebSocket metrics
    if (components.webSocketHandlers) {
      const ws = components.webSocketHandlers;
      output += `# HELP realtime_websocket_connections WebSocket connections\n`;
      output += `# TYPE realtime_websocket_connections gauge\n`;
      output += `realtime_websocket_connections{type="active"} ${ws.activeConnections || 0} ${timestamp}\n`;
      output += `realtime_websocket_connections{type="total"} ${ws.totalConnections || 0} ${timestamp}\n`;
      
      output += `# HELP realtime_websocket_messages WebSocket messages\n`;
      output += `# TYPE realtime_websocket_messages counter\n`;
      output += `realtime_websocket_messages{direction="received"} ${ws.messagesReceived || 0} ${timestamp}\n`;
      output += `realtime_websocket_messages{direction="sent"} ${ws.messagesSent || 0} ${timestamp}\n`;
    }

    // Message queue metrics
    if (components.messageQueue) {
      const mq = components.messageQueue;
      output += `# HELP realtime_messages Messages processed\n`;
      output += `# TYPE realtime_messages counter\n`;
      output += `realtime_messages{type="published"} ${mq.messagesPublished || 0} ${timestamp}\n`;
      output += `realtime_messages{type="consumed"} ${mq.messagesConsumed || 0} ${timestamp}\n`;
      
      output += `# HELP realtime_message_errors Message errors\n`;
      output += `# TYPE realtime_message_errors counter\n`;
      output += `realtime_message_errors{type="dead_letter"} ${mq.deadLetterMessages || 0} ${timestamp}\n`;
      output += `realtime_message_errors{type="duplicates"} ${mq.duplicatesDetected || 0} ${timestamp}\n`;
    }

    // Load balancer metrics
    if (components.loadBalancer) {
      const lb = components.loadBalancer;
      output += `# HELP realtime_loadbalancer_requests Load balancer requests\n`;
      output += `# TYPE realtime_loadbalancer_requests counter\n`;
      output += `realtime_loadbalancer_requests ${lb.totalRequests || 0} ${timestamp}\n`;
    }
  }

  // System metrics
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  output += `# HELP realtime_process_memory_bytes Process memory usage\n`;
  output += `# TYPE realtime_process_memory_bytes gauge\n`;
  output += `realtime_process_memory_bytes{type="heap_used"} ${memUsage.heapUsed} ${timestamp}\n`;
  output += `realtime_process_memory_bytes{type="heap_total"} ${memUsage.heapTotal} ${timestamp}\n`;
  output += `realtime_process_memory_bytes{type="external"} ${memUsage.external} ${timestamp}\n`;
  
  output += `# HELP realtime_process_cpu_seconds Process CPU usage\n`;
  output += `# TYPE realtime_process_cpu_seconds counter\n`;
  output += `realtime_process_cpu_seconds{type="user"} ${cpuUsage.user / 1000000} ${timestamp}\n`;
  output += `realtime_process_cpu_seconds{type="system"} ${cpuUsage.system / 1000000} ${timestamp}\n`;
  
  output += `# HELP realtime_process_uptime_seconds Process uptime\n`;
  output += `# TYPE realtime_process_uptime_seconds gauge\n`;
  output += `realtime_process_uptime_seconds ${process.uptime()} ${timestamp}\n`;

  return output;
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Production readiness check
function checkProductionReadiness(): void {
  const checks = [
    { name: 'Node.js Version', check: () => process.version >= 'v18.0.0' },
    { name: 'Memory Available', check: () => os.totalmem() > 1024 * 1024 * 1024 }, // 1GB
    { name: 'Environment', check: () => PRODUCTION_CONFIG.environment === 'production' },
    { name: 'Redis Connection', check: () => !!process.env.REDIS_URL },
    { name: 'Kafka Connection', check: () => !!process.env.KAFKA_BROKERS }
  ];

  const failed = checks.filter(check => !check.check());
  
  if (failed.length > 0) {
    logger.error('❌ Production readiness checks failed', {
      failed: failed.map(f => f.name)
    });
    process.exit(1);
  }

  logger.info('✅ Production readiness checks passed');
}

// CLI argument handling
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'start':
  case undefined:
    checkProductionReadiness();
    main().catch(error => {
      logger.error('❌ Fatal error during startup', { error });
      process.exit(1);
    });
    break;
    
  case 'health':
    // Health check command
    const http = require('http');
    const healthPort = PRODUCTION_CONFIG.deployment.healthCheckPort;
    
    const req = http.get(`http://localhost:${healthPort}/health`, (res: any) => {
      let data = '';
      res.on('data', (chunk: string) => data += chunk);
      res.on('end', () => {
        console.log('Health Status:', JSON.parse(data));
        process.exit(res.statusCode === 200 ? 0 : 1);
      });
    });
    
    req.on('error', (error: Error) => {
      console.error('Health check failed:', error.message);
      process.exit(1);
    });
    
    req.setTimeout(5000, () => {
      console.error('Health check timeout');
      process.exit(1);
    });
    break;
    
  case 'status':
    // Status check command
    const statusPort = PRODUCTION_CONFIG.deployment.healthCheckPort;
    
    const statusReq = http.get(`http://localhost:${statusPort}/status`, (res: any) => {
      let data = '';
      res.on('data', (chunk: string) => data += chunk);
      res.on('end', () => {
        console.log(JSON.stringify(JSON.parse(data), null, 2));
        process.exit(0);
      });
    });
    
    statusReq.on('error', (error: Error) => {
      console.error('Status check failed:', error.message);
      process.exit(1);
    });
    break;
    
  default:
    console.log(`
Real-Time Platform Production Deployment

Usage: node main-production.js [command]

Commands:
  start     Start the production platform (default)
  health    Check platform health
  status    Get detailed platform status

Environment Variables:
  NODE_ENV                 Environment (production/staging/development)
  WORKERS                  Number of worker processes (auto-detect if not set)
  MAX_CONNECTIONS          Maximum total connections (default: 1000000)
  MAX_CONNECTIONS_PER_WORKER  Maximum connections per worker (default: 50000)
  REDIS_URL               Redis connection URL
  KAFKA_BROKERS           Kafka broker URLs (comma-separated)
  AUTO_SCALING            Enable auto-scaling (true/false)
  MONITORING_ENABLED      Enable monitoring (default: true)
  LOG_LEVEL               Log level (debug/info/warn/error)

Examples:
  NODE_ENV=production WORKERS=8 MAX_CONNECTIONS=2000000 node main-production.js
  node main-production.js health
  node main-production.js status
`);
    process.exit(0);
}

export { main, PRODUCTION_CONFIG };