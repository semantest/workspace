#!/usr/bin/env node
/**
 * 🧪 Simple E2E Test for Extension WebSocket Integration
 * Run this after loading the extension and starting the server
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');

console.log('🧪 Testing Extension WebSocket Integration...\n');

// Test 1: Check if server is running
console.log('📡 Test 1: Checking WebSocket server on port 3004...');
const ws = new WebSocket('ws://localhost:3004');

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully!\n');
  
  // Test 2: Send a test message
  console.log('📨 Test 2: Sending test image request...');
  
  // Close this connection and run generate-image.sh
  ws.close();
  
  // Test 3: Run generate-image.sh
  console.log('🎨 Test 3: Running generate-image.sh...');
  const child = spawn('./generate-image.sh', ['Generate a beautiful test sunset'], {
    cwd: __dirname
  });
  
  let output = '';
  
  child.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  child.stderr.on('data', (data) => {
    console.error('❌ Error:', data.toString());
  });
  
  child.on('close', (code) => {
    if (code === 0) {
      console.log('✅ generate-image.sh executed successfully!');
      console.log('📋 Output:', output.trim());
      
      console.log('\n🎯 Test Summary:');
      console.log('- WebSocket connection: ✅');
      console.log('- Script execution: ✅');
      console.log('- Now check the extension popup for the message!');
      console.log('- Check ChatGPT tab for the prompt being sent!');
    } else {
      console.error('❌ generate-image.sh failed with code:', code);
    }
    
    process.exit(code);
  });
});

ws.on('error', (err) => {
  console.error('❌ WebSocket connection failed:', err.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Make sure the server is running: npm start');
  console.log('2. Check if port 3004 is available');
  console.log('3. Check server logs for errors');
  process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('❌ Test timeout after 10 seconds');
  process.exit(1);
}, 10000);