import { EventEmitter } from 'events';
import { BaseEvent } from '@semantest/core';
import { TestEventTypes, TestStatus, TestStartPayload, TestEndPayload, SuiteStartPayload, SuiteEndPayload } from '@semantest/contracts';
import {
  TestExecutionContext,
  TestResult,
  SuiteExecutionContext,
  SuiteResult,
  TestRunConfig,
  TestRunStatus,
  Plugin
} from '../types/orchestration';
import { TestStateManager } from './test-state-manager';
import { EventPersistence } from '../persistence/event-persistence';
import { PluginManager } from '../plugins/plugin-manager';
import { SecurityMiddleware } from '../security/security-middleware';

/**
 * Test orchestrator - coordinates distributed test execution
 */
export class TestOrchestrator extends EventEmitter {
  private stateManager: TestStateManager;
  private persistence: EventPersistence;
  private pluginManager: PluginManager;
  private security: SecurityMiddleware;
  private activeRuns: Map<string, TestRunStatus> = new Map();

  constructor(options: {
    persistence: EventPersistence;
    security: SecurityMiddleware;
  }) {
    super();
    
    this.persistence = options.persistence;
    this.security = options.security;
    this.stateManager = new TestStateManager();
    this.pluginManager = new PluginManager();
  }

  /**
   * Start a new test run
   */
  async startTestRun(config: TestRunConfig): Promise<TestRunStatus> {
    const status: TestRunStatus = {
      runId: config.runId,
      status: 'pending',
      totalSuites: 0,
      completedSuites: 0,
      totalTests: 0,
      completedTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0
    };

    this.activeRuns.set(config.runId, status);

    // Execute plugin hooks
    await this.pluginManager.executeHook('beforeTestRun', config);

    // Persist run start
    await this.persistence.saveTestRun(config, status);

    status.status = 'running';
    status.startTime = Date.now();

    this.emit('testRun:started', { config, status });

    return status;
  }

  /**
   * End a test run
   */
  async endTestRun(runId: string): Promise<TestRunStatus> {
    const status = this.activeRuns.get(runId);
    if (!status) {
      throw new Error(`Test run ${runId} not found`);
    }

    status.status = 'completed';
    status.endTime = Date.now();

    // Get final config
    const config = await this.persistence.getTestRunConfig(runId);
    if (config) {
      await this.pluginManager.executeHook('afterTestRun', config, status);
    }

    // Persist final status
    await this.persistence.updateTestRunStatus(runId, status);

    this.activeRuns.delete(runId);
    this.emit('testRun:ended', { runId, status });

    return status;
  }

  /**
   * Handle test start event
   */
  async handleTestStart(event: BaseEvent<TestStartPayload>): Promise<void> {
    const { payload, metadata } = event;
    
    // Validate event
    const validation = await this.security.validateEvent(event);
    if (!validation.valid) {
      throw new Error(`Invalid test start event: ${validation.errors?.map(e => e.message).join(', ')}`);
    }

    const context: TestExecutionContext = {
      testId: payload.testId,
      suiteId: payload.suiteId,
      browser: payload.browser,
      clientId: metadata?.source || 'unknown',
      startTime: event.timestamp,
      retries: payload.retries || 0,
      maxRetries: 3, // TODO: Make configurable
      tags: payload.tags || [],
      metadata: metadata?.custom || {}
    };

    // Update state
    this.stateManager.startTest(context);

    // Execute plugin hooks
    await this.pluginManager.executeHook('beforeTest', context);

    // Persist event
    await this.persistence.saveEvent(event);

    this.emit('test:started', { event, context });
  }

  /**
   * Handle test end event
   */
  async handleTestEnd(event: BaseEvent<TestEndPayload>): Promise<void> {
    const { payload } = event;
    
    // Validate event
    const validation = await this.security.validateEvent(event);
    if (!validation.valid) {
      throw new Error(`Invalid test end event: ${validation.errors?.map(e => e.message).join(', ')}`);
    }

    const context = this.stateManager.getTestContext(payload.testId);
    if (!context) {
      throw new Error(`Test context not found for ${payload.testId}`);
    }

    const result: TestResult = {
      testId: payload.testId,
      status: payload.status,
      duration: payload.duration,
      error: payload.error,
      retries: payload.retries || 0,
      assertions: this.stateManager.getTestAssertions(payload.testId),
      screenshots: this.stateManager.getTestScreenshots(payload.testId),
      logs: this.stateManager.getTestLogs(payload.testId)
    };

    // Update state
    this.stateManager.endTest(payload.testId, result);

    // Execute plugin hooks
    await this.pluginManager.executeHook('afterTest', context, result);

    // Persist event and result
    await this.persistence.saveEvent(event);
    await this.persistence.saveTestResult(result);

    // Check if retry is needed
    if (result.status === TestStatus.FAILED && result.retries < context.maxRetries) {
      this.emit('test:retry', { context, result });
    } else {
      this.emit('test:ended', { event, context, result });
    }
  }

  /**
   * Handle suite start event
   */
  async handleSuiteStart(event: BaseEvent<SuiteStartPayload>): Promise<void> {
    const { payload, metadata } = event;
    
    // Validate event
    const validation = await this.security.validateEvent(event);
    if (!validation.valid) {
      throw new Error(`Invalid suite start event: ${validation.errors?.map(e => e.message).join(', ')}`);
    }

    const context: SuiteExecutionContext = {
      suiteId: payload.suiteId,
      suiteName: payload.suiteName,
      browser: payload.browser,
      clientId: metadata?.source || 'unknown',
      startTime: event.timestamp,
      totalTests: payload.totalTests,
      completedTests: 0,
      tags: payload.tags || []
    };

    // Update state
    this.stateManager.startSuite(context);

    // Execute plugin hooks
    await this.pluginManager.executeHook('beforeSuite', context);

    // Persist event
    await this.persistence.saveEvent(event);

    this.emit('suite:started', { event, context });
  }

  /**
   * Handle suite end event
   */
  async handleSuiteEnd(event: BaseEvent<SuiteEndPayload>): Promise<void> {
    const { payload } = event;
    
    // Validate event
    const validation = await this.security.validateEvent(event);
    if (!validation.valid) {
      throw new Error(`Invalid suite end event: ${validation.errors?.map(e => e.message).join(', ')}`);
    }

    const context = this.stateManager.getSuiteContext(payload.suiteId);
    if (!context) {
      throw new Error(`Suite context not found for ${payload.suiteId}`);
    }

    const testResults = this.stateManager.getSuiteTestResults(payload.suiteId);
    
    const result: SuiteResult = {
      suiteId: payload.suiteId,
      duration: payload.duration,
      totalTests: payload.totalTests,
      passedTests: payload.passedTests,
      failedTests: payload.failedTests,
      skippedTests: payload.skippedTests,
      testResults
    };

    // Update state
    this.stateManager.endSuite(payload.suiteId, result);

    // Execute plugin hooks
    await this.pluginManager.executeHook('afterSuite', context, result);

    // Persist event and result
    await this.persistence.saveEvent(event);
    await this.persistence.saveSuiteResult(result);

    this.emit('suite:ended', { event, context, result });
  }

  /**
   * Register a plugin
   */
  async registerPlugin(plugin: Plugin): Promise<void> {
    await this.pluginManager.register(plugin);
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(name: string): Promise<void> {
    await this.pluginManager.unregister(name);
  }

  /**
   * Get active test runs
   */
  getActiveRuns(): TestRunStatus[] {
    return Array.from(this.activeRuns.values());
  }

  /**
   * Get test run status
   */
  getRunStatus(runId: string): TestRunStatus | undefined {
    return this.activeRuns.get(runId);
  }

  /**
   * Cancel a test run
   */
  async cancelTestRun(runId: string, reason?: string): Promise<void> {
    const status = this.activeRuns.get(runId);
    if (!status) {
      throw new Error(`Test run ${runId} not found`);
    }

    status.status = 'cancelled';
    status.endTime = Date.now();

    await this.persistence.updateTestRunStatus(runId, status);
    this.activeRuns.delete(runId);

    this.emit('testRun:cancelled', { runId, reason });
  }

  /**
   * Replay events from a specific time range
   */
  async replayEvents(startTime: number, endTime: number): Promise<void> {
    const events = await this.persistence.getEventsByTimeRange(startTime, endTime);
    
    for (const event of events) {
      // Re-emit events for replay
      this.emit('event:replay', event);
      
      // Process based on event type
      switch (event.type) {
        case TestEventTypes.START_TEST:
          await this.handleTestStart(event as BaseEvent<TestStartPayload>);
          break;
        case TestEventTypes.END_TEST:
          await this.handleTestEnd(event as BaseEvent<TestEndPayload>);
          break;
        case TestEventTypes.SUITE_START:
          await this.handleSuiteStart(event as BaseEvent<SuiteStartPayload>);
          break;
        case TestEventTypes.SUITE_END:
          await this.handleSuiteEnd(event as BaseEvent<SuiteEndPayload>);
          break;
      }
    }
  }

  /**
   * Shutdown orchestrator
   */
  async shutdown(): Promise<void> {
    // Cancel all active runs
    for (const runId of this.activeRuns.keys()) {
      await this.cancelTestRun(runId, 'Orchestrator shutdown');
    }

    // Shutdown plugin manager
    await this.pluginManager.shutdown();

    // Clear state
    this.stateManager.clear();
    
    this.emit('shutdown');
  }
}