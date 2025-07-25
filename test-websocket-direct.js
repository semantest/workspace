#!/usr/bin/env node

// Direct WebSocket test to see server responses
const WebSocket = require('ws');

console.log('🔍 Testing direct WebSocket connection to Semantest server...\n');

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
    console.log('✅ Connected to WebSocket server');
    console.log('📤 Sending test message...\n');
    
    // Send a simple ping
    ws.send(JSON.stringify({
        id: 'test-' + Date.now(),
        type: 'ping',
        timestamp: Date.now()
    }));
    
    // Wait for any response
    setTimeout(() => {
        console.log('\n⏱️  No response after 5 seconds');
        console.log('This confirms the server is waiting for the Chrome extension.');
        ws.close();
    }, 5000);
});

ws.on('message', (data) => {
    console.log('📥 Received:', data.toString());
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
    console.log('\n🔌 Connection closed');
    console.log('\n📋 Next steps:');
    console.log('1. Load the Chrome extension in your browser');
    console.log('2. Navigate to https://chatgpt.com');
    console.log('3. Run ./generate-image.sh again');
    process.exit(0);
});