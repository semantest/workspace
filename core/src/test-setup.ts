/*
                        Semantest - Core Module Test Setup
                        Jest configuration for core module tests

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

// Global test setup
global.console = {
    ...console,
    // Suppress console output during tests unless explicitly needed
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};

// Mock modules will be handled in individual test files as needed

// Setup test environment
beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
});

afterEach(() => {
    // Clean up after each test
    jest.resetModules();
});