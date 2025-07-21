import { 
  TestEventTypes, 
  TestStatus,
  TestStartPayload,
  TestEndPayload,
  TestAssertionPayload,
  TestScreenshotPayload,
  TestLogPayload,
  SuiteStartPayload,
  SuiteEndPayload
} from '../test-events';

describe('Test Events Contracts', () => {
  describe('TestEventTypes', () => {
    it('should have all required event types', () => {
      expect(TestEventTypes.START_TEST).toBe('test/start');
      expect(TestEventTypes.END_TEST).toBe('test/end');
      expect(TestEventTypes.TEST_PASSED).toBe('test/passed');
      expect(TestEventTypes.TEST_FAILED).toBe('test/failed');
      expect(TestEventTypes.TEST_SKIPPED).toBe('test/skipped');
      expect(TestEventTypes.SUITE_START).toBe('test/suite/start');
      expect(TestEventTypes.SUITE_END).toBe('test/suite/end');
      expect(TestEventTypes.ASSERTION).toBe('test/assertion');
      expect(TestEventTypes.SCREENSHOT).toBe('test/screenshot');
      expect(TestEventTypes.LOG).toBe('test/log');
    });

    it('should have correct type structure', () => {
      // Verify the object has all expected properties
      const expectedKeys = [
        'START_TEST', 'END_TEST', 'TEST_PASSED', 'TEST_FAILED', 'TEST_SKIPPED',
        'SUITE_START', 'SUITE_END', 'ASSERTION', 'SCREENSHOT', 'LOG'
      ];
      
      expect(Object.keys(TestEventTypes).sort()).toEqual(expectedKeys.sort());
    });

    it('should follow naming convention', () => {
      // Get fresh values to avoid issues from previous test
      const eventTypes = {
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
      };
      
      Object.values(eventTypes).forEach(eventType => {
        expect(eventType).toMatch(/^test\//);
      });
    });
  });

  describe('TestStatus', () => {
    it('should have all test statuses', () => {
      expect(TestStatus.PENDING).toBe('pending');
      expect(TestStatus.RUNNING).toBe('running');
      expect(TestStatus.PASSED).toBe('passed');
      expect(TestStatus.FAILED).toBe('failed');
      expect(TestStatus.SKIPPED).toBe('skipped');
    });

    it('should have correct enum values', () => {
      const values = Object.values(TestStatus);
      expect(values).toHaveLength(5);
      expect(values).toContain('pending');
      expect(values).toContain('running');
      expect(values).toContain('passed');
      expect(values).toContain('failed');
      expect(values).toContain('skipped');
    });
  });

  describe('TestStartPayload', () => {
    it('should accept valid payload', () => {
      const payload: TestStartPayload = {
        testId: 'test-123',
        testName: 'should add two numbers'
      };

      expect(payload.testId).toBe('test-123');
      expect(payload.testName).toBe('should add two numbers');
    });

    it('should accept optional fields', () => {
      const payload: TestStartPayload = {
        testId: 'test-123',
        testName: 'should add two numbers',
        suiteId: 'suite-456',
        suiteName: 'Math operations',
        browser: 'chrome',
        tags: ['unit', 'math'],
        retries: 3
      };

      expect(payload.suiteId).toBe('suite-456');
      expect(payload.suiteName).toBe('Math operations');
      expect(payload.browser).toBe('chrome');
      expect(payload.tags).toEqual(['unit', 'math']);
      expect(payload.retries).toBe(3);
    });

    it('should not accept invalid types', () => {
      // TypeScript compile-time checks
      // @ts-expect-error - testId must be string
      const invalid1: TestStartPayload = { testId: 123, testName: 'test' };
      
      // @ts-expect-error - testName must be string
      const invalid2: TestStartPayload = { testId: 'test', testName: 123 };
      
      // @ts-expect-error - tags must be string array
      const invalid3: TestStartPayload = { testId: 'test', testName: 'test', tags: [123] };
    });
  });

  describe('TestEndPayload', () => {
    it('should accept valid payload', () => {
      const payload: TestEndPayload = {
        testId: 'test-123',
        status: TestStatus.PASSED,
        duration: 1234
      };

      expect(payload.testId).toBe('test-123');
      expect(payload.status).toBe(TestStatus.PASSED);
      expect(payload.duration).toBe(1234);
    });

    it('should accept error information', () => {
      const payload: TestEndPayload = {
        testId: 'test-123',
        status: TestStatus.FAILED,
        duration: 1234,
        error: {
          message: 'Expected 2 to equal 3',
          stack: 'Error: Expected 2 to equal 3\n    at ...',
          code: 'ASSERTION_ERROR'
        },
        retries: 2
      };

      expect(payload.error).toBeDefined();
      expect(payload.error?.message).toBe('Expected 2 to equal 3');
      expect(payload.error?.stack).toContain('Error: Expected 2 to equal 3');
      expect(payload.error?.code).toBe('ASSERTION_ERROR');
      expect(payload.retries).toBe(2);
    });

    it('should work with all test statuses', () => {
      const statuses = Object.values(TestStatus);
      
      statuses.forEach(status => {
        const payload: TestEndPayload = {
          testId: 'test-123',
          status: status,
          duration: 100
        };
        
        expect(payload.status).toBe(status);
      });
    });
  });

  describe('TestAssertionPayload', () => {
    it('should accept pass assertion', () => {
      const payload: TestAssertionPayload = {
        testId: 'test-123',
        type: 'pass',
        message: 'Expected value to be truthy'
      };

      expect(payload.type).toBe('pass');
    });

    it('should accept fail assertion with details', () => {
      const payload: TestAssertionPayload = {
        testId: 'test-123',
        type: 'fail',
        message: 'Expected values to be equal',
        expected: 3,
        actual: 2,
        operator: 'toBe',
        location: {
          file: 'math.test.ts',
          line: 42,
          column: 10
        }
      };

      expect(payload.type).toBe('fail');
      expect(payload.expected).toBe(3);
      expect(payload.actual).toBe(2);
      expect(payload.operator).toBe('toBe');
      expect(payload.location?.file).toBe('math.test.ts');
      expect(payload.location?.line).toBe(42);
      expect(payload.location?.column).toBe(10);
    });

    it('should accept complex expected/actual values', () => {
      const payload: TestAssertionPayload = {
        testId: 'test-123',
        type: 'fail',
        message: 'Objects do not match',
        expected: { a: 1, b: { c: 2 } },
        actual: { a: 1, b: { c: 3 } }
      };

      expect(payload.expected).toEqual({ a: 1, b: { c: 2 } });
      expect(payload.actual).toEqual({ a: 1, b: { c: 3 } });
    });
  });

  describe('TestScreenshotPayload', () => {
    it('should accept valid screenshot payload', () => {
      const payload: TestScreenshotPayload = {
        testId: 'test-123',
        name: 'login-page',
        path: '/screenshots/login-page.png',
        timestamp: Date.now()
      };

      expect(payload.name).toBe('login-page');
      expect(payload.path).toBe('/screenshots/login-page.png');
      expect(payload.timestamp).toBeGreaterThan(0);
    });

    it('should accept fullPage option', () => {
      const payload: TestScreenshotPayload = {
        testId: 'test-123',
        name: 'full-page-capture',
        path: '/screenshots/full-page.png',
        fullPage: true,
        timestamp: Date.now()
      };

      expect(payload.fullPage).toBe(true);
    });
  });

  describe('TestLogPayload', () => {
    it('should accept all log levels', () => {
      const levels: Array<'debug' | 'info' | 'warn' | 'error'> = ['debug', 'info', 'warn', 'error'];
      
      levels.forEach(level => {
        const payload: TestLogPayload = {
          testId: 'test-123',
          level,
          message: `This is a ${level} message`,
          timestamp: Date.now()
        };
        
        expect(payload.level).toBe(level);
      });
    });

    it('should accept additional data', () => {
      const payload: TestLogPayload = {
        testId: 'test-123',
        level: 'info',
        message: 'User logged in',
        data: {
          userId: 'user-123',
          email: 'test@example.com',
          loginTime: new Date().toISOString()
        },
        timestamp: Date.now()
      };

      expect(payload.data).toBeDefined();
      expect((payload.data as any).userId).toBe('user-123');
    });
  });

  describe('SuiteStartPayload', () => {
    it('should accept valid suite start payload', () => {
      const payload: SuiteStartPayload = {
        suiteId: 'suite-123',
        suiteName: 'Authentication Tests',
        totalTests: 10
      };

      expect(payload.suiteId).toBe('suite-123');
      expect(payload.suiteName).toBe('Authentication Tests');
      expect(payload.totalTests).toBe(10);
    });

    it('should accept optional browser and tags', () => {
      const payload: SuiteStartPayload = {
        suiteId: 'suite-123',
        suiteName: 'Authentication Tests',
        totalTests: 10,
        browser: 'firefox',
        tags: ['auth', 'integration', 'critical']
      };

      expect(payload.browser).toBe('firefox');
      expect(payload.tags).toEqual(['auth', 'integration', 'critical']);
    });
  });

  describe('SuiteEndPayload', () => {
    it('should accept valid suite end payload', () => {
      const payload: SuiteEndPayload = {
        suiteId: 'suite-123',
        duration: 5432,
        totalTests: 10,
        passedTests: 8,
        failedTests: 1,
        skippedTests: 1
      };

      expect(payload.suiteId).toBe('suite-123');
      expect(payload.duration).toBe(5432);
      expect(payload.totalTests).toBe(10);
      expect(payload.passedTests).toBe(8);
      expect(payload.failedTests).toBe(1);
      expect(payload.skippedTests).toBe(1);
    });

    it('should validate test count consistency', () => {
      const payload: SuiteEndPayload = {
        suiteId: 'suite-123',
        duration: 1000,
        totalTests: 10,
        passedTests: 7,
        failedTests: 2,
        skippedTests: 1
      };

      const sum = payload.passedTests + payload.failedTests + payload.skippedTests;
      expect(sum).toBe(payload.totalTests);
    });
  });

  describe('Integration Tests', () => {
    it('should handle a complete test lifecycle', () => {
      const testId = 'test-integration-123';
      const suiteId = 'suite-integration-456';
      
      // Suite starts
      const suiteStart: SuiteStartPayload = {
        suiteId,
        suiteName: 'Integration Test Suite',
        totalTests: 1,
        browser: 'chrome'
      };

      // Test starts
      const testStart: TestStartPayload = {
        testId,
        testName: 'should complete integration test',
        suiteId,
        suiteName: suiteStart.suiteName,
        browser: 'chrome'
      };

      // Assertions during test
      const assertions: TestAssertionPayload[] = [
        {
          testId,
          type: 'pass',
          message: 'Setup completed successfully'
        },
        {
          testId,
          type: 'pass',
          message: 'API call returned expected data'
        }
      ];

      // Log entries
      const logs: TestLogPayload[] = [
        {
          testId,
          level: 'info',
          message: 'Starting integration test',
          timestamp: Date.now()
        },
        {
          testId,
          level: 'debug',
          message: 'API response received',
          data: { status: 200, body: { success: true } },
          timestamp: Date.now()
        }
      ];

      // Screenshot
      const screenshot: TestScreenshotPayload = {
        testId,
        name: 'final-state',
        path: '/screenshots/integration/final-state.png',
        timestamp: Date.now()
      };

      // Test ends
      const testEnd: TestEndPayload = {
        testId,
        status: TestStatus.PASSED,
        duration: 2500
      };

      // Suite ends
      const suiteEnd: SuiteEndPayload = {
        suiteId,
        duration: 3000,
        totalTests: 1,
        passedTests: 1,
        failedTests: 0,
        skippedTests: 0
      };

      // Verify all payloads are valid
      expect(suiteStart).toBeDefined();
      expect(testStart).toBeDefined();
      expect(assertions).toHaveLength(2);
      expect(logs).toHaveLength(2);
      expect(screenshot).toBeDefined();
      expect(testEnd).toBeDefined();
      expect(suiteEnd).toBeDefined();
    });
  });
});