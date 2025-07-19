import { KafkaRedisQueueManager, QueueMessage, MessagePriority } from '../../src/infrastructure/message-queue/kafka-redis-queue-manager';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('kafkajs');
jest.mock('redis');
jest.mock('winston');

describe('KafkaRedisQueueManager', () => {
  let queueManager: KafkaRedisQueueManager;
  let mockKafka: any;
  let mockRedis: any;
  let mockLogger: any;

  const testConfig = {
    kafka: {
      clientId: 'test-client',
      brokers: ['localhost:9092'],
      producer: {
        maxInFlightRequests: 1,
        idempotent: true,
        compression: 'lz4' as const,
        retry: { retries: 3 }
      },
      consumer: {
        groupId: 'test-group',
        sessionTimeout: 30000,
        heartbeatInterval: 3000
      }
    },
    redis: {
      url: 'redis://localhost:6379',
      keyPrefix: 'test:mq:',
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

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup Kafka mocks
    mockKafka = {
      producer: jest.fn().mockReturnValue({
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        send: jest.fn().mockResolvedValue(undefined)
      }),
      consumer: jest.fn().mockReturnValue({
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        subscribe: jest.fn().mockResolvedValue(undefined),
        run: jest.fn().mockResolvedValue(undefined)
      })
    };
    
    // Setup Redis mocks
    mockRedis = {
      createClient: jest.fn().mockReturnValue({
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue(0),
        setEx: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(null),
        del: jest.fn().mockResolvedValue(1)
      })
    };
    
    // Setup Logger mock
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    
    queueManager = new KafkaRedisQueueManager(testConfig, mockLogger);
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      expect(queueManager).toBeInstanceOf(KafkaRedisQueueManager);
      expect(queueManager.isStarted()).toBe(false);
    });

    it('should throw error with invalid configuration', () => {
      expect(() => {
        new KafkaRedisQueueManager({} as any, mockLogger);
      }).toThrow();
    });
  });

  describe('start', () => {
    it('should start all services successfully', async () => {
      await queueManager.start();
      expect(queueManager.isStarted()).toBe(true);
    });

    it('should handle start failures gracefully', async () => {
      const errorMessage = 'Connection failed';
      mockKafka.producer().connect.mockRejectedValue(new Error(errorMessage));
      
      await expect(queueManager.start()).rejects.toThrow(errorMessage);
      expect(queueManager.isStarted()).toBe(false);
    });
  });

  describe('publish', () => {
    beforeEach(async () => {
      await queueManager.start();
    });

    it('should publish message successfully', async () => {
      const message = {
        type: 'test_message',
        payload: { data: 'test' },
        priority: 'medium' as MessagePriority
      };

      const messageId = await queueManager.publish(message);
      
      expect(messageId).toBeDefined();
      expect(typeof messageId).toBe('string');
      expect(mockKafka.producer().send).toHaveBeenCalled();
    });

    it('should handle deduplication', async () => {
      // Mock duplicate check to return true
      mockRedis.createClient().exists.mockResolvedValue(1);
      
      const message = {
        type: 'test_message',
        payload: { data: 'test' },
        priority: 'medium' as MessagePriority
      };

      const messageId = await queueManager.publish(message);
      
      // Should return early without publishing to Kafka
      expect(mockKafka.producer().send).not.toHaveBeenCalled();
      expect(messageId).toBeDefined();
    });

    it('should handle publishing errors', async () => {
      const publishError = new Error('Kafka publish failed');
      mockKafka.producer().send.mockRejectedValue(publishError);
      
      const message = {
        type: 'test_message',
        payload: { data: 'test' },
        priority: 'medium' as MessagePriority
      };

      await expect(queueManager.publish(message)).rejects.toThrow(publishError);
    });
  });

  describe('subscribe', () => {
    beforeEach(async () => {
      await queueManager.start();
    });

    it('should subscribe to topic successfully', async () => {
      const handler = jest.fn();
      
      await queueManager.subscribe('test-topic', handler);
      
      expect(mockKafka.consumer().subscribe).toHaveBeenCalledWith({
        topic: 'test-topic',
        fromBeginning: false
      });
    });

    it('should handle subscription errors', async () => {
      const subscribeError = new Error('Subscription failed');
      mockKafka.consumer().subscribe.mockRejectedValue(subscribeError);
      
      const handler = jest.fn();
      
      await expect(queueManager.subscribe('test-topic', handler))
        .rejects.toThrow(subscribeError);
    });
  });

  describe('getMetrics', () => {
    it('should return performance metrics', () => {
      const metrics = queueManager.getMetrics();
      
      expect(metrics).toHaveProperty('messagesPublished');
      expect(metrics).toHaveProperty('messagesConsumed');
      expect(metrics).toHaveProperty('duplicatesDetected');
      expect(metrics).toHaveProperty('deadLetterMessages');
      expect(metrics).toHaveProperty('avgProcessingTime');
      expect(metrics).toHaveProperty('errorRate');
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      await queueManager.start();
      await queueManager.shutdown();
      
      expect(queueManager.isStarted()).toBe(false);
      expect(mockKafka.producer().disconnect).toHaveBeenCalled();
      expect(mockKafka.consumer().disconnect).toHaveBeenCalled();
    });

    it('should handle shutdown errors gracefully', async () => {
      await queueManager.start();
      
      const shutdownError = new Error('Shutdown failed');
      mockKafka.producer().disconnect.mockRejectedValue(shutdownError);
      
      // Should not throw, but log error
      await queueManager.shutdown();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});

// Helper function to create test messages
function createTestMessage(overrides: Partial<QueueMessage> = {}): Omit<QueueMessage, 'id' | 'timestamp' | 'retryCount'> {
  return {
    type: 'test_message',
    payload: { data: 'test' },
    priority: 'medium',
    ...overrides
  };
}