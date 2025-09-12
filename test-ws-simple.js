#!/usr/bin/env node

const WebSocket = require('ws');

async function testSimpleConnection() {
  console.log('Starting simple WebSocket test...');
  
  // Start server
  const EventSourcedWebSocketServer = require('./nodejs.server/src/websocket-event-sourced');
  const server = new EventSourcedWebSocketServer(8085, {
    path: '/ws-test'
  });
  
  await server.start();
  console.log('Server started on port 8085');
  
  // Create client
  const client = new WebSocket('ws://localhost:8085/ws-test');
  
  client.on('open', () => {
    console.log('Client connected');
  });
  
  client.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('Received message:', message.type);
    if (message.type === 'welcome') {
      console.log('✅ Welcome message received successfully!');
      console.log('Message content:', JSON.stringify(message, null, 2));
      client.close();
      server.shutdown();
      process.exit(0);
    }
  });
  
  client.on('error', (err) => {
    console.error('Client error:', err);
    server.shutdown();
    process.exit(1);
  });
  
  // Timeout after 5 seconds
  setTimeout(() => {
    console.error('❌ Timeout - no welcome message received');
    client.close();
    server.shutdown();
    process.exit(1);
  }, 5000);
}

testSimpleConnection().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});