/*
                        Semantest - AR/VR Test Visualization Configuration
                        Value objects for immersive test visualization

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface TestVisualizationTheme {
  success: Color;
  failure: Color;
  pending: Color;
  skipped: Color;
  warning: Color;
  background: Color;
  text: Color;
}

export interface CameraConfig {
  position: Vector3D;
  target: Vector3D;
  fov: number;
  near: number;
  far: number;
}

export interface SceneConfig {
  dimensions: Vector3D;
  lighting: {
    ambient: Color;
    directional: {
      color: Color;
      intensity: number;
      position: Vector3D;
    };
  };
  camera: CameraConfig;
}

export interface InteractionConfig {
  enableHandTracking: boolean;
  enableGazeInput: boolean;
  enableVoiceCommands: boolean;
  gestureThresholds: {
    pinch: number;
    grab: number;
    point: number;
  };
}

export interface PerformanceConfig {
  maxObjects: number;
  lodDistance: number;
  shadowQuality: 'low' | 'medium' | 'high';
  antiAliasing: boolean;
  targetFPS: number;
}

export class TestVisualizationConfig {
  constructor(
    public readonly theme: TestVisualizationTheme,
    public readonly scene: SceneConfig,
    public readonly interaction: InteractionConfig,
    public readonly performance: PerformanceConfig
  ) {}

  static createDefault(): TestVisualizationConfig {
    return new TestVisualizationConfig(
      {
        success: { r: 0.2, g: 0.8, b: 0.2 },
        failure: { r: 0.8, g: 0.2, b: 0.2 },
        pending: { r: 0.8, g: 0.8, b: 0.2 },
        skipped: { r: 0.5, g: 0.5, b: 0.5 },
        warning: { r: 0.8, g: 0.5, b: 0.2 },
        background: { r: 0.1, g: 0.1, b: 0.15 },
        text: { r: 0.9, g: 0.9, b: 0.9 }
      },
      {
        dimensions: { x: 20, y: 15, z: 20 },
        lighting: {
          ambient: { r: 0.3, g: 0.3, b: 0.4 },
          directional: {
            color: { r: 1, g: 1, b: 0.9 },
            intensity: 1.0,
            position: { x: 10, y: 15, z: 10 }
          }
        },
        camera: {
          position: { x: 0, y: 5, z: 10 },
          target: { x: 0, y: 0, z: 0 },
          fov: 75,
          near: 0.1,
          far: 1000
        }
      },
      {
        enableHandTracking: true,
        enableGazeInput: true,
        enableVoiceCommands: false,
        gestureThresholds: {
          pinch: 0.5,
          grab: 0.7,
          point: 0.8
        }
      },
      {
        maxObjects: 1000,
        lodDistance: 50,
        shadowQuality: 'medium',
        antiAliasing: true,
        targetFPS: 60
      }
    );
  }
}