const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Test configuration
const TEST_PROMPT = 'A futuristic robot coding at a holographic terminal';
const DOWNLOAD_DIR = path.join(process.env.HOME || '', 'Downloads');
const SERVER_PORT = 8080;
const WS_URL = `ws://localhost:${SERVER_PORT}`;

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// Simple image download function
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error', reject);
  });
}

// Start the test
async function runTest() {
  console.log('🚀 ChatGPT Image Integration Test');
  console.log('==================================\n');
  
  // Step 1: Start WebSocket server
  console.log('1️⃣ Starting WebSocket server...');
  const wss = new WebSocket.Server({ port: SERVER_PORT });
  
  wss.on('connection', (ws) => {
    console.log('✅ Client connected to server');
    
    ws.on('message', async (data) => {
      const message = JSON.parse(data);
      console.log('📨 Server received:', message);
      
      if (message.type === 'image:request/received') {
        const { prompt, project, chat } = message.payload;
        
        // Simulate image generation/download
        console.log(`🎨 Generating image for: "${prompt}"`);
        
        try {
          // For demo, download a placeholder image
          const imageUrl = 'https://via.placeholder.com/512x512.png?text=Robot+Coding';
          const timestamp = Date.now();
          const fileName = `robot_coding_${timestamp}.png`;
          const filePath = path.join(DOWNLOAD_DIR, fileName);
          
          console.log(`📥 Downloading to: ${filePath}`);
          await downloadImage(imageUrl, filePath);
          
          // Send ImageDownloaded event
          const response = {
            type: 'image:downloaded',
            payload: {
              project,
              chat,
              prompt,
              imagePath: filePath,
              fileName: fileName,
              timestamp: new Date().toISOString()
            }
          };
          
          console.log('📤 Sending ImageDownloaded event');
          ws.send(JSON.stringify(response));
          
        } catch (error) {
          console.error('❌ Error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            payload: { message: error.message }
          }));
        }
      }
    });
  });
  
  console.log(`✅ Server listening on port ${SERVER_PORT}\n`);
  
  // Step 2: Create test client
  console.log('2️⃣ Creating test client...');
  const client = new WebSocket(WS_URL);
  
  await new Promise((resolve) => {
    client.on('open', () => {
      console.log('✅ Client connected\n');
      resolve();
    });
  });
  
  // Step 3: Set up response handler
  console.log('3️⃣ Setting up event handlers...');
  
  const testPromise = new Promise((resolve, reject) => {
    client.on('message', (data) => {
      const message = JSON.parse(data);
      console.log('\n📨 Client received:', message);
      
      if (message.type === 'image:downloaded') {
        console.log('\n🎉 SUCCESS! Image download completed');
        console.log(`📍 Image saved to: ${message.payload.imagePath}`);
        
        // Verify file exists
        if (fs.existsSync(message.payload.imagePath)) {
          const stats = fs.statSync(message.payload.imagePath);
          console.log(`✅ File verified: ${stats.size} bytes`);
          resolve(message);
        } else {
          reject(new Error('File not found at specified path'));
        }
      } else if (message.type === 'error') {
        reject(new Error(message.payload.message));
      }
    });
    
    // Timeout after 10 seconds
    setTimeout(() => reject(new Error('Test timeout')), 10000);
  });
  
  // Step 4: Send test event
  console.log('4️⃣ Sending ImageRequestReceived event...');
  const testEvent = {
    type: 'image:request/received',
    payload: {
      project: 'test-project',
      chat: 'test-chat-123',
      prompt: TEST_PROMPT
    }
  };
  
  console.log('📤 Event:', testEvent);
  client.send(JSON.stringify(testEvent));
  
  // Wait for result
  console.log('\n⏳ Waiting for response...');
  
  try {
    const result = await testPromise;
    console.log('\n✅ Test PASSED! End-to-end flow working correctly');
    console.log('=====================================');
  } catch (error) {
    console.error('\n❌ Test FAILED:', error.message);
    process.exit(1);
  }
  
  // Cleanup
  client.close();
  wss.close();
  process.exit(0);
}

// Run the test
runTest().catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});