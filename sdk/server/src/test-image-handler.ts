#!/usr/bin/env node

import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { ImageEventTypes } from '@semantest/contracts';
import { MessageType, EventMessage } from '@semantest/core';

/**
 * Test client for the Image Handler implementation
 */
class ImageHandlerTestClient {
  private ws: WebSocket | null = null;
  private url: string;

  constructor(url: string = 'ws://localhost:8080') {
    this.url = url;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        console.log('✅ Connected to WebSocket server');
        this.setupListeners();
        resolve();
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      });
    });
  }

  private setupListeners(): void {
    if (!this.ws) return;

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === MessageType.EVENT) {
          const event = message.payload;
          console.log(`\n📨 Received event: ${event.type}`);
          console.log('Payload:', JSON.stringify(event.payload, null, 2));

          // Handle specific event types
          switch (event.type) {
            case ImageEventTypes.GENERATION_STARTED:
              console.log('🎨 Image generation started!');
              break;
            case ImageEventTypes.DOWNLOADED:
              console.log('✅ Image downloaded successfully!');
              console.log(`📁 File saved to: ${event.payload.path}`);
              break;
            case ImageEventTypes.GENERATION_FAILED:
              console.log('❌ Image generation failed!');
              break;
          }
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('🔌 Disconnected from server');
    });
  }

  async sendImageRequest(prompt: string, options?: {
    project?: string;
    chat?: string;
    downloadFolder?: string;
  }): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to server');
    }

    const requestId = uuidv4();
    const event: EventMessage = {
      id: uuidv4(),
      type: MessageType.EVENT,
      timestamp: Date.now(),
      payload: {
        id: uuidv4(),
        type: ImageEventTypes.REQUEST_RECEIVED,
        timestamp: Date.now(),
        payload: {
          prompt,
          project: options?.project,
          chat: options?.chat,
          metadata: {
            requestId,
            userId: 'test-user',
            timestamp: Date.now(),
            downloadFolder: options?.downloadFolder
          }
        }
      }
    };

    console.log(`\n📤 Sending ImageRequestReceived event`);
    console.log(`   Prompt: ${prompt}`);
    console.log(`   Project: ${options?.project || '(none)'}`);
    console.log(`   Chat: ${options?.chat || '(will create new)'}`);
    console.log(`   Download folder: ${options?.downloadFolder || '(default)'}`);

    this.ws.send(JSON.stringify(event));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Run test scenarios
 */
async function runTests() {
  console.log('🧪 Image Handler Test Client');
  console.log('===========================\n');

  const client = new ImageHandlerTestClient();

  try {
    // Connect to server
    await client.connect();
    
    console.log('\n📋 Running test scenarios...\n');

    // Test 1: Request with all parameters
    console.log('Test 1: Full request with project and chat');
    await client.sendImageRequest('A beautiful sunset over mountains', {
      project: 'test-project',
      chat: 'test-chat-123'
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 2: Request without chat (should create new)
    console.log('\nTest 2: Request without chat (should create new)');
    await client.sendImageRequest('Abstract geometric patterns in blue', {
      project: 'test-project'
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 3: Request without project
    console.log('\nTest 3: Request without project');
    await client.sendImageRequest('A cute robot drawing', {
      chat: 'test-chat-456'
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 4: Custom download folder
    console.log('\nTest 4: Request with custom download folder');
    await client.sendImageRequest('Space exploration scene', {
      project: 'space-project',
      downloadFolder: '/tmp/semantest-test-images'
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n✅ All tests completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Disconnect
    client.disconnect();
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { ImageHandlerTestClient };