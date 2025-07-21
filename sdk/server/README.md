# @semantest/server

WebSocket server for the Semantest distributed testing framework.

## Features

- ✅ WebSocket server with heartbeat/ping-pong
- ✅ Event-based publish/subscribe pattern
- ✅ Request/response correlation
- ✅ Client connection management
- ✅ Message routing and broadcasting
- ✅ Graceful shutdown
- ✅ TypeScript support

## Installation

```bash
npm install @semantest/server
```

## Usage

```javascript
const { WebSocketServer } = require('@semantest/server');

// Create server
const server = new WebSocketServer({
  port: 8080,
  host: '0.0.0.0',
  maxConnections: 1000,
  heartbeatInterval: 30000,
  requestTimeout: 30000
});

// Handle events
server.on('client:connected', (clientInfo) => {
  console.log(`Client connected: ${clientInfo.id}`);
});

server.on('event', (event) => {
  console.log(`Event received: ${event.type}`);
});

// Start server
await server.start();
```

## Message Types

### Event Message
```json
{
  "id": "unique-id",
  "type": "event",
  "timestamp": 1234567890,
  "payload": {
    "id": "event-id",
    "type": "test.started",
    "timestamp": 1234567890,
    "payload": { "testId": "123" }
  }
}
```

### Subscribe Message
```json
{
  "id": "unique-id",
  "type": "subscribe",
  "timestamp": 1234567890,
  "payload": {
    "eventTypes": ["test.*", "browser.*"]
  }
}
```

### Request/Response
```json
// Request
{
  "id": "request-id",
  "type": "request",
  "timestamp": 1234567890,
  "method": "server.info",
  "payload": {}
}

// Response
{
  "id": "response-id",
  "type": "response",
  "timestamp": 1234567890,
  "requestId": "request-id",
  "success": true,
  "payload": { "version": "0.1.0" }
}
```

## API

### WebSocketServer

#### Constructor Options
- `port` (number): Server port
- `host` (string): Server host (default: '0.0.0.0')
- `maxConnections` (number): Maximum client connections (default: 1000)
- `heartbeatInterval` (number): Heartbeat interval in ms (default: 30000)
- `requestTimeout` (number): Request timeout in ms (default: 30000)

#### Methods
- `start()`: Start the server
- `stop()`: Stop the server gracefully
- `broadcast(event)`: Broadcast event to all clients
- `getClients()`: Get array of connected client info

#### Events
- `started`: Server started
- `stopped`: Server stopped
- `client:connected`: Client connected
- `client:disconnected`: Client disconnected
- `client:error`: Client error
- `event`: Event received from client
- `error`: Server error

## Examples

See the `example/` directory for:
- `server.js` - Example server implementation
- `client.js` - Example client implementation