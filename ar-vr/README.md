# @semantest/ar-vr

Immersive test visualization module for the Semantest platform, providing AR/VR capabilities for 3D test result visualization.

## Features

- **WebXR Integration**: Support for VR and AR devices using WebXR standards
- **3D Test Visualization**: Transform test results into immersive 3D environments
- **Multiple Visualization Types**: Scatter plots, hierarchical trees, timelines, and network graphs
- **Real-time Updates**: Live test execution visualization with performance monitoring
- **Hand Tracking**: Natural gesture-based interaction with test objects
- **Spatial Anchors**: Persistent placement of test suites in AR environments
- **Cross-platform**: Works with major VR/AR devices and browsers

## Quick Start

```typescript
import { createARVRDemo } from '@semantest/ar-vr';

// Create demo in a container element
const container = document.getElementById('ar-vr-container');
const demo = createARVRDemo(container);

// Initialize and start VR session
await demo.initialize();
const sessionId = await demo.startVRSession();

// Load demo test results
await demo.visualizeDemoTestResults();
```

## Architecture

### Domain Layer
- **Value Objects**: `TestResult3D`, `TestSuite3D`, `TestVisualizationConfig`
- **Entities**: `VisualizationSession`
- **Events**: Visualization lifecycle and interaction events

### Application Layer
- **TestVisualizationService**: Main service for creating immersive test visualizations

### Infrastructure Layer
- **ThreeVisualizationEngineAdapter**: 3D rendering using Three.js
- **WebXRAdapter**: WebXR device integration for VR/AR

## Supported Devices

### VR Headsets
- Meta Quest 2/3/Pro
- HTC Vive series
- Valve Index
- Pico 4 Enterprise
- Any WebXR-compatible VR device

### AR Devices
- Meta Quest 3 (Mixed Reality)
- HoloLens 2
- Magic Leap 2
- WebXR-compatible mobile devices

### Fallback Support
- Desktop browsers with mouse/keyboard interaction
- Touch-enabled devices
- Any device supporting WebGL

## Test Visualization Types

### 3D Scatter Plot
```typescript
await visualizationService.visualizeTestResults(
  testResults,
  testSuites,
  '3d_scatter'
);
```
- Tests positioned by status, priority, and execution time
- Color-coded by pass/fail status
- Size indicates test complexity or duration

### Hierarchical Tree
```typescript
await visualizationService.visualizeTestResults(
  testResults,
  testSuites,
  'hierarchical_tree'
);
```
- Test suites as parent nodes
- Individual tests as child nodes
- Connections show test relationships

### Timeline View
```typescript
await visualizationService.visualizeTestResults(
  testResults,
  testSuites,
  'timeline'
);
```
- Tests arranged chronologically
- Duration represented by object length
- Parallel execution shown in 3D space

### Network Graph
```typescript
await visualizationService.visualizeTestResults(
  testResults,
  testSuites,
  'network_graph'
);
```
- Tests connected by dependencies
- Clusters show related functionality
- Failed tests highlighted with connections to related tests

## Interaction Methods

### Hand Tracking (VR/AR)
- **Pinch**: Select test objects
- **Grab**: Move camera or objects
- **Point**: Highlight related tests
- **Swipe**: Navigate between visualizations

### Controller Input (VR)
- Trigger button for selection
- Joystick for navigation
- Menu button for options

### Mouse/Touch (Desktop/Mobile)
- Click to select tests
- Drag to rotate camera
- Scroll to zoom
- Right-click for context menu

## Performance Optimization

The module includes built-in performance monitoring and optimization:

- **Level-of-Detail (LOD)**: Reduce geometry complexity at distance
- **Occlusion Culling**: Hide objects not in view
- **Instanced Rendering**: Efficient rendering of similar objects
- **Memory Management**: Automatic cleanup of unused resources

```typescript
const config = TestVisualizationConfig.createDefault();
config.performance = {
  maxObjects: 1000,
  lodDistance: 50,
  shadowQuality: 'medium',
  antiAliasing: true,
  targetFPS: 60
};
```

## Integration with Test Frameworks

### Jest Integration
```typescript
import { TestVisualizationService } from '@semantest/ar-vr';

// Convert Jest results to visualization format
const convertJestResults = (jestResults) => {
  return jestResults.testResults.map(result => ({
    id: result.testPath,
    name: result.testResults[0].title,
    status: result.testResults[0].status,
    duration: result.testResults[0].duration,
    // ... additional mapping
  }));
};
```

### Cypress Integration
```typescript
// In cypress/support/commands.js
Cypress.Commands.add('visualizeTest', (testResult) => {
  // Send test result to AR/VR visualization
});
```

### Custom Test Frameworks
Implement the `TestFrameworkResult` and `TestFrameworkSuite` interfaces:

```typescript
interface TestFrameworkResult {
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
```

## Configuration

### Theme Customization
```typescript
const config = TestVisualizationConfig.createDefault();
config.theme = {
  success: { r: 0.2, g: 0.8, b: 0.2 },
  failure: { r: 0.8, g: 0.2, b: 0.2 },
  pending: { r: 0.8, g: 0.8, b: 0.2 },
  skipped: { r: 0.5, g: 0.5, b: 0.5 },
  warning: { r: 0.8, g: 0.5, b: 0.2 },
  background: { r: 0.1, g: 0.1, b: 0.15 },
  text: { r: 0.9, g: 0.9, b: 0.9 }
};
```

### Interaction Settings
```typescript
config.interaction = {
  enableHandTracking: true,
  enableGazeInput: true,
  enableVoiceCommands: false,
  gestureThresholds: {
    pinch: 0.5,
    grab: 0.7,
    point: 0.8
  }
};
```

## Events

The module emits domain events for integration:

```typescript
// Listen for visualization events
visualizationSession.on('TestObjectInteracted', (event) => {
  console.log('User interacted with test:', event.testId);
});

visualizationSession.on('VisualizationPerformanceAlert', (event) => {
  if (event.severity === 'critical') {
    // Reduce quality settings
  }
});
```

## Browser Support

- Chrome 90+ (WebXR support)
- Firefox 90+ (WebXR support)
- Edge 90+ (WebXR support)
- Safari 15+ (Limited WebXR, WebGL fallback)

## Dependencies

- Three.js: 3D rendering engine
- WebXR Device API: VR/AR device integration
- GSAP: Animations and transitions
- TypeScript: Type safety and development experience

## Development

```bash
# Install dependencies
npm install

# Build the module
npm run build

# Run tests
npm test

# Start development server
npm run dev
```

## Contributing

This module follows the Semantest project guidelines:

1. Domain-Driven Design architecture
2. Event-driven communication
3. Comprehensive test coverage
4. TypeScript strict mode
5. Performance-first approach

## License

GPL-3.0 - See LICENSE file for details.

## Roadmap

- [ ] Eye tracking integration
- [ ] Voice command support
- [ ] Multi-user collaborative sessions
- [ ] Cloud-based test result streaming
- [ ] AI-powered test insights
- [ ] Custom shader support
- [ ] WebAssembly performance optimizations