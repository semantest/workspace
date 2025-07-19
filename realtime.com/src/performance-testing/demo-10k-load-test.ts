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
 * @fileoverview Comprehensive 10,000 Concurrent WebSocket Load Test Demo
 * @author Semantest Team
 * @module performance-testing/demo
 */

import { 
  TestExecutionSuite,
  PerformanceTestingFactory,
  PerformanceTestingUtils,
  DefaultConfigurations
} from './index';
import { Logger } from '@shared/infrastructure/logger';
import { PerformanceMonitor } from '../infrastructure/monitoring/performance-monitor';
import { Redis } from 'ioredis';
import * as path from 'path';

/**
 * Demo Configuration for 10,000 Concurrent WebSocket Connections
 */
const DEMO_CONFIG = {
  name: 'WebSocket 10K Load Test Demo',
  description: 'Comprehensive performance testing for 10,000 concurrent WebSocket connections',
  version: '1.0.0',
  
  environment: {
    name: 'demo_environment',
    type: 'production_like' as const,
    infrastructure: {
      serverEndpoints: ['ws://localhost:8080/ws'],
      loadBalancer: 'nginx-lb',
      database: {
        type: 'redis',
        endpoint: 'redis://localhost:6379',
        maxConnections: 100,
        timeout: 5000
      },
      cache: {
        type: 'redis',
        endpoint: 'redis://localhost:6379',
        maxConnections: 50,
        ttl: 3600
      },
      monitoring: ['prometheus', 'grafana']
    },
    monitoring: {
      metricsCollection: true,
      alerting: true,
      tracing: true,
      logging: {
        level: 'info' as const,
        format: 'json' as const,
        outputs: ['console', 'file']
      }
    },
    validation: {
      preTest: [
        {
          name: 'server_health_check',
          type: 'health_check' as const,
          criteria: {
            metric: 'server_status',
            operator: 'eq' as const,
            threshold: 1
          },
          action: 'abort' as const
        },
        {
          name: 'available_connections',
          type: 'capacity' as const,
          criteria: {
            metric: 'max_connections',
            operator: 'gte' as const,
            threshold: 10000
          },
          action: 'warn' as const
        },
        {
          name: 'memory_availability',
          type: 'performance' as const,
          criteria: {
            metric: 'memory_usage',
            operator: 'lt' as const,
            threshold: 0.7
          },
          action: 'warn' as const
        }
      ],
      postTest: [
        {
          name: 'no_memory_leaks',
          type: 'performance' as const,
          criteria: {
            metric: 'memory_growth',
            operator: 'lt' as const,
            threshold: 0.1
          },
          action: 'warn' as const
        },
        {
          name: 'connection_cleanup',
          type: 'capacity' as const,
          criteria: {
            metric: 'active_connections',
            operator: 'lt' as const,
            threshold: 100
          },
          action: 'warn' as const
        }
      ],
      continuous: [
        {
          name: 'cpu_usage_monitor',
          type: 'performance' as const,
          criteria: {
            metric: 'cpu_usage',
            operator: 'lt' as const,
            threshold: 0.9,
            duration: 60000
          },
          action: 'warn' as const
        }
      ]
    }
  },

  loadTesting: {
    ...DefaultConfigurations.basic10KLoadTest,
    stressTestScenarios: [
      {
        name: 'connection_ramp_up',
        description: 'Gradual connection establishment test',
        duration: 600000, // 10 minutes
        connectionPattern: {
          type: 'ramp-up' as const,
          parameters: {
            startConnections: 100,
            endConnections: 10000,
            rampUpTime: 300000
          }
        },
        messagePattern: {
          frequency: 100, // Start low during ramp-up
          burstiness: 1.0,
          sizeDistribution: 'fixed' as const,
          typeDistribution: {
            heartbeat: 0.8,
            data_update: 0.2
          }
        },
        faultInjection: {
          networkDropRate: 0.001,
          serverDelaySimulation: 0,
          clientUnresponsiveRate: 0,
          connectionFailureRate: 0.001,
          messageCorruptionRate: 0
        },
        expectedResults: {
          minThroughput: 8000,
          maxLatency: 100,
          maxErrorRate: 0.005,
          minAvailability: 0.999,
          maxResourceUsage: {
            cpu: 0.8,
            memory: 0.8,
            network: 0.7,
            connections: 10000
          }
        }
      },
      {
        name: 'sustained_peak_load',
        description: 'Sustained peak load with high message throughput',
        duration: 1800000, // 30 minutes
        connectionPattern: {
          type: 'sustained' as const,
          parameters: {
            connections: 10000
          }
        },
        messagePattern: {
          frequency: 5000, // High message rate
          burstiness: 2.0,
          sizeDistribution: 'normal' as const,
          typeDistribution: {
            heartbeat: 0.4,
            data_update: 0.4,
            critical_notification: 0.2
          }
        },
        faultInjection: {
          networkDropRate: 0.01,
          serverDelaySimulation: 0.005,
          clientUnresponsiveRate: 0.002,
          connectionFailureRate: 0.001,
          messageCorruptionRate: 0.0005
        },
        expectedResults: {
          minThroughput: 8000,
          maxLatency: 200,
          maxErrorRate: 0.01,
          minAvailability: 0.999,
          maxResourceUsage: {
            cpu: 0.85,
            memory: 0.9,
            network: 0.9,
            connections: 10000
          }
        }
      },
      {
        name: 'stress_failure_injection',
        description: 'Stress test with failure injection and recovery',
        duration: 900000, // 15 minutes
        connectionPattern: {
          type: 'wave' as const,
          parameters: {
            baseConnections: 8000,
            peakConnections: 12000,
            waveFrequency: 120000, // 2-minute waves
            waveDuration: 60000 // 1-minute peaks
          }
        },
        messagePattern: {
          frequency: 3000,
          burstiness: 3.0,
          sizeDistribution: 'exponential' as const,
          typeDistribution: {
            heartbeat: 0.3,
            data_update: 0.5,
            critical_notification: 0.2
          }
        },
        faultInjection: {
          networkDropRate: 0.02,
          serverDelaySimulation: 0.01,
          clientUnresponsiveRate: 0.005,
          connectionFailureRate: 0.002,
          messageCorruptionRate: 0.001
        },
        expectedResults: {
          minThroughput: 6000,
          maxLatency: 300,
          maxErrorRate: 0.02,
          minAvailability: 0.995,
          maxResourceUsage: {
            cpu: 0.9,
            memory: 0.95,
            network: 0.95,
            connections: 12000
          }
        }
      }
    ]
  },

  failureAnalysis: {
    patternDetection: {
      enabled: true,
      temporalWindowSize: 300000,
      spatialRadius: 1000,
      minimumOccurrences: 5,
      confidenceThreshold: 0.75,
      algorithms: [
        {
          name: 'temporal_clustering',
          type: 'statistical' as const,
          parameters: { window: 60000 },
          weight: 0.4
        },
        {
          name: 'cascade_detection',
          type: 'rule_based' as const,
          parameters: { maxDelay: 10000 },
          weight: 0.6
        }
      ]
    },
    rootCauseAnalysis: {
      enabled: true,
      analysisDepth: 3,
      evidenceWeight: {
        metric: 0.5,
        log: 0.3,
        trace: 0.2
      },
      confidenceThreshold: 0.7,
      maxCauses: 5
    },
    cascadeDetection: {
      enabled: true,
      maxHops: 3,
      timeWindow: 30000,
      severityThreshold: 0.5,
      propagationModels: ['linear']
    },
    predictionModels: {
      enabled: true,
      models: [
        {
          name: 'failure_rate_prediction',
          type: 'time_series' as const,
          features: ['error_rate', 'latency'],
          horizon: 1800000, // 30 minutes
          accuracy: 0.8
        }
      ],
      updateFrequency: 300000,
      validationThreshold: 0.75
    }
  },

  reporting: {
    outputDirectory: './performance-test-results',
    formats: ['html', 'json', 'csv'] as const,
    sections: [
      'executive_summary',
      'test_configuration',
      'performance_metrics',
      'failure_analysis',
      'scalability_analysis',
      'recommendations'
    ] as const,
    visualizations: [
      {
        type: 'line_chart' as const,
        data: ['connections', 'latency', 'throughput'],
        style: {
          theme: 'enterprise' as const,
          colorScheme: ['#2E86AB', '#A23B72', '#F18F01'],
          dimensions: { width: 1200, height: 600 },
          fontSize: 14,
          showLegend: true
        },
        interactive: true,
        exportFormats: ['png', 'svg']
      }
    ],
    distribution: {
      enabled: false,
      email: {
        enabled: false,
        recipients: [],
        subject: '',
        template: '',
        attachments: []
      },
      slack: {
        enabled: false,
        webhook: '',
        channel: '',
        mention: [],
        template: ''
      },
      teams: {
        enabled: false,
        webhook: '',
        template: ''
      },
      webhook: {
        enabled: false,
        url: '',
        method: 'POST' as const,
        headers: {},
        payload: {}
      }
    },
    customization: {
      branding: {
        logo: '',
        colors: {
          primary: '#2E86AB',
          secondary: '#A23B72',
          accent: '#F18F01',
          success: '#28A745',
          warning: '#FFC107',
          error: '#DC3545'
        },
        fonts: {
          primary: 'Arial, sans-serif',
          secondary: 'Georgia, serif',
          monospace: 'Monaco, monospace'
        }
      },
      formatting: {
        dateFormat: 'YYYY-MM-DD HH:mm:ss',
        numberFormat: {
          decimal: 2,
          thousandsSeparator: ',',
          decimalSeparator: '.'
        },
        units: {
          time: 'ms' as const,
          throughput: 'msg/s' as const,
          data: 'MB' as const
        }
      },
      content: {
        includeRawData: true,
        includeCharts: true,
        includeRecommendations: true,
        includeComparisons: true,
        detailLevel: 'detailed' as const
      }
    }
  },

  execution: {
    parallelization: {
      enabled: true,
      maxWorkers: 4,
      strategy: 'connection_based' as const,
      coordination: 'centralized' as const
    },
    retry: {
      enabled: true,
      maxAttempts: 3,
      backoffStrategy: 'exponential' as const,
      initialDelay: 5000,
      maxDelay: 30000,
      retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND']
    },
    timeout: {
      overall: 7200000, // 2 hours
      phase: 1800000, // 30 minutes
      connection: 10000, // 10 seconds
      message: 5000, // 5 seconds
      cleanup: 300000 // 5 minutes
    },
    checkpoints: {
      enabled: true,
      interval: 60000, // 1 minute
      conditions: [
        {
          metric: 'error_rate',
          threshold: 0.05, // 5% error rate
          action: 'pause' as const
        },
        {
          metric: 'memory_usage',
          threshold: 0.95, // 95% memory usage
          action: 'abort' as const
        },
        {
          metric: 'cpu_usage',
          threshold: 0.98, // 98% CPU usage
          action: 'scale' as const
        }
      ],
      actions: [
        {
          trigger: 'high_error_rate',
          action: 'reduce_load',
          parameters: { factor: 0.8 }
        },
        {
          trigger: 'resource_exhaustion',
          action: 'emergency_cleanup',
          parameters: { graceful: false }
        }
      ]
    },
    cleanup: {
      enabled: true,
      gracefulShutdown: true,
      timeout: 300000,
      preserveLogs: true,
      preserveMetrics: true
    }
  }
};

/**
 * Demo Logger Implementation
 */
class DemoLogger implements Logger {
  info(message: string, meta?: any): void {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  warn(message: string, meta?: any): void {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  error(message: string, meta?: any): void {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  debug(message: string, meta?: any): void {
    console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }
}

/**
 * Execute comprehensive 10K WebSocket load test demo
 */
async function execute10KLoadTestDemo(): Promise<void> {
  const logger = new DemoLogger();
  
  console.log(`
🚀 WEBSOCKET 10K LOAD TEST DEMO
================================

This demo will execute a comprehensive performance test suite for 10,000 concurrent WebSocket connections.

Test Configuration:
• Max Connections: ${DEMO_CONFIG.loadTesting.maxConnections.toLocaleString()}
• Test Scenarios: ${DEMO_CONFIG.loadTesting.stressTestScenarios.length}
• Expected Duration: ${Math.round(PerformanceTestingUtils.estimateTestDuration(DEMO_CONFIG.loadTesting) / 60000)} minutes
• Resource Requirements: ${JSON.stringify(PerformanceTestingUtils.calculateResourceRequirements(DEMO_CONFIG.loadTesting), null, 2)}

Starting test execution...
  `);

  try {
    // Validate configuration
    const validation = PerformanceTestingUtils.validateConfiguration(DEMO_CONFIG.loadTesting);
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    // Create mock Redis instance
    const redis = new Redis({
      host: 'localhost',
      port: 6379,
      retryDelayOnFailover: 100,
      lazyConnect: true
    });

    // Create performance monitor
    const performanceMonitor = new PerformanceMonitor(
      {
        metrics: {
          enabled: true,
          collectionInterval: 5000,
          retentionPeriod: 3600000,
          aggregationWindow: 60000,
          customMetrics: []
        },
        alerting: {
          enabled: true,
          channels: [],
          thresholds: {
            cpu: { warning: 0.8, critical: 0.9 },
            memory: { warning: 0.8, critical: 0.95 },
            latency: { warning: 200, critical: 500 },
            errorRate: { warning: 0.01, critical: 0.05 },
            throughput: { warning: 5000, critical: 3000 },
            connections: { warning: 9000, critical: 11000 }
          },
          escalation: {
            levels: [],
            timeout: 300000,
            maxEscalations: 3
          }
        },
        storage: {
          backend: 'redis' as const,
          compression: true,
          batchSize: 100,
          flushInterval: 30000
        },
        reporting: {
          enabled: true,
          formats: ['json'] as const,
          schedule: '0 */6 * * *',
          recipients: []
        },
        sampling: {
          strategy: 'adaptive' as const,
          rate: 0.1,
          maxSamples: 10000,
          windowSize: 300000
        }
      },
      redis,
      logger
    );

    // Create test execution suite
    const testSuite = new TestExecutionSuite(
      DEMO_CONFIG,
      logger,
      performanceMonitor
    );

    // Setup event listeners for real-time updates
    testSuite.on('phase_started', (phase) => {
      console.log(`\n📊 Phase Started: ${phase.name || phase}`);
    });

    testSuite.on('phase_completed', (phase) => {
      console.log(`✅ Phase Completed: ${phase.name || phase}`);
    });

    testSuite.on('progress_update', (progress) => {
      if (progress.type === 'ramp_up') {
        const percentage = Math.round((progress.connected / progress.target) * 100);
        console.log(`🔄 Connection Progress: ${progress.connected}/${progress.target} (${percentage}%)`);
      }
    });

    testSuite.on('failure_detected', (failure) => {
      console.log(`⚠️  Failure Detected: ${failure.type} - ${failure.description}`);
    });

    testSuite.on('pattern_detected', (event) => {
      console.log(`🔍 Pattern Detected: ${event.patterns.map((p: any) => p.name).join(', ')}`);
    });

    testSuite.on('performance_alert', (alert) => {
      console.log(`🚨 Performance Alert: ${alert.type} - ${alert.message}`);
    });

    // Execute the test suite
    logger.info('Starting comprehensive WebSocket performance test suite');
    const startTime = Date.now();

    const results = await testSuite.executeSuite();
    
    const duration = Date.now() - startTime;
    
    // Display results summary
    console.log(`
🎉 TEST SUITE COMPLETED SUCCESSFULLY
====================================

Duration: ${Math.round(duration / 60000)} minutes
Status: ${results.summary.status.toUpperCase()}
Score: ${results.summary.score}/100

${PerformanceTestingUtils.generateQuickSummary(results.loadTesting)}

📈 Key Achievements:
${results.summary.highlights.map(h => `  • ${h.description}: ${h.value}`).join('\n')}

${results.summary.concerns.length > 0 ? `
⚠️  Areas for Improvement:
${results.summary.concerns.map(c => `  • ${c.description} (${c.severity})`).join('\n')}
` : ''}

🎯 Production Readiness: ${results.summary.verdict.productionReady ? 'READY' : 'NOT READY'}
Confidence: ${Math.round(results.summary.verdict.confidence * 100)}%
Risk Level: ${results.summary.verdict.riskLevel.toUpperCase()}

📊 Detailed reports generated in: ${DEMO_CONFIG.reporting.outputDirectory}
    `);

    // Display top recommendations
    if (results.recommendations.length > 0) {
      console.log(`
🔧 TOP RECOMMENDATIONS:
${results.recommendations.slice(0, 5).map((r, i) => 
  `${i + 1}. [${r.priority.toUpperCase()}] ${r.title}\n   ${r.description}`
).join('\n\n')}
      `);
    }

    // Cleanup
    await redis.disconnect();
    await performanceMonitor.stop();

    logger.info('Demo completed successfully');

  } catch (error) {
    console.error(`
❌ DEMO EXECUTION FAILED
========================

Error: ${error.message}

Please check the following:
1. WebSocket server is running on ws://localhost:8080/ws
2. Redis is available on localhost:6379
3. Sufficient system resources are available
4. Network connectivity is stable

For troubleshooting, check the logs above for more details.
    `);
    
    process.exit(1);
  }
}

/**
 * Run demo if called directly
 */
if (require.main === module) {
  execute10KLoadTestDemo()
    .then(() => {
      console.log('\n🎉 Demo execution completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Demo execution failed:', error.message);
      process.exit(1);
    });
}

export { execute10KLoadTestDemo, DEMO_CONFIG, DemoLogger };