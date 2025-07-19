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
 * @fileoverview WebSocket Performance Testing Suite Entry Point
 * @author Semantest Team
 * @module performance-testing
 */

// Core testing framework
export { WebSocketLoadTester } from './websocket-load-tester';
export type {
  LoadTestConfig,
  LoadTestResults,
  StressTestScenario,
  FailureAnalysisConfig,
  PerformanceTargets,
  MessageType,
  ConnectionMetrics,
  MessageMetrics,
  PerformanceMetrics,
  ErrorMetrics,
  OptimizationRecommendation
} from './websocket-load-tester';

// Failure analysis
export { FailureAnalyzer } from './failure-analyzer';
export type {
  FailureEvent,
  FailurePattern,
  RootCause,
  FailureAnalysisResults,
  FailurePrediction,
  AnalysisRecommendation
} from './failure-analyzer';

// Performance reporting
export { PerformanceReporter } from './performance-reporter';
export type {
  PerformanceReport,
  ExecutiveSummary,
  ReportConfig,
  TestSuiteSummary,
  BenchmarkComparison
} from './performance-reporter';

// Test execution suite
export { TestExecutionSuite } from './test-execution-suite';
export type {
  TestSuiteConfig,
  TestSuiteResults,
  EnvironmentConfig,
  ExecutionConfig,
  TestVerdict
} from './test-execution-suite';

/**
 * Default configurations for different testing scenarios
 */
export const DefaultConfigurations = {
  /**
   * Basic load testing configuration for 10,000 connections
   */
  basic10KLoadTest: {
    serverEndpoint: 'ws://localhost:8080/ws',
    maxConnections: 10000,
    rampUpStrategy: 'exponential' as const,
    messageConfiguration: {
      messagesPerSecond: 1000,
      payloadSizes: [100, 1024, 4096],
      messageTypes: [
        {
          type: 'heartbeat',
          priority: 'low' as const,
          expectedLatency: 50,
          deliveryGuarantee: 0.99,
          payload: { ping: true }
        },
        {
          type: 'data_update',
          priority: 'medium' as const,
          expectedLatency: 100,
          deliveryGuarantee: 0.999,
          payload: { data: 'sample' }
        },
        {
          type: 'critical_notification',
          priority: 'critical' as const,
          expectedLatency: 25,
          deliveryGuarantee: 0.9999,
          payload: { alert: 'important' }
        }
      ],
      deliveryGuarantees: {
        enableChecksums: true,
        enableSequenceNumbers: true,
        enableTimestamps: true,
        enableDeliveryConfirmations: true,
        retryPolicy: {
          maxRetries: 3,
          backoffStrategy: 'exponential' as const,
          initialDelay: 1000,
          maxDelay: 10000
        }
      }
    },
    stressTestScenarios: [
      {
        name: 'peak_load',
        description: 'Sustained peak load testing',
        duration: 1800000, // 30 minutes
        connectionPattern: {
          type: 'sustained' as const,
          parameters: { connections: 10000 }
        },
        messagePattern: {
          frequency: 1000,
          burstiness: 1.0,
          sizeDistribution: 'normal' as const,
          typeDistribution: {
            heartbeat: 0.6,
            data_update: 0.3,
            critical_notification: 0.1
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
            cpu: 0.8,
            memory: 0.85,
            network: 0.9,
            connections: 10000
          }
        }
      }
    ],
    failureAnalysis: {
      enablePatternDetection: true,
      enableRootCauseAnalysis: true,
      enableRecoveryTimeAnalysis: true,
      enableCascadeFailureDetection: true,
      analysisDepth: 'comprehensive' as const
    },
    performanceTargets: {
      connectionEstablishmentRate: 500, // connections/second
      sustainedThroughput: 8000, // messages/second
      latencyPercentiles: {
        p50: 50,
        p95: 100,
        p99: 200,
        p999: 500
      },
      availabilityTarget: 0.999,
      resourceEfficiency: {
        memoryPerConnection: 1024, // bytes
        cpuPerConnection: 0.01, // percentage
        networkUtilization: 0.85
      }
    },
    reporting: {
      realTimeMetrics: true,
      detailedAnalysis: true,
      executiveSummary: true,
      optimizationRecommendations: true,
      formats: ['json', 'html', 'csv'] as const
    }
  },

  /**
   * Enterprise-grade configuration with comprehensive analysis
   */
  enterpriseFullSuite: {
    serverEndpoint: 'wss://production.semantest.com/ws',
    maxConnections: 15000,
    rampUpStrategy: 'stepped' as const,
    messageConfiguration: {
      messagesPerSecond: 5000,
      payloadSizes: [50, 512, 2048, 8192],
      messageTypes: [
        {
          type: 'system_health',
          priority: 'high' as const,
          expectedLatency: 25,
          deliveryGuarantee: 0.9999,
          payload: { status: 'ok' }
        },
        {
          type: 'user_activity',
          priority: 'medium' as const,
          expectedLatency: 100,
          deliveryGuarantee: 0.995,
          payload: { action: 'click' }
        },
        {
          type: 'analytics_event',
          priority: 'low' as const,
          expectedLatency: 500,
          deliveryGuarantee: 0.99,
          payload: { event: 'page_view' }
        }
      ],
      deliveryGuarantees: {
        enableChecksums: true,
        enableSequenceNumbers: true,
        enableTimestamps: true,
        enableDeliveryConfirmations: true,
        retryPolicy: {
          maxRetries: 5,
          backoffStrategy: 'exponential' as const,
          initialDelay: 500,
          maxDelay: 30000
        }
      }
    },
    stressTestScenarios: [
      {
        name: 'burst_traffic',
        description: 'Sudden traffic burst simulation',
        duration: 600000, // 10 minutes
        connectionPattern: {
          type: 'burst' as const,
          parameters: { 
            initialConnections: 5000,
            burstConnections: 15000,
            burstDuration: 120000
          }
        },
        messagePattern: {
          frequency: 5000,
          burstiness: 3.0,
          sizeDistribution: 'exponential' as const,
          typeDistribution: {
            system_health: 0.1,
            user_activity: 0.7,
            analytics_event: 0.2
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
          minThroughput: 12000,
          maxLatency: 150,
          maxErrorRate: 0.005,
          minAvailability: 0.9995,
          maxResourceUsage: {
            cpu: 0.75,
            memory: 0.8,
            network: 0.95,
            connections: 15000
          }
        }
      }
    ],
    failureAnalysis: {
      enablePatternDetection: true,
      enableRootCauseAnalysis: true,
      enableRecoveryTimeAnalysis: true,
      enableCascadeFailureDetection: true,
      analysisDepth: 'comprehensive' as const
    },
    performanceTargets: {
      connectionEstablishmentRate: 1000,
      sustainedThroughput: 12000,
      latencyPercentiles: {
        p50: 25,
        p95: 75,
        p99: 150,
        p999: 300
      },
      availabilityTarget: 0.9999,
      resourceEfficiency: {
        memoryPerConnection: 512,
        cpuPerConnection: 0.005,
        networkUtilization: 0.9
      }
    },
    reporting: {
      realTimeMetrics: true,
      detailedAnalysis: true,
      executiveSummary: true,
      optimizationRecommendations: true,
      formats: ['json', 'html', 'pdf', 'prometheus'] as const
    }
  }
};

/**
 * Quick-start factory functions
 */
export class PerformanceTestingFactory {
  /**
   * Create a basic load tester for 10K connections
   */
  static createBasicLoadTester(
    serverEndpoint: string,
    logger: any,
    performanceMonitor: any
  ) {
    const config = {
      ...DefaultConfigurations.basic10KLoadTest,
      serverEndpoint
    };
    
    return new WebSocketLoadTester(config, logger, performanceMonitor);
  }

  /**
   * Create enterprise-grade test suite
   */
  static createEnterpriseTestSuite(
    suiteConfig: any,
    logger: any,
    performanceMonitor: any
  ) {
    return new TestExecutionSuite(suiteConfig, logger, performanceMonitor);
  }

  /**
   * Create failure analyzer with comprehensive configuration
   */
  static createFailureAnalyzer(logger: any) {
    const config = {
      patternDetection: {
        enabled: true,
        temporalWindowSize: 300000, // 5 minutes
        spatialRadius: 1000,
        minimumOccurrences: 3,
        confidenceThreshold: 0.8,
        algorithms: [
          {
            name: 'temporal_clustering',
            type: 'statistical' as const,
            parameters: { window: 60000 },
            weight: 0.3
          },
          {
            name: 'spatial_correlation',
            type: 'statistical' as const,
            parameters: { radius: 500 },
            weight: 0.3
          },
          {
            name: 'sequence_analysis',
            type: 'rule_based' as const,
            parameters: { maxGap: 5000 },
            weight: 0.4
          }
        ]
      },
      rootCauseAnalysis: {
        enabled: true,
        analysisDepth: 5,
        evidenceWeight: {
          metric: 0.4,
          log: 0.3,
          trace: 0.2,
          alert: 0.1
        },
        confidenceThreshold: 0.7,
        maxCauses: 10
      },
      cascadeDetection: {
        enabled: true,
        maxHops: 5,
        timeWindow: 60000,
        severityThreshold: 0.5,
        propagationModels: ['linear', 'exponential']
      },
      predictionModels: {
        enabled: true,
        models: [
          {
            name: 'time_series_forecast',
            type: 'time_series' as const,
            features: ['error_rate', 'latency', 'throughput'],
            horizon: 3600000, // 1 hour
            accuracy: 0.85
          }
        ],
        updateFrequency: 300000, // 5 minutes
        validationThreshold: 0.8
      }
    };

    return new FailureAnalyzer(config, logger);
  }

  /**
   * Create performance reporter with executive summary focus
   */
  static createExecutiveReporter(outputDirectory: string, logger: any) {
    const config = {
      outputDirectory,
      formats: ['html', 'json', 'pdf'] as const,
      sections: [
        'executive_summary',
        'performance_metrics',
        'failure_analysis',
        'recommendations'
      ] as const,
      visualizations: [
        {
          type: 'line_chart' as const,
          data: ['latency', 'throughput', 'connections'],
          style: {
            theme: 'enterprise' as const,
            colorScheme: ['#2E86AB', '#A23B72', '#F18F01'],
            dimensions: { width: 800, height: 400 },
            fontSize: 12,
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
            primary: 'Helvetica, Arial, sans-serif',
            secondary: 'Georgia, serif',
            monospace: 'Monaco, Consolas, monospace'
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
          includeRawData: false,
          includeCharts: true,
          includeRecommendations: true,
          includeComparisons: true,
          detailLevel: 'summary' as const
        }
      }
    };

    return new PerformanceReporter(config, logger);
  }
}

/**
 * Utility functions for common operations
 */
export class PerformanceTestingUtils {
  /**
   * Validate test configuration
   */
  static validateConfiguration(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.serverEndpoint) {
      errors.push('Server endpoint is required');
    }

    if (!config.maxConnections || config.maxConnections <= 0) {
      errors.push('Max connections must be a positive number');
    }

    if (config.maxConnections > 50000) {
      errors.push('Max connections exceeds recommended limit of 50,000');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Estimate test duration
   */
  static estimateTestDuration(config: any): number {
    const rampUpTime = config.maxConnections / 100 * 1000; // Assume 100 connections/second
    const testDuration = config.stressTestScenarios?.reduce(
      (total: number, scenario: any) => total + scenario.duration, 
      0
    ) || 1800000; // Default 30 minutes
    const rampDownTime = 300000; // 5 minutes
    const analysisTime = 600000; // 10 minutes

    return rampUpTime + testDuration + rampDownTime + analysisTime;
  }

  /**
   * Calculate resource requirements
   */
  static calculateResourceRequirements(config: any): {
    cpu: number;
    memory: number;
    network: number;
    storage: number;
  } {
    const connections = config.maxConnections || 10000;
    const messagesPerSecond = config.messageConfiguration?.messagesPerSecond || 1000;

    return {
      cpu: Math.ceil(connections / 1000) * 2, // 2 CPU cores per 1000 connections
      memory: Math.ceil(connections * 1.5), // 1.5 MB per connection
      network: Math.ceil(messagesPerSecond * 2), // 2 Mbps per 1000 msg/s
      storage: Math.ceil(connections / 100) // 100 MB per 10000 connections
    };
  }

  /**
   * Generate test report summary
   */
  static generateQuickSummary(results: any): string {
    if (!results) return 'No results available';

    const {
      maxConcurrentConnections = 0,
      totalMessages = 0,
      overallSuccessRate = 0,
      averageLatency = 0
    } = results.overall?.summary || {};

    return `
🚀 WebSocket Performance Test Results Summary

📊 Key Metrics:
  • Max Concurrent Connections: ${maxConcurrentConnections.toLocaleString()}
  • Total Messages Processed: ${totalMessages.toLocaleString()}
  • Overall Success Rate: ${(overallSuccessRate * 100).toFixed(2)}%
  • Average Latency: ${averageLatency}ms

${overallSuccessRate >= 0.999 && averageLatency <= 100 
  ? '✅ System ready for production deployment' 
  : '⚠️ System requires optimization before production'}
    `.trim();
  }
}

export default {
  WebSocketLoadTester,
  FailureAnalyzer,
  PerformanceReporter,
  TestExecutionSuite,
  DefaultConfigurations,
  PerformanceTestingFactory,
  PerformanceTestingUtils
};