#!/usr/bin/env node

/**
 * Test Google Gemini image generation
 * Usage: node test-gemini.js "<prompt>"
 */

const http = require('http');

const prompt = process.argv[2] || 'Create an image of a futuristic cityscape with flying cars and neon lights';
const correlationId = `corr_${Date.now()}`;

console.log('✨ Google Gemini Image Generation Test');
console.log('======================================');
console.log('📝 Prompt:', prompt);
console.log('');

const event = {
  id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  type: 'ImageGenerationRequestedEvent',
  correlationId: correlationId,
  payload: {
    domain: 'gemini.google.com',  // Specific domain for Gemini
    prompt: prompt,
    correlationId: correlationId,
    outputPath: `gemini_${Date.now()}.png`,
    downloadFolder: 'Downloads/Gemini'
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
    console.log('1. Make sure you have Gemini open at:');
    console.log('   https://gemini.google.com/u/4/app');
    console.log('2. The extension will automatically:');
    console.log('   - Type your prompt in the message box');
    console.log('   - Submit it to Gemini');
    console.log('   - Wait for image generation');
    console.log('   - Download generated images');
    console.log('');
    console.log('💡 Tip: Gemini may generate images when you use prompts like:');
    console.log('   "Create an image of..."');
    console.log('   "Generate a picture of..."');
    console.log('   "Draw..."');
  });
});

req.on('error', (error) => {
  console.error('❌ Error sending event:', error);
  console.error('Make sure the polling server is running:');
  console.error('  node nodejs.server/semantest-polling-server.js');
});

req.write(data);
req.end();