/*
                        Semantest - AR/VR Visualization Events
                        Domain events for 3D test visualization

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { DomainEvent } from '@semantest/core';
import { TestResult3D, TestSuite3D, Vector3D } from '../value-objects';

export class VisualizationSessionStarted extends DomainEvent {
  public readonly eventType = 'AR-VR_VISUALIZATION_SESSION_STARTED';

  constructor(
    correlationId: string,
    public readonly sessionId: string,
    public readonly mode: 'vr' | 'ar' | 'mixed',
    public readonly deviceCapabilities: any
  ) {
    super(correlationId);
  }
}

export class VisualizationSessionEnded extends DomainEvent {
  public readonly eventType = 'AR-VR_VISUALIZATION_SESSION_ENDED';

  constructor(
    correlationId: string,
    public readonly sessionId: string,
    public readonly duration: number,
    public readonly reason: 'user_requested' | 'error' | 'device_disconnected'
  ) {
    super(correlationId);
  }
}

export class TestVisualizationRequested extends DomainEvent {
  public readonly eventType = 'AR-VR_TEST_VISUALIZATION_REQUESTED';

  constructor(
    correlationId: string,
    public readonly testResults: TestResult3D[],
    public readonly testSuites: TestSuite3D[],
    public readonly visualizationType: '3d_scatter' | 'hierarchical_tree' | 'timeline' | 'network_graph'
  ) {
    super(correlationId);
  }
}

export class TestVisualizationCreated extends DomainEvent {
  public readonly eventType = 'AR-VR_TEST_VISUALIZATION_CREATED';

  constructor(
    correlationId: string,
    public readonly visualizationId: string,
    public readonly objectCount: number,
    public readonly renderTime: number
  ) {
    super(correlationId);
  }
}

export class TestObjectInteracted extends DomainEvent {
  public readonly eventType = 'AR-VR_TEST_OBJECT_INTERACTED';

  constructor(
    correlationId: string,
    public readonly objectId: string,
    public readonly testId: string,
    public readonly interactionType: 'click' | 'hover' | 'gesture' | 'voice',
    public readonly position: Vector3D,
    public readonly userPosition: Vector3D
  ) {
    super(correlationId);
  }
}

export class CameraMovementRequested extends DomainEvent {
  public readonly eventType = 'AR-VR_CAMERA_MOVEMENT_REQUESTED';

  constructor(
    correlationId: string,
    public readonly targetPosition: Vector3D,
    public readonly targetRotation: Vector3D,
    public readonly animationDuration: number
  ) {
    super(correlationId);
  }
}

export class VisualizationPerformanceAlert extends DomainEvent {
  public readonly eventType = 'AR-VR_VISUALIZATION_PERFORMANCE_ALERT';

  constructor(
    correlationId: string,
    public readonly fps: number,
    public readonly memoryUsage: number,
    public readonly severity: 'warning' | 'critical',
    public readonly recommendation: string
  ) {
    super(correlationId);
  }
}

export class SpatialAnchorCreated extends DomainEvent {
  public readonly eventType = 'AR-VR_SPATIAL_ANCHOR_CREATED';

  constructor(
    correlationId: string,
    public readonly anchorId: string,
    public readonly position: Vector3D,
    public readonly testSuiteId: string
  ) {
    super(correlationId);
  }
}

export class HandGestureDetected extends DomainEvent {
  public readonly eventType = 'AR-VR_HAND_GESTURE_DETECTED';

  constructor(
    correlationId: string,
    public readonly gestureType: 'pinch' | 'grab' | 'point' | 'swipe',
    public readonly handPosition: Vector3D,
    public readonly confidence: number,
    public readonly targetObjectId?: string
  ) {
    super(correlationId);
  }
}