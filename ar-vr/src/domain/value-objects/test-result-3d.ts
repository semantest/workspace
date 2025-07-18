/*
                        Semantest - 3D Test Result Value Objects
                        Value objects for representing test results in 3D space

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Vector3D, Color } from './test-visualization-config';

export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'error';

export interface TestMetadata {
  id: string;
  name: string;
  description?: string;
  duration?: number;
  tags: string[];
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface TestErrorInfo {
  message: string;
  stack?: string;
  code?: string;
  line?: number;
  column?: number;
}

export interface TestAssertionResult {
  assertion: string;
  expected: any;
  actual: any;
  passed: boolean;
  message?: string;
}

export class TestResult3D {
  constructor(
    public readonly metadata: TestMetadata,
    public readonly status: TestStatus,
    public readonly position: Vector3D,
    public readonly startTime: Date,
    public readonly endTime?: Date,
    public readonly error?: TestErrorInfo,
    public readonly assertions: TestAssertionResult[] = [],
    public readonly childTests: TestResult3D[] = []
  ) {}

  get duration(): number {
    if (!this.endTime) return 0;
    return this.endTime.getTime() - this.startTime.getTime();
  }

  get isCompleted(): boolean {
    return this.status === 'passed' || this.status === 'failed' || this.status === 'skipped' || this.status === 'error';
  }

  get successRate(): number {
    if (this.assertions.length === 0) return this.status === 'passed' ? 1 : 0;
    const passedAssertions = this.assertions.filter(a => a.passed).length;
    return passedAssertions / this.assertions.length;
  }

  get visualizationColor(): Color {
    switch (this.status) {
      case 'passed': return { r: 0.2, g: 0.8, b: 0.2 };
      case 'failed': return { r: 0.8, g: 0.2, b: 0.2 };
      case 'error': return { r: 0.8, g: 0.1, b: 0.1 };
      case 'skipped': return { r: 0.5, g: 0.5, b: 0.5 };
      case 'pending': return { r: 0.8, g: 0.8, b: 0.2 };
      case 'running': return { r: 0.2, g: 0.5, b: 0.8 };
      default: return { r: 0.3, g: 0.3, b: 0.3 };
    }
  }

  get visualizationScale(): Vector3D {
    const baseScale = 1.0;
    const durationScale = Math.min(this.duration / 1000, 3.0); // Max 3x scale for duration
    const priorityScale = this.metadata.priority === 'critical' ? 1.5 : 
                         this.metadata.priority === 'high' ? 1.3 : 
                         this.metadata.priority === 'medium' ? 1.1 : 1.0;
    
    const finalScale = baseScale * (1 + durationScale * 0.2) * priorityScale;
    
    return { x: finalScale, y: finalScale, z: finalScale };
  }
}

export class TestSuite3D {
  constructor(
    public readonly name: string,
    public readonly position: Vector3D,
    public readonly tests: TestResult3D[],
    public readonly metadata: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      skippedTests: number;
      startTime: Date;
      endTime?: Date;
    }
  ) {}

  get successRate(): number {
    return this.metadata.totalTests > 0 ? this.metadata.passedTests / this.metadata.totalTests : 0;
  }

  get averageDuration(): number {
    const completedTests = this.tests.filter(t => t.isCompleted);
    if (completedTests.length === 0) return 0;
    
    const totalDuration = completedTests.reduce((sum, test) => sum + test.duration, 0);
    return totalDuration / completedTests.length;
  }

  get visualizationHeight(): number {
    const baseHeight = 2.0;
    const successBonus = this.successRate * 2.0;
    const testCountFactor = Math.log10(this.metadata.totalTests + 1);
    
    return baseHeight + successBonus + testCountFactor;
  }
}