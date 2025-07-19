import { RealTimeMonitoring, MonitoringAlert, AlertSeverity } from '../../src/infrastructure/monitoring/real-time-monitoring';
import { KafkaRedisQueueManager } from '../../src/infrastructure/message-queue/kafka-redis-queue-manager';
import { OptimizedWebSocketHandlers } from '../../src/infrastructure/websocket/optimized-websocket-handlers';
import { EventStreamingService } from '../../src/infrastructure/streaming/event-streaming-service';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../src/infrastructure/message-queue/kafka-redis-queue-manager');
jest.mock('../../src/infrastructure/websocket/optimized-websocket-handlers');
jest.mock('../../src/infrastructure/streaming/event-streaming-service');

describe('RealTimeMonitoring', () => {
  let monitoring: RealTimeMonitoring;
  let mockMessageQueue: jest.Mocked<KafkaRedisQueueManager>;
  let mockWebSocketHandlers: jest.Mocked<OptimizedWebSocketHandlers>;
  let mockStreamingService: jest.Mocked<EventStreamingService>;
  let mockLogger: any;

  const testConfig = {
    metrics: {
      enabled: true,
      collectInterval: 5000,
      retentionPeriod: 3600000,
      categories: ['system', 'application', 'business']
    },
    alerts: {
      enabled: true,
      thresholds: {
        errorRate: 0.05,
        responseTime: 1000,
        memoryUsage: 0.8,
        cpuUsage: 0.8,
        queueDepth: 10000
      },
      channels: ['log', 'webhook', 'email']
    },
    health: {
      enabled: true,
      checkInterval: 10000,
      endpoints: [
        { name: 'kafka', url: 'kafka://localhost:9092' },
        { name: 'redis', url: 'redis://localhost:6379' }
      ]
    },
    dashboard: {
      enabled: true,
      refreshInterval: 1000,
      charts: ['throughput', 'latency', 'errors', 'resources']
    },
    notifications: {
      webhook: {
        url: 'http://localhost:3000/alerts',
        timeout: 5000
      },
      email: {
        smtp: {
          host: 'localhost',
          port: 587
        },
        recipients: ['admin@example.com']
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock services
    mockMessageQueue = {
      getMetrics: jest.fn().mockReturnValue({
        messagesPublished: 1000,
        messagesConsumed: 950,
        duplicatesDetected: 5,
        deadLetterMessages: 2,
        avgProcessingTime: 50,
        errorRate: 0.02
      }),
      isStarted: jest.fn().mockReturnValue(true)
    } as any;

    mockWebSocketHandlers = {
      getMetrics: jest.fn().mockReturnValue({
        activeConnections: 100,
        totalConnections: 500,
        messagesReceived: 2000,
        messagesSent: 1900,
        averageLatency: 25,
        rateLimitViolations: 3
      }),
      isStarted: jest.fn().mockReturnValue(true)
    } as any;

    mockStreamingService = {
      getMetrics: jest.fn().mockReturnValue({
        messagesProcessed: 1500,
        messagesFiltered: 50,
        messagesTransformed: 200,
        activeStreams: 10,
        averageProcessingTime: 75,
        throughput: 100
      }),
      isStarted: jest.fn().mockReturnValue(true)
    } as any;

    // Mock Logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    monitoring = new RealTimeMonitoring(testConfig, mockLogger);
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      expect(monitoring).toBeInstanceOf(RealTimeMonitoring);
      expect(monitoring.isStarted()).toBe(false);
    });

    it('should throw error with invalid configuration', () => {
      expect(() => {
        new RealTimeMonitoring({} as any, mockLogger);
      }).toThrow();
    });
  });

  describe('start', () => {
    it('should start monitoring successfully', async () => {
      await monitoring.start();
      
      expect(monitoring.isStarted()).toBe(true);
    });

    it('should handle start failures', async () => {
      // Mock a start failure scenario
      jest.spyOn(monitoring as any, 'initializeMetricsCollection')
        .mockRejectedValue(new Error('Metrics initialization failed'));
      
      await expect(monitoring.start()).rejects.toThrow('Metrics initialization failed');
      expect(monitoring.isStarted()).toBe(false);
    });
  });

  describe('service connection', () => {
    beforeEach(async () => {
      await monitoring.start();
    });

    it('should connect to services successfully', () => {
      monitoring.connectServices({
        messageQueue: mockMessageQueue,
        webSocketHandlers: mockWebSocketHandlers,
        streamingService: mockStreamingService
      });

      // Should have registered event listeners
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Connected to services')
      );
    });

    it('should handle partial service connections', () => {
      monitoring.connectServices({
        messageQueue: mockMessageQueue
        // Missing other services
      });

      // Should still work with partial connections
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Connected to services')
      );
    });
  });

  describe('metrics collection', () => {
    beforeEach(async () => {
      await monitoring.start();
      monitoring.connectServices({
        messageQueue: mockMessageQueue,
        webSocketHandlers: mockWebSocketHandlers,
        streamingService: mockStreamingService
      });
    });

    it('should collect system metrics', () => {
      const metrics = monitoring.getSystemMetrics();
      
      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('disk');
      expect(metrics).toHaveProperty('network');
      expect(metrics.timestamp).toBeGreaterThan(0);
    });

    it('should collect application metrics', () => {
      const metrics = monitoring.getApplicationMetrics();
      
      expect(metrics).toHaveProperty('messageQueue');
      expect(metrics).toHaveProperty('webSocket');
      expect(metrics).toHaveProperty('streaming');
      expect(metrics.timestamp).toBeGreaterThan(0);
      
      expect(metrics.messageQueue.messagesPublished).toBe(1000);
      expect(metrics.webSocket.activeConnections).toBe(100);
      expect(metrics.streaming.messagesProcessed).toBe(1500);
    });

    it('should collect business metrics', () => {
      const metrics = monitoring.getBusinessMetrics();
      
      expect(metrics).toHaveProperty('throughput');
      expect(metrics).toHaveProperty('latency');
      expect(metrics).toHaveProperty('errorRates');
      expect(metrics).toHaveProperty('userEngagement');
      expect(metrics.timestamp).toBeGreaterThan(0);
    });

    it('should get comprehensive metrics', () => {
      const allMetrics = monitoring.getMetrics();
      
      expect(allMetrics).toHaveProperty('system');
      expect(allMetrics).toHaveProperty('application');
      expect(allMetrics).toHaveProperty('business');
      expect(allMetrics.timestamp).toBeGreaterThan(0);
    });
  });

  describe('health checks', () => {
    beforeEach(async () => {
      await monitoring.start();
    });

    it('should perform health checks', async () => {
      const healthStatus = await monitoring.checkHealth();
      
      expect(healthStatus).toHaveProperty('overall');
      expect(healthStatus).toHaveProperty('services');
      expect(healthStatus).toHaveProperty('timestamp');
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthStatus.overall);
    });

    it('should detect unhealthy services', async () => {
      // Mock service failure
      mockMessageQueue.isStarted.mockReturnValue(false);
      
      const healthStatus = await monitoring.checkHealth();
      
      expect(healthStatus.overall).toBe('degraded');
      expect(healthStatus.services.messageQueue).toBe('unhealthy');
    });
  });

  describe('alerting', () => {
    beforeEach(async () => {
      await monitoring.start();
      monitoring.connectServices({
        messageQueue: mockMessageQueue,
        webSocketHandlers: mockWebSocketHandlers,
        streamingService: mockStreamingService
      });
    });

    it('should trigger alerts for high error rates', async () => {
      // Mock high error rate
      mockMessageQueue.getMetrics.mockReturnValue({
        messagesPublished: 1000,
        messagesConsumed: 900,
        duplicatesDetected: 5,
        deadLetterMessages: 100, // High error rate
        avgProcessingTime: 50,
        errorRate: 0.1 // Above threshold
      });

      const alerts = await monitoring.checkAlerts();
      
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.type === 'error_rate')).toBe(true);
    });

    it('should trigger alerts for high response times', async () => {
      // Mock high response time
      mockWebSocketHandlers.getMetrics.mockReturnValue({
        activeConnections: 100,
        totalConnections: 500,
        messagesReceived: 2000,
        messagesSent: 1900,
        averageLatency: 2000, // Above threshold
        rateLimitViolations: 3
      });

      const alerts = await monitoring.checkAlerts();
      
      expect(alerts.some(alert => alert.type === 'response_time')).toBe(true);
    });

    it('should send alert notifications', async () => {
      const testAlert: MonitoringAlert = {
        id: 'test-alert',
        type: 'error_rate',
        severity: 'critical' as AlertSeverity,
        message: 'High error rate detected',
        threshold: 0.05,
        currentValue: 0.1,
        timestamp: Date.now(),
        service: 'messageQueue'
      };

      await monitoring.sendAlert(testAlert);
      
      // Should log the alert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('ALERT')
      );
    });
  });

  describe('dashboard data', () => {
    beforeEach(async () => {
      await monitoring.start();
      monitoring.connectServices({
        messageQueue: mockMessageQueue,
        webSocketHandlers: mockWebSocketHandlers,
        streamingService: mockStreamingService
      });
    });

    it('should provide dashboard data', () => {
      const dashboardData = monitoring.getDashboardData();
      
      expect(dashboardData).toHaveProperty('charts');
      expect(dashboardData).toHaveProperty('metrics');
      expect(dashboardData).toHaveProperty('alerts');
      expect(dashboardData).toHaveProperty('health');
      expect(dashboardData.timestamp).toBeGreaterThan(0);
    });

    it('should include chart data', () => {
      const dashboardData = monitoring.getDashboardData();
      
      expect(dashboardData.charts).toHaveProperty('throughput');
      expect(dashboardData.charts).toHaveProperty('latency');
      expect(dashboardData.charts).toHaveProperty('errors');
      expect(dashboardData.charts).toHaveProperty('resources');
    });
  });

  describe('historical data', () => {
    beforeEach(async () => {
      await monitoring.start();
    });

    it('should store historical metrics', () => {
      const currentTime = Date.now();
      const historicalData = monitoring.getHistoricalData(currentTime - 3600000, currentTime);
      
      expect(Array.isArray(historicalData)).toBe(true);
    });

    it('should aggregate historical data', () => {
      const aggregatedData = monitoring.getAggregatedMetrics('1h');
      
      expect(aggregatedData).toHaveProperty('period');
      expect(aggregatedData).toHaveProperty('metrics');
      expect(aggregatedData.period).toBe('1h');
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      await monitoring.start();
      await monitoring.shutdown();
      
      expect(monitoring.isStarted()).toBe(false);
    });

    it('should handle shutdown errors', async () => {
      await monitoring.start();
      
      // Mock shutdown error
      jest.spyOn(monitoring as any, 'stopMetricsCollection')
        .mockRejectedValue(new Error('Cleanup failed'));
      
      await monitoring.shutdown();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});

// Helper functions for testing
function createTestAlert(overrides: Partial<MonitoringAlert> = {}): MonitoringAlert {
  return {
    id: 'test-alert',
    type: 'error_rate',
    severity: 'warning' as AlertSeverity,
    message: 'Test alert',
    threshold: 0.05,
    currentValue: 0.1,
    timestamp: Date.now(),
    service: 'test_service',
    ...overrides
  };
}

function createMockMetrics() {
  return {
    system: {
      cpu: { usage: 0.4, load: [1.2, 1.1, 1.0] },
      memory: { used: 0.6, free: 0.4, total: 8589934592 },
      disk: { used: 0.7, free: 0.3, total: 1073741824000 },
      network: { bytesIn: 1000000, bytesOut: 800000 },
      timestamp: Date.now()
    },
    application: {
      messageQueue: { messagesPublished: 1000, messagesConsumed: 950 },
      webSocket: { activeConnections: 100, messagesSent: 1900 },
      streaming: { messagesProcessed: 1500, throughput: 100 },
      timestamp: Date.now()
    },
    business: {
      throughput: 1000,
      latency: 50,
      errorRates: { messageQueue: 0.02, webSocket: 0.01 },
      userEngagement: { activeUsers: 500, sessionsPerUser: 2.5 },
      timestamp: Date.now()
    }
  };
}