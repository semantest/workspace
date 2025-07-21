import { TestStatus } from '@semantest/contracts';
import {
  TestExecutionContext,
  TestResult,
  SuiteExecutionContext,
  SuiteResult
} from '../types/orchestration';

/**
 * Manages test and suite state during execution
 */
export class TestStateManager {
  private testContexts: Map<string, TestExecutionContext> = new Map();
  private testResults: Map<string, TestResult> = new Map();
  private suiteContexts: Map<string, SuiteExecutionContext> = new Map();
  private suiteResults: Map<string, SuiteResult> = new Map();
  
  // Track test data
  private testAssertions: Map<string, { passed: number; failed: number; total: number }> = new Map();
  private testScreenshots: Map<string, string[]> = new Map();
  private testLogs: Map<string, Array<{ level: string; message: string; timestamp: number }>> = new Map();
  
  // Track suite to test relationships
  private suiteTests: Map<string, Set<string>> = new Map();

  /**
   * Start a test
   */
  startTest(context: TestExecutionContext): void {
    this.testContexts.set(context.testId, context);
    
    // Initialize test data
    this.testAssertions.set(context.testId, { passed: 0, failed: 0, total: 0 });
    this.testScreenshots.set(context.testId, []);
    this.testLogs.set(context.testId, []);
    
    // Track suite relationship
    if (context.suiteId) {
      if (!this.suiteTests.has(context.suiteId)) {
        this.suiteTests.set(context.suiteId, new Set());
      }
      this.suiteTests.get(context.suiteId)!.add(context.testId);
    }
  }

  /**
   * End a test
   */
  endTest(testId: string, result: TestResult): void {
    this.testResults.set(testId, result);
    
    // Update suite progress if applicable
    const context = this.testContexts.get(testId);
    if (context?.suiteId) {
      const suiteContext = this.suiteContexts.get(context.suiteId);
      if (suiteContext) {
        suiteContext.completedTests++;
      }
    }
  }

  /**
   * Start a suite
   */
  startSuite(context: SuiteExecutionContext): void {
    this.suiteContexts.set(context.suiteId, context);
    this.suiteTests.set(context.suiteId, new Set());
  }

  /**
   * End a suite
   */
  endSuite(suiteId: string, result: SuiteResult): void {
    this.suiteResults.set(suiteId, result);
  }

  /**
   * Add test assertion
   */
  addTestAssertion(testId: string, passed: boolean): void {
    const assertions = this.testAssertions.get(testId);
    if (assertions) {
      assertions.total++;
      if (passed) {
        assertions.passed++;
      } else {
        assertions.failed++;
      }
    }
  }

  /**
   * Add test screenshot
   */
  addTestScreenshot(testId: string, screenshotPath: string): void {
    const screenshots = this.testScreenshots.get(testId);
    if (screenshots) {
      screenshots.push(screenshotPath);
    }
  }

  /**
   * Add test log
   */
  addTestLog(testId: string, level: string, message: string, timestamp: number): void {
    const logs = this.testLogs.get(testId);
    if (logs) {
      logs.push({ level, message, timestamp });
    }
  }

  /**
   * Get test context
   */
  getTestContext(testId: string): TestExecutionContext | undefined {
    return this.testContexts.get(testId);
  }

  /**
   * Get test result
   */
  getTestResult(testId: string): TestResult | undefined {
    return this.testResults.get(testId);
  }

  /**
   * Get suite context
   */
  getSuiteContext(suiteId: string): SuiteExecutionContext | undefined {
    return this.suiteContexts.get(suiteId);
  }

  /**
   * Get suite result
   */
  getSuiteResult(suiteId: string): SuiteResult | undefined {
    return this.suiteResults.get(suiteId);
  }

  /**
   * Get test assertions
   */
  getTestAssertions(testId: string): { passed: number; failed: number; total: number } {
    return this.testAssertions.get(testId) || { passed: 0, failed: 0, total: 0 };
  }

  /**
   * Get test screenshots
   */
  getTestScreenshots(testId: string): string[] {
    return this.testScreenshots.get(testId) || [];
  }

  /**
   * Get test logs
   */
  getTestLogs(testId: string): Array<{ level: string; message: string; timestamp: number }> {
    return this.testLogs.get(testId) || [];
  }

  /**
   * Get suite test results
   */
  getSuiteTestResults(suiteId: string): TestResult[] {
    const testIds = this.suiteTests.get(suiteId);
    if (!testIds) return [];
    
    const results: TestResult[] = [];
    for (const testId of testIds) {
      const result = this.testResults.get(testId);
      if (result) {
        results.push(result);
      }
    }
    return results;
  }

  /**
   * Get active tests
   */
  getActiveTests(): TestExecutionContext[] {
    const active: TestExecutionContext[] = [];
    for (const [testId, context] of this.testContexts) {
      if (!this.testResults.has(testId)) {
        active.push(context);
      }
    }
    return active;
  }

  /**
   * Get active suites
   */
  getActiveSuites(): SuiteExecutionContext[] {
    const active: SuiteExecutionContext[] = [];
    for (const [suiteId, context] of this.suiteContexts) {
      if (!this.suiteResults.has(suiteId)) {
        active.push(context);
      }
    }
    return active;
  }

  /**
   * Check if test is active
   */
  isTestActive(testId: string): boolean {
    return this.testContexts.has(testId) && !this.testResults.has(testId);
  }

  /**
   * Check if suite is active
   */
  isSuiteActive(suiteId: string): boolean {
    return this.suiteContexts.has(suiteId) && !this.suiteResults.has(suiteId);
  }

  /**
   * Get test statistics
   */
  getTestStats(): {
    total: number;
    active: number;
    completed: number;
    passed: number;
    failed: number;
    skipped: number;
  } {
    const total = this.testContexts.size;
    const completed = this.testResults.size;
    const active = total - completed;
    
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const result of this.testResults.values()) {
      switch (result.status) {
        case TestStatus.PASSED:
          passed++;
          break;
        case TestStatus.FAILED:
          failed++;
          break;
        case TestStatus.SKIPPED:
          skipped++;
          break;
      }
    }
    
    return { total, active, completed, passed, failed, skipped };
  }

  /**
   * Clear all state
   */
  clear(): void {
    this.testContexts.clear();
    this.testResults.clear();
    this.suiteContexts.clear();
    this.suiteResults.clear();
    this.testAssertions.clear();
    this.testScreenshots.clear();
    this.testLogs.clear();
    this.suiteTests.clear();
  }

  /**
   * Clear test state
   */
  clearTest(testId: string): void {
    this.testContexts.delete(testId);
    this.testResults.delete(testId);
    this.testAssertions.delete(testId);
    this.testScreenshots.delete(testId);
    this.testLogs.delete(testId);
    
    // Remove from suite tracking
    for (const testIds of this.suiteTests.values()) {
      testIds.delete(testId);
    }
  }

  /**
   * Clear suite state
   */
  clearSuite(suiteId: string): void {
    // Clear all tests in suite
    const testIds = this.suiteTests.get(suiteId);
    if (testIds) {
      for (const testId of testIds) {
        this.clearTest(testId);
      }
    }
    
    this.suiteContexts.delete(suiteId);
    this.suiteResults.delete(suiteId);
    this.suiteTests.delete(suiteId);
  }
}