#!/usr/bin/env node

/**
 * Send image generation request to polling server
 */

const http = require('http');

const prompt = process.argv[2] || 'A beautiful sunset';
const correlationId = `corr_${Date.now()}`;

const event = {
  id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  type: 'ImageGenerationRequestedEvent',
  correlationId: correlationId,
  payload: {
    domain: 'chatgpt.com',  // Specify target domain
    prompt: prompt,
    correlationId: correlationId,
    outputPath: `generated_${Date.now()}.png`,
    downloadFolder: 'Downloads/ChatGPT'
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

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('✅ Event sent successfully');
    console.log('📋 Correlation ID:', correlationId);
    console.log('🎨 Prompt:', prompt);
    console.log('📨 Response:', body);
  });
});

req.on('error', (error) => {
  console.error('❌ Error sending event:', error);
});

req.write(data);
req.end();