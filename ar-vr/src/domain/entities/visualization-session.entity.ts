/*
                        Semantest - Visualization Session Entity
                        Domain entity for managing AR/VR visualization sessions

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Entity, DomainEvent } from '@semantest/core';
import { 
  VisualizationSessionStarted, 
  VisualizationSessionEnded,
  TestVisualizationRequested,
  TestVisualizationCreated,
  VisualizationPerformanceAlert
} from '../events';
import { TestResult3D, TestSuite3D, TestVisualizationConfig, Vector3D } from '../value-objects';

export interface VisualizationSessionState {
  sessionId: string;
  mode: 'vr' | 'ar' | 'mixed';
  isActive: boolean;
  startTime: Date;
  endTime?: Date;
  deviceCapabilities: any;
  config: TestVisualizationConfig;
  currentVisualization?: {
    id: string;
    testResults: TestResult3D[];
    testSuites: TestSuite3D[];
    objectCount: number;
  };
  performance: {
    averageFPS: number;
    peakMemoryUsage: number;
    alertCount: number;
  };
  userInteractions: {
    totalInteractions: number;
    gestureCount: number;
    voiceCommandCount: number;
  };
}

export class VisualizationSession extends Entity<VisualizationSessionState> {
  constructor(
    private sessionId: string,
    private mode: 'vr' | 'ar' | 'mixed',
    private deviceCapabilities: any,
    private config: TestVisualizationConfig
  ) {
    super({
      sessionId,
      mode,
      isActive: false,
      startTime: new Date(),
      deviceCapabilities,
      config,
      performance: {
        averageFPS: 0,
        peakMemoryUsage: 0,
        alertCount: 0
      },
      userInteractions: {
        totalInteractions: 0,
        gestureCount: 0,
        voiceCommandCount: 0
      }
    });
  }

  getId(): string {
    return this.sessionId;
  }

  startSession(correlationId: string): void {
    if (this.state.isActive) {
      throw new Error('Visualization session is already active');
    }

    this.state = {
      ...this.state,
      isActive: true,
      startTime: new Date()
    };

    this.addDomainEvent(
      new VisualizationSessionStarted(
        correlationId,
        this.sessionId,
        this.mode,
        this.deviceCapabilities
      )
    );
  }

  endSession(correlationId: string, reason: 'user_requested' | 'error' | 'device_disconnected'): void {
    if (!this.state.isActive) {
      throw new Error('No active visualization session to end');
    }

    const endTime = new Date();
    const duration = endTime.getTime() - this.state.startTime.getTime();

    this.state = {
      ...this.state,
      isActive: false,
      endTime
    };

    this.addDomainEvent(
      new VisualizationSessionEnded(
        correlationId,
        this.sessionId,
        duration,
        reason
      )
    );
  }

  requestTestVisualization(
    correlationId: string,
    testResults: TestResult3D[],
    testSuites: TestSuite3D[],
    visualizationType: '3d_scatter' | 'hierarchical_tree' | 'timeline' | 'network_graph'
  ): void {
    if (!this.state.isActive) {
      throw new Error('Cannot create visualization: session is not active');
    }

    this.addDomainEvent(
      new TestVisualizationRequested(
        correlationId,
        testResults,
        testSuites,
        visualizationType
      )
    );
  }

  confirmVisualizationCreated(
    correlationId: string,
    visualizationId: string,
    testResults: TestResult3D[],
    testSuites: TestSuite3D[],
    objectCount: number,
    renderTime: number
  ): void {
    this.state = {
      ...this.state,
      currentVisualization: {
        id: visualizationId,
        testResults,
        testSuites,
        objectCount
      }
    };

    this.addDomainEvent(
      new TestVisualizationCreated(
        correlationId,
        visualizationId,
        objectCount,
        renderTime
      )
    );
  }

  recordPerformanceMetrics(fps: number, memoryUsage: number): void {
    const currentAverage = this.state.performance.averageFPS;
    const newAverage = currentAverage === 0 ? fps : (currentAverage + fps) / 2;

    this.state = {
      ...this.state,
      performance: {
        ...this.state.performance,
        averageFPS: newAverage,
        peakMemoryUsage: Math.max(this.state.performance.peakMemoryUsage, memoryUsage)
      }
    };

    // Check for performance issues
    if (fps < 30 || memoryUsage > 500) {
      this.triggerPerformanceAlert(fps, memoryUsage);
    }
  }

  recordUserInteraction(type: 'gesture' | 'voice' | 'controller' | 'gaze'): void {
    this.state = {
      ...this.state,
      userInteractions: {
        totalInteractions: this.state.userInteractions.totalInteractions + 1,
        gestureCount: type === 'gesture' ? 
          this.state.userInteractions.gestureCount + 1 : 
          this.state.userInteractions.gestureCount,
        voiceCommandCount: type === 'voice' ? 
          this.state.userInteractions.voiceCommandCount + 1 : 
          this.state.userInteractions.voiceCommandCount
      }
    };
  }

  private triggerPerformanceAlert(fps: number, memoryUsage: number): void {
    const severity = fps < 15 || memoryUsage > 800 ? 'critical' : 'warning';
    const recommendation = fps < 15 ? 
      'Reduce object count or lower quality settings' : 
      'Monitor memory usage and dispose unused objects';

    this.state = {
      ...this.state,
      performance: {
        ...this.state.performance,
        alertCount: this.state.performance.alertCount + 1
      }
    };

    this.addDomainEvent(
      new VisualizationPerformanceAlert(
        `perf-alert-${Date.now()}`,
        fps,
        memoryUsage,
        severity,
        recommendation
      )
    );
  }

  get sessionDuration(): number {
    const endTime = this.state.endTime || new Date();
    return endTime.getTime() - this.state.startTime.getTime();
  }

  get isHealthy(): boolean {
    return this.state.performance.averageFPS >= 30 && 
           this.state.performance.peakMemoryUsage < 500 &&
           this.state.performance.alertCount < 5;
  }
}