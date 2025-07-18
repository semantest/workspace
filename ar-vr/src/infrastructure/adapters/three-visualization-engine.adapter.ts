/*
                        Semantest - Three.js Visualization Engine Adapter
                        Implementation of 3D visualization using Three.js

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer';

import { 
  I3DVisualizationEngine, 
  SceneObject, 
  AnimationConfig, 
  CameraState, 
  RenderStats 
} from './interfaces/visualization-engine.interface';
import { Vector3D, Color, TestResult3D, TestSuite3D, TestVisualizationConfig } from '../../domain/value-objects';

export class ThreeVisualizationEngineAdapter implements I3DVisualizationEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private cssRenderer: CSS3DRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private mixer: THREE.AnimationMixer;
  private clock: THREE.Clock;
  
  private sceneObjects: Map<string, THREE.Object3D> = new Map();
  private objectMetadata: Map<string, SceneObject> = new Map();
  private interactionCallbacks: Array<(objectId: string, interaction: 'click' | 'hover' | 'select') => void> = [];
  
  private isInitialized = false;
  private isRenderLoopActive = false;
  private renderStats: RenderStats = {
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    points: 0,
    lines: 0,
    memoryUsage: 0
  };

  constructor(private container: HTMLElement) {
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();
  }

  async initialize(config: TestVisualizationConfig): Promise<void> {
    // Initialize Three.js components
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(
      config.theme.background.r,
      config.theme.background.g,
      config.theme.background.b
    );

    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      config.scene.camera.fov,
      this.container.clientWidth / this.container.clientHeight,
      config.scene.camera.near,
      config.scene.camera.far
    );
    
    this.camera.position.set(
      config.scene.camera.position.x,
      config.scene.camera.position.y,
      config.scene.camera.position.z
    );

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: config.performance.antiAliasing,
      alpha: true 
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = config.performance.shadowQuality === 'high' ? 
      THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    
    // Setup CSS3D renderer for HTML labels
    this.cssRenderer = new CSS3DRenderer();
    this.cssRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.cssRenderer.domElement.style.position = 'absolute';
    this.cssRenderer.domElement.style.top = '0';
    this.cssRenderer.domElement.style.pointerEvents = 'none';

    // Add renderers to container
    this.container.appendChild(this.renderer.domElement);
    this.container.appendChild(this.cssRenderer.domElement);

    // Setup controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(
      config.scene.camera.target.x,
      config.scene.camera.target.y,
      config.scene.camera.target.z
    );

    // Setup lighting
    this.updateLighting(
      config.scene.lighting.ambient,
      config.scene.lighting.directional.color,
      config.scene.lighting.directional.intensity
    );

    // Setup animation mixer
    this.mixer = new THREE.AnimationMixer(this.scene);

    // Setup interaction handlers
    this.setupInteractionHandlers();

    this.isInitialized = true;
  }

  async createScene(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Engine must be initialized before creating scene');
    }

    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x333333, 
      transparent: true, 
      opacity: 0.3 
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x222222);
    this.scene.add(gridHelper);

    // Add axis helper
    const axesHelper = new THREE.AxesHelper(5);
    this.scene.add(axesHelper);
  }

  async addTestResult(testResult: TestResult3D): Promise<SceneObject> {
    const geometry = this.createTestGeometry(testResult);
    const material = this.createTestMaterial(testResult);
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      testResult.position.x,
      testResult.position.y,
      testResult.position.z
    );
    
    const scale = testResult.visualizationScale;
    mesh.scale.set(scale.x, scale.y, scale.z);
    
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { testId: testResult.metadata.id, type: 'test' };

    this.scene.add(mesh);
    this.sceneObjects.set(testResult.metadata.id, mesh);

    const sceneObject: SceneObject = {
      id: testResult.metadata.id,
      type: 'test',
      position: testResult.position,
      rotation: { x: 0, y: 0, z: 0 },
      scale: testResult.visualizationScale,
      color: testResult.visualizationColor,
      visible: true,
      interactive: true,
      metadata: testResult
    };

    this.objectMetadata.set(testResult.metadata.id, sceneObject);

    // Add floating animation for failed tests
    if (testResult.status === 'failed') {
      this.addFloatingAnimation(mesh);
    }

    return sceneObject;
  }

  async addTestSuite(testSuite: TestSuite3D): Promise<SceneObject> {
    // Create a compound object for the test suite
    const group = new THREE.Group();
    
    // Base platform
    const platformGeometry = new THREE.CylinderGeometry(3, 3, 0.2, 8);
    const platformMaterial = new THREE.MeshPhongMaterial({
      color: testSuite.successRate > 0.8 ? 0x00ff00 : 
             testSuite.successRate > 0.5 ? 0xffff00 : 0xff0000,
      transparent: true,
      opacity: 0.7
    });
    
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.castShadow = true;
    platform.receiveShadow = true;
    group.add(platform);

    // Height indicator (success tower)
    const towerHeight = testSuite.visualizationHeight;
    const towerGeometry = new THREE.CylinderGeometry(0.3, 0.5, towerHeight, 6);
    const towerMaterial = new THREE.MeshPhongMaterial({
      color: 0x4444ff,
      transparent: true,
      opacity: 0.8
    });
    
    const tower = new THREE.Mesh(towerGeometry, towerMaterial);
    tower.position.y = towerHeight / 2;
    tower.castShadow = true;
    group.add(tower);

    group.position.set(
      testSuite.position.x,
      testSuite.position.y,
      testSuite.position.z
    );
    
    group.userData = { suiteId: testSuite.name, type: 'suite' };
    this.scene.add(group);
    this.sceneObjects.set(testSuite.name, group);

    const sceneObject: SceneObject = {
      id: testSuite.name,
      type: 'suite',
      position: testSuite.position,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: { r: 0.3, g: 0.3, b: 1 },
      visible: true,
      interactive: true,
      metadata: testSuite
    };

    this.objectMetadata.set(testSuite.name, sceneObject);

    return sceneObject;
  }

  async updateTestResult(testId: string, testResult: TestResult3D): Promise<void> {
    const object = this.sceneObjects.get(testId);
    if (!object || !(object instanceof THREE.Mesh)) return;

    // Update material color based on new status
    const material = object.material as THREE.MeshPhongMaterial;
    const color = testResult.visualizationColor;
    material.color.setRGB(color.r, color.g, color.b);

    // Update position if changed
    object.position.set(
      testResult.position.x,
      testResult.position.y,
      testResult.position.z
    );

    // Update scale
    const scale = testResult.visualizationScale;
    object.scale.set(scale.x, scale.y, scale.z);

    // Update metadata
    const sceneObject = this.objectMetadata.get(testId);
    if (sceneObject) {
      sceneObject.metadata = testResult;
      this.objectMetadata.set(testId, sceneObject);
    }
  }

  async removeTestResult(testId: string): Promise<void> {
    const object = this.sceneObjects.get(testId);
    if (object) {
      this.scene.remove(object);
      this.sceneObjects.delete(testId);
      this.objectMetadata.delete(testId);
      
      // Dispose geometry and material
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    }
  }

  async animateObject(
    objectId: string, 
    targetTransform: Partial<SceneObject>, 
    config: AnimationConfig
  ): Promise<void> {
    const object = this.sceneObjects.get(objectId);
    if (!object) return;

    // Create GSAP-like animation using Three.js
    // For simplicity, using basic animation here
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / config.duration, 1);
      
      if (targetTransform.position) {
        object.position.lerp(
          new THREE.Vector3(
            targetTransform.position.x!,
            targetTransform.position.y!,
            targetTransform.position.z!
          ),
          progress
        );
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  async createConnection(
    fromTestId: string, 
    toTestId: string, 
    connectionType: 'dependency' | 'sequence' | 'parent-child'
  ): Promise<SceneObject> {
    const fromObject = this.sceneObjects.get(fromTestId);
    const toObject = this.sceneObjects.get(toTestId);
    
    if (!fromObject || !toObject) {
      throw new Error('Cannot create connection: one or both objects not found');
    }

    const points = [fromObject.position, toObject.position];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    const color = connectionType === 'dependency' ? 0xff0000 :
                  connectionType === 'sequence' ? 0x00ff00 : 0x0000ff;
    
    const material = new THREE.LineBasicMaterial({ 
      color,
      transparent: true,
      opacity: 0.6
    });
    
    const line = new THREE.Line(geometry, material);
    const connectionId = `${fromTestId}-${toTestId}`;
    line.userData = { connectionId, type: 'connection' };
    
    this.scene.add(line);
    this.sceneObjects.set(connectionId, line);

    const sceneObject: SceneObject = {
      id: connectionId,
      type: 'connection',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: { r: color >> 16 & 255, g: color >> 8 & 255, b: color & 255 },
      visible: true,
      interactive: false
    };

    this.objectMetadata.set(connectionId, sceneObject);
    return sceneObject;
  }

  async addLabel(objectId: string, text: string, position: Vector3D): Promise<SceneObject> {
    // Create HTML element for label
    const labelDiv = document.createElement('div');
    labelDiv.textContent = text;
    labelDiv.style.marginTop = '-1em';
    labelDiv.style.color = 'white';
    labelDiv.style.fontSize = '12px';
    labelDiv.style.fontFamily = 'Arial, sans-serif';
    labelDiv.style.textAlign = 'center';
    labelDiv.style.background = 'rgba(0,0,0,0.7)';
    labelDiv.style.padding = '4px 8px';
    labelDiv.style.borderRadius = '4px';

    const cssObject = new CSS3DObject(labelDiv);
    cssObject.position.set(position.x, position.y + 2, position.z);
    cssObject.scale.setScalar(0.01);

    this.scene.add(cssObject);

    const labelId = `${objectId}-label`;
    this.sceneObjects.set(labelId, cssObject);

    const sceneObject: SceneObject = {
      id: labelId,
      type: 'label',
      position,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: { r: 1, g: 1, b: 1 },
      visible: true,
      interactive: false,
      metadata: { text, parentObjectId: objectId }
    };

    this.objectMetadata.set(labelId, sceneObject);
    return sceneObject;
  }

  async setCameraPosition(position: Vector3D, target: Vector3D): Promise<void> {
    this.camera.position.set(position.x, position.y, position.z);
    this.controls.target.set(target.x, target.y, target.z);
    this.controls.update();
  }

  async animateCamera(targetState: CameraState, config: AnimationConfig): Promise<void> {
    // Implement camera animation
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / config.duration, 1);
      
      this.camera.position.lerpVectors(
        startPosition,
        new THREE.Vector3(targetState.position.x, targetState.position.y, targetState.position.z),
        progress
      );
      
      this.controls.target.lerpVectors(
        startTarget,
        new THREE.Vector3(targetState.target.x, targetState.target.y, targetState.target.z),
        progress
      );
      
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  setObjectInteractive(objectId: string, interactive: boolean): void {
    const sceneObject = this.objectMetadata.get(objectId);
    if (sceneObject) {
      sceneObject.interactive = interactive;
      this.objectMetadata.set(objectId, sceneObject);
    }
  }

  onObjectInteraction(callback: (objectId: string, interaction: 'click' | 'hover' | 'select') => void): void {
    this.interactionCallbacks.push(callback);
  }

  updateLighting(ambientColor: Color, directionalColor: Color, intensity: number): void {
    // Remove existing lights
    const lightsToRemove = this.scene.children.filter(child => child instanceof THREE.Light);
    lightsToRemove.forEach(light => this.scene.remove(light));

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(
      new THREE.Color(ambientColor.r, ambientColor.g, ambientColor.b),
      0.4
    );
    this.scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(
      new THREE.Color(directionalColor.r, directionalColor.g, directionalColor.b),
      intensity
    );
    directionalLight.position.set(10, 15, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
  }

  render(): void {
    if (!this.isInitialized) return;

    // Update controls
    this.controls.update();

    // Update animations
    const delta = this.clock.getDelta();
    this.mixer.update(delta);

    // Render both scenes
    this.renderer.render(this.scene, this.camera);
    this.cssRenderer.render(this.scene, this.camera);

    // Update render stats
    this.updateRenderStats();
  }

  startRenderLoop(): void {
    if (this.isRenderLoopActive) return;
    
    this.isRenderLoopActive = true;
    
    const animate = () => {
      if (!this.isRenderLoopActive) return;
      
      requestAnimationFrame(animate);
      this.render();
    };
    
    animate();
  }

  stopRenderLoop(): void {
    this.isRenderLoopActive = false;
  }

  getRenderStats(): RenderStats {
    return { ...this.renderStats };
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.cssRenderer.setSize(width, height);
  }

  clearScene(): void {
    // Remove all objects except lights and helpers
    const objectsToRemove = this.scene.children.filter(child => 
      !(child instanceof THREE.Light) && 
      !(child instanceof THREE.GridHelper) &&
      !(child instanceof THREE.AxesHelper)
    );
    
    objectsToRemove.forEach(object => {
      this.scene.remove(object);
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    this.sceneObjects.clear();
    this.objectMetadata.clear();
  }

  dispose(): void {
    this.stopRenderLoop();
    this.clearScene();
    this.renderer.dispose();
    this.controls.dispose();
    
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    if (this.container.contains(this.cssRenderer.domElement)) {
      this.container.removeChild(this.cssRenderer.domElement);
    }
  }

  async exportImage(format: 'png' | 'jpg', quality: number = 0.9): Promise<Blob> {
    this.render();
    
    return new Promise((resolve) => {
      this.renderer.domElement.toBlob((blob) => {
        resolve(blob!);
      }, `image/${format}`, quality);
    });
  }

  setPerformanceMonitoring(enabled: boolean): void {
    // Enable/disable performance monitoring
    // This would typically integrate with performance monitoring tools
  }

  private createTestGeometry(testResult: TestResult3D): THREE.BufferGeometry {
    switch (testResult.status) {
      case 'passed':
        return new THREE.SphereGeometry(0.5, 8, 6);
      case 'failed':
        return new THREE.BoxGeometry(1, 1, 1);
      case 'skipped':
        return new THREE.CylinderGeometry(0.3, 0.3, 1, 6);
      case 'pending':
        return new THREE.ConeGeometry(0.5, 1, 6);
      default:
        return new THREE.OctahedronGeometry(0.5);
    }
  }

  private createTestMaterial(testResult: TestResult3D): THREE.Material {
    const color = testResult.visualizationColor;
    
    return new THREE.MeshPhongMaterial({
      color: new THREE.Color(color.r, color.g, color.b),
      transparent: color.a !== undefined,
      opacity: color.a || 1.0,
      emissive: testResult.status === 'failed' ? 
        new THREE.Color(0.1, 0, 0) : new THREE.Color(0, 0, 0)
    });
  }

  private addFloatingAnimation(mesh: THREE.Mesh): void {
    const originalY = mesh.position.y;
    
    const action = this.mixer.clipAction(
      new THREE.AnimationClip('float', 2, [
        new THREE.VectorKeyframeTrack(
          '.position',
          [0, 1, 2],
          [
            mesh.position.x, originalY, mesh.position.z,
            mesh.position.x, originalY + 0.5, mesh.position.z,
            mesh.position.x, originalY, mesh.position.z
          ]
        )
      ])
    );
    
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();
  }

  private setupInteractionHandlers(): void {
    const onMouseMove = (event: MouseEvent) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onClick = () => {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);
      
      if (intersects.length > 0) {
        const object = intersects[0].object;
        const userData = object.userData;
        
        if (userData.testId || userData.suiteId) {
          const objectId = userData.testId || userData.suiteId;
          const sceneObject = this.objectMetadata.get(objectId);
          
          if (sceneObject?.interactive) {
            this.interactionCallbacks.forEach(callback => 
              callback(objectId, 'click')
            );
          }
        }
      }
    };

    this.renderer.domElement.addEventListener('mousemove', onMouseMove);
    this.renderer.domElement.addEventListener('click', onClick);
  }

  private updateRenderStats(): void {
    const info = this.renderer.info;
    
    this.renderStats = {
      fps: Math.round(1 / this.clock.getDelta()),
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      points: info.render.points,
      lines: info.render.lines,
      memoryUsage: info.memory.geometries + info.memory.textures
    };
  }
}