# Test Orchestration System

The Semantest orchestration system coordinates distributed test execution, manages test state, persists events, and provides extensibility through plugins.

## Architecture Components

### 1. Test Orchestrator (`TestOrchestrator`)
The main coordinator that manages test execution lifecycle:
- Handles test and suite lifecycle events
- Manages test run configurations
- Coordinates with plugins for extensibility
- Implements retry logic and failure handling

### 2. Test State Manager (`TestStateManager`)
Tracks real-time state of tests and suites:
- Manages test execution contexts and results
- Tracks test assertions, screenshots, and logs
- Maintains suite-to-test relationships
- Provides statistics and active test queries

### 3. Event Persistence (`EventPersistence`)
SQLite-based storage for events and test results:
- Stores all events with full payload and metadata
- Persists test runs, results, and suite outcomes
- Supports event replay for recovery and analysis
- Provides cleanup and statistics capabilities

### 4. Plugin System (`PluginManager`)
Extensible architecture for custom functionality:
- Lifecycle hooks for test runs, tests, and suites
- Event filtering and transformation
- Error handling with fallback mechanisms
- Configurable execution order

### 5. Security Middleware (`SecurityMiddleware`)
Comprehensive security layer:
- Event validation against schemas
- Rate limiting per client (sliding window)
- Access control with authentication support
- Content security scanning

## Usage Example

```typescript
import { createOrchestratorIntegration } from '@semantest/server';

// Create orchestration system
const orchestration = createOrchestratorIntegration({
  dbPath: './test-results.db',
  securityPolicy: {
    maxEventsPerSecond: 100,
    maxEventSize: 1024 * 1024, // 1MB
    requireAuthentication: false
  }
});

// Get components
const orchestrator = orchestration.getOrchestrator();
const security = orchestration.getSecurity();

// Register custom plugin
await orchestrator.registerPlugin({
  name: 'my-plugin',
  version: '1.0.0',
  hooks: {
    afterTest: async (context, result) => {
      console.log(`Test ${result.testId} completed with status: ${result.status}`);
    }
  }
});

// Start a test run
const testRun = await orchestrator.startTestRun({
  runId: 'run-123',
  name: 'Regression Suite',
  browsers: ['chrome', 'firefox'],
  parallel: true,
  maxConcurrency: 4
});

// Handle events from WebSocket
const handlers = orchestration.createWebSocketHandlers();
await handlers.onEvent(incomingEvent);

// Query active runs
const activeRuns = orchestrator.getActiveRuns();

// Get security metrics
const metrics = security.getMetrics();

// Shutdown gracefully
await orchestration.shutdown();
```

## Plugin Development

### Basic Plugin Structure

```typescript
import { Plugin } from '@semantest/server';

export class MyPlugin implements Plugin {
  name = 'my-plugin';
  version = '1.0.0';

  hooks = {
    // Called before test run starts
    beforeTestRun: async (config) => {
      console.log(`Starting test run: ${config.runId}`);
    },

    // Called after each test completes
    afterTest: async (context, result) => {
      if (result.status === 'failed') {
        // Handle test failure
      }
    },

    // Filter/transform events
    onEvent: (event) => {
      // Modify or filter event
      return event; // or null to filter out
    },

    // Handle errors
    onError: async (error, context) => {
      console.error('Plugin error:', error);
    }
  };

  // Optional initialization
  async initialize() {
    // Setup resources
  }

  // Optional cleanup
  async destroy() {
    // Cleanup resources
  }
}
```

### Available Hooks

- `beforeTestRun` / `afterTestRun` - Test run lifecycle
- `beforeTest` / `afterTest` - Individual test lifecycle  
- `beforeSuite` / `afterSuite` - Test suite lifecycle
- `onEvent` - Event filtering and transformation
- `onError` - Error handling

## Security Configuration

### Rate Limiting
```typescript
// Configure rate limits
security.updatePolicy({
  maxEventsPerSecond: 50
});

// Check client rate limit stats
const stats = security.getRateLimitStats('client-123');
console.log(`Remaining: ${stats.remaining}/${stats.limit}`);
```

### Access Control
```typescript
// Enable authentication
security.updatePolicy({
  requireAuthentication: true,
  allowedClients: ['client-123', 'client-456']
});

// Add allowed event types
security.updatePolicy({
  allowedEventTypes: ['test/start', 'test/end', 'test/assert']
});
```

## Event Replay

Replay events for recovery or analysis:

```typescript
// Replay events from time range
const startTime = Date.now() - (60 * 60 * 1000); // 1 hour ago
const endTime = Date.now();

await orchestrator.replayEvents(startTime, endTime);
```

## Database Schema

### Events Table
- `id`: Event unique identifier
- `type`: Event type (e.g., 'test/start')
- `timestamp`: Event occurrence time
- `payload`: JSON event data
- `metadata`: JSON metadata

### Test Results Table
- `test_id`: Test identifier
- `run_id`: Test run identifier
- `status`: Test status (passed/failed/skipped)
- `duration`: Execution time in ms
- `error`: Error details if failed
- `assertions_*`: Assertion counts
- `screenshots`: Screenshot paths
- `logs`: Test logs

## Performance Considerations

1. **Rate Limiting**: Prevents DoS attacks and resource exhaustion
2. **Event Batching**: Use `saveEvents()` for bulk operations
3. **Database Optimization**: WAL mode enabled for better concurrency
4. **Cleanup**: Regularly clean old events with `cleanupOldEvents()`

## Integration with WebSocket Server

The orchestration system integrates seamlessly with the WebSocket server:

```typescript
// In your WebSocket server
import { createOrchestratorIntegration } from '@semantest/server';

const orchestration = createOrchestratorIntegration();
const handlers = orchestration.createWebSocketHandlers();

// Wire up handlers
ws.on('message', async (data) => {
  const message = JSON.parse(data);
  
  if (message.type === 'event') {
    await handlers.onEvent(message.payload);
  } else if (message.type === 'startTestRun') {
    const status = await handlers.onStartTestRun(message.payload);
    ws.send(JSON.stringify({ type: 'testRunStarted', payload: status }));
  }
  // ... other handlers
});
```

## Monitoring and Metrics

Get system metrics for monitoring:

```typescript
// Persistence metrics
const dbStats = await orchestration.getPersistence().getStatistics();
console.log(`Total events: ${dbStats.totalEvents}`);
console.log(`Database size: ${dbStats.databaseSize} bytes`);

// Security metrics  
const securityMetrics = orchestration.getSecurity().getMetrics();
console.log(`Events validated: ${securityMetrics.totalValidations}`);
console.log(`Rate limit exceeded: ${securityMetrics.rateLimitExceeded}`);

// Test execution stats
const testStats = orchestrator.getStateManager().getTestStats();
console.log(`Active tests: ${testStats.active}`);
console.log(`Pass rate: ${(testStats.passed / testStats.total * 100).toFixed(2)}%`);
```