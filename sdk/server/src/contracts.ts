// Re-export contracts for local use until build issues are resolved
export enum TestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export const TestEventTypes = {
  START_TEST: 'test/start',
  END_TEST: 'test/end',
  TEST_PASSED: 'test/passed',
  TEST_FAILED: 'test/failed',
  TEST_SKIPPED: 'test/skipped',
  SUITE_START: 'test/suite/start',
  SUITE_END: 'test/suite/end',
  ASSERTION: 'test/assertion',
  SCREENSHOT: 'test/screenshot',
  LOG: 'test/log'
} as const;