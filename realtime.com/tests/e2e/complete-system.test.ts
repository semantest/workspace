import { KafkaRedisQueueManager } from '../../src/infrastructure/message-queue/kafka-redis-queue-manager';
import { OptimizedWebSocketHandlers } from '../../src/infrastructure/websocket/optimized-websocket-handlers';
import { EventStreamingService } from '../../src/infrastructure/streaming/event-streaming-service';
import { RealTimeMonitoring } from '../../src/infrastructure/monitoring/real-time-monitoring';
import WebSocket from 'ws';
import { jest } from '@jest/globals';

describe('Complete System E2E Tests', () => {
  let messageQueue: KafkaRedisQueueManager;
  let webSocketHandlers: OptimizedWebSocketHandlers;
  let streamingService: EventStreamingService;
  let monitoring: RealTimeMonitoring;
  let clients: WebSocket[] = [];
  let logger: any;

  const systemConfig = {
    messageQueue: {
      kafka: {
        clientId: 'e2e-test-client',
        brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
        producer: {
          maxInFlightRequests: 1,
          idempotent: true,
          compression: 'lz4' as const,
          retry: { retries: 3 }
        },
        consumer: {
          groupId: 'e2e-test-group',
          sessionTimeout: 30000,
          heartbeatInterval: 3000
        }
      },
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        keyPrefix: 'e2e-test:mq:',
        ttl: 3600
      },
      deduplication: {
        enabled: true,
        strategy: 'combined' as const,
        window: 300000
      },
      deadLetterQueue: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2
      },
      performance: {
        batchSize: 100,
        flushInterval: 1000,
        compressionThreshold: 1024
      }
    },
    webSocket: {
      port: 8082,
      host: 'localhost',
      compression: {
        enabled: true,
        threshold: 1024,
        algorithm: 'gzip' as const
      },
      rateLimit: {
        enabled: true,
        maxRequests: 1000,
        windowMs: 60000
      },
      authentication: {
        enabled: false,
        tokenHeader: 'Authorization',
        tokenValidation: 'jwt' as const
      },
      heartbeat: {
        enabled: true,
        interval: 30000,
        timeout: 5000
      },
      batching: {
        enabled: true,
        maxBatchSize: 100,
        flushInterval: 1000
      },
      security: {
        maxMessageSize: 1048576,
        allowedOrigins: ['*'],
        enableCors: true
      }
    },
    streaming: {
      routing: {
        strategy: 'content_based' as const,
        rules: [
          {
            condition: { type: 'chat_message' },
            target: 'chat_stream',
            priority: 'high' as const
          },
          {
            condition: { type: 'notification' },
            target: 'notification_stream',
            priority: 'medium' as const
          },
          {
            condition: { type: 'system_alert' },
            target: 'alert_stream',
            priority: 'critical' as const
          }
        ],
        defaultTarget: 'default_stream'
      },
      filtering: {
        enabled: true,
        rules: [
          {
            field: 'payload.spam',
            operator: 'equals' as const,
            value: true,
            action: 'drop' as const
          }
        ]
      },
      transformation: {
        enabled: true,
        rules: [
          {
            field: 'timestamp',
            operation: 'add_current_time' as const
          },
          {
            field: 'payload.processed_at',
            operation: 'add_current_time' as const
          }
        ]
      },
      aggregation: {
        enabled: true,
        windows: [
          {
            type: 'time' as const,
            duration: 60000,
            operations: ['count', 'avg']
          }
        ]
      },
      persistence: {
        enabled: true,
        storageType: 'redis' as const,
        ttl: 86400,
        batchSize: 1000
      },
      performance: {
        maxConcurrentStreams: 100,
        bufferSize: 10000,
        flushInterval: 1000
      }
    },
    monitoring: {
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
        channels: ['log']
      },
      health: {
        enabled: true,
        checkInterval: 10000,
        endpoints: []
      },
      dashboard: {
        enabled: true,
        refreshInterval: 1000,
        charts: ['throughput', 'latency', 'errors']
      },
      notifications: {
        webhook: {
          url: 'http://localhost:3000/alerts',
          timeout: 5000
        }
      }
    }
  };

  beforeAll(async () => {
    logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    // Initialize all components
    messageQueue = new KafkaRedisQueueManager(systemConfig.messageQueue, logger);
    webSocketHandlers = new OptimizedWebSocketHandlers(systemConfig.webSocket, messageQueue, logger);
    streamingService = new EventStreamingService(systemConfig.streaming, messageQueue, webSocketHandlers, logger);
    monitoring = new RealTimeMonitoring(systemConfig.monitoring, logger);

    // Start all services in order
    console.log('Starting complete system...');
    await messageQueue.start();
    await webSocketHandlers.start();
    await streamingService.start();
    await monitoring.start();

    // Connect monitoring to all services
    monitoring.connectServices({
      messageQueue,
      webSocketHandlers,
      streamingService
    });

    // Wait for full initialization
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('System fully initialized');
  }, 60000);

  afterAll(async () => {
    console.log('Shutting down complete system...');
    
    // Close all client connections
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });

    // Shutdown services in reverse order
    try {
      await monitoring?.shutdown();
      await streamingService?.shutdown();
      await webSocketHandlers?.shutdown();
      await messageQueue?.shutdown();
    } catch (error) {
      console.error('Shutdown error:', error);
    }
  }, 30000);

  describe('Complete System Integration', () => {
    it('should handle end-to-end message flow', async () => {
      // Create WebSocket clients
      const client1 = await createWebSocketClient();
      const client2 = await createWebSocketClient();
      clients.push(client1, client2);

      // Set up message listeners
      const client1Messages: any[] = [];
      const client2Messages: any[] = [];

      client1.on('message', (data) => {
        client1Messages.push(JSON.parse(data.toString()));
      });

      client2.on('message', (data) => {
        client2Messages.push(JSON.parse(data.toString()));
      });

      // Test message flow: WebSocket → Streaming → Kafka → Processing → Distribution
      const testMessage = {
        type: 'chat_message',
        payload: {
          text: 'Hello from E2E test',
          userId: 'user123',
          channel: 'general'
        }
      };

      // Send message from client1
      client1.send(JSON.stringify(testMessage));

      // Wait for message to flow through entire system
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify message was processed
      const streamingMetrics = streamingService.getMetrics();
      expect(streamingMetrics.messagesProcessed).toBeGreaterThan(0);

      const queueMetrics = messageQueue.getMetrics();
      expect(queueMetrics.messagesPublished).toBeGreaterThan(0);
    }, 15000);

    it('should handle multiple message types with proper routing', async () => {
      const client = await createWebSocketClient();
      clients.push(client);

      const messages = [
        {
          type: 'chat_message',
          payload: { text: 'Chat message', channel: 'general' }
        },
        {
          type: 'notification',
          payload: { title: 'New notification', body: 'Test notification' }
        },
        {
          type: 'system_alert',
          payload: { level: 'warning', message: 'System alert' }
        }
      ];

      // Send all message types
      for (const message of messages) {
        client.send(JSON.stringify(message));
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify routing occurred
      const streamingMetrics = streamingService.getMetrics();
      expect(streamingMetrics.messagesProcessed).toBeGreaterThanOrEqual(messages.length);
    }, 12000);

    it('should handle spam filtering', async () => {
      const client = await createWebSocketClient();
      clients.push(client);

      const spamMessage = {
        type: 'chat_message',
        payload: {
          text: 'This is spam',
          spam: true // Should be filtered
        }
      };

      const normalMessage = {
        type: 'chat_message',
        payload: {
          text: 'This is normal',
          spam: false
        }
      };

      // Send both messages
      client.send(JSON.stringify(spamMessage));
      await new Promise(resolve => setTimeout(resolve, 200));
      
      client.send(JSON.stringify(normalMessage));

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check filtering metrics
      const streamingMetrics = streamingService.getMetrics();
      expect(streamingMetrics.messagesFiltered).toBeGreaterThan(0);
    }, 10000);

    it('should provide comprehensive system monitoring', async () => {
      // Generate some activity
      const client = await createWebSocketClient();
      clients.push(client);

      for (let i = 0; i < 10; i++) {
        client.send(JSON.stringify({
          type: 'monitoring_test',
          payload: { index: i, data: `Test message ${i}` }
        }));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wait for processing and metrics collection
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check comprehensive metrics
      const systemMetrics = monitoring.getSystemMetrics();
      const appMetrics = monitoring.getApplicationMetrics();
      const businessMetrics = monitoring.getBusinessMetrics();

      // System metrics
      expect(systemMetrics.cpu).toBeDefined();
      expect(systemMetrics.memory).toBeDefined();
      expect(systemMetrics.timestamp).toBeGreaterThan(0);

      // Application metrics
      expect(appMetrics.messageQueue).toBeDefined();
      expect(appMetrics.webSocket).toBeDefined();
      expect(appMetrics.streaming).toBeDefined();

      // Business metrics
      expect(businessMetrics.throughput).toBeGreaterThanOrEqual(0);
      expect(businessMetrics.latency).toBeGreaterThanOrEqual(0);

      console.log('E2E System Metrics:', {
        system: systemMetrics,
        application: appMetrics,
        business: businessMetrics
      });
    }, 15000);

    it('should handle health checks across all services', async () => {
      const healthStatus = await monitoring.checkHealth();

      expect(healthStatus.overall).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthStatus.overall);
      expect(healthStatus.services).toBeDefined();
      expect(healthStatus.timestamp).toBeGreaterThan(0);

      // All services should be healthy in E2E test
      expect(healthStatus.overall).toBe('healthy');
    }, 8000);
  });

  describe('System Performance and Scalability', () => {
    it('should handle high concurrent load', async () => {
      const clientCount = 20;
      const messagesPerClient = 10;
      const testClients: WebSocket[] = [];

      // Create multiple clients
      const clientPromises = Array.from({ length: clientCount }, () => createWebSocketClient());
      const connectedClients = await Promise.all(clientPromises);
      
      testClients.push(...connectedClients);
      clients.push(...connectedClients);

      // Send messages concurrently from all clients
      const messagingPromises = testClients.map(async (client, clientIndex) => {
        for (let msgIndex = 0; msgIndex < messagesPerClient; msgIndex++) {
          const message = {
            type: 'load_test',
            payload: {
              clientId: clientIndex,
              messageId: msgIndex,
              timestamp: Date.now()
            }
          };

          client.send(JSON.stringify(message));
          await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
        }
      });

      const startTime = Date.now();
      await Promise.all(messagingPromises);
      
      // Wait for all messages to be processed
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      const endTime = Date.now();
      const totalMessages = clientCount * messagesPerClient;
      const duration = (endTime - startTime) / 1000;
      const throughput = totalMessages / duration;

      console.log(`Load Test Results:`);
      console.log(`- Clients: ${clientCount}`);
      console.log(`- Messages per client: ${messagesPerClient}`);
      console.log(`- Total messages: ${totalMessages}`);
      console.log(`- Duration: ${duration.toFixed(2)}s`);
      console.log(`- Throughput: ${throughput.toFixed(2)} msg/s`);

      // Verify system handled the load
      const wsMetrics = webSocketHandlers.getMetrics();
      const streamingMetrics = streamingService.getMetrics();
      const queueMetrics = messageQueue.getMetrics();

      expect(wsMetrics.messagesReceived).toBeGreaterThan(totalMessages * 0.8); // Allow some loss
      expect(streamingMetrics.messagesProcessed).toBeGreaterThan(0);
      expect(queueMetrics.messagesPublished).toBeGreaterThan(0);
      expect(throughput).toBeGreaterThan(5); // At least 5 msg/s under load
    }, 45000);

    it('should maintain system stability under stress', async () => {
      const client = await createWebSocketClient();
      clients.push(client);

      // Send rapid burst of messages
      const burstSize = 100;
      const messages = Array.from({ length: burstSize }, (_, i) => ({
        type: 'stress_test',
        payload: {
          index: i,
          data: `Stress test message ${i}`,
          timestamp: Date.now()
        }
      }));

      // Send burst
      const sendPromises = messages.map(message => {
        return new Promise<void>((resolve) => {
          client.send(JSON.stringify(message));
          resolve();
        });
      });

      await Promise.all(sendPromises);

      // Wait for system to process and stabilize
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Check system is still healthy
      const healthStatus = await monitoring.checkHealth();
      expect(healthStatus.overall).toBe('healthy');

      // Verify no excessive errors
      const queueMetrics = messageQueue.getMetrics();
      expect(queueMetrics.errorRate).toBeLessThan(0.1); // Less than 10% error rate
    }, 20000);
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary connection issues', async () => {
      const client = await createWebSocketClient();
      clients.push(client);

      // Send initial message
      client.send(JSON.stringify({
        type: 'resilience_test',
        payload: { phase: 'before_disconnect' }
      }));

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Force disconnect and reconnect
      client.terminate();

      // Create new connection
      const newClient = await createWebSocketClient();
      clients.push(newClient);

      // Send message after reconnection
      newClient.send(JSON.stringify({
        type: 'resilience_test',
        payload: { phase: 'after_reconnect' }
      }));

      await new Promise(resolve => setTimeout(resolve, 2000));

      // System should still be healthy
      const healthStatus = await monitoring.checkHealth();
      expect(['healthy', 'degraded']).toContain(healthStatus.overall);
    }, 12000);

    it('should handle malformed messages gracefully', async () => {
      const client = await createWebSocketClient();
      clients.push(client);

      // Send various malformed messages
      const malformedMessages = [
        'invalid json',
        '{"incomplete": json',
        JSON.stringify({ missing: 'required fields' }),
        JSON.stringify({ type: 'valid', payload: null }),
        ''
      ];

      for (const badMessage of malformedMessages) {
        try {
          client.send(badMessage);
        } catch (error) {
          // Expected for some malformed messages
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Send valid message to ensure system still works
      client.send(JSON.stringify({
        type: 'recovery_test',
        payload: { data: 'Valid message after errors' }
      }));

      await new Promise(resolve => setTimeout(resolve, 2000));

      // System should still be operational
      expect(webSocketHandlers.isStarted()).toBe(true);
      expect(streamingService.isStarted()).toBe(true);
      expect(messageQueue.isStarted()).toBe(true);
    }, 10000);
  });

  // Helper function to create WebSocket clients
  async function createWebSocketClient(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const client = new WebSocket(`ws://localhost:${systemConfig.webSocket.port}`);
      
      client.on('open', () => {
        resolve(client);
      });
      
      client.on('error', (error) => {
        reject(error);
      });

      setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);
    });
  }
});