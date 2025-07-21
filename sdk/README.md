# Semantest SDK

Type-safe distributed testing framework SDK for domain event communication.

## Architecture Overview

```
@semantest/core         - Core types and interfaces
@semantest/contracts    - Domain event contracts
@semantest/client       - WebSocket client library
@semantest/server       - WebSocket server implementation
```

## Packages

### @semantest/core

Core types, interfaces, and utilities shared across all packages:
- Base event interfaces
- Error types
- Validation utilities
- Common constants

### @semantest/contracts

Type-safe domain event definitions:
- UI interaction events (click, type, submit)
- Test events (start, progress, complete)
- System events (log, error, metric)
- Custom domain events

### @semantest/client

WebSocket client for event communication:
- Auto-reconnection
- Event queuing
- Type-safe event emitters
- Promise-based responses

### @semantest/server

WebSocket server for event distribution:
- Event routing
- Client management
- Event persistence
- Plugin system

## Usage Example

```typescript
import { createClient } from '@semantest/client';
import { TestEvents } from '@semantest/contracts';

const client = await createClient({
  url: 'ws://localhost:8080'
});

// Type-safe event emission
await client.emit(TestEvents.StartTest, {
  testId: 'test-123',
  suite: 'e2e',
  browser: 'chrome'
});

// Listen for events
client.on(TestEvents.TestComplete, (event) => {
  console.log('Test completed:', event.testId);
});
```

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Start development server
npm run dev
```