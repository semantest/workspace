# Integration Guide for Backend Engineers

## Backend Engineer 2 → Backend Engineer 1 Integration Points

### Overview
Backend Engineer 2 has completed the test orchestration system with the following components:
- Test orchestration and state management
- Event persistence (SQLite)
- Plugin system for extensibility  
- Security layer (validation, rate limiting, access control)

### Key Integration Points

#### 1. Event Handling
The orchestration system needs to receive all test-related events from the WebSocket server:

```typescript
// In your WebSocket message handler
import { createOrchestratorIntegration } from './orchestration';

const orchestration = createOrchestratorIntegration();
const handlers = orchestration.createWebSocketHandlers();

// When receiving an event message
if (message.type === 'event') {
  await handlers.onEvent(message.payload);
}
```

#### 2. Test Run Management
Add handlers for test run lifecycle commands:

```typescript
// Start test run
case 'startTestRun':
  const status = await handlers.onStartTestRun(message.payload);
  client.send(JSON.stringify({ type: 'testRunStarted', payload: status }));
  break;

// End test run  
case 'endTestRun':
  const finalStatus = await handlers.onEndTestRun(message.payload.runId);
  client.send(JSON.stringify({ type: 'testRunEnded', payload: finalStatus }));
  break;
```

#### 3. Security Integration
Use the security middleware to validate events before processing:

```typescript
// Validate event
const validation = await handlers.onValidateEvent(event);
if (!validation.valid) {
  // Send error response
  return;
}
```

#### 4. Event Types to Handle
The orchestration system specifically handles these event types:
- `test/start` - Test execution started
- `test/end` - Test execution completed
- `test/suite/start` - Test suite started
- `test/suite/end` - Test suite completed
- `system/client/connect` - Client connected
- `system/client/disconnect` - Client disconnected

#### 5. Query Endpoints
Add handlers for querying test execution state:

```typescript
// Get active test runs
case 'getActiveRuns':
  const runs = handlers.onGetActiveRuns();
  client.send(JSON.stringify({ type: 'activeRuns', payload: runs }));
  break;

// Get run status
case 'getRunStatus':
  const status = handlers.onGetRunStatus(message.payload.runId);
  client.send(JSON.stringify({ type: 'runStatus', payload: status }));
  break;

// Get statistics
case 'getStatistics':
  const stats = await handlers.onGetStatistics();
  client.send(JSON.stringify({ type: 'statistics', payload: stats }));
  break;
```

### Complete Integration Example

See `example/orchestrated-server.js` for a complete integration example that shows:
- How to create the orchestration system
- How to override the WebSocket message handler
- How to handle orchestration-specific messages
- How to gracefully shutdown

### Architecture Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Test Clients   │────▶│ WebSocket Server │────▶│  Orchestration  │
│  (CLI/Browser)  │     │  (Engineer 1)    │     │  (Engineer 2)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                           │
                               ▼                           ▼
                        ┌──────────────┐           ┌──────────────┐
                        │   Message     │           │   SQLite     │
                        │   Router      │           │  Database    │
                        └──────────────┘           └──────────────┘
```

### Required Changes to WebSocket Server

1. **Import orchestration module**:
   ```typescript
   import { createOrchestratorIntegration } from './orchestration';
   ```

2. **Initialize orchestration**:
   ```typescript
   const orchestration = createOrchestratorIntegration({
     dbPath: './test-results.db',
     securityPolicy: { /* ... */ }
   });
   ```

3. **Integrate handlers** into message processing pipeline

4. **Add graceful shutdown**:
   ```typescript
   await orchestration.shutdown();
   ```

### Testing the Integration

1. Start the orchestrated server:
   ```bash
   node example/orchestrated-server.js
   ```

2. Send test events:
   ```javascript
   ws.send(JSON.stringify({
     type: 'event',
     payload: {
       id: 'evt-123',
       type: 'test/start',
       timestamp: Date.now(),
       payload: {
         testId: 'test-1',
         testName: 'Login Test'
       }
     }
   }));
   ```

3. Query active runs:
   ```javascript
   ws.send(JSON.stringify({
     type: 'getActiveRuns'
   }));
   ```

### Notes

- The orchestration system is designed to be non-intrusive
- All existing WebSocket functionality remains unchanged
- Security validation is optional but recommended
- Event persistence happens automatically for all handled events
- Plugins can be added for custom reporting, notifications, etc.