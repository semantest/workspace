#!/usr/bin/env node

/**
 * Send image generation request to specific domain
 * Usage: node send-to-domain.js <domain> "<prompt>" [filename]
 * Example: node send-to-domain.js chatgpt.com "A sunset" sunset.png
 * Example: node send-to-domain.js claude.ai "A mountain" mountain.png
 */

const http = require('http');

const domain = process.argv[2];
const prompt = process.argv[3];
const filename = process.argv[4] || `generated_${Date.now()}.png`;

if (!domain || !prompt) {
  console.log('Usage: node send-to-domain.js <domain> "<prompt>" [filename]');
  console.log('Examples:');
  console.log('  node send-to-domain.js chatgpt.com "A red apple" apple.png');
  console.log('  node send-to-domain.js claude.ai "A blue ocean" ocean.png');
  process.exit(1);
}

const correlationId = `corr_${Date.now()}`;

const event = {
  id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  type: 'ImageGenerationRequestedEvent',
  correlationId: correlationId,
  payload: {
    domain: domain,  // Target domain
    prompt: prompt,
    correlationId: correlationId,
    outputPath: filename,
    downloadFolder: 'Downloads/Semantest'
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
    console.log('🌐 Target Domain:', domain);
    console.log('📋 Correlation ID:', correlationId);
    console.log('🎨 Prompt:', prompt);
    console.log('💾 Output File:', filename);
    console.log('📨 Response:', body);
    
    console.log('\n📌 Make sure you have a tab open at:');
    if (domain.includes('chatgpt')) {
      console.log('   https://chatgpt.com or https://chat.openai.com');
    } else if (domain.includes('claude')) {
      console.log('   https://claude.ai');
    } else if (domain.includes('bard') || domain.includes('gemini')) {
      console.log('   https://bard.google.com or https://gemini.google.com');
    } else {
      console.log(`   https://${domain}`);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error sending event:', error);
});

req.write(data);
req.end();