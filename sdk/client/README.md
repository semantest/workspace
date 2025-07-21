# @semantest/client

Client library for the Semantest distributed testing framework. Provides WebSocket-based real-time communication with the Semantest server and React hooks for easy integration.

## Installation

```bash
npm install @semantest/client
```

## Features

- 🔌 WebSocket transport with automatic reconnection
- 🎣 React hooks for easy integration
- 📊 Real-time event subscription and handling
- 🎯 Request/response pattern support
- 🧩 Pre-built React components for test monitoring
- 💪 TypeScript support with full type definitions

## Quick Start

### Basic Usage

```typescript
import { SemantestClient } from '@semantest/client';

// Create client instance
const client = new SemantestClient({
  url: 'ws://localhost:8080',
  reconnect: true
});

// Connect to server
await client.connect();

// Send events
await client.send('test.started', {
  testId: '123',
  name: 'Login Test'
});

// Subscribe to events
client.subscribe('test.completed', (event) => {
  console.log('Test completed:', event.payload);
});

// Make requests
const response = await client.request('test.run', {
  testSuite: 'smoke-tests'
});
```

### React Integration

```tsx
import { useSemantestClient, TestMonitor, ConnectionStatus } from '@semantest/client';

function App() {
  const { client, connected, error } = useSemantestClient({
    url: 'ws://localhost:8080'
  });

  return (
    <div>
      <ConnectionStatus 
        connected={connected} 
        error={error} 
      />
      <TestMonitor client={client} />
    </div>
  );
}
```

## API Reference

### Client

#### `SemantestClient`

Main client class for WebSocket communication.

```typescript
const client = new SemantestClient(options: ClientOptions);
```

**Options:**
- `url` (string): WebSocket server URL
- `reconnect` (boolean): Enable auto-reconnection
- `reconnectInterval` (number): Reconnection interval in ms
- `timeout` (number): Request timeout in ms
- `defaultMetadata` (EventMetadata): Default metadata for all events

**Methods:**
- `connect(): Promise<void>` - Connect to server
- `disconnect(): Promise<void>` - Disconnect from server
- `send<T>(type: string, payload: T, metadata?: EventMetadata): Promise<void>` - Send event
- `subscribe<T>(type: string, handler: EventHandler<T>): () => void` - Subscribe to events
- `unsubscribe<T>(type: string, handler: EventHandler<T>): void` - Unsubscribe from events
- `subscribeOnce<T>(type: string, handler: EventHandler<T>): () => void` - One-time subscription
- `request<TReq, TRes>(method: string, payload: TReq): Promise<TRes>` - Make request
- `isConnected(): boolean` - Check connection status

### React Hooks

#### `useSemantestClient`

Main hook for creating and managing a client instance.

```tsx
const { client, connected, connecting, error, send, request } = useSemantestClient(options);
```

#### `useEventSubscription`

Subscribe to specific event types.

```tsx
useEventSubscription(client, 'test.completed', (event) => {
  console.log('Test completed:', event);
});
```

#### `useEventValue`

Track the latest value of an event type.

```tsx
const { value, loading, error } = useEventValue(client, 'test.progress');
```

#### `useEventCollector`

Collect a history of events.

```tsx
const { events, clear } = useEventCollector(client, 'test.*', 100);
```

#### `useRequest`

Make requests with loading and error states.

```tsx
const { execute, loading, error, data } = useRequest(client);

const handleRunTests = async () => {
  const result = await execute('test.run', { testSuite: 'smoke' });
};
```

### Components

#### `<TestMonitor />`

Real-time test execution monitor with progress tracking and result filtering.

```tsx
<TestMonitor client={client} className="my-4" />
```

#### `<TestRunner />`

Test execution control panel.

```tsx
<TestRunner 
  client={client} 
  onTestStart={(runId) => console.log('Started:', runId)} 
/>
```

#### `<ConnectionStatus />`

WebSocket connection status indicator.

```tsx
<ConnectionStatus 
  connected={connected}
  connecting={connecting}
  error={error}
  url="ws://localhost:8080"
/>
```

## Event Types

The client supports subscribing to any event type. Common patterns include:

- `test.*` - All test-related events
- `test.started` - Test execution started
- `test.completed` - Test execution completed
- `test.failed` - Test failed
- `test.progress` - Test progress updates
- `browser.*` - Browser-related events
- `system.*` - System events

## Examples

See the [examples/react-app](../../examples/react-app) directory for a complete React application demonstrating all features.

## License

MIT