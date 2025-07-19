import { jest } from '@jest/globals';

// Extend Jest timeout for integration tests
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.KAFKA_BROKERS = 'localhost:9092';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.LOG_LEVEL = 'error';

// Global test utilities
(global as any).testUtils = {
  // Helper to wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to create test message
  createTestMessage: (overrides: any = {}) => ({
    type: 'test_message',
    payload: { data: 'test' },
    priority: 'medium',
    ...overrides
  }),
  
  // Helper to generate random string
  randomString: (length: number = 10) => 
    Math.random().toString(36).substring(2, 2 + length)
};

// Suppress console logs during tests unless LOG_LEVEL is set
if (!process.env.LOG_LEVEL || process.env.LOG_LEVEL === 'error') {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
}

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};