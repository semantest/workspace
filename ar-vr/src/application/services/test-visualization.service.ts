/*
                        Semantest - Test Visualization Service
                        Application service for integrating test results with AR/VR visualization

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Injectable } from '@semantest/core';
import { VisualizationSession } from '../../domain/entities/visualization-session.entity';
import { TestResult3D, TestSuite3D, TestVisualizationConfig, Vector3D } from '../../domain/value-objects';
import { IWebXRAdapter, I3DVisualizationEngine } from '../../infrastructure/adapters/interfaces';

export interface TestFrameworkResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  duration: number;
  error?: { message: string; stack?: string };
  assertions: Array<{
    description: string;
    passed: boolean;
    expected?: any;
    actual?: any;
  }>;
  metadata: {
    file: string;
    line?: number;
    tags: string[];
    category: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface TestFrameworkSuite {
  name: string;
  tests: TestFrameworkResult[];
  nested: TestFrameworkSuite[];
  metadata: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    startTime: Date;
    endTime?: Date;
  };
}

@Injectable()
export class TestVisualizationService {
  private currentSession: VisualizationSession | null = null;

  constructor(
    private webXRAdapter: IWebXRAdapter,
    private visualizationEngine: I3DVisualizationEngine
  ) {}

  async startVisualizationSession(
    mode: 'vr' | 'ar' | 'mixed',
    config?: Partial<TestVisualizationConfig>
  ): Promise<string> {
    // Check WebXR support
    const isSupported = await this.webXRAdapter.isSupported();
    if (!isSupported) {
      throw new Error('WebXR is not supported on this device/browser');
    }

    // Initialize WebXR session
    const xrSession = await this.webXRAdapter.initializeSession(mode);
    const deviceCapabilities = await this.webXRAdapter.getDeviceCapabilities();

    // Create visualization session
    const sessionId = `vis-session-${Date.now()}`;
    const visualizationConfig = config ? 
      { ...TestVisualizationConfig.createDefault(), ...config } :
      TestVisualizationConfig.createDefault();

    this.currentSession = new VisualizationSession(
      sessionId,
      mode,
      deviceCapabilities,
      visualizationConfig
    );

    // Initialize 3D engine
    await this.visualizationEngine.initialize(visualizationConfig);
    await this.visualizationEngine.createScene();

    // Start session
    const correlationId = `start-${sessionId}`;
    this.currentSession.startSession(correlationId);

    // Set up XR render loop
    await this.webXRAdapter.startRenderLoop((frame) => {
      this.visualizationEngine.render();
      this.currentSession?.recordPerformanceMetrics(frame.frameRate, 0);
    });

    return sessionId;
  }

  async endVisualizationSession(reason: 'user_requested' | 'error' | 'device_disconnected' = 'user_requested'): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active visualization session to end');
    }

    const correlationId = `end-${this.currentSession.getId()}`;
    this.currentSession.endSession(correlationId, reason);

    // Clean up resources
    await this.webXRAdapter.endSession();
    this.visualizationEngine.stopRenderLoop();
    this.visualizationEngine.clearScene();

    this.currentSession = null;
  }

  async visualizeTestResults(
    testResults: TestFrameworkResult[],
    testSuites: TestFrameworkSuite[],
    visualizationType: '3d_scatter' | 'hierarchical_tree' | 'timeline' | 'network_graph' = '3d_scatter'
  ): Promise<string> {
    if (!this.currentSession) {
      throw new Error('No active visualization session');
    }

    // Convert test framework results to 3D objects
    const testResults3D = this.convertTestResults(testResults);
    const testSuites3D = this.convertTestSuites(testSuites);

    // Request visualization
    const correlationId = `viz-${Date.now()}`;
    this.currentSession.requestTestVisualization(
      correlationId,
      testResults3D,
      testSuites3D,
      visualizationType
    );

    // Create 3D visualization
    const visualizationId = await this.create3DVisualization(
      testResults3D,
      testSuites3D,
      visualizationType
    );

    // Confirm creation
    this.currentSession.confirmVisualizationCreated(
      correlationId,
      visualizationId,
      testResults3D,
      testSuites3D,
      testResults3D.length + testSuites3D.length,
      Date.now()
    );

    return visualizationId;
  }

  private convertTestResults(testResults: TestFrameworkResult[]): TestResult3D[] {
    return testResults.map((result, index) => {
      // Calculate position based on test relationship and status
      const position = this.calculateTestPosition(result, index, testResults.length);
      
      // Convert assertions
      const assertions = result.assertions.map(assertion => ({
        assertion: assertion.description,
        expected: assertion.expected,
        actual: assertion.actual,
        passed: assertion.passed,
        message: assertion.description
      }));

      // Create error info if needed
      const error = result.error ? {
        message: result.error.message,
        stack: result.error.stack
      } : undefined;

      return new TestResult3D(
        {
          id: result.id,
          name: result.name,
          description: `${result.metadata.file}:${result.metadata.line || 0}`,
          duration: result.duration,
          tags: result.metadata.tags,
          category: result.metadata.category,
          priority: result.metadata.priority
        },
        result.status,
        position,
        new Date(Date.now() - result.duration),
        new Date(),
        error,
        assertions
      );
    });
  }

  private convertTestSuites(testSuites: TestFrameworkSuite[]): TestSuite3D[] {
    return testSuites.map((suite, index) => {
      const position = this.calculateSuitePosition(suite, index, testSuites.length);
      
      // Recursively convert nested test results
      const allTests: TestFrameworkResult[] = [
        ...suite.tests,
        ...suite.nested.flatMap(nested => this.flattenSuiteTests(nested))
      ];
      
      const testResults3D = this.convertTestResults(allTests);

      return new TestSuite3D(
        suite.name,
        position,
        testResults3D,
        suite.metadata
      );
    });
  }

  private flattenSuiteTests(suite: TestFrameworkSuite): TestFrameworkResult[] {
    return [
      ...suite.tests,
      ...suite.nested.flatMap(nested => this.flattenSuiteTests(nested))
    ];
  }

  private calculateTestPosition(test: TestFrameworkResult, index: number, total: number): Vector3D {
    // Arrange tests in a spiral pattern based on status and priority
    const angle = (index / total) * Math.PI * 2;
    const radius = 5 + (test.metadata.priority === 'critical' ? 2 : 
                       test.metadata.priority === 'high' ? 1 : 0);
    
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = test.status === 'failed' ? 2 : 
              test.status === 'passed' ? 0 : 1;

    return { x, y, z };
  }

  private calculateSuitePosition(suite: TestFrameworkSuite, index: number, total: number): Vector3D {
    // Arrange suites in a grid pattern
    const gridSize = Math.ceil(Math.sqrt(total));
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    
    const spacing = 15;
    const x = (col - gridSize / 2) * spacing;
    const z = (row - gridSize / 2) * spacing;
    const y = suite.metadata.passedTests / suite.metadata.totalTests * 5; // Height based on success rate

    return { x, y, z };
  }

  private async create3DVisualization(
    testResults: TestResult3D[],
    testSuites: TestSuite3D[],
    visualizationType: string
  ): Promise<string> {
    const visualizationId = `viz-${Date.now()}`;

    // Add test suites first (as foundations)
    for (const suite of testSuites) {
      await this.visualizationEngine.addTestSuite(suite);
    }

    // Add individual test results
    for (const test of testResults) {
      await this.visualizationEngine.addTestResult(test);
    }

    // Create connections based on visualization type
    if (visualizationType === 'hierarchical_tree') {
      await this.createHierarchicalConnections(testResults, testSuites);
    } else if (visualizationType === 'network_graph') {
      await this.createNetworkConnections(testResults);
    }

    // Set up interactive behaviors
    this.visualizationEngine.onObjectInteraction((objectId, interaction) => {
      this.currentSession?.recordUserInteraction('controller');
      // Handle object interactions (show details, highlight related tests, etc.)
    });

    return visualizationId;
  }

  private async createHierarchicalConnections(
    testResults: TestResult3D[],
    testSuites: TestSuite3D[]
  ): Promise<void> {
    // Create parent-child connections between suites and their tests
    for (const suite of testSuites) {
      for (const test of suite.tests) {
        await this.visualizationEngine.createConnection(
          suite.name,
          test.metadata.id,
          'parent-child'
        );
      }
    }
  }

  private async createNetworkConnections(testResults: TestResult3D[]): Promise<void> {
    // Create connections between tests in the same category or with similar tags
    for (let i = 0; i < testResults.length; i++) {
      for (let j = i + 1; j < testResults.length; j++) {
        const test1 = testResults[i];
        const test2 = testResults[j];
        
        // Connect tests with shared tags
        const sharedTags = test1.metadata.tags.filter(tag => 
          test2.metadata.tags.includes(tag)
        );
        
        if (sharedTags.length > 0 || test1.metadata.category === test2.metadata.category) {
          await this.visualizationEngine.createConnection(
            test1.metadata.id,
            test2.metadata.id,
            'dependency'
          );
        }
      }
    }
  }

  getCurrentSession(): VisualizationSession | null {
    return this.currentSession;
  }

  async isWebXRSupported(): Promise<boolean> {
    return await this.webXRAdapter.isSupported();
  }
}