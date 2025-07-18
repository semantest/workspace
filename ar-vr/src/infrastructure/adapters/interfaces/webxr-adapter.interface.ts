/*
                        Semantest - WebXR Adapter Interface
                        Interface for WebXR device integration

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Vector3D } from '../../..';

export interface XRDeviceCapabilities {
  hasVR: boolean;
  hasAR: boolean;
  hasHandTracking: boolean;
  hasEyeTracking: boolean;
  hasVoiceInput: boolean;
  displayRefreshRate: number;
  fieldOfView: number;
  resolution: { width: number; height: number };
}

export interface XRInputSource {
  type: 'hand' | 'controller' | 'gaze' | 'voice';
  position: Vector3D;
  rotation: Vector3D;
  isPressed: boolean;
  intensity: number;
  gesture?: 'pinch' | 'grab' | 'point' | 'swipe';
}

export interface XRRenderFrame {
  timestamp: number;
  viewerPosition: Vector3D;
  viewerRotation: Vector3D;
  inputSources: XRInputSource[];
  frameRate: number;
}

export interface WebXRSession {
  sessionId: string;
  mode: 'immersive-vr' | 'immersive-ar' | 'inline';
  isActive: boolean;
  startTime: Date;
  capabilities: XRDeviceCapabilities;
}

export interface IWebXRAdapter {
  /**
   * Initialize WebXR session with specified mode
   */
  initializeSession(mode: 'vr' | 'ar' | 'mixed'): Promise<WebXRSession>;

  /**
   * Check if WebXR is supported on current device/browser
   */
  isSupported(): Promise<boolean>;

  /**
   * Get available device capabilities
   */
  getDeviceCapabilities(): Promise<XRDeviceCapabilities>;

  /**
   * Start rendering loop for immersive experience
   */
  startRenderLoop(onFrame: (frame: XRRenderFrame) => void): Promise<void>;

  /**
   * Stop rendering and end XR session
   */
  endSession(): Promise<void>;

  /**
   * Handle user input events
   */
  onInputEvent(callback: (input: XRInputSource) => void): void;

  /**
   * Set up spatial anchors for persistent object placement
   */
  createSpatialAnchor(position: Vector3D): Promise<string>;

  /**
   * Remove spatial anchor
   */
  removeSpatialAnchor(anchorId: string): Promise<void>;

  /**
   * Enable/disable hand tracking
   */
  setHandTrackingEnabled(enabled: boolean): Promise<void>;

  /**
   * Enable/disable eye tracking
   */
  setEyeTrackingEnabled(enabled: boolean): Promise<void>;

  /**
   * Get current session state
   */
  getSession(): WebXRSession | null;
}