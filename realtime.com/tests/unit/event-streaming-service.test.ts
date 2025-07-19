import { EventStreamingService, StreamMessage, RoutingStrategy } from '../../src/infrastructure/streaming/event-streaming-service';
import { KafkaRedisQueueManager } from '../../src/infrastructure/message-queue/kafka-redis-queue-manager';
import { OptimizedWebSocketHandlers } from '../../src/infrastructure/websocket/optimized-websocket-handlers';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../src/infrastructure/message-queue/kafka-redis-queue-manager');
jest.mock('../../src/infrastructure/websocket/optimized-websocket-handlers');

describe('EventStreamingService', () => {
  let streamingService: EventStreamingService;
  let mockMessageQueue: jest.Mocked<KafkaRedisQueueManager>;
  let mockWebSocketHandlers: jest.Mocked<OptimizedWebSocketHandlers>;
  let mockLogger: any;

  const testConfig = {
    routing: {
      strategy: 'content_based' as RoutingStrategy,
      rules: [
        {
          condition: { type: 'user_action' },
          target: 'user_events',
          priority: 'high' as const
        }
      ],
      defaultTarget: 'default_stream'
    },
    filtering: {
      enabled: true,
      rules: [
        {
          field: 'payload.sensitive',
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
      enabled: true,
      windows: [
        {
          type: 'time' as const,
          duration: 60000,
          operations: ['count', 'sum']
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
      flushInterval: 5000
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MessageQueue
    mockMessageQueue = {
      publish: jest.fn().mockResolvedValue('message-id'),
      subscribe: jest.fn().mockResolvedValue(undefined),
      isStarted: jest.fn().mockReturnValue(true),
      getMetrics: jest.fn().mockReturnValue({
        messagesPublished: 100,
        messagesConsumed: 95
      })
    } as any;

    // Mock WebSocket Handlers
    mockWebSocketHandlers = {
      broadcast: jest.fn().mockResolvedValue(undefined),
      sendToUser: jest.fn().mockResolvedValue(undefined),
      isStarted: jest.fn().mockReturnValue(true),
      getMetrics: jest.fn().mockReturnValue({
        activeConnections: 10,
        messagesSent: 50
      })
    } as any;

    // Mock Logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    streamingService = new EventStreamingService(
      testConfig,
      mockMessageQueue,
      mockWebSocketHandlers,
      mockLogger
    );
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      expect(streamingService).toBeInstanceOf(EventStreamingService);
      expect(streamingService.isStarted()).toBe(false);
    });

    it('should throw error with invalid configuration', () => {
      expect(() => {
        new EventStreamingService({} as any, mockMessageQueue, mockWebSocketHandlers, mockLogger);
      }).toThrow();
    });
  });

  describe('start', () => {
    it('should start streaming service successfully', async () => {
      await streamingService.start();
      
      expect(streamingService.isStarted()).toBe(true);
      expect(mockMessageQueue.subscribe).toHaveBeenCalled();
    });

    it('should handle start failures', async () => {
      const startError = new Error('Start failed');
      mockMessageQueue.subscribe.mockRejectedValue(startError);
      
      await expect(streamingService.start()).rejects.toThrow(startError);
      expect(streamingService.isStarted()).toBe(false);
    });
  });

  describe('message processing', () => {
    beforeEach(async () => {
      await streamingService.start();
    });

    it('should process messages successfully', async () => {
      const testMessage: StreamMessage = {
        id: 'test-message-id',
        type: 'user_action',
        payload: { action: 'click', button: 'submit' },
        timestamp: Date.now(),
        source: 'web_app',
        userId: 'user123'
      };

      await streamingService.processMessage(testMessage);
      
      // Should route message based on configuration
      expect(mockMessageQueue.publish).toHaveBeenCalled();
    });

    it('should apply filtering rules', async () => {
      const sensitiveMessage: StreamMessage = {
        id: 'sensitive-message',
        type: 'user_data',
        payload: { sensitive: true, data: 'secret' },
        timestamp: Date.now(),
        source: 'web_app',
        userId: 'user123'
      };

      await streamingService.processMessage(sensitiveMessage);
      
      // Message should be dropped due to filtering
      expect(mockMessageQueue.publish).not.toHaveBeenCalled();
    });

    it('should apply transformation rules', async () => {
      const testMessage: StreamMessage = {
        id: 'transform-test',
        type: 'analytics',
        payload: { event: 'page_view' },
        timestamp: 0, // Will be transformed
        source: 'web_app',
        userId: 'user123'
      };

      await streamingService.processMessage(testMessage);
      
      // Should have added current timestamp
      expect(mockMessageQueue.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number)
        })
      );
    });

    it('should handle processing errors gracefully', async () => {
      const errorMessage: StreamMessage = {
        id: 'error-message',
        type: 'invalid',
        payload: null,
        timestamp: Date.now(),
        source: 'web_app',
        userId: 'user123'
      };

      // Mock processing error
      mockMessageQueue.publish.mockRejectedValue(new Error('Processing failed'));

      await streamingService.processMessage(errorMessage);
      
      // Should log error but not throw
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('routing', () => {
    beforeEach(async () => {
      await streamingService.start();
    });

    it('should route messages based on content', async () => {
      const userActionMessage: StreamMessage = {
        id: 'user-action',
        type: 'user_action',
        payload: { action: 'login' },
        timestamp: Date.now(),
        source: 'web_app',
        userId: 'user123'
      };

      await streamingService.processMessage(userActionMessage);
      
      // Should route to user_events based on routing rules
      expect(mockMessageQueue.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user_action'
        })
      );
    });

    it('should use default routing for unmatched messages', async () => {
      const unknownMessage: StreamMessage = {
        id: 'unknown',
        type: 'unknown_type',
        payload: { data: 'test' },
        timestamp: Date.now(),
        source: 'web_app',
        userId: 'user123'
      };

      await streamingService.processMessage(unknownMessage);
      
      // Should route to default stream
      expect(mockMessageQueue.publish).toHaveBeenCalled();
    });
  });

  describe('aggregation', () => {
    beforeEach(async () => {
      await streamingService.start();
    });

    it('should aggregate messages in time windows', async () => {
      const messages: StreamMessage[] = [
        {
          id: '1',
          type: 'metric',
          payload: { value: 10 },
          timestamp: Date.now(),
          source: 'sensor',
          userId: 'system'
        },
        {
          id: '2',
          type: 'metric',
          payload: { value: 20 },
          timestamp: Date.now(),
          source: 'sensor',
          userId: 'system'
        }
      ];

      for (const message of messages) {
        await streamingService.processMessage(message);
      }

      // Should aggregate values in time window
      const metrics = streamingService.getMetrics();
      expect(metrics.aggregation).toBeDefined();
    });
  });

  describe('stream management', () => {
    beforeEach(async () => {
      await streamingService.start();
    });

    it('should create new streams', async () => {
      const streamId = await streamingService.createStream('test-stream', {
        routing: 'round_robin',
        bufferSize: 1000
      });

      expect(streamId).toBeDefined();
      expect(typeof streamId).toBe('string');
    });

    it('should list active streams', () => {
      const streams = streamingService.getActiveStreams();
      expect(Array.isArray(streams)).toBe(true);
    });

    it('should pause and resume streams', async () => {
      const streamId = await streamingService.createStream('pausable-stream');
      
      await streamingService.pauseStream(streamId);
      expect(streamingService.isStreamActive(streamId)).toBe(false);
      
      await streamingService.resumeStream(streamId);
      expect(streamingService.isStreamActive(streamId)).toBe(true);
    });

    it('should close streams', async () => {
      const streamId = await streamingService.createStream('closeable-stream');
      
      await streamingService.closeStream(streamId);
      expect(streamingService.isStreamActive(streamId)).toBe(false);
    });
  });

  describe('getMetrics', () => {
    it('should return streaming metrics', () => {
      const metrics = streamingService.getMetrics();
      
      expect(metrics).toHaveProperty('messagesProcessed');
      expect(metrics).toHaveProperty('messagesFiltered');
      expect(metrics).toHaveProperty('messagesTransformed');
      expect(metrics).toHaveProperty('activeStreams');
      expect(metrics).toHaveProperty('averageProcessingTime');
      expect(metrics).toHaveProperty('throughput');
      expect(metrics).toHaveProperty('aggregation');
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      await streamingService.start();
      await streamingService.shutdown();
      
      expect(streamingService.isStarted()).toBe(false);
    });

    it('should handle shutdown errors', async () => {
      await streamingService.start();
      
      // Mock shutdown error
      const shutdownError = new Error('Shutdown failed');
      jest.spyOn(streamingService as any, 'closeAllStreams')
        .mockRejectedValue(shutdownError);
      
      await streamingService.shutdown();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});

// Helper functions for testing
function createTestMessage(overrides: Partial<StreamMessage> = {}): StreamMessage {
  return {
    id: 'test-message',
    type: 'test',
    payload: { data: 'test' },
    timestamp: Date.now(),
    source: 'test_source',
    userId: 'test_user',
    ...overrides
  };
}

function createStreamConfig() {
  return {
    routing: 'round_robin' as RoutingStrategy,
    bufferSize: 1000,
    maxConcurrency: 10
  };
}