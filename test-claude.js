#!/usr/bin/env node

/**
 * Test Claude.ai automation
 * Usage: node test-claude.js "<prompt>"
 */

const http = require('http');

const prompt = process.argv[2] || 'Hello Claude, please tell me a short joke about programming.';
const correlationId = `corr_${Date.now()}`;

console.log('🤖 Claude.ai Automation Test');
console.log('============================');
console.log('📝 Prompt:', prompt);
console.log('');

const event = {
  id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  type: 'PromptRequestedEvent',
  correlationId: correlationId,
  payload: {
    domain: 'claude.ai',
    prompt: prompt,
    correlationId: correlationId,
    timestamp: Date.now()
  },
  timestamp: new Date().toISOString()
};

const data = JSON.stringify(event);

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/events',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('📤 Sending event to server...');

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('✅ Event sent successfully');
    console.log('📋 Correlation ID:', correlationId);
    console.log('📨 Server Response:', body);
    console.log('');
    console.log('📌 Next steps:');
    console.log('1. Make sure you have Claude.ai open in a browser tab');
    console.log('2. The extension will automatically type the prompt');
    console.log('3. Claude will respond to your prompt');
    console.log('');
    console.log('Note: Claude.ai doesn\'t generate images,');
    console.log('but this demonstrates the automation works for text prompts!');
  });
});

req.on('error', (error) => {
  console.error('❌ Error sending event:', error);
  console.error('Make sure the polling server is running:');
  console.error('  node nodejs.server/semantest-polling-server.js');
});

req.write(data);
req.end();