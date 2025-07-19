/*
                     @semantest/realtime-streaming

 Copyright (C) 2025-today  Semantest Team

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * @fileoverview High-Performance WebSocket Server Main Entry Point
 * @author Semantest Team
 * @module main-high-performance
 */

import { HighPerformanceServer, HighPerformanceServerConfig } from './infrastructure/server/high-performance-server';
import { PerformanceBenchmark, BenchmarkConfig } from './benchmarks/performance-benchmark';
import { Logger } from '@shared/infrastructure/logger';

// Enhanced Configuration for High Performance
const config: HighPerformanceServerConfig = {
  server: {
    port: parseInt(process.env.PORT || '8080'),
    host: process.env.HOST || '0.0.0.0',
    workers: parseInt(process.env.WORKERS || '4'),
    maxConnections: parseInt(process.env.MAX_CONNECTIONS || '10000'),
    keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT || '65000'),
    headersTimeout: parseInt(process.env.HEADERS_TIMEOUT || '66000'),
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '300000'),
    ssl: {
      enabled: process.env.SSL_ENABLED === 'true',
      cert: process.env.SSL_CERT || '',
      key: process.env.SSL_KEY || '',
      ca: process.env.SSL_CA
    }
  },
  broker: {
    clustering: {
      redis: {
        nodes: JSON.parse(process.env.REDIS_CLUSTER_NODES || JSON.stringify([
          { host: 'localhost', port: 7000 },
          { host: 'localhost', port: 7001 },
          { host: 'localhost', port: 7002 },
          { host: 'localhost', port: 7003 },
          { host: 'localhost', port: 7004 },
          { host: 'localhost', port: 7005 }
        ])),
        options: {
          enableReadyCheck: true,
          redisOptions: {
            password: process.env.REDIS_PASSWORD,
            connectTimeout: 10000,
            commandTimeout: 5000,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3
          }
        }
      },
      sharding: {
        enabled: true,
        shardCount: 16,
        hashFunction: 'crc32' as const
      },
      replication: {
        enabled: true,
        replicationFactor: 2
      }
    },
    performance: {
      messageCompression: {
        enabled: true,
        algorithm: 'lz4' as const,
        threshold: 1024
      },
      batching: {
        enabled: true,
        maxBatchSize: 100,
        batchTimeout: 10,
        adaptiveBatching: true
      },
      caching: {
        enabled: true,
        ttl: 300000,
        maxSize: 100 * 1024 * 1024, // 100MB
        strategy: 'lru' as const
      },
      connection: {
        maxConnections: 10000,
        connectionPoolSize: 50,
        keepAlive: true,
        tcpNoDelay: true
      }
    },
    scaling: {
      autoScaling: {
        enabled: true,
        minInstances: 2,
        maxInstances: 20,
        targetCPU: 70,
        targetMemory: 80,
        targetConnections: 8000,
        scaleUpCooldown: 300000,
        scaleDownCooldown: 600000
      },
      loadBalancing: {
        algorithm: 'least_connections' as const,
        healthCheckInterval: 30000,
        unhealthyThreshold: 3
      }
    },
    monitoring: {
      metrics: {
        enabled: true,
        interval: 10000,
        retention: 3600000
      },
      alerting: {
        enabled: true,
        thresholds: {
          latency: 1000,
          errorRate: 0.01,
          memoryUsage: 90,
          connectionCount: 9000
        }
      }
    },
    security: {
      rateLimiting: {
        enabled: true,
        windowMs: 60000,
        maxRequests: 1000,
        skipSuccessfulRequests: false
      },
      authentication: {
        enabled: process.env.AUTH_ENABLED === 'true',
        tokenValidation: true,
        refreshInterval: 3600000
      }
    }
  },
  cluster: {
    nodes: JSON.parse(process.env.REDIS_CLUSTER_NODES || JSON.stringify([
      { host: 'localhost', port: 7000, role: 'master' as const },
      { host: 'localhost', port: 7001, role: 'slave' as const },
      { host: 'localhost', port: 7002, role: 'master' as const },
      { host: 'localhost', port: 7003, role: 'slave' as const },
      { host: 'localhost', port: 7004, role: 'master' as const },
      { host: 'localhost', port: 7005, role: 'slave' as const }
    ])),
    options: {
      enableReadyCheck: true,
      redisOptions: {
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        keepAlive: 30000,
        family: 4
      },
      clusterRetryDelayOnFailover: 100,
      clusterRetryDelayOnClusterDown: 300,
      clusterRetryDelayOnMoved: 0,
      clusterMaxRedirections: 16,
      clusterMode: 'cluster' as const,
      scaleReads: 'slave' as const,
      readOnly: false,
      enableOfflineQueue: false
    },
    monitoring: {
      healthCheckInterval: 30000,
      performanceMetrics: true,
      slowLogThreshold: 1000,
      memoryThreshold: 90,
      connectionThreshold: 1000
    },
    failover: {
      enabled: true,
      automaticFailover: true,
      failoverTimeout: 30000,
      maxFailoverAttempts: 3,
      backupNodes: []
    },
    sharding: {
      strategy: 'consistent_hash' as const,
      virtualNodes: 160,
      rebalanceThreshold: 0.1,
      autoRebalance: true
    },
    replication: {
      enabled: true,
      replicationFactor: 2,
      asyncReplication: true,
      replicationTimeout: 5000
    }
  },
  monitoring: {
    metrics: {
      enabled: true,
      collectionInterval: 5000,
      retentionPeriod: 86400000, // 24 hours
      aggregationWindow: 60000,
      customMetrics: []
    },
    alerting: {
      enabled: true,
      channels: [
        {
          type: 'webhook' as const,
          config: { url: process.env.ALERT_WEBHOOK_URL || 'http://localhost:9093/api/v1/alerts' },
          severity: ['medium', 'high', 'critical'] as const
        }
      ],
      thresholds: {
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 80, critical: 95 },
        latency: { warning: 500, critical: 1000 },
        errorRate: { warning: 0.01, critical: 0.05 },
        throughput: { warning: 1000, critical: 500 },
        connections: { warning: 8000, critical: 9500 }
      },
      escalation: {
        levels: [
          { severity: 'low' as const, delay: 300000, channels: [], actions: [] },
          { severity: 'medium' as const, delay: 180000, channels: ['webhook'], actions: ['log'] },
          { severity: 'high' as const, delay: 60000, channels: ['webhook'], actions: ['log', 'scale'] },
          { severity: 'critical' as const, delay: 30000, channels: ['webhook'], actions: ['log', 'scale', 'restart'] }
        ],
        timeout: 900000,
        maxEscalations: 3
      }
    },
    storage: {
      backend: 'redis' as const,
      compression: true,
      batchSize: 100,
      flushInterval: 10000
    },
    reporting: {
      enabled: true,
      formats: ['json', 'csv'] as const,
      schedule: '0 0 * * *',
      recipients: []
    },
    sampling: {
      strategy: 'adaptive' as const,
      rate: 0.1,
      maxSamples: 10000,
      windowSize: 300000
    }
  },
  autoScaling: {
    enabled: true,
    minInstances: 2,
    maxInstances: 20,
    scaleUpThreshold: {
      cpu: 70,
      memory: 80,
      connections: 8000
    },
    scaleDownThreshold: {
      cpu: 30,
      memory: 40,
      connections: 2000
    },
    cooldownPeriod: 300000,
    healthCheckGracePeriod: 60000
  },
  healthCheck: {
    enabled: true,
    path: '/health',
    interval: 10000,
    timeout: 5000,
    retries: 3,
    gracefulShutdownTimeout: 30000
  }
};

// Benchmark Configuration
const benchmarkConfig: BenchmarkConfig = {
  scenarios: [
    {
      name: 'low_load',
      description: 'Low load test with 100 concurrent clients',
      concurrentClients: 100,
      messagesPerSecond: 1000,
      messageSize: 1024,
      channels: 10,
      publishRate: 100,
      subscribeRate: 50,
      enabled: true
    },
    {
      name: 'medium_load',
      description: 'Medium load test with 1000 concurrent clients',
      concurrentClients: 1000,
      messagesPerSecond: 10000,
      messageSize: 2048,
      channels: 50,
      publishRate: 1000,
      subscribeRate: 500,
      enabled: true
    },
    {
      name: 'high_load',
      description: 'High load test with 5000 concurrent clients',
      concurrentClients: 5000,
      messagesPerSecond: 50000,
      messageSize: 4096,
      channels: 100,
      publishRate: 5000,
      subscribeRate: 2500,
      enabled: true
    },
    {
      name: 'stress_test',
      description: 'Stress test with 10000 concurrent clients',
      concurrentClients: 10000,
      messagesPerSecond: 100000,
      messageSize: 8192,
      channels: 200,
      publishRate: 10000,
      subscribeRate: 5000,
      enabled: process.env.RUN_STRESS_TEST === 'true'
    }
  ],
  duration: parseInt(process.env.BENCHMARK_DURATION || '300000'), // 5 minutes
  warmupDuration: parseInt(process.env.WARMUP_DURATION || '30000'), // 30 seconds
  reportInterval: parseInt(process.env.REPORT_INTERVAL || '5000'), // 5 seconds
  outputFormats: ['console', 'json', 'csv'] as const
};

// Logger setup
const logger: Logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
  },
  debug: (message: string, meta?: any) => {
    if (process.env.DEBUG === 'true') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }
};

/**
 * Main application with high-performance WebSocket server
 */
async function main(): Promise<void> {
  const server = new HighPerformanceServer(config, logger);
  
  try {
    logger.info('Starting High-Performance WebSocket Server...');
    
    // Start the server
    await server.start();

    logger.info('High-Performance WebSocket Server started successfully', {
      host: config.server.host,
      port: config.server.port,
      maxConnections: config.server.maxConnections,
      clustering: config.broker.clustering.redis.nodes.length > 0,
      autoScaling: config.autoScaling.enabled,
      monitoring: config.monitoring.metrics.enabled
    });

    // Run benchmark if requested
    if (process.env.RUN_BENCHMARK === 'true') {
      logger.info('Starting performance benchmark...');
      
      // Wait for server to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const benchmark = new PerformanceBenchmark(server, logger);
      const results = await benchmark.run(benchmarkConfig);
      
      logger.info('Performance benchmark completed', {
        scenarios: results.length,
        totalMessages: results.reduce((sum, r) => sum + r.summary.totalMessages, 0),
        avgThroughput: results.reduce((sum, r) => sum + r.throughput.messagesPerSecond, 0) / results.length,
        avgLatency: results.reduce((sum, r) => sum + r.latency.mean, 0) / results.length
      });
    }

    // Print server information
    const metrics = await server.getMetrics();
    const healthStatus = await server.getHealthStatus();
    
    logger.info('Server Status', {
      status: healthStatus.status,
      uptime: metrics.uptime,
      connections: metrics.connections,
      throughput: metrics.throughput,
      latency: metrics.latency.avg,
      cpu: metrics.cpu,
      memory: metrics.memory,
      cluster: metrics.cluster
    });

    // Keep the process running
    process.stdin.resume();

  } catch (error) {
    logger.error('Failed to start High-Performance WebSocket Server', { 
      error: error.message,
      stack: error.stack 
    });
    process.exit(1);
  }
}

/**
 * Performance test runner
 */
async function runPerformanceTest(): Promise<void> {
  logger.info('Running standalone performance test...');
  
  const server = new HighPerformanceServer(config, logger);
  
  try {
    await server.start();
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const benchmark = new PerformanceBenchmark(server, logger);
    const results = await benchmark.run(benchmarkConfig);
    
    // Print comprehensive results
    console.log('\n' + '='.repeat(80));
    console.log('HIGH-PERFORMANCE WEBSOCKET SERVER BENCHMARK RESULTS');
    console.log('='.repeat(80));
    
    for (const result of results) {
      console.log(`\n📊 Scenario: ${result.scenario}`);
      console.log(`⏱️  Duration: ${(result.duration / 1000).toFixed(2)}s`);
      console.log(`🚀 Throughput: ${result.throughput.messagesPerSecond.toFixed(0)} msg/s`);
      console.log(`📈 Peak Throughput: ${result.throughput.peakThroughput.toFixed(0)} msg/s`);
      console.log(`📊 Sustained Throughput: ${result.throughput.sustainedThroughput.toFixed(0)} msg/s`);
      console.log(`⚡ Average Latency: ${result.latency.mean.toFixed(2)}ms`);
      console.log(`📈 P95 Latency: ${result.latency.p95.toFixed(2)}ms`);
      console.log(`📈 P99 Latency: ${result.latency.p99.toFixed(2)}ms`);
      console.log(`❌ Error Rate: ${(result.errors.errorRate * 100).toFixed(3)}%`);
      console.log(`🔌 Connections: ${result.summary.totalConnections.toLocaleString()}`);
      console.log(`📨 Messages: ${result.summary.totalMessages.toLocaleString()}`);
      console.log(`💾 CPU Usage: ${result.resources.cpu.avg.toFixed(1)}% (peak: ${result.resources.cpu.max.toFixed(1)}%)`);
      console.log(`🧠 Memory Usage: ${result.resources.memory.avg.toFixed(1)}% (peak: ${result.resources.memory.max.toFixed(1)}%)`);
      console.log('-'.repeat(80));
    }
    
    // Overall summary
    const totalMessages = results.reduce((sum, r) => sum + r.summary.totalMessages, 0);
    const avgThroughput = results.reduce((sum, r) => sum + r.throughput.messagesPerSecond, 0) / results.length;
    const avgLatency = results.reduce((sum, r) => sum + r.latency.mean, 0) / results.length;
    const overallErrorRate = results.reduce((sum, r) => sum + r.errors.errorRate, 0) / results.length;
    
    console.log('\n🎯 OVERALL PERFORMANCE SUMMARY');
    console.log('='.repeat(80));
    console.log(`📊 Total Scenarios: ${results.length}`);
    console.log(`📨 Total Messages Processed: ${totalMessages.toLocaleString()}`);
    console.log(`🚀 Average Throughput: ${avgThroughput.toFixed(0)} msg/s`);
    console.log(`⚡ Average Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`❌ Overall Error Rate: ${(overallErrorRate * 100).toFixed(3)}%`);
    console.log(`✅ Server Status: HIGH-PERFORMANCE WEBSOCKET SERVICE READY`);
    console.log('='.repeat(80));
    
    await server.stop();
    
  } catch (error) {
    logger.error('Performance test failed', { error: error.message });
    await server.stop();
    process.exit(1);
  }
}

// Command line handling
const command = process.argv[2];

switch (command) {
  case 'benchmark':
    runPerformanceTest();
    break;
  case 'test':
    process.env.RUN_BENCHMARK = 'true';
    main();
    break;
  default:
    main();
}

export { main, config, logger, benchmarkConfig };