#!/usr/bin/env node
// Manual WebSocket connection test

const WebSocket = require('ws');

console.log('🧪 Testing WebSocket connection to localhost:8081...');

const ws = new WebSocket('ws://localhost:8081');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server!');
  
  // Send test message
  ws.send(JSON.stringify({
    type: 'CONNECTION_ESTABLISHED',
    source: 'test-client',
    timestamp: new Date().toISOString()
  }));
  
  // Test ImageGenerationRequestedEvent
  setTimeout(() => {
    console.log('📤 Sending test ImageGenerationRequestedEvent...');
    ws.send(JSON.stringify({
      type: 'ImageGenerationRequestedEvent',
      payload: {
        prompt: 'test prompt from manual test',
        correlationId: 'manual-test-001'
      }
    }));
  }, 1000);
  
  // Keep connection alive
  setInterval(() => {
    ws.send(JSON.stringify({ type: 'PING' }));
  }, 30000);
});

ws.on('message', (data) => {
  console.log('📨 Received:', data.toString());
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

ws.on('close', () => {
  console.log('🔌 WebSocket disconnected');
  process.exit(0);
});

console.log('Press Ctrl+C to exit...');