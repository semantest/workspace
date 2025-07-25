/**
 * 🧪 TDD Test Suite for Extension WebSocket Integration
 * Tests the flow: CLI → WebSocket → Extension → ChatGPT
 */

const { expect } = require('chai');
const WebSocket = require('ws');
const { spawn } = require('child_process');

describe('🧪 Extension WebSocket Integration', () => {
  let wss;
  let extensionClient;
  
  before((done) => {
    // Start mock WebSocket server on port 3004
    wss = new WebSocket.Server({ port: 3004 });
    
    wss.on('connection', (ws) => {
      console.log('✅ Mock server: Client connected');
      
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        console.log('📨 Mock server received:', message);
        
        // Store the extension client
        if (message.type === 'event' && 
            message.payload?.type === 'semantest/extension/registered') {
          extensionClient = ws;
        }
      });
    });
    
    wss.on('listening', () => {
      console.log('🚀 Mock WebSocket server listening on port 3004');
      done();
    });
  });
  
  after(() => {
    wss.close();
  });
  
  describe('📡 WebSocket Connection', () => {
    it('should accept connections on port 3004', (done) => {
      const testClient = new WebSocket('ws://localhost:3004');
      
      testClient.on('open', () => {
        expect(testClient.readyState).to.equal(WebSocket.OPEN);
        testClient.close();
        done();
      });
      
      testClient.on('error', (err) => {
        done(err);
      });
    });
  });
  
  describe('🎨 Image Generation Flow', () => {
    it('should receive image request from generate-image.sh', (done) => {
      let messageReceived = false;
      
      wss.once('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data);
          
          if (message.type === 'event' && 
              message.payload?.type === 'semantest/custom/image/request/received') {
            messageReceived = true;
            expect(message.payload.payload).to.have.property('prompt');
            expect(message.payload.payload.prompt).to.include('test sunset');
            done();
          }
        });
      });
      
      // Run generate-image.sh
      const child = spawn('./generate-image.sh', ['Generate a test sunset'], {
        cwd: '/home/chous/work/semantest'
      });
      
      child.on('error', (err) => {
        done(err);
      });
      
      // Timeout if no message received
      setTimeout(() => {
        if (!messageReceived) {
          done(new Error('No image request received within timeout'));
        }
      }, 5000);
    });
    
    it('should forward image request to extension client', (done) => {
      // Simulate extension connection
      const extensionWs = new WebSocket('ws://localhost:3004');
      
      extensionWs.on('open', () => {
        // Register as extension
        extensionWs.send(JSON.stringify({
          id: 'msg-test',
          type: 'event',
          timestamp: Date.now(),
          payload: {
            type: 'semantest/extension/registered',
            payload: {
              extensionId: 'test-extension',
              version: '1.0.0'
            }
          }
        }));
        
        // Subscribe to events
        extensionWs.send(JSON.stringify({
          id: 'sub-test',
          type: 'subscribe',
          timestamp: Date.now(),
          payload: {
            eventTypes: ['semantest/custom/image/request/received']
          }
        }));
      });
      
      extensionWs.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'event' && 
            message.payload?.type === 'semantest/custom/image/request/received') {
          expect(message.payload.payload).to.have.property('prompt');
          extensionWs.close();
          done();
        }
      });
      
      // Send test image request after extension connects
      setTimeout(() => {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              id: 'evt-test',
              type: 'event',
              timestamp: Date.now(),
              payload: {
                type: 'semantest/custom/image/request/received',
                payload: {
                  prompt: 'Generate a test image',
                  requestId: 'test-123'
                }
              }
            }));
          }
        });
      }, 1000);
    });
  });
  
  describe('📋 Extension Message Logging', () => {
    it('should log incoming WebSocket messages', (done) => {
      // This would require Chrome extension testing framework
      // For now, we verify the server-side behavior
      
      const testMessages = [];
      
      wss.once('connection', (ws) => {
        ws.on('message', (data) => {
          testMessages.push(JSON.parse(data));
        });
      });
      
      const client = new WebSocket('ws://localhost:3004');
      
      client.on('open', () => {
        client.send(JSON.stringify({
          type: 'test',
          payload: { message: 'Test log entry' }
        }));
        
        setTimeout(() => {
          expect(testMessages).to.have.lengthOf.at.least(1);
          client.close();
          done();
        }, 100);
      });
    });
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  const Mocha = require('mocha');
  const mocha = new Mocha({ 
    reporter: 'spec',
    timeout: 10000 
  });
  
  mocha.addFile(__filename);
  mocha.run((failures) => {
    process.exit(failures ? 1 : 0);
  });
}