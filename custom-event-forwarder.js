#!/usr/bin/env node

/**
 * Custom Event Forwarder for Semantest WebSocket Server
 * 
 * This script creates a WebSocket server that:
 * 1. Accepts connections from both the extension and the event generator
 * 2. Forwards semantest/custom/* events to all connected clients
 * 3. Works around the event type mismatch issue
 */

const WebSocket = require('ws');

const PORT = 3004;
const server = new WebSocket.Server({ port: PORT });
const clients = new Set();

console.log(`🚀 Custom Event Forwarder started on ws://localhost:${PORT}`);
console.log('📋 This server will forward semantest/custom/* events to all clients');
console.log('');

// Track connected clients
server.on('connection', (ws, req) => {
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const clientInfo = {
    id: clientId,
    ws: ws,
    connectedAt: new Date(),
    ip: req.socket.remoteAddress
  };
  
  clients.add(clientInfo);
  console.log(`✅ Client connected: ${clientId} from ${clientInfo.ip}`);
  
  // Send welcome message
  ws.send(JSON.stringify({
    id: `msg-${Date.now()}`,
    type: 'event',
    timestamp: Date.now(),
    payload: {
      id: `evt-${Date.now()}`,
      type: 'system.connected',
      timestamp: Date.now(),
      payload: { 
        clientId,
        message: 'Connected to custom event forwarder'
      }
    }
  }));
  
  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 Received from ${clientId}:`, message.type);
      
      // Check if this is an event message
      if (message.type === 'event' && message.payload) {
        const eventType = message.payload.type;
        console.log(`📋 Event type: ${eventType}`);
        
        // Forward semantest/custom/* events to all OTHER clients
        if (eventType && eventType.startsWith('semantest/custom/')) {
          console.log(`🔄 Forwarding ${eventType} to ${clients.size - 1} other clients`);
          
          // Send to all clients except the sender
          clients.forEach(client => {
            if (client.id !== clientId && client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(JSON.stringify(message));
              console.log(`  ➡️ Sent to ${client.id}`);
            }
          });
        } else {
          console.log(`⏭️ Ignoring non-custom event: ${eventType}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing message from ${clientId}:`, error.message);
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    clients.forEach(client => {
      if (client.id === clientId) {
        clients.delete(client);
      }
    });
    console.log(`👋 Client disconnected: ${clientId}`);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`❌ Client error ${clientId}:`, error.message);
  });
  
  // Keep connection alive with ping/pong
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
});

// Send periodic status updates
setInterval(() => {
  const activeClients = Array.from(clients).filter(c => c.ws.readyState === WebSocket.OPEN);
  
  const statusEvent = {
    id: `msg-${Date.now()}`,
    type: 'event',
    timestamp: Date.now(),
    payload: {
      id: `evt-${Date.now()}`,
      type: 'server.status',
      timestamp: Date.now(),
      payload: {
        connectedClients: activeClients.length,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    }
  };
  
  // Broadcast to all clients
  activeClients.forEach(client => {
    client.ws.send(JSON.stringify(statusEvent));
  });
}, 30000); // Every 30 seconds

// Heartbeat to keep connections alive
setInterval(() => {
  clients.forEach(client => {
    if (!client.ws.isAlive) {
      clients.delete(client);
      return client.ws.terminate();
    }
    
    client.ws.isAlive = false;
    client.ws.ping();
  });
}, 30000);

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  
  // Notify all clients
  const shutdownMessage = {
    id: `msg-${Date.now()}`,
    type: 'event',
    timestamp: Date.now(),
    payload: {
      id: `evt-${Date.now()}`,
      type: 'system.shutdown',
      timestamp: Date.now(),
      payload: { message: 'Server shutting down' }
    }
  };
  
  clients.forEach(client => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(shutdownMessage));
      client.ws.close(1000, 'Server shutting down');
    }
  });
  
  server.close(() => {
    console.log('✅ Server shut down cleanly');
    process.exit(0);
  });
});

console.log('🎯 Ready to forward semantest/custom/* events!');
console.log('📡 Extension should connect to ws://localhost:3004');
console.log('🔧 Use ./generate-image-async.sh to send events');