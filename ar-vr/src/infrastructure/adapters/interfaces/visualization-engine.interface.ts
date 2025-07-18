/*
                        Semantest - 3D Visualization Engine Interface
                        Interface for 3D rendering and visualization

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Vector3D, Color, TestResult3D, TestSuite3D, TestVisualizationConfig } from '../../..';

export interface SceneObject {
  id: string;
  type: 'test' | 'suite' | 'connection' | 'label' | 'environment';
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
  color: Color;
  visible: boolean;
  interactive: boolean;
  metadata?: any;
}

export interface AnimationConfig {
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';
  loop: boolean;
  delay?: number;
}

export interface CameraState {
  position: Vector3D;
  target: Vector3D;
  fov: number;
  zoom: number;
}

export interface RenderStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  memoryUsage: number;
}

export interface I3DVisualizationEngine {
  /**
   * Initialize the 3D rendering engine
   */
  initialize(config: TestVisualizationConfig): Promise<void>;

  /**
   * Create 3D scene for test visualization
   */
  createScene(): Promise<void>;

  /**
   * Add test result as 3D object to scene
   */
  addTestResult(testResult: TestResult3D): Promise<SceneObject>;

  /**
   * Add test suite as 3D structure to scene
   */
  addTestSuite(testSuite: TestSuite3D): Promise<SceneObject>;

  /**
   * Update existing test object (for real-time updates)
   */
  updateTestResult(testId: string, testResult: TestResult3D): Promise<void>;

  /**
   * Remove test object from scene
   */
  removeTestResult(testId: string): Promise<void>;

  /**
   * Animate object transformation
   */
  animateObject(objectId: string, targetTransform: Partial<SceneObject>, config: AnimationConfig): Promise<void>;

  /**
   * Create connection line between related tests
   */
  createConnection(fromTestId: string, toTestId: string, connectionType: 'dependency' | 'sequence' | 'parent-child'): Promise<SceneObject>;

  /**
   * Add text label to object
   */
  addLabel(objectId: string, text: string, position: Vector3D): Promise<SceneObject>;

  /**
   * Set camera position and target
   */
  setCameraPosition(position: Vector3D, target: Vector3D): Promise<void>;

  /**
   * Animate camera movement
   */
  animateCamera(targetState: CameraState, config: AnimationConfig): Promise<void>;

  /**
   * Enable/disable object interaction
   */
  setObjectInteractive(objectId: string, interactive: boolean): void;

  /**
   * Handle object selection/clicking
   */
  onObjectInteraction(callback: (objectId: string, interaction: 'click' | 'hover' | 'select') => void): void;

  /**
   * Update lighting in scene
   */
  updateLighting(ambientColor: Color, directionalColor: Color, intensity: number): void;

  /**
   * Render single frame
   */
  render(): void;

  /**
   * Start continuous rendering loop
   */
  startRenderLoop(): void;

  /**
   * Stop rendering loop
   */
  stopRenderLoop(): void;

  /**
   * Get current render statistics
   */
  getRenderStats(): RenderStats;

  /**
   * Resize renderer viewport
   */
  resize(width: number, height: number): void;

  /**
   * Clear entire scene
   */
  clearScene(): void;

  /**
   * Dispose of all resources
   */
  dispose(): void;

  /**
   * Export scene as image
   */
  exportImage(format: 'png' | 'jpg', quality?: number): Promise<Blob>;

  /**
   * Enable/disable performance monitoring
   */
  setPerformanceMonitoring(enabled: boolean): void;
}