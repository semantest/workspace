#!/usr/bin/env node

/**
 * Simple test for the ChatGPT image generation system
 * Tests the basic flow: CLI -> Server -> Response
 */

const http = require('http');

function sendImageGenerationRequest(prompt, fileName, downloadFolder) {
  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'ImageGenerationRequestedEvent',
    eventType: 'ImageGenerationRequested',
    payload: {
      domain: 'chatgpt.com',
      prompt: prompt,
      outputPath: fileName,
      downloadFolder: downloadFolder || './downloads',
      correlationId: `corr_${Date.now()}`,
      timestamp: Date.now(),
      parameters: {
        model: 'dall-e-3'
      }
    }
  };

  const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/events',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'semantest-cli/1.0.0'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 202) {
          console.log('✅ Request sent successfully');
          console.log('📋 Response:', data);
          resolve({ success: true, data });
        } else {
          console.error('❌ Server returned error:', res.statusCode);
          console.error('Response:', data);
          reject(new Error(`Server error: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (err) => {
      console.error('❌ Connection error:', err.message);
      reject(err);
    });
    
    const payload = JSON.stringify(event);
    console.log('📤 Sending event:', JSON.stringify(event, null, 2));
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('🎨 ChatGPT Image Generation Test');
  console.log('=================================\n');
  
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage:');
    console.log('  node test-image-generation.js "<prompt>" [filename] [folder]');
    console.log('\nExamples:');
    console.log('  node test-image-generation.js "a beautiful sunset"');
    console.log('  node test-image-generation.js "a cat wearing a hat" cat.png ./images');
    process.exit(0);
  }
  
  const prompt = args[0];
  const fileName = args[1] || `image_${Date.now()}.png`;
  const downloadFolder = args[2] || './downloads';
  
  console.log('📝 Configuration:');
  console.log(`   Prompt: ${prompt}`);
  console.log(`   File: ${fileName}`);
  console.log(`   Folder: ${downloadFolder}`);
  console.log('');
  
  try {
    console.log('🚀 Sending image generation request...\n');
    await sendImageGenerationRequest(prompt, fileName, downloadFolder);
    
    console.log('\n✅ Test completed successfully!');
    console.log('\n📌 Next steps:');
    console.log('1. Check that the browser extension received the event');
    console.log('2. Verify the prompt was submitted to ChatGPT');
    console.log('3. Confirm the image was downloaded to:', downloadFolder);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Is the server running? (./start-communication-server.js)');
    console.log('2. Is port 8080 available?');
    console.log('3. Check server logs for errors');
    process.exit(1);
  }
}

main();