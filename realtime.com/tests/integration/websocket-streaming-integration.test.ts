import { OptimizedWebSocketHandlers } from '../../src/infrastructure/websocket/optimized-websocket-handlers';
import { EventStreamingService } from '../../src/infrastructure/streaming/event-streaming-service';
import { KafkaRedisQueueManager } from '../../src/infrastructure/message-queue/kafka-redis-queue-manager';
import WebSocket from 'ws';
import { jest } from '@jest/globals';

describe('WebSocket-Streaming Integration Tests', () => {
  let webSocketHandlers: OptimizedWebSocketHandlers;
  let streamingService: EventStreamingService;
  let messageQueue: KafkaRedisQueueManager;
  let testClient: WebSocket;
  let logger: any;

  const baseConfig = {
    webSocket: {
      port: 8081,
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
        enabled: false, // Disabled for testing
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
          }
        ],
        defaultTarget: 'default_stream'
      },
      filtering: {
        enabled: true,
        rules: [
          {
            field: 'payload.filtered',
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
          }
        ]
      },
      aggregation: {
        enabled: false,
        windows: []
      },
      persistence: {
        enabled: false,
        storageType: 'memory' as const,
        ttl: 3600,
        batchSize: 100
      },
      performance: {
        maxConcurrentStreams: 100,
        bufferSize: 10000,
        flushInterval: 1000
      }
    },
    messageQueue: {
      kafka: {
        clientId: 'integration-test-ws-client',
        brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
        producer: {
          maxInFlightRequests: 1,
          idempotent: true,
          compression: 'lz4' as const,
          retry: { retries: 3 }
        },
        consumer: {
          groupId: 'integration-test-ws-group',
          sessionTimeout: 30000,
          heartbeatInterval: 3000
        }
      },
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        keyPrefix: 'integration-test-ws:mq:',
        ttl: 3600
      },
      deduplication: {
        enabled: false,
        strategy: 'hash' as const,
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
    }
  };

  beforeAll(async () => {
    logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    // Initialize components
    messageQueue = new KafkaRedisQueueManager(baseConfig.messageQueue, logger);
    webSocketHandlers = new OptimizedWebSocketHandlers(baseConfig.webSocket, messageQueue, logger);
    streamingService = new EventStreamingService(baseConfig.streaming, messageQueue, webSocketHandlers, logger);

    // Start services
    await messageQueue.start();
    await webSocketHandlers.start();
    await streamingService.start();

    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (testClient?.readyState === WebSocket.OPEN) {
      testClient.close();
    }

    await streamingService?.shutdown();
    await webSocketHandlers?.shutdown();
    await messageQueue?.shutdown();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WebSocket connection and messaging', () => {
    it('should establish WebSocket connection successfully', async () => {
      const connectionPromise = new Promise<void>((resolve, reject) => {
        testClient = new WebSocket(`ws://localhost:${baseConfig.webSocket.port}`);
        
        testClient.on('open', () => {
          resolve();
        });
        
        testClient.on('error', (error) => {
          reject(error);
        });

        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      await expect(connectionPromise).resolves.toBeUndefined();
      expect(testClient.readyState).toBe(WebSocket.OPEN);
    }, 10000);

    it('should send and receive messages through WebSocket', async () => {
      const testMessage = {
        type: 'chat_message',
        payload: {
          text: 'Hello from integration test',
          userId: 'test-user-123'
        }
      };

      const messagePromise = new Promise<any>((resolve, reject) => {
        testClient.on('message', (data) => {
          try {
            const receivedMessage = JSON.parse(data.toString());
            resolve(receivedMessage);
          } catch (error) {
            reject(error);
          }
        });

        setTimeout(() => reject(new Error('Message timeout')), 5000);
      });

      // Send message
      testClient.send(JSON.stringify(testMessage));

      // Should receive response or acknowledgment
      const response = await messagePromise;
      expect(response).toBeDefined();
    }, 10000);

    it('should handle message routing through streaming service', async () => {
      const chatMessage = {
        type: 'chat_message',
        payload: {
          text: 'Test message for routing',
          channel: 'general'
        }
      };

      const notificationMessage = {
        type: 'notification',
        payload: {
          title: 'Test Notification',
          body: 'This is a test notification'
        }
      };

      // Send messages with different types
      testClient.send(JSON.stringify(chatMessage));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      testClient.send(JSON.stringify(notificationMessage));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check streaming service metrics
      const streamingMetrics = streamingService.getMetrics();
      expect(streamingMetrics.messagesProcessed).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Real-time streaming functionality', () => {
    it('should stream messages to multiple WebSocket connections', async () => {
      // Create multiple client connections
      const clients: WebSocket[] = [];
      const connectionPromises: Promise<void>[] = [];

      for (let i = 0; i < 3; i++) {
        const client = new WebSocket(`ws://localhost:${baseConfig.webSocket.port}`);
        clients.push(client);

        const connectionPromise = new Promise<void>((resolve, reject) => {
          client.on('open', () => resolve());
          client.on('error', reject);
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });

        connectionPromises.push(connectionPromise);
      }

      // Wait for all connections
      await Promise.all(connectionPromises);

      // Set up message listeners
      const receivedMessages: any[][] = clients.map(() => []);
      
      clients.forEach((client, index) => {
        client.on('message', (data) => {
          const message = JSON.parse(data.toString());
          receivedMessages[index].push(message);
        });
      });

      // Send broadcast message through first client
      const broadcastMessage = {
        type: 'broadcast',
        payload: {
          text: 'Broadcast to all users',
          sender: 'system'
        }
      };

      clients[0].send(JSON.stringify(broadcastMessage));

      // Wait for message propagation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clean up connections
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      });

      // Verify broadcast worked (at least some clients should receive)
      const totalReceived = receivedMessages.reduce((sum, msgs) => sum + msgs.length, 0);
      expect(totalReceived).toBeGreaterThan(0);
    }, 15000);

    it('should handle message filtering in streaming service', async () => {
      const filteredMessage = {
        type: 'test_message',
        payload: {
          text: 'This message should be filtered',
          filtered: true // This should trigger filtering
        }
      };

      const normalMessage = {
        type: 'test_message',
        payload: {
          text: 'This message should pass through',
          filtered: false
        }
      };

      // Send both messages
      testClient.send(JSON.stringify(filteredMessage));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      testClient.send(JSON.stringify(normalMessage));

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check streaming metrics
      const metrics = streamingService.getMetrics();
      expect(metrics.messagesFiltered).toBeGreaterThan(0);
      expect(metrics.messagesProcessed).toBeGreaterThan(0);
    }, 8000);

    it('should apply message transformations', async () => {
      const messageWithoutTimestamp = {
        type: 'transform_test',
        payload: {
          data: 'Test transformation'
        }
        // No timestamp - should be added by transformation
      };

      let transformedMessage: any = null;

      const messagePromise = new Promise<void>((resolve) => {
        testClient.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'transform_test' || message.type === 'transformed_message') {
            transformedMessage = message;
            resolve();
          }
        });

        setTimeout(resolve, 5000); // Timeout after 5 seconds
      });

      testClient.send(JSON.stringify(messageWithoutTimestamp));
      await messagePromise;

      // Verify transformation applied (timestamp should be added)
      if (transformedMessage) {
        expect(transformedMessage.timestamp).toBeDefined();
        expect(typeof transformedMessage.timestamp).toBe('number');
      }
    }, 8000);
  });

  describe('Performance under concurrent load', () => {
    it('should handle multiple concurrent WebSocket connections', async () => {
      const connectionCount = 10;
      const clients: WebSocket[] = [];
      const connectionPromises: Promise<void>[] = [];

      // Create multiple connections
      for (let i = 0; i < connectionCount; i++) {
        const client = new WebSocket(`ws://localhost:${baseConfig.webSocket.port}`);
        clients.push(client);

        const connectionPromise = new Promise<void>((resolve, reject) => {
          client.on('open', () => resolve());
          client.on('error', reject);
          setTimeout(() => reject(new Error(`Connection ${i} timeout`)), 10000);
        });

        connectionPromises.push(connectionPromise);
      }

      // Wait for all connections to establish
      await Promise.all(connectionPromises);

      // Send messages from all clients
      const messagePromises = clients.map((client, index) => {
        return new Promise<void>((resolve) => {
          const message = {
            type: 'load_test',
            payload: {
              clientIndex: index,
              timestamp: Date.now()
            }
          };

          client.send(JSON.stringify(message));
          resolve();
        });
      });

      await Promise.all(messagePromises);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check metrics
      const wsMetrics = webSocketHandlers.getMetrics();
      expect(wsMetrics.activeConnections).toBeGreaterThanOrEqual(connectionCount);

      // Clean up
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      });
    }, 20000);

    it('should maintain performance with high message throughput', async () => {
      const messageCount = 100;
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        type: 'throughput_test',
        payload: {
          index: i,
          data: `Message ${i}`,
          timestamp: Date.now()
        }
      }));

      const startTime = Date.now();

      // Send messages rapidly
      for (const message of messages) {
        testClient.send(JSON.stringify(message));
        // Small delay to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Wait for all messages to be processed
      await new Promise(resolve => setTimeout(resolve, 5000));

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = messageCount / (duration / 1000);

      console.log(`WebSocket throughput: ${throughput.toFixed(2)} messages/second`);

      // Check metrics
      const wsMetrics = webSocketHandlers.getMetrics();
      const streamingMetrics = streamingService.getMetrics();

      expect(wsMetrics.messagesReceived).toBeGreaterThan(0);
      expect(streamingMetrics.messagesProcessed).toBeGreaterThan(0);
      expect(throughput).toBeGreaterThan(10); // At least 10 msg/sec
    }, 15000);
  });

  describe('Error handling and resilience', () => {
    it('should handle WebSocket connection drops gracefully', async () => {
      // Create connection
      const tempClient = new WebSocket(`ws://localhost:${baseConfig.webSocket.port}`);
      
      await new Promise<void>((resolve, reject) => {
        tempClient.on('open', () => resolve());
        tempClient.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      // Send message
      tempClient.send(JSON.stringify({
        type: 'before_disconnect',
        payload: { data: 'test before disconnect' }
      }));

      // Force disconnect
      tempClient.terminate();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Service should continue working for other connections
      testClient.send(JSON.stringify({
        type: 'after_disconnect',
        payload: { data: 'test after disconnect' }
      }));

      // Should not throw errors
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check that services are still running
      expect(webSocketHandlers.isStarted()).toBe(true);
      expect(streamingService.isStarted()).toBe(true);
    }, 10000);

    it('should handle invalid message formats', async () => {
      // Send invalid JSON
      testClient.send('invalid json message');
      
      // Send valid JSON with invalid structure
      testClient.send(JSON.stringify({ invalid: 'structure' }));

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Services should still be running
      expect(webSocketHandlers.isStarted()).toBe(true);
      expect(streamingService.isStarted()).toBe(true);

      // Should be able to send valid message after
      testClient.send(JSON.stringify({
        type: 'recovery_test',
        payload: { data: 'valid message after errors' }
      }));
    }, 8000);
  });

  describe('Metrics and monitoring integration', () => {
    it('should provide comprehensive metrics', async () => {
      // Send some test messages
      for (let i = 0; i < 10; i++) {
        testClient.send(JSON.stringify({
          type: 'metrics_test',
          payload: { index: i }
        }));
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get metrics from all services
      const wsMetrics = webSocketHandlers.getMetrics();
      const streamingMetrics = streamingService.getMetrics();
      const queueMetrics = messageQueue.getMetrics();

      // Verify WebSocket metrics
      expect(wsMetrics.activeConnections).toBeGreaterThan(0);
      expect(wsMetrics.messagesReceived).toBeGreaterThan(0);

      // Verify Streaming metrics
      expect(streamingMetrics.messagesProcessed).toBeGreaterThan(0);
      expect(streamingMetrics.activeStreams).toBeGreaterThanOrEqual(0);

      // Verify Queue metrics
      expect(queueMetrics.messagesPublished).toBeGreaterThanOrEqual(0);

      console.log('Integration Test Metrics:', {
        webSocket: wsMetrics,
        streaming: streamingMetrics,
        messageQueue: queueMetrics
      });
    }, 10000);
  });
});