import { Plugin, TestExecutionContext, TestResult, TestRunConfig, TestRunStatus } from '../types/orchestration';
import { BaseEvent } from '@semantest/core';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Console reporter plugin - logs test progress to console
 */
export class ConsoleReporterPlugin implements Plugin {
  name = 'console-reporter';
  version = '1.0.0';

  hooks = {
    beforeTestRun: async (config: TestRunConfig) => {
      console.log(`\n🚀 Starting test run: ${config.runId}`);
      if (config.name) console.log(`   Name: ${config.name}`);
      if (config.browsers?.length) console.log(`   Browsers: ${config.browsers.join(', ')}`);
      if (config.tags?.length) console.log(`   Tags: ${config.tags.join(', ')}`);
    },

    afterTestRun: async (config: TestRunConfig, status: TestRunStatus) => {
      const duration = status.endTime && status.startTime 
        ? ((status.endTime - status.startTime) / 1000).toFixed(2)
        : 'unknown';
      
      console.log(`\n✅ Test run completed: ${config.runId}`);
      console.log(`   Duration: ${duration}s`);
      console.log(`   Total tests: ${status.totalTests}`);
      console.log(`   Passed: ${status.passedTests} ✓`);
      console.log(`   Failed: ${status.failedTests} ✗`);
      console.log(`   Skipped: ${status.skippedTests} -`);
    },

    beforeTest: async (context: TestExecutionContext) => {
      console.log(`\n▶️  Starting test: ${context.testId}`);
      if (context.suiteId) console.log(`   Suite: ${context.suiteId}`);
      if (context.browser) console.log(`   Browser: ${context.browser}`);
    },

    afterTest: async (context: TestExecutionContext, result: TestResult) => {
      const icon = result.status === 'passed' ? '✓' : result.status === 'failed' ? '✗' : '-';
      console.log(`${icon} Test ${result.status}: ${context.testId} (${result.duration}ms)`);
      
      if (result.error) {
        console.error(`   Error: ${result.error.message}`);
      }
    }
  };
}

/**
 * JSON reporter plugin - saves test results to JSON files
 */
export class JSONReporterPlugin implements Plugin {
  name = 'json-reporter';
  version = '1.0.0';
  
  private outputDir: string;
  private runResults: Map<string, any> = new Map();

  constructor(outputDir: string = './test-results') {
    this.outputDir = outputDir;
  }

  hooks = {
    beforeTestRun: async (config: TestRunConfig) => {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });
      
      // Initialize run results
      this.runResults.set(config.runId, {
        config,
        tests: [],
        suites: [],
        startTime: Date.now()
      });
    },

    afterTest: async (context: TestExecutionContext, result: TestResult) => {
      const runId = this.findRunIdForTest(context);
      if (runId) {
        const runResult = this.runResults.get(runId);
        if (runResult) {
          runResult.tests.push({ context, result });
        }
      }
    },

    afterTestRun: async (config: TestRunConfig, status: TestRunStatus) => {
      const runResult = this.runResults.get(config.runId);
      if (!runResult) return;

      runResult.status = status;
      runResult.endTime = Date.now();

      // Save to file
      const filename = `test-run-${config.runId}-${Date.now()}.json`;
      const filepath = path.join(this.outputDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(runResult, null, 2));
      console.log(`Test results saved to: ${filepath}`);

      // Clean up
      this.runResults.delete(config.runId);
    }
  };

  private findRunIdForTest(_context: TestExecutionContext): string | undefined {
    // In a real implementation, this would be tracked properly
    // For now, return the first run ID
    return Array.from(this.runResults.keys())[0];
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
  }
}

/**
 * Screenshot plugin - automatically takes screenshots on test failure
 */
export class ScreenshotPlugin implements Plugin {
  name = 'screenshot-plugin';
  version = '1.0.0';
  
  private screenshotDir: string;

  constructor(screenshotDir: string = './screenshots') {
    this.screenshotDir = screenshotDir;
  }

  hooks = {
    afterTest: async (context: TestExecutionContext, result: TestResult) => {
      if (result.status === 'failed') {
        // In a real implementation, this would trigger a screenshot
        // through the browser automation tool
        console.log(`📸 Screenshot would be taken for failed test: ${context.testId}`);
        
        // Simulate saving screenshot path
        const screenshotPath = path.join(
          this.screenshotDir,
          `${context.testId}-${Date.now()}.png`
        );
        
        // In reality, we would save the actual screenshot here
        // For now, just log it
        console.log(`   Screenshot path: ${screenshotPath}`);
      }
    }
  };

  async initialize(): Promise<void> {
    await fs.mkdir(this.screenshotDir, { recursive: true });
  }
}

/**
 * Retry plugin - automatically retries failed tests
 */
export class RetryPlugin implements Plugin {
  name = 'retry-plugin';
  version = '1.0.0';
  
  private maxRetries: number;
  private retryDelay: number;

  constructor(maxRetries: number = 3, retryDelay: number = 1000) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  hooks = {
    afterTest: async (context: TestExecutionContext, result: TestResult) => {
      if (result.status === 'failed' && result.retries < this.maxRetries) {
        console.log(`🔄 Scheduling retry ${result.retries + 1}/${this.maxRetries} for test: ${context.testId}`);
        
        // In a real implementation, this would trigger a test retry
        // through the orchestrator after the specified delay
        setTimeout(() => {
          console.log(`   Retrying test: ${context.testId}`);
        }, this.retryDelay);
      }
    }
  };
}

/**
 * Performance monitoring plugin - tracks test execution performance
 */
export class PerformancePlugin implements Plugin {
  name = 'performance-plugin';
  version = '1.0.0';
  
  private thresholds = {
    slow: 5000,      // 5 seconds
    verySlow: 10000  // 10 seconds
  };

  hooks = {
    afterTest: async (context: TestExecutionContext, result: TestResult) => {
      if (result.duration > this.thresholds.verySlow) {
        console.warn(`🐌 Very slow test detected: ${context.testId} (${result.duration}ms)`);
      } else if (result.duration > this.thresholds.slow) {
        console.warn(`🐢 Slow test detected: ${context.testId} (${result.duration}ms)`);
      }
    },

    afterTestRun: async (_config: TestRunConfig, status: TestRunStatus) => {
      if (status.endTime && status.startTime) {
        const duration = status.endTime - status.startTime;
        const avgTestTime = status.completedTests > 0 
          ? (duration / status.completedTests).toFixed(2)
          : 'N/A';
        
        console.log(`\n📊 Performance Summary:`);
        console.log(`   Total duration: ${(duration / 1000).toFixed(2)}s`);
        console.log(`   Average test time: ${avgTestTime}ms`);
      }
    }
  };
}

/**
 * Event filter plugin - filters out sensitive information from events
 */
export class EventFilterPlugin implements Plugin {
  name = 'event-filter';
  version = '1.0.0';
  
  private sensitiveFields = ['password', 'token', 'secret', 'apiKey'];

  hooks = {
    onEvent: (event: BaseEvent): BaseEvent => {
      // Deep clone the event
      const filteredEvent = JSON.parse(JSON.stringify(event));
      
      // Filter sensitive fields from payload
      this.filterObject(filteredEvent.payload);
      
      // Filter sensitive fields from metadata
      if (filteredEvent.metadata) {
        this.filterObject(filteredEvent.metadata);
      }
      
      return filteredEvent;
    }
  };

  private filterObject(obj: any): void {
    if (!obj || typeof obj !== 'object') return;

    for (const key in obj) {
      if (this.sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        obj[key] = '[FILTERED]';
      } else if (typeof obj[key] === 'object') {
        this.filterObject(obj[key]);
      }
    }
  }
}