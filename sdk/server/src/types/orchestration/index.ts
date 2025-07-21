import { TestStatus } from '@semantest/contracts';
import { BaseEvent } from '@semantest/core';

/**
 * Test execution context
 */
export interface TestExecutionContext {
  testId: string;
  suiteId?: string;
  browser?: string;
  clientId: string;
  startTime: number;
  retries: number;
  maxRetries: number;
  tags: string[];
  metadata: Record<string, unknown>;
}

/**
 * Test result
 */
export interface TestResult {
  testId: string;
  status: TestStatus;
  duration: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  retries: number;
  assertions: {
    passed: number;
    failed: number;
    total: number;
  };
  screenshots: string[];
  logs: Array<{
    level: string;
    message: string;
    timestamp: number;
  }>;
}

/**
 * Suite execution context
 */
export interface SuiteExecutionContext {
  suiteId: string;
  suiteName: string;
  browser?: string;
  clientId: string;
  startTime: number;
  totalTests: number;
  completedTests: number;
  tags: string[];
}

/**
 * Suite result
 */
export interface SuiteResult {
  suiteId: string;
  duration: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  testResults: TestResult[];
}

/**
 * Test run configuration
 */
export interface TestRunConfig {
  runId: string;
  name?: string;
  browsers?: string[];
  tags?: string[];
  parallel?: boolean;
  maxConcurrency?: number;
  timeout?: number;
  retries?: number;
  failFast?: boolean;
}

/**
 * Test run status
 */
export interface TestRunStatus {
  runId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: number;
  endTime?: number;
  totalSuites: number;
  completedSuites: number;
  totalTests: number;
  completedTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks {
  beforeTestRun?: (config: TestRunConfig) => Promise<void> | void;
  afterTestRun?: (config: TestRunConfig, status: TestRunStatus) => Promise<void> | void;
  beforeTest?: (context: TestExecutionContext) => Promise<void> | void;
  afterTest?: (context: TestExecutionContext, result: TestResult) => Promise<void> | void;
  beforeSuite?: (context: SuiteExecutionContext) => Promise<void> | void;
  afterSuite?: (context: SuiteExecutionContext, result: SuiteResult) => Promise<void> | void;
  onEvent?: (event: BaseEvent) => Promise<BaseEvent | null> | BaseEvent | null;
  onError?: (error: Error, context?: unknown) => Promise<void> | void;
}

/**
 * Plugin interface
 */
export interface Plugin {
  name: string;
  version: string;
  hooks: PluginHooks;
  initialize?: () => Promise<void> | void;
  destroy?: () => Promise<void> | void;
}

/**
 * Security policy
 */
export interface SecurityPolicy {
  maxEventsPerSecond: number;
  maxEventSize: number;
  allowedEventTypes?: string[];
  blockedEventTypes?: string[];
  requireAuthentication?: boolean;
  allowedClients?: string[];
}

/**
 * Event validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}