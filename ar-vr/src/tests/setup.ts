/*
                        Semantest - AR/VR Test Setup
                        Test configuration and setup for AR/VR module

    This file is part of Semantest.
*/

import 'jest-environment-jsdom';

// Mock WebXR APIs for testing
Object.defineProperty(window, 'navigator', {
  value: {
    ...window.navigator,
    xr: {
      isSessionSupported: jest.fn().mockResolvedValue(false),
      requestSession: jest.fn().mockRejectedValue(new Error('WebXR not supported in test environment'))
    }
  },
  writable: true
});

// Mock Three.js WebGL context for testing
const mockWebGLContext = {
  canvas: document.createElement('canvas'),
  getExtension: jest.fn(),
  getParameter: jest.fn(),
  createShader: jest.fn(),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  createProgram: jest.fn(),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  useProgram: jest.fn(),
  getAttribLocation: jest.fn(),
  enableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),
  createBuffer: jest.fn(),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  drawArrays: jest.fn(),
  clear: jest.fn(),
  clearColor: jest.fn(),
  viewport: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
  blend: jest.fn(),
  blendFunc: jest.fn()
};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => mockWebGLContext),
  writable: true
});

// Global test utilities
global.createMockTestResult = (overrides = {}) => ({
  id: 'test-1',
  name: 'Mock Test',
  status: 'passed',
  duration: 1000,
  assertions: [],
  metadata: {
    file: 'mock.test.ts',
    line: 1,
    tags: ['mock'],
    category: 'test',
    priority: 'medium'
  },
  ...overrides
});

global.createMockTestSuite = (overrides = {}) => ({
  name: 'Mock Suite',
  tests: [],
  nested: [],
  metadata: {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    startTime: new Date(),
    endTime: new Date()
  },
  ...overrides
});