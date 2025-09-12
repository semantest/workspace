#!/usr/bin/env node

/**
 * Test Google text2image automation
 * Usage: node test-google.js "<prompt>"
 */

const http = require('http');

const prompt = process.argv[2] || 'A beautiful mountain landscape at sunset with vibrant colors';
const correlationId = `corr_${Date.now()}`;

console.log('🎨 Google text2image Automation Test');
console.log('=====================================');
console.log('📝 Prompt:', prompt);
console.log('');

const event = {
  id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  type: 'ImageGenerationRequestedEvent',
  correlationId: correlationId,
  payload: {
    domain: 'google.text2image',  // Generic domain for Google services
    prompt: prompt,
    correlationId: correlationId,
    outputPath: `google_${Date.now()}.png`,
    downloadFolder: 'Downloads/Google'
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
    console.log('1. Make sure you have one of these Google services open:');
    console.log('   - https://aidemo.googlelabs.com');
    console.log('   - https://labs.google.com');
    console.log('   - https://aistudio.google.com');
    console.log('   - https://makersuite.google.com');
    console.log('2. The extension will automatically type the prompt');
    console.log('3. Images will be generated and downloaded');
  });
});

req.on('error', (error) => {
  console.error('❌ Error sending event:', error);
  console.error('Make sure the polling server is running:');
  console.error('  node nodejs.server/semantest-polling-server.js');
});

req.write(data);
req.end();