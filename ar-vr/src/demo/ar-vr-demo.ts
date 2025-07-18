/*
                        Semantest - AR/VR Demo
                        Demo implementation showing basic AR/VR test visualization

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { TestVisualizationService, TestFrameworkResult, TestFrameworkSuite } from '../application/services/test-visualization.service';
import { ThreeVisualizationEngineAdapter } from '../infrastructure/adapters/three-visualization-engine.adapter';
import { WebXRAdapter } from '../infrastructure/adapters/webxr.adapter';
import { TestVisualizationConfig } from '../domain/value-objects';

export class ARVRDemo {
  private visualizationService: TestVisualizationService;
  private container: HTMLElement;

  constructor(containerElement: HTMLElement) {
    this.container = containerElement;
    
    // Initialize adapters
    const visualizationEngine = new ThreeVisualizationEngineAdapter(containerElement);
    const webXRAdapter = new WebXRAdapter();
    
    // Create visualization service
    this.visualizationService = new TestVisualizationService(
      webXRAdapter,
      visualizationEngine
    );
  }

  async initialize(): Promise<boolean> {
    try {
      // Check WebXR support
      const isSupported = await this.visualizationService.isWebXRSupported();
      
      if (!isSupported) {
        console.warn('WebXR not supported, falling back to 3D visualization only');
        // Could still use 3D visualization without VR/AR
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize AR/VR demo:', error);
      return false;
    }
  }

  async startVRSession(): Promise<string | null> {
    try {
      const sessionId = await this.visualizationService.startVisualizationSession('vr');
      console.log('VR session started:', sessionId);
      return sessionId;
    } catch (error) {
      console.error('Failed to start VR session:', error);
      return null;
    }
  }

  async startARSession(): Promise<string | null> {
    try {
      const sessionId = await this.visualizationService.startVisualizationSession('ar');
      console.log('AR session started:', sessionId);
      return sessionId;
    } catch (error) {
      console.error('Failed to start AR session:', error);
      return null;
    }
  }

  async visualizeDemoTestResults(): Promise<void> {
    // Create sample test data
    const sampleTestResults: TestFrameworkResult[] = [
      {
        id: 'test-1',
        name: 'User Authentication',
        status: 'passed',
        duration: 1500,
        assertions: [
          {
            description: 'should authenticate valid user',
            passed: true,
            expected: true,
            actual: true
          }
        ],
        metadata: {
          file: 'auth.test.ts',
          line: 15,
          tags: ['auth', 'integration'],
          category: 'security',
          priority: 'high'
        }
      },
      {
        id: 'test-2',
        name: 'API Rate Limiting',
        status: 'failed',
        duration: 2300,
        error: {
          message: 'Rate limit not enforced',
          stack: 'Error: Rate limit not enforced\n    at test-2...'
        },
        assertions: [
          {
            description: 'should block requests after limit',
            passed: false,
            expected: 429,
            actual: 200
          }
        ],
        metadata: {
          file: 'api.test.ts',
          line: 42,
          tags: ['api', 'security'],
          category: 'api',
          priority: 'critical'
        }
      },
      {
        id: 'test-3',
        name: 'UI Component Rendering',
        status: 'passed',
        duration: 800,
        assertions: [
          {
            description: 'should render button component',
            passed: true,
            expected: 'visible',
            actual: 'visible'
          },
          {
            description: 'should handle click events',
            passed: true,
            expected: 'clicked',
            actual: 'clicked'
          }
        ],
        metadata: {
          file: 'button.test.tsx',
          line: 28,
          tags: ['ui', 'component'],
          category: 'frontend',
          priority: 'medium'
        }
      },
      {
        id: 'test-4',
        name: 'Database Connection',
        status: 'skipped',
        duration: 0,
        assertions: [],
        metadata: {
          file: 'db.test.ts',
          line: 10,
          tags: ['database', 'integration'],
          category: 'backend',
          priority: 'low'
        }
      },
      {
        id: 'test-5',
        name: 'Performance Benchmark',
        status: 'pending',
        duration: 0,
        assertions: [],
        metadata: {
          file: 'performance.test.ts',
          line: 5,
          tags: ['performance', 'benchmark'],
          category: 'performance',
          priority: 'medium'
        }
      }
    ];

    const sampleTestSuites: TestFrameworkSuite[] = [
      {
        name: 'Authentication Tests',
        tests: [sampleTestResults[0]],
        nested: [],
        metadata: {
          totalTests: 1,
          passedTests: 1,
          failedTests: 0,
          skippedTests: 0,
          startTime: new Date(Date.now() - 60000),
          endTime: new Date(Date.now() - 45000)
        }
      },
      {
        name: 'API Tests',
        tests: [sampleTestResults[1]],
        nested: [],
        metadata: {
          totalTests: 1,
          passedTests: 0,
          failedTests: 1,
          skippedTests: 0,
          startTime: new Date(Date.now() - 45000),
          endTime: new Date(Date.now() - 30000)
        }
      },
      {
        name: 'UI Tests',
        tests: [sampleTestResults[2]],
        nested: [],
        metadata: {
          totalTests: 1,
          passedTests: 1,
          failedTests: 0,
          skippedTests: 0,
          startTime: new Date(Date.now() - 30000),
          endTime: new Date(Date.now() - 15000)
        }
      }
    ];

    try {
      const visualizationId = await this.visualizationService.visualizeTestResults(
        sampleTestResults,
        sampleTestSuites,
        '3d_scatter'
      );
      
      console.log('Test visualization created:', visualizationId);
      
      // Add some interactive demonstrations
      setTimeout(() => {
        console.log('Demo: Switching to hierarchical view...');
        this.visualizationService.visualizeTestResults(
          sampleTestResults,
          sampleTestSuites,
          'hierarchical_tree'
        );
      }, 5000);

    } catch (error) {
      console.error('Failed to visualize test results:', error);
    }
  }

  async endSession(): Promise<void> {
    try {
      await this.visualizationService.endVisualizationSession('user_requested');
      console.log('Visualization session ended');
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  // Utility method to create demo HTML interface
  createDemoInterface(): HTMLElement {
    const demoContainer = document.createElement('div');
    demoContainer.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px;
      border-radius: 8px;
      z-index: 1000;
      max-width: 300px;
    `;

    demoContainer.innerHTML = `
      <h3>Semantest AR/VR Demo</h3>
      <div id="status">Initializing...</div>
      <br>
      <button id="btn-vr">Start VR Session</button>
      <button id="btn-ar">Start AR Session</button>
      <button id="btn-3d">3D Visualization Only</button>
      <br><br>
      <button id="btn-demo">Load Demo Test Results</button>
      <button id="btn-end">End Session</button>
      <br><br>
      <div id="session-info" style="font-size: 12px; color: #ccc;"></div>
    `;

    // Add event listeners
    const statusDiv = demoContainer.querySelector('#status') as HTMLElement;
    const sessionInfoDiv = demoContainer.querySelector('#session-info') as HTMLElement;

    demoContainer.querySelector('#btn-vr')?.addEventListener('click', async () => {
      statusDiv.textContent = 'Starting VR session...';
      const sessionId = await this.startVRSession();
      statusDiv.textContent = sessionId ? 'VR session active' : 'VR session failed';
      if (sessionId) {
        sessionInfoDiv.textContent = `Session ID: ${sessionId}`;
      }
    });

    demoContainer.querySelector('#btn-ar')?.addEventListener('click', async () => {
      statusDiv.textContent = 'Starting AR session...';
      const sessionId = await this.startARSession();
      statusDiv.textContent = sessionId ? 'AR session active' : 'AR session failed';
      if (sessionId) {
        sessionInfoDiv.textContent = `Session ID: ${sessionId}`;
      }
    });

    demoContainer.querySelector('#btn-3d')?.addEventListener('click', async () => {
      statusDiv.textContent = 'Starting 3D visualization...';
      // Start without XR for 3D-only mode
      try {
        statusDiv.textContent = '3D visualization ready';
        sessionInfoDiv.textContent = 'Mode: 3D Visualization (No VR/AR)';
      } catch (error) {
        statusDiv.textContent = '3D visualization failed';
      }
    });

    demoContainer.querySelector('#btn-demo')?.addEventListener('click', async () => {
      statusDiv.textContent = 'Loading demo test results...';
      await this.visualizeDemoTestResults();
      statusDiv.textContent = 'Demo test results loaded';
    });

    demoContainer.querySelector('#btn-end')?.addEventListener('click', async () => {
      statusDiv.textContent = 'Ending session...';
      await this.endSession();
      statusDiv.textContent = 'Session ended';
      sessionInfoDiv.textContent = '';
    });

    return demoContainer;
  }
}

// Export factory function for easy use
export function createARVRDemo(containerElement: HTMLElement): ARVRDemo {
  return new ARVRDemo(containerElement);
}