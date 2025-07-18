// Jest Test Setup
// Global test configuration and utilities

// Remove reflect-metadata dependency for now
// import 'reflect-metadata';

// Mock global objects for testing
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test timeout
jest.setTimeout(30000);