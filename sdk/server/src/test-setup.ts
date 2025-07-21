// Jest test setup file for WebSocket server tests

// Mock timers for consistent testing
beforeEach(() => {
  jest.clearAllMocks();
});

// Cleanup after tests
afterEach(() => {
  jest.clearAllTimers();
});

// Global test timeout for integration tests
jest.setTimeout(30000);

// Suppress console logs during tests unless explicitly needed
if (process.env.NODE_ENV === 'test' && !process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}