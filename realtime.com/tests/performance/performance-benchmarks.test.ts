import { KafkaRedisQueueManager } from '../../src/infrastructure/message-queue/kafka-redis-queue-manager';
import { OptimizedWebSocketHandlers } from '../../src/infrastructure/websocket/optimized-websocket-handlers';
import { EventStreamingService } from '../../src/infrastructure/streaming/event-streaming-service';
import WebSocket from 'ws';
import { jest } from '@jest/globals';
import { performance } from 'perf_hooks';

describe('Performance Benchmarks', () => {
  let messageQueue: KafkaRedisQueueManager;
  let webSocketHandlers: OptimizedWebSocketHandlers;
  let streamingService: EventStreamingService;
  let logger: any;

  const benchmarkConfig = {
    messageQueue: {
      kafka: {
        clientId: 'perf-test-client',
        brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
        producer: {
          maxInFlightRequests: 5,
          idempotent: true,
          compression: 'lz4' as const,
          retry: { retries: 3 },
          acks: 1
        },
        consumer: {
          groupId: 'perf-test-group',
          sessionTimeout: 30000,
          heartbeatInterval: 3000,
          maxBytesPerPartition: 1048576
        }
      },
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        keyPrefix: 'perf-test:mq:',
        ttl: 3600
      },
      deduplication: {
        enabled: false, // Disabled for raw performance
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
        batchSize: 500,
        flushInterval: 100,
        compressionThreshold: 512
      }
    },
    webSocket: {
      port: 8083,
      host: 'localhost',
      compression: {
        enabled: true,
        threshold: 512,
        algorithm: 'gzip' as const
      },
      rateLimit: {
        enabled: false, // Disabled for benchmarking
        maxRequests: 10000,
        windowMs: 60000
      },
      authentication: {
        enabled: false,
        tokenHeader: 'Authorization',
        tokenValidation: 'none' as const
      },
      heartbeat: {
        enabled: false, // Disabled for benchmarking
        interval: 30000,
        timeout: 5000
      },
      batching: {
        enabled: true,
        maxBatchSize: 500,
        flushInterval: 50
      },
      security: {
        maxMessageSize: 10485760, // 10MB for large message tests
        allowedOrigins: ['*'],
        enableCors: true
      }
    },
    streaming: {
      routing: {
        strategy: 'round_robin' as const, // Faster than content-based
        rules: [],
        defaultTarget: 'perf_stream'
      },
      filtering: {
        enabled: false, // Disabled for raw performance
        rules: []
      },
      transformation: {
        enabled: false, // Disabled for raw performance
        rules: []
      },
      aggregation: {
        enabled: false,
        windows: []
      },
      persistence: {
        enabled: false, // Disabled for raw performance
        storageType: 'memory' as const,
        ttl: 3600,
        batchSize: 1000
      },
      performance: {
        maxConcurrentStreams: 1000,
        bufferSize: 50000,
        flushInterval: 50
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

    // Initialize optimized components for performance testing
    messageQueue = new KafkaRedisQueueManager(benchmarkConfig.messageQueue, logger);
    webSocketHandlers = new OptimizedWebSocketHandlers(benchmarkConfig.webSocket, messageQueue, logger);
    streamingService = new EventStreamingService(benchmarkConfig.streaming, messageQueue, webSocketHandlers, logger);

    // Start all services
    await messageQueue.start();
    await webSocketHandlers.start();
    await streamingService.start();

    // Warm up the system
    await warmUpSystem();
  }, 60000);

  afterAll(async () => {
    await streamingService?.shutdown();
    await webSocketHandlers?.shutdown();
    await messageQueue?.shutdown();
  }, 30000);

  describe('Message Queue Performance', () => {
    it('should achieve high throughput publishing', async () => {
      const messageCount = 10000;
      const batchSize = 100;
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        type: 'throughput_test',
        payload: { 
          index: i, 
          data: `Performance test message ${i}`,
          timestamp: Date.now()
        },
        priority: 'medium' as const
      }));

      const startTime = performance.now();

      // Publish in batches for optimal performance
      const batchPromises = [];
      for (let i = 0; i < messageCount; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const batchPromise = Promise.all(
          batch.map(message => messageQueue.publish(message))
        );
        batchPromises.push(batchPromise);
      }

      await Promise.all(batchPromises);
      const endTime = performance.now();

      const duration = (endTime - startTime) / 1000;
      const throughput = messageCount / duration;

      console.log(`\n📊 MESSAGE QUEUE THROUGHPUT BENCHMARK:`);
      console.log(`Messages: ${messageCount.toLocaleString()}`);
      console.log(`Duration: ${duration.toFixed(2)}s`);
      console.log(`Throughput: ${throughput.toFixed(0)} msg/s`);
      console.log(`Latency: ${(duration / messageCount * 1000).toFixed(2)}ms per message`);

      // Performance targets
      expect(throughput).toBeGreaterThan(1000); // At least 1K msg/s
      expect(duration).toBeLessThan(messageCount / 500); // Max 500 msg/s baseline
    }, 60000);

    it('should handle large message payloads efficiently', async () => {
      const messageCount = 1000;
      const largePayload = 'x'.repeat(50000); // 50KB payload

      const messages = Array.from({ length: messageCount }, (_, i) => ({
        type: 'large_payload_test',
        payload: {
          index: i,
          largeData: largePayload,
          metadata: { size: '50KB', test: 'large_message_performance' }
        },
        priority: 'medium' as const
      }));

      const startTime = performance.now();

      // Use smaller batches for large messages
      const batchSize = 20;
      for (let i = 0; i < messageCount; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        await Promise.all(batch.map(message => messageQueue.publish(message)));
      }

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      const throughput = messageCount / duration;
      const dataRate = (messageCount * 50) / 1024 / duration; // MB/s

      console.log(`\n📊 LARGE MESSAGE PERFORMANCE:`);
      console.log(`Messages: ${messageCount} x 50KB`);
      console.log(`Total Data: ${(messageCount * 50 / 1024).toFixed(1)}MB`);
      console.log(`Duration: ${duration.toFixed(2)}s`);
      console.log(`Throughput: ${throughput.toFixed(0)} msg/s`);
      console.log(`Data Rate: ${dataRate.toFixed(1)} MB/s`);

      expect(throughput).toBeGreaterThan(50); // At least 50 large msg/s
      expect(dataRate).toBeGreaterThan(2); // At least 2 MB/s
    }, 45000);

    it('should demonstrate compression efficiency', async () => {
      const messageCount = 5000;
      
      // Create compressible payload (repetitive data)
      const compressibleData = Array(1000).fill('This is repetitive data for compression testing. ').join('');
      
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        type: 'compression_test',
        payload: {
          index: i,
          compressibleData,
          randomData: Math.random().toString(36)
        },
        priority: 'medium' as const
      }));

      const startTime = performance.now();
      
      // Publish with compression enabled
      const publishPromises = messages.map(message => messageQueue.publish(message));
      await Promise.all(publishPromises);
      
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      const throughput = messageCount / duration;

      console.log(`\n📊 COMPRESSION PERFORMANCE:`);
      console.log(`Messages: ${messageCount} (highly compressible)`);
      console.log(`Duration: ${duration.toFixed(2)}s`);
      console.log(`Throughput: ${throughput.toFixed(0)} msg/s`);

      expect(throughput).toBeGreaterThan(200); // Compression should improve performance
    }, 30000);
  });

  describe('WebSocket Performance', () => {
    it('should handle high concurrent connections', async () => {
      const connectionCount = 100;
      const clients: WebSocket[] = [];

      console.log(`\n🔌 CREATING ${connectionCount} WEBSOCKET CONNECTIONS...`);
      
      const startTime = performance.now();

      // Create connections in batches to avoid overwhelming
      const batchSize = 20;
      for (let i = 0; i < connectionCount; i += batchSize) {
        const batchPromises = [];
        
        for (let j = 0; j < batchSize && (i + j) < connectionCount; j++) {
          const connectionPromise = createWebSocketClient();
          batchPromises.push(connectionPromise);
        }

        const batchClients = await Promise.all(batchPromises);
        clients.push(...batchClients);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const connectionTime = performance.now();
      const connectionDuration = (connectionTime - startTime) / 1000;

      console.log(`📊 CONNECTION PERFORMANCE:`);
      console.log(`Connections: ${clients.length}`);
      console.log(`Connection Time: ${connectionDuration.toFixed(2)}s`);
      console.log(`Connection Rate: ${(clients.length / connectionDuration).toFixed(0)} conn/s`);

      // Test messaging performance with all connections
      const messagesPerClient = 10;
      const totalMessages = clients.length * messagesPerClient;

      const messagingStartTime = performance.now();

      // Send messages from all clients
      const messagingPromises = clients.map(async (client, index) => {
        for (let i = 0; i < messagesPerClient; i++) {
          const message = {
            type: 'concurrent_test',
            payload: {
              clientId: index,
              messageId: i,
              timestamp: Date.now()
            }
          };
          client.send(JSON.stringify(message));
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      });

      await Promise.all(messagingPromises);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const messagingEndTime = performance.now();
      const messagingDuration = (messagingEndTime - messagingStartTime) / 1000;
      const messagingThroughput = totalMessages / messagingDuration;

      console.log(`📊 CONCURRENT MESSAGING PERFORMANCE:`);
      console.log(`Total Messages: ${totalMessages.toLocaleString()}`);
      console.log(`Messaging Duration: ${messagingDuration.toFixed(2)}s`);
      console.log(`Messaging Throughput: ${messagingThroughput.toFixed(0)} msg/s`);

      // Clean up connections
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      });

      // Performance assertions
      expect(clients.length).toBe(connectionCount);
      expect(connectionDuration).toBeLessThan(connectionCount / 10); // At least 10 conn/s
      expect(messagingThroughput).toBeGreaterThan(100); // At least 100 msg/s under load
    }, 60000);

    it('should demonstrate message batching efficiency', async () => {
      const client = await createWebSocketClient();
      const messageCount = 5000;

      // Test individual message sending
      const individualStartTime = performance.now();
      
      for (let i = 0; i < messageCount / 2; i++) {
        client.send(JSON.stringify({
          type: 'individual_test',
          payload: { index: i }
        }));
      }
      
      const individualEndTime = performance.now();
      const individualDuration = (individualEndTime - individualStartTime) / 1000;

      // Test batched message sending (simulate internal batching)
      const batchedStartTime = performance.now();
      
      const batchSize = 50;
      for (let i = messageCount / 2; i < messageCount; i += batchSize) {
        const batch = Array.from({ length: Math.min(batchSize, messageCount - i) }, (_, j) => ({
          type: 'batched_test',
          payload: { index: i + j }
        }));

        // Send batch rapidly
        batch.forEach(message => {
          client.send(JSON.stringify(message));
        });

        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const batchedEndTime = performance.now();
      const batchedDuration = (batchedEndTime - batchedStartTime) / 1000;

      console.log(`\n📊 BATCHING EFFICIENCY:`);
      console.log(`Individual Messages: ${messageCount / 2} in ${individualDuration.toFixed(2)}s`);
      console.log(`Batched Messages: ${messageCount / 2} in ${batchedDuration.toFixed(2)}s`);
      console.log(`Improvement: ${((individualDuration / batchedDuration - 1) * 100).toFixed(1)}%`);

      client.close();

      expect(batchedDuration).toBeLessThan(individualDuration);
    }, 20000);
  });

  describe('Streaming Service Performance', () => {
    it('should handle high-throughput streaming', async () => {
      const client = await createWebSocketClient();
      const streamCount = 10;
      const messagesPerStream = 1000;
      const totalMessages = streamCount * messagesPerStream;

      // Create multiple streams
      const streamIds = [];
      for (let i = 0; i < streamCount; i++) {
        const streamId = await streamingService.createStream(`perf-stream-${i}`, {
          routing: 'round_robin',
          bufferSize: 5000
        });
        streamIds.push(streamId);
      }

      const startTime = performance.now();

      // Send messages to different streams
      const streamingPromises = streamIds.map(async (streamId, streamIndex) => {
        for (let msgIndex = 0; msgIndex < messagesPerStream; msgIndex++) {
          const message = {
            type: 'streaming_perf_test',
            payload: {
              streamId,
              streamIndex,
              messageIndex: msgIndex,
              data: `Stream ${streamIndex} message ${msgIndex}`
            }
          };

          client.send(JSON.stringify(message));
          
          // Minimal delay to prevent overwhelming
          if (msgIndex % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      });

      await Promise.all(streamingPromises);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 10000));

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      const throughput = totalMessages / duration;

      console.log(`\n📊 STREAMING PERFORMANCE:`);
      console.log(`Streams: ${streamCount}`);
      console.log(`Messages per Stream: ${messagesPerStream.toLocaleString()}`);
      console.log(`Total Messages: ${totalMessages.toLocaleString()}`);
      console.log(`Duration: ${duration.toFixed(2)}s`);
      console.log(`Throughput: ${throughput.toFixed(0)} msg/s`);

      // Get streaming metrics
      const streamingMetrics = streamingService.getMetrics();
      console.log(`Processed: ${streamingMetrics.messagesProcessed.toLocaleString()}`);
      console.log(`Processing Time: ${streamingMetrics.averageProcessingTime.toFixed(2)}ms`);

      // Clean up
      client.close();
      for (const streamId of streamIds) {
        await streamingService.closeStream(streamId);
      }

      expect(throughput).toBeGreaterThan(500); // At least 500 msg/s across streams
      expect(streamingMetrics.averageProcessingTime).toBeLessThan(100); // Under 100ms avg
    }, 45000);
  });

  describe('System-Wide Performance', () => {
    it('should demonstrate end-to-end performance', async () => {
      const clientCount = 50;
      const messagesPerClient = 100;
      const totalMessages = clientCount * messagesPerClient;

      // Create clients
      const clients: WebSocket[] = [];
      const clientPromises = Array.from({ length: clientCount }, () => createWebSocketClient());
      const connectedClients = await Promise.all(clientPromises);
      clients.push(...connectedClients);

      console.log(`\n🏁 END-TO-END PERFORMANCE TEST:`);
      console.log(`Clients: ${clientCount}`);
      console.log(`Messages per Client: ${messagesPerClient}`);
      console.log(`Total Messages: ${totalMessages.toLocaleString()}`);

      const startTime = performance.now();

      // Send messages from all clients
      const messagingPromises = clients.map(async (client, clientIndex) => {
        for (let msgIndex = 0; msgIndex < messagesPerClient; msgIndex++) {
          const message = {
            type: 'e2e_perf_test',
            payload: {
              clientId: clientIndex,
              messageId: msgIndex,
              timestamp: Date.now(),
              data: `E2E test message ${clientIndex}-${msgIndex}`
            }
          };

          client.send(JSON.stringify(message));
          
          // Small delay to prevent overwhelming
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      });

      await Promise.all(messagingPromises);

      // Wait for complete processing
      await new Promise(resolve => setTimeout(resolve, 15000));

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      const throughput = totalMessages / duration;

      // Gather metrics from all components
      const wsMetrics = webSocketHandlers.getMetrics();
      const streamingMetrics = streamingService.getMetrics();
      const queueMetrics = messageQueue.getMetrics();

      console.log(`\n📊 SYSTEM-WIDE RESULTS:`);
      console.log(`Duration: ${duration.toFixed(2)}s`);
      console.log(`Throughput: ${throughput.toFixed(0)} msg/s`);
      console.log(`\n📈 COMPONENT METRICS:`);
      console.log(`WebSocket - Received: ${wsMetrics.messagesReceived.toLocaleString()}, Latency: ${wsMetrics.averageLatency.toFixed(2)}ms`);
      console.log(`Streaming - Processed: ${streamingMetrics.messagesProcessed.toLocaleString()}, Time: ${streamingMetrics.averageProcessingTime.toFixed(2)}ms`);
      console.log(`Queue - Published: ${queueMetrics.messagesPublished.toLocaleString()}, Error Rate: ${(queueMetrics.errorRate * 100).toFixed(2)}%`);

      // Clean up
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      });

      // Performance assertions
      expect(throughput).toBeGreaterThan(100); // At least 100 msg/s end-to-end
      expect(queueMetrics.errorRate).toBeLessThan(0.05); // Less than 5% error rate
      expect(wsMetrics.averageLatency).toBeLessThan(200); // Under 200ms latency
    }, 60000);
  });

  // Helper functions
  async function createWebSocketClient(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const client = new WebSocket(`ws://localhost:${benchmarkConfig.webSocket.port}`);
      
      client.on('open', () => resolve(client));
      client.on('error', reject);
      
      setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
    });
  }

  async function warmUpSystem(): Promise<void> {
    console.log('🔥 Warming up system...');
    
    const warmupClient = await createWebSocketClient();
    
    // Send warm-up messages
    for (let i = 0; i < 100; i++) {
      warmupClient.send(JSON.stringify({
        type: 'warmup',
        payload: { index: i }
      }));
      
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    warmupClient.close();
    
    console.log('✅ System warmed up');
  }
});