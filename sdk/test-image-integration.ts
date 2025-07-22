import { ChatGPTClient } from './client/src/domains/chatgpt';
import { ImageEventTypes } from './contracts/src/custom-events';
import { WebSocketServer } from './server/src/server';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

// Test configuration
const TEST_PROMPT = 'A futuristic robot coding at a holographic terminal';
const DOWNLOAD_DIR = path.join(process.env.HOME || '', 'Downloads');
const SERVER_PORT = 8080;

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// Mock image generation service (in real implementation, this would call actual image API)
async function generateAndDownloadImage(prompt: string): Promise<string> {
  console.log(`🎨 Generating image for prompt: "${prompt}"`);
  
  // For testing, we'll download a placeholder image
  // In production, this would call the actual image generation API
  const imageUrl = 'https://via.placeholder.com/512x512.png?text=Robot+Coding';
  const timestamp = Date.now();
  const fileName = `generated_${timestamp}.png`;
  const filePath = path.join(DOWNLOAD_DIR, fileName);
  
  console.log(`📥 Downloading image to: ${filePath}`);
  
  // Download the image
  return new Promise((resolve, reject) => {
    const file = createWriteStream(filePath);
    
    https.get(imageUrl, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Image downloaded successfully: ${filePath}`);
        resolve(filePath);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

// Main test function
async function runImageIntegrationTest() {
  console.log('🚀 Starting ChatGPT Image Integration Test');
  console.log('=====================================\n');
  
  // Step 1: Start WebSocket server
  console.log('1️⃣ Starting WebSocket server...');
  const server = new WebSocketServer(SERVER_PORT);
  
  // Add image event handler to server
  server.on('connection', (client) => {
    client.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === ImageEventTypes.REQUEST_RECEIVED) {
          console.log('📨 Server received ImageRequestReceived event:', message);
          
          // Extract prompt from payload
          const { prompt, project, chat } = message.payload;
          
          // Generate and download image
          try {
            const imagePath = await generateAndDownloadImage(prompt);
            
            // Send ImageDownloaded event
            const downloadedEvent = {
              type: ImageEventTypes.DOWNLOADED,
              payload: {
                project,
                chat,
                prompt,
                imagePath,
                fileName: path.basename(imagePath),
                timestamp: new Date().toISOString()
              }
            };
            
            console.log('📤 Sending ImageDownloaded event:', downloadedEvent);
            client.send(JSON.stringify(downloadedEvent));
            
          } catch (error) {
            console.error('❌ Error generating image:', error);
            client.send(JSON.stringify({
              type: 'error',
              payload: {
                message: 'Failed to generate image',
                error: error.message
              }
            }));
          }
        }
      } catch (error) {
        console.error('❌ Error processing message:', error);
      }
    });
  });
  
  await server.start();
  console.log(`✅ Server started on port ${SERVER_PORT}\n`);
  
  // Step 2: Create test client
  console.log('2️⃣ Creating test client...');
  const client = new ChatGPTClient({
    url: `ws://localhost:${SERVER_PORT}`,
    debug: true
  });
  
  // Step 3: Set up event listener for ImageDownloaded
  console.log('3️⃣ Setting up event listeners...');
  
  let testCompleted = false;
  
  client.on(ImageEventTypes.DOWNLOADED, (event) => {
    console.log('\n🎉 SUCCESS! Received ImageDownloaded event:', event);
    console.log(`📍 Image saved to: ${event.payload.imagePath}`);
    
    // Verify file exists
    if (fs.existsSync(event.payload.imagePath)) {
      console.log('✅ File verification: Image exists at specified path');
      const stats = fs.statSync(event.payload.imagePath);
      console.log(`📊 File size: ${stats.size} bytes`);
    } else {
      console.error('❌ File verification failed: Image not found at path');
    }
    
    testCompleted = true;
  });
  
  // Connect client
  await client.connect();
  console.log('✅ Client connected\n');
  
  // Step 4: Send ImageRequestReceived event
  console.log('4️⃣ Sending ImageRequestReceived event...');
  const requestEvent = {
    type: ImageEventTypes.REQUEST_RECEIVED,
    payload: {
      project: 'test-project',
      chat: 'test-chat-123',
      prompt: TEST_PROMPT
    }
  };
  
  console.log('📤 Sending event:', requestEvent);
  await client.emit(requestEvent);
  
  // Wait for response
  console.log('\n⏳ Waiting for ImageDownloaded event...');
  
  // Set timeout for test
  setTimeout(() => {
    if (!testCompleted) {
      console.error('\n❌ Test timeout: No ImageDownloaded event received within 10 seconds');
      process.exit(1);
    }
  }, 10000);
  
  // Keep process alive until test completes
  await new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (testCompleted) {
        clearInterval(checkInterval);
        resolve(undefined);
      }
    }, 100);
  });
  
  // Cleanup
  console.log('\n🧹 Cleaning up...');
  await client.disconnect();
  await server.stop();
  
  console.log('\n✅ Image Integration Test Completed Successfully!');
  console.log('=====================================');
  process.exit(0);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the test
runImageIntegrationTest().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});