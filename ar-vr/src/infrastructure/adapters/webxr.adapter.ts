/*
                        Semantest - WebXR Adapter
                        WebXR implementation for AR/VR device integration

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { 
  IWebXRAdapter, 
  XRDeviceCapabilities, 
  XRInputSource, 
  XRRenderFrame, 
  WebXRSession 
} from './interfaces/webxr-adapter.interface';
import { Vector3D } from '../../domain/value-objects';

declare global {
  interface Navigator {
    xr?: XRSystem;
  }
  
  interface XRSystem {
    isSessionSupported(mode: XRSessionMode): Promise<boolean>;
    requestSession(mode: XRSessionMode, options?: XRSessionInit): Promise<XRSession>;
  }
}

export class WebXRAdapter implements IWebXRAdapter {
  private currentSession: XRSession | null = null;
  private sessionWrapper: WebXRSession | null = null;
  private referenceSpace: XRReferenceSpace | null = null;
  private animationFrameId: number | null = null;
  private inputCallbacks: Array<(input: XRInputSource) => void> = [];
  private spatialAnchors: Map<string, any> = new Map();

  async initializeSession(mode: 'vr' | 'ar' | 'mixed'): Promise<WebXRSession> {
    if (!navigator.xr) {
      throw new Error('WebXR is not supported in this browser');
    }

    const xrMode = this.mapModeToXRMode(mode);
    const isSupported = await navigator.xr.isSessionSupported(xrMode);
    
    if (!isSupported) {
      throw new Error(`${mode.toUpperCase()} mode is not supported on this device`);
    }

    try {
      this.currentSession = await navigator.xr.requestSession(xrMode, {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['hand-tracking', 'anchors', 'dom-overlay']
      });

      // Get reference space
      this.referenceSpace = await this.currentSession.requestReferenceSpace('local-floor');

      // Setup session event handlers
      this.currentSession.addEventListener('end', this.onSessionEnd.bind(this));
      this.currentSession.addEventListener('inputsourceschange', this.onInputSourcesChange.bind(this));

      // Get device capabilities
      const capabilities = await this.getDeviceCapabilities();

      // Create session wrapper
      this.sessionWrapper = {
        sessionId: `xr-session-${Date.now()}`,
        mode: mode === 'vr' ? 'immersive-vr' : mode === 'ar' ? 'immersive-ar' : 'inline',
        isActive: true,
        startTime: new Date(),
        capabilities
      };

      return this.sessionWrapper;
    } catch (error) {
      throw new Error(`Failed to initialize ${mode.toUpperCase()} session: ${error}`);
    }
  }

  async isSupported(): Promise<boolean> {
    if (!navigator.xr) {
      return false;
    }

    try {
      const [vrSupported, arSupported] = await Promise.all([
        navigator.xr.isSessionSupported('immersive-vr'),
        navigator.xr.isSessionSupported('immersive-ar')
      ]);

      return vrSupported || arSupported;
    } catch {
      return false;
    }
  }

  async getDeviceCapabilities(): Promise<XRDeviceCapabilities> {
    if (!navigator.xr) {
      throw new Error('WebXR not available');
    }

    const [hasVR, hasAR] = await Promise.all([
      navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
      navigator.xr.isSessionSupported('immersive-ar').catch(() => false)
    ]);

    // Get additional capabilities from session if available
    let hasHandTracking = false;
    let hasEyeTracking = false;
    let hasVoiceInput = false;
    let displayRefreshRate = 60;
    let fieldOfView = 110;
    let resolution = { width: 1920, height: 1080 };

    if (this.currentSession) {
      // Check for hand tracking support
      try {
        hasHandTracking = this.currentSession.enabledFeatures?.includes('hand-tracking') || false;
      } catch {
        hasHandTracking = false;
      }

      // Get display information if available
      // Note: These are estimates as WebXR doesn't expose all device details
      const inputSources = Array.from(this.currentSession.inputSources);
      if (inputSources.length > 0) {
        // Estimate based on device type
        const deviceProfile = this.estimateDeviceProfile(inputSources);
        displayRefreshRate = deviceProfile.refreshRate;
        fieldOfView = deviceProfile.fov;
        resolution = deviceProfile.resolution;
      }
    }

    return {
      hasVR,
      hasAR,
      hasHandTracking,
      hasEyeTracking,
      hasVoiceInput,
      displayRefreshRate,
      fieldOfView,
      resolution
    };
  }

  async startRenderLoop(onFrame: (frame: XRRenderFrame) => void): Promise<void> {
    if (!this.currentSession || !this.referenceSpace) {
      throw new Error('No active XR session');
    }

    const renderFrame = (timestamp: number, xrFrame: XRFrame) => {
      if (!this.currentSession || !this.referenceSpace) return;

      // Get viewer pose
      const viewerPose = xrFrame.getViewerPose(this.referenceSpace);
      if (!viewerPose) return;

      // Extract position and rotation
      const position = viewerPose.transform.position;
      const orientation = viewerPose.transform.orientation;

      // Convert quaternion to Euler angles (simplified)
      const viewerPosition: Vector3D = {
        x: position.x,
        y: position.y,
        z: position.z
      };

      const viewerRotation: Vector3D = {
        x: orientation.x,
        y: orientation.y,
        z: orientation.z
      };

      // Process input sources
      const inputSources = this.processInputSources(xrFrame);

      // Calculate frame rate
      const frameRate = 1000 / (timestamp - (this.lastFrameTime || timestamp));
      this.lastFrameTime = timestamp;

      // Create render frame data
      const renderFrameData: XRRenderFrame = {
        timestamp,
        viewerPosition,
        viewerRotation,
        inputSources,
        frameRate
      };

      // Call the frame callback
      onFrame(renderFrameData);

      // Continue the render loop
      this.animationFrameId = this.currentSession!.requestAnimationFrame(renderFrame);
    };

    this.animationFrameId = this.currentSession.requestAnimationFrame(renderFrame);
  }

  private lastFrameTime: number = 0;

  async endSession(): Promise<void> {
    if (this.animationFrameId) {
      // Note: XR sessions don't have cancelAnimationFrame, it stops when session ends
      this.animationFrameId = null;
    }

    if (this.currentSession) {
      await this.currentSession.end();
    }

    this.cleanup();
  }

  onInputEvent(callback: (input: XRInputSource) => void): void {
    this.inputCallbacks.push(callback);
  }

  async createSpatialAnchor(position: Vector3D): Promise<string> {
    if (!this.currentSession || !this.referenceSpace) {
      throw new Error('No active XR session for anchor creation');
    }

    // Check if anchors are supported
    if (!this.currentSession.enabledFeatures?.includes('anchors')) {
      throw new Error('Spatial anchors are not supported in this session');
    }

    try {
      // Create anchor at specified position
      const anchorId = `anchor-${Date.now()}-${Math.random()}`;
      
      // Note: This is a simplified implementation
      // Real anchor creation would use XRFrame.createAnchor()
      const anchorData = {
        id: anchorId,
        position,
        createdAt: new Date()
      };
      
      this.spatialAnchors.set(anchorId, anchorData);
      return anchorId;
    } catch (error) {
      throw new Error(`Failed to create spatial anchor: ${error}`);
    }
  }

  async removeSpatialAnchor(anchorId: string): Promise<void> {
    const anchor = this.spatialAnchors.get(anchorId);
    if (!anchor) {
      throw new Error(`Spatial anchor ${anchorId} not found`);
    }

    // Remove the anchor
    this.spatialAnchors.delete(anchorId);
  }

  async setHandTrackingEnabled(enabled: boolean): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active XR session');
    }

    // Note: Hand tracking is typically enabled during session creation
    // This method would be used for runtime toggling if supported
    if (enabled && !this.currentSession.enabledFeatures?.includes('hand-tracking')) {
      console.warn('Hand tracking was not enabled during session creation');
    }
  }

  async setEyeTrackingEnabled(enabled: boolean): Promise<void> {
    // Eye tracking is not widely supported in WebXR yet
    console.warn('Eye tracking is not yet supported in WebXR');
  }

  getSession(): WebXRSession | null {
    return this.sessionWrapper;
  }

  private mapModeToXRMode(mode: 'vr' | 'ar' | 'mixed'): XRSessionMode {
    switch (mode) {
      case 'vr':
        return 'immersive-vr';
      case 'ar':
        return 'immersive-ar';
      case 'mixed':
        // Mixed reality typically uses AR mode
        return 'immersive-ar';
      default:
        return 'immersive-vr';
    }
  }

  private processInputSources(xrFrame: XRFrame): XRInputSource[] {
    if (!this.currentSession || !this.referenceSpace) return [];

    const inputSources: XRInputSource[] = [];

    for (const inputSource of this.currentSession.inputSources) {
      try {
        const inputPose = xrFrame.getPose(inputSource.gripSpace || inputSource.targetRaySpace, this.referenceSpace);
        
        if (inputPose) {
          const position: Vector3D = {
            x: inputPose.transform.position.x,
            y: inputPose.transform.position.y,
            z: inputPose.transform.position.z
          };

          const rotation: Vector3D = {
            x: inputPose.transform.orientation.x,
            y: inputPose.transform.orientation.y,
            z: inputPose.transform.orientation.z
          };

          // Determine input type
          const type = inputSource.hand ? 'hand' : 
                      inputSource.targetRayMode === 'gaze' ? 'gaze' : 'controller';

          // Check for button presses
          const gamepad = inputSource.gamepad;
          const isPressed = gamepad ? gamepad.buttons.some(button => button.pressed) : false;
          const intensity = gamepad ? gamepad.buttons[0]?.value || 0 : 0;

          // Detect gestures for hand input
          let gesture: 'pinch' | 'grab' | 'point' | 'swipe' | undefined;
          if (inputSource.hand) {
            gesture = this.detectHandGesture(inputSource.hand);
          }

          const xrInputSource: XRInputSource = {
            type,
            position,
            rotation,
            isPressed,
            intensity,
            gesture
          };

          inputSources.push(xrInputSource);

          // Notify input callbacks
          this.inputCallbacks.forEach(callback => callback(xrInputSource));
        }
      } catch (error) {
        console.warn('Error processing input source:', error);
      }
    }

    return inputSources;
  }

  private detectHandGesture(hand: XRHand): 'pinch' | 'grab' | 'point' | 'swipe' | undefined {
    // Hand gesture detection is simplified here
    // Real implementation would analyze joint positions and movements
    try {
      const thumbTip = hand.get('thumb-tip');
      const indexTip = hand.get('index-finger-tip');
      
      if (thumbTip && indexTip) {
        // Simple pinch detection based on distance
        const distance = Math.sqrt(
          Math.pow(thumbTip.transform.position.x - indexTip.transform.position.x, 2) +
          Math.pow(thumbTip.transform.position.y - indexTip.transform.position.y, 2) +
          Math.pow(thumbTip.transform.position.z - indexTip.transform.position.z, 2)
        );
        
        if (distance < 0.03) { // 3cm threshold
          return 'pinch';
        }
      }

      // Additional gesture detection would go here
      return 'point'; // Default gesture
    } catch {
      return undefined;
    }
  }

  private estimateDeviceProfile(inputSources: XRInputSource[]): {
    refreshRate: number;
    fov: number;
    resolution: { width: number; height: number };
  } {
    // Estimate device characteristics based on input sources
    // This is a simplified heuristic approach
    
    const hasControllers = inputSources.some(source => source.targetRayMode === 'tracked-pointer');
    const hasHandTracking = inputSources.some(source => source.hand);
    
    if (hasHandTracking) {
      // High-end device (e.g., Quest Pro, HoloLens)
      return {
        refreshRate: 90,
        fov: 120,
        resolution: { width: 2880, height: 1700 }
      };
    } else if (hasControllers) {
      // Mid-range VR device (e.g., Quest 2)
      return {
        refreshRate: 72,
        fov: 110,
        resolution: { width: 1832, height: 1920 }
      };
    } else {
      // Basic device or mobile AR
      return {
        refreshRate: 60,
        fov: 100,
        resolution: { width: 1440, height: 1080 }
      };
    }
  }

  private onSessionEnd(): void {
    this.cleanup();
  }

  private onInputSourcesChange(event: XRInputSourceChangeEvent): void {
    // Handle input source changes
    console.log('Input sources changed:', event);
  }

  private cleanup(): void {
    this.currentSession = null;
    this.sessionWrapper = null;
    this.referenceSpace = null;
    this.animationFrameId = null;
    this.inputCallbacks = [];
    this.spatialAnchors.clear();
    this.lastFrameTime = 0;
  }
}