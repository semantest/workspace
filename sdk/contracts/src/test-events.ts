import { EVENT_TYPE_PREFIX } from '@semantest/core';

/**
 * Test event types
 */
export const TestEventTypes = {
  START_TEST: `${EVENT_TYPE_PREFIX.TEST}/start`,
  END_TEST: `${EVENT_TYPE_PREFIX.TEST}/end`,
  TEST_PASSED: `${EVENT_TYPE_PREFIX.TEST}/passed`,
  TEST_FAILED: `${EVENT_TYPE_PREFIX.TEST}/failed`,
  TEST_SKIPPED: `${EVENT_TYPE_PREFIX.TEST}/skipped`,
  SUITE_START: `${EVENT_TYPE_PREFIX.TEST}/suite/start`,
  SUITE_END: `${EVENT_TYPE_PREFIX.TEST}/suite/end`,
  ASSERTION: `${EVENT_TYPE_PREFIX.TEST}/assertion`,
  SCREENSHOT: `${EVENT_TYPE_PREFIX.TEST}/screenshot`,
  LOG: `${EVENT_TYPE_PREFIX.TEST}/log`
} as const;

/**
 * Test status
 */
export enum TestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

/**
 * Test start event payload
 */
export interface TestStartPayload {
  testId: string;
  testName: string;
  suiteId?: string;
  suiteName?: string;
  browser?: string;
  tags?: string[];
  retries?: number;
}

/**
 * Test end event payload
 */
export interface TestEndPayload {
  testId: string;
  status: TestStatus;
  duration: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  retries?: number;
}

/**
 * Test assertion payload
 */
export interface TestAssertionPayload {
  testId: string;
  type: 'pass' | 'fail';
  message: string;
  expected?: unknown;
  actual?: unknown;
  operator?: string;
  location?: {
    file: string;
    line: number;
    column?: number;
  };
}

/**
 * Test screenshot payload
 */
export interface TestScreenshotPayload {
  testId: string;
  name: string;
  path: string;
  fullPage?: boolean;
  timestamp: number;
}

/**
 * Test log payload
 */
export interface TestLogPayload {
  testId: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
  timestamp: number;
}

/**
 * Suite start payload
 */
export interface SuiteStartPayload {
  suiteId: string;
  suiteName: string;
  totalTests: number;
  browser?: string;
  tags?: string[];
}

/**
 * Suite end payload
 */
export interface SuiteEndPayload {
  suiteId: string;
  duration: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
}