// Jest Test Setup
// Global test configuration and utilities

import 'reflect-metadata';

// Mock global objects for testing
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test timeout
jest.setTimeout(30000);