const { WebSocketServer } = require('../dist');
const config = require('./server-config');

// Create server instance with configuration
const server = new WebSocketServer(config);

console.log(`Configuring WebSocket server on port ${config.port}...`);

// Handle server events
server.on('started', ({ port, host }) => {
  console.log(`WebSocket server started on ${host}:${port}`);
});

server.on('client:connected', (clientInfo) => {
  console.log(`Client connected: ${clientInfo.id}`);
});

server.on('client:disconnected', (clientInfo) => {
  console.log(`Client disconnected: ${clientInfo.id}`);
});

server.on('event', (event) => {
  console.log(`Received event: ${event.type}`, event.payload);
  
  // Example: broadcast events to all clients
  if (event.type.startsWith('broadcast.')) {
    server.broadcast(event);
  }
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

// Start the server
async function start() {
  try {
    await server.start();
    console.log('Semantest WebSocket server is running!');
    
    // Example: Send periodic server status
    setInterval(() => {
      const clients = server.getClients();
      server.broadcast({
        id: Date.now().toString(),
        type: 'server.status',
        timestamp: Date.now(),
        payload: {
          connectedClients: clients.length,
          uptime: process.uptime()
        }
      });
    }, 60000); // Every minute
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

// Start the server
start();