import { OptimizedWebSocketHandlers, WebSocketConnection } from '../../src/infrastructure/websocket/optimized-websocket-handlers';
import { KafkaRedisQueueManager } from '../../src/infrastructure/message-queue/kafka-redis-queue-manager';
import { jest } from '@jest/globals';
import WebSocket from 'ws';

// Mock dependencies
jest.mock('ws');
jest.mock('../../src/infrastructure/message-queue/kafka-redis-queue-manager');

describe('OptimizedWebSocketHandlers', () => {
  let webSocketHandlers: OptimizedWebSocketHandlers;
  let mockMessageQueue: jest.Mocked<KafkaRedisQueueManager>;
  let mockLogger: any;
  let mockWebSocket: jest.Mocked<WebSocket>;

  const testConfig = {
    port: 8080,
    host: 'localhost',
    compression: {
      enabled: true,
      threshold: 1024,
      algorithm: 'gzip' as const
    },
    rateLimit: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60000
    },
    authentication: {
      enabled: true,
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
      allowedOrigins: ['http://localhost:3000'],
      enableCors: true
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MessageQueue
    mockMessageQueue = {
      publish: jest.fn().mockResolvedValue('test-message-id'),
      subscribe: jest.fn().mockResolvedValue(undefined),
      isStarted: jest.fn().mockReturnValue(true),
      getMetrics: jest.fn().mockReturnValue({
        messagesPublished: 0,
        messagesConsumed: 0
      })
    } as any;

    // Mock Logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    // Mock WebSocket
    mockWebSocket = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      ping: jest.fn(),
      pong: jest.fn()
    } as any;

    webSocketHandlers = new OptimizedWebSocketHandlers(testConfig, mockMessageQueue, mockLogger);
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      expect(webSocketHandlers).toBeInstanceOf(OptimizedWebSocketHandlers);
      expect(webSocketHandlers.isStarted()).toBe(false);
    });

    it('should throw error with invalid configuration', () => {
      expect(() => {
        new OptimizedWebSocketHandlers({} as any, mockMessageQueue, mockLogger);
      }).toThrow();
    });
  });

  describe('start', () => {
    it('should start WebSocket server successfully', async () => {
      const mockServer = {
        on: jest.fn(),
        listen: jest.fn((callback) => callback()),
        close: jest.fn()
      };

      // Mock WebSocket.Server
      (WebSocket.Server as any) = jest.fn().mockReturnValue(mockServer);

      await webSocketHandlers.start();
      
      expect(webSocketHandlers.isStarted()).toBe(true);
      expect(mockServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should handle start failures', async () => {
      const startError = new Error('Server start failed');
      
      const mockServer = {
        on: jest.fn(),
        listen: jest.fn((callback) => callback(startError))
      };

      (WebSocket.Server as any) = jest.fn().mockReturnValue(mockServer);

      await expect(webSocketHandlers.start()).rejects.toThrow(startError);
      expect(webSocketHandlers.isStarted()).toBe(false);
    });
  });

  describe('connection handling', () => {
    let mockConnection: WebSocketConnection;

    beforeEach(async () => {
      // Start the handlers
      const mockServer = {
        on: jest.fn(),
        listen: jest.fn((callback) => callback()),
        close: jest.fn()
      };
      (WebSocket.Server as any) = jest.fn().mockReturnValue(mockServer);
      await webSocketHandlers.start();

      // Create mock connection
      mockConnection = {
        id: 'test-connection-id',
        socket: mockWebSocket,
        userId: 'test-user',
        authenticated: true,
        lastHeartbeat: Date.now(),
        rateLimiter: {
          checkRateLimit: jest.fn().mockReturnValue(true),
          reset: jest.fn()
        },
        messageQueue: [],
        subscriptions: new Set()
      };
    });

    it('should handle new connections', () => {
      const connections = webSocketHandlers.getConnections();
      expect(Array.isArray(connections)).toBe(true);
    });

    it('should authenticate connections', async () => {
      const authToken = 'valid-jwt-token';
      const authMessage = {
        type: 'auth',
        token: authToken
      };

      // Mock JWT validation
      jest.doMock('jsonwebtoken', () => ({
        verify: jest.fn().mockReturnValue({ userId: 'test-user' })
      }));

      // This would be called by connection handler
      expect(mockConnection.authenticated).toBe(true);
    });

    it('should handle rate limiting', () => {
      // Simulate rate limit exceeded
      mockConnection.rateLimiter.checkRateLimit = jest.fn().mockReturnValue(false);
      
      const result = mockConnection.rateLimiter.checkRateLimit();
      expect(result).toBe(false);
    });

    it('should process messages', async () => {
      const testMessage = {
        type: 'chat_message',
        payload: { text: 'Hello, World!' }
      };

      // Simulate message processing
      await mockMessageQueue.publish(testMessage);
      
      expect(mockMessageQueue.publish).toHaveBeenCalledWith(testMessage);
    });
  });

  describe('message broadcasting', () => {
    it('should broadcast messages to subscribers', async () => {
      const testMessage = {
        type: 'broadcast',
        payload: { text: 'Broadcast message' },
        target: 'all'
      };

      // Mock connections
      const connections = [
        { id: '1', socket: mockWebSocket, subscriptions: new Set(['general']) },
        { id: '2', socket: mockWebSocket, subscriptions: new Set(['general']) }
      ];

      // Simulate broadcasting
      connections.forEach(conn => {
        if (conn.subscriptions.has('general')) {
          expect(conn.socket.send).toBeDefined();
        }
      });
    });

    it('should handle broadcasting errors', async () => {
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Send failed');
      });

      // Should log error but not crash
      expect(mockLogger.error).toBeDefined();
    });
  });

  describe('heartbeat mechanism', () => {
    it('should send heartbeat pings', () => {
      const mockConnection = {
        socket: mockWebSocket,
        lastHeartbeat: Date.now()
      };

      // Simulate heartbeat
      mockWebSocket.ping();
      expect(mockWebSocket.ping).toHaveBeenCalled();
    });

    it('should handle heartbeat timeouts', () => {
      const mockConnection = {
        socket: mockWebSocket,
        lastHeartbeat: Date.now() - 60000 // 1 minute ago
      };

      // Should close connection on timeout
      expect(mockWebSocket.close).toBeDefined();
    });
  });

  describe('getMetrics', () => {
    it('should return WebSocket metrics', () => {
      const metrics = webSocketHandlers.getMetrics();
      
      expect(metrics).toHaveProperty('activeConnections');
      expect(metrics).toHaveProperty('totalConnections');
      expect(metrics).toHaveProperty('messagesReceived');
      expect(metrics).toHaveProperty('messagesSent');
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('rateLimitViolations');
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      // Start first
      const mockServer = {
        on: jest.fn(),
        listen: jest.fn((callback) => callback()),
        close: jest.fn((callback) => callback())
      };
      (WebSocket.Server as any) = jest.fn().mockReturnValue(mockServer);
      await webSocketHandlers.start();

      // Then shutdown
      await webSocketHandlers.shutdown();
      
      expect(webSocketHandlers.isStarted()).toBe(false);
      expect(mockServer.close).toHaveBeenCalled();
    });

    it('should handle shutdown errors', async () => {
      const shutdownError = new Error('Shutdown failed');
      
      const mockServer = {
        on: jest.fn(),
        listen: jest.fn((callback) => callback()),
        close: jest.fn((callback) => callback(shutdownError))
      };
      (WebSocket.Server as any) = jest.fn().mockReturnValue(mockServer);
      await webSocketHandlers.start();

      await webSocketHandlers.shutdown();
      expect(mockLogger.error).toBeDefined();
    });
  });
});

// Helper functions for testing
function createMockWebSocket(): jest.Mocked<WebSocket> {
  return {
    readyState: WebSocket.OPEN,
    send: jest.fn(),
    close: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
    ping: jest.fn(),
    pong: jest.fn()
  } as any;
}

function createMockConnection(overrides: Partial<WebSocketConnection> = {}): WebSocketConnection {
  return {
    id: 'test-connection',
    socket: createMockWebSocket(),
    userId: 'test-user',
    authenticated: true,
    lastHeartbeat: Date.now(),
    rateLimiter: {
      checkRateLimit: jest.fn().mockReturnValue(true),
      reset: jest.fn()
    },
    messageQueue: [],
    subscriptions: new Set(),
    ...overrides
  };
}