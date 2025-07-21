const WebSocket = require('ws');

// Connect to server
const ws = new WebSocket('ws://localhost:8080');

// Client ID (normally would come from server)
let clientId = null;

ws.on('open', () => {
  console.log('Connected to server');
  
  // Subscribe to test events
  ws.send(JSON.stringify({
    id: Date.now().toString(),
    type: 'subscribe',
    timestamp: Date.now(),
    payload: {
      eventTypes: ['test.*', 'server.status', 'broadcast.*']
    }
  }));
  
  // Send a test event
  setTimeout(() => {
    ws.send(JSON.stringify({
      id: Date.now().toString(),
      type: 'event',
      timestamp: Date.now(),
      payload: {
        id: Date.now().toString(),
        type: 'test.hello',
        timestamp: Date.now(),
        payload: { message: 'Hello from client!' }
      }
    }));
  }, 1000);
  
  // Send a broadcast event
  setTimeout(() => {
    ws.send(JSON.stringify({
      id: Date.now().toString(),
      type: 'event',
      timestamp: Date.now(),
      payload: {
        id: Date.now().toString(),
        type: 'broadcast.announcement',
        timestamp: Date.now(),
        payload: { message: 'This should be broadcast to all clients!' }
      }
    }));
  }, 2000);
  
  // Test request/response
  setTimeout(() => {
    ws.send(JSON.stringify({
      id: Date.now().toString(),
      type: 'request',
      timestamp: Date.now(),
      method: 'server.info',
      payload: {}
    }));
  }, 3000);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  if (message.type === 'event' && message.payload.type === 'system.connected') {
    clientId = message.payload.payload.clientId;
    console.log(`Assigned client ID: ${clientId}`);
  } else if (message.type === 'response') {
    console.log('Response:', message);
  } else if (message.type === 'event') {
    console.log(`Event [${message.payload.type}]:`, message.payload.payload);
  } else {
    console.log('Message:', message);
  }
});

ws.on('ping', () => {
  console.log('Received ping from server');
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Disconnected from server');
  process.exit(0);
});

// Send periodic test events
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      id: Date.now().toString(),
      type: 'event',
      timestamp: Date.now(),
      payload: {
        id: Date.now().toString(),
        type: 'test.ping',
        timestamp: Date.now(),
        payload: { 
          clientId,
          timestamp: Date.now() 
        }
      }
    }));
  }
}, 10000);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  ws.close();
});

process.on('SIGINT', () => {
  ws.close();
});