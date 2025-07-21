// Jest test setup file
// Add any global test configuration or setup here

// Extend Jest matchers if needed
// import '@testing-library/jest-dom';

// Mock timers for consistent testing
beforeEach(() => {
  jest.clearAllMocks();
});

// Global test timeout
jest.setTimeout(10000);

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