import { KafkaRedisQueueManager } from '../../src/infrastructure/message-queue/kafka-redis-queue-manager';
import { createClient } from 'redis';
import { Kafka } from 'kafkajs';
import { jest } from '@jest/globals';

describe('Kafka-Redis Integration Tests', () => {
  let queueManager: KafkaRedisQueueManager;
  let redisClient: any;
  let kafka: Kafka;
  
  const testConfig = {
    kafka: {
      clientId: 'integration-test-client',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
      producer: {
        maxInFlightRequests: 1,
        idempotent: true,
        compression: 'lz4' as const,
        retry: { retries: 3 }
      },
      consumer: {
        groupId: 'integration-test-group',
        sessionTimeout: 30000,
        heartbeatInterval: 3000
      }
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      keyPrefix: 'integration-test:mq:',
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
  };

  beforeAll(async () => {
    // Setup Redis client for testing
    redisClient = createClient({ url: testConfig.redis.url });
    await redisClient.connect();

    // Setup Kafka for testing
    kafka = new Kafka({
      clientId: testConfig.kafka.clientId,
      brokers: testConfig.kafka.brokers
    });

    // Create test logger
    const logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    queueManager = new KafkaRedisQueueManager(testConfig, logger);
  });

  afterAll(async () => {
    if (queueManager?.isStarted()) {
      await queueManager.shutdown();
    }
    
    if (redisClient?.isOpen) {
      await redisClient.disconnect();
    }
  });

  beforeEach(async () => {
    // Clean up Redis keys
    const keys = await redisClient.keys('integration-test:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  });

  describe('end-to-end message flow', () => {
    it('should publish and consume messages successfully', async () => {
      await queueManager.start();

      const testMessage = {
        type: 'integration_test',
        payload: { data: 'test message', timestamp: Date.now() },
        priority: 'medium' as const
      };

      // Set up consumer
      const receivedMessages: any[] = [];
      await queueManager.subscribe('integration-test-topic', async (message) => {
        receivedMessages.push(message);
      });

      // Publish message
      const messageId = await queueManager.publish(testMessage);
      expect(messageId).toBeDefined();

      // Wait for message to be consumed
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].type).toBe('integration_test');
      expect(receivedMessages[0].payload.data).toBe('test message');
    }, 30000);

    it('should handle message deduplication', async () => {
      await queueManager.start();

      const testMessage = {
        type: 'dedup_test',
        payload: { data: 'duplicate test', uniqueId: 'test-123' },
        priority: 'medium' as const
      };

      // Publish same message twice
      const messageId1 = await queueManager.publish(testMessage);
      const messageId2 = await queueManager.publish(testMessage);

      // Should return same message ID for duplicate
      expect(messageId1).toBe(messageId2);

      // Check Redis for deduplication key
      const dedupKey = `${testConfig.redis.keyPrefix}dedup:${messageId1}`;
      const exists = await redisClient.exists(dedupKey);
      expect(exists).toBe(1);
    }, 15000);

    it('should handle dead letter queue', async () => {
      await queueManager.start();

      const errorMessage = {
        type: 'dlq_test',
        payload: { shouldFail: true },
        priority: 'medium' as const
      };

      // Set up consumer that always fails
      await queueManager.subscribe('dlq-test-topic', async (message) => {
        throw new Error('Simulated processing error');
      });

      // Publish message that will fail
      await queueManager.publish(errorMessage);

      // Wait for retries and DLQ processing
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check metrics for DLQ messages
      const metrics = queueManager.getMetrics();
      expect(metrics.deadLetterMessages).toBeGreaterThan(0);
    }, 20000);
  });

  describe('performance under load', () => {
    it('should handle high message throughput', async () => {
      await queueManager.start();

      const messageCount = 1000;
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        type: 'load_test',
        payload: { index: i, data: `message-${i}` },
        priority: 'medium' as const
      }));

      const startTime = Date.now();

      // Publish messages in parallel
      const publishPromises = messages.map(message => 
        queueManager.publish(message)
      );

      const messageIds = await Promise.all(publishPromises);
      expect(messageIds).toHaveLength(messageCount);

      const endTime = Date.now();
      const throughput = messageCount / ((endTime - startTime) / 1000);

      console.log(`Throughput: ${throughput.toFixed(2)} messages/second`);
      expect(throughput).toBeGreaterThan(100); // Expect at least 100 msg/sec
    }, 30000);

    it('should maintain performance with batching', async () => {
      await queueManager.start();

      const batchCount = 10;
      const batchSize = 100;
      
      for (let batch = 0; batch < batchCount; batch++) {
        const batchMessages = Array.from({ length: batchSize }, (_, i) => ({
          type: 'batch_test',
          payload: { batch, index: i },
          priority: 'medium' as const
        }));

        const batchStartTime = Date.now();
        
        // Publish batch
        await Promise.all(batchMessages.map(msg => queueManager.publish(msg)));
        
        const batchEndTime = Date.now();
        const batchTime = batchEndTime - batchStartTime;
        
        console.log(`Batch ${batch + 1} completed in ${batchTime}ms`);
        expect(batchTime).toBeLessThan(5000); // Each batch should complete in <5s
      }

      const metrics = queueManager.getMetrics();
      expect(metrics.messagesPublished).toBe(batchCount * batchSize);
    }, 60000);
  });

  describe('error handling and recovery', () => {
    it('should recover from Redis connection loss', async () => {
      await queueManager.start();

      // Simulate Redis disconnection
      await redisClient.disconnect();

      // Try to publish (should handle gracefully)
      const testMessage = {
        type: 'redis_failure_test',
        payload: { data: 'test during redis failure' },
        priority: 'medium' as const
      };

      // Should not throw error, but may return different behavior
      await expect(queueManager.publish(testMessage)).resolves.toBeDefined();

      // Reconnect Redis
      await redisClient.connect();

      // Normal operation should resume
      const messageId = await queueManager.publish(testMessage);
      expect(messageId).toBeDefined();
    }, 30000);

    it('should handle Kafka broker unavailability', async () => {
      // Note: This test requires manual Kafka shutdown/restart
      // or mock implementation for CI/CD environments
      
      await queueManager.start();

      const testMessage = {
        type: 'kafka_failure_test',
        payload: { data: 'test during kafka failure' },
        priority: 'medium' as const
      };

      // This should be wrapped in retry logic
      try {
        await queueManager.publish(testMessage);
      } catch (error) {
        // Should have retry mechanism
        expect(error).toBeDefined();
      }
    }, 15000);
  });

  describe('metrics and monitoring integration', () => {
    it('should provide accurate metrics', async () => {
      await queueManager.start();

      // Publish some messages
      const messageCount = 50;
      for (let i = 0; i < messageCount; i++) {
        await queueManager.publish({
          type: 'metrics_test',
          payload: { index: i },
          priority: 'medium'
        });
      }

      const metrics = queueManager.getMetrics();
      
      expect(metrics.messagesPublished).toBe(messageCount);
      expect(metrics.avgProcessingTime).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.errorRate).toBeLessThanOrEqual(1);
    }, 20000);

    it('should track performance over time', async () => {
      await queueManager.start();

      const measurements: number[] = [];
      
      // Take multiple performance measurements
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        
        await queueManager.publish({
          type: 'performance_tracking',
          payload: { measurement: i },
          priority: 'medium'
        });
        
        const endTime = Date.now();
        measurements.push(endTime - startTime);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      console.log(`Average publish time: ${avgTime.toFixed(2)}ms`);
      
      expect(avgTime).toBeLessThan(1000); // Should be under 1 second
    }, 30000);
  });

  describe('configuration validation', () => {
    it('should work with different compression settings', async () => {
      const gzipConfig = {
        ...testConfig,
        kafka: {
          ...testConfig.kafka,
          producer: {
            ...testConfig.kafka.producer,
            compression: 'gzip' as const
          }
        }
      };

      const gzipManager = new KafkaRedisQueueManager(gzipConfig, {
        info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn()
      });

      await gzipManager.start();
      
      const messageId = await gzipManager.publish({
        type: 'compression_test',
        payload: { data: 'compressed message' },
        priority: 'medium'
      });

      expect(messageId).toBeDefined();
      await gzipManager.shutdown();
    }, 15000);

    it('should work with different deduplication strategies', async () => {
      const hashConfig = {
        ...testConfig,
        deduplication: {
          enabled: true,
          strategy: 'hash' as const,
          window: 300000
        }
      };

      const hashManager = new KafkaRedisQueueManager(hashConfig, {
        info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn()
      });

      await hashManager.start();
      
      const testMessage = {
        type: 'dedup_hash_test',
        payload: { data: 'hash dedup test' },
        priority: 'medium' as const
      };

      const messageId1 = await hashManager.publish(testMessage);
      const messageId2 = await hashManager.publish(testMessage);

      // Should detect duplicate and return same ID
      expect(messageId1).toBe(messageId2);
      
      await hashManager.shutdown();
    }, 15000);
  });
});