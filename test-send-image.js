#!/usr/bin/env node
// Simple WebSocket test - requires: npm install ws

const WebSocket = require('ws');

const prompt = process.argv[2] || 'Generate a beautiful sunset';

console.log('🎨 Sending image request...');
console.log('Prompt:', prompt);

const ws = new WebSocket('ws://localhost:3004');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket');
  
  // Send message in the format the server expects
  const message = {
    id: `msg-${Date.now()}`,
    type: 'event',
    timestamp: Date.now(),
    payload: {
      id: `evt-${Date.now()}`,
      type: 'semantest/custom/image/request/received',
      timestamp: Date.now(),
      payload: {
        prompt: prompt,
        requestId: `req-${Date.now()}`
      }
    }
  };
  
  console.log('📤 Sending:', JSON.stringify(message, null, 2));
  ws.send(JSON.stringify(message));
  
  // Close after sending
  setTimeout(() => {
    ws.close();
    console.log('✅ Message sent!');
    process.exit(0);
  }, 1000);
});

ws.on('error', (err) => {
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});