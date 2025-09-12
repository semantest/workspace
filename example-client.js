#!/usr/bin/env node

/**
 * Example Client - Demonstrates how to use the communication server
 * Shows complete image generation workflow from CLI perspective
 */

const axios = require('axios');
const WebSocket = require('ws');

class EventSourcedClient {
  constructor(url = 'ws://localhost:8082/ws-events') {
    this.url = url;
    this.ws = null;
    this.clientId = null;
    this.correlationId = null;
    this.subscriptions = new Set();
  }
  
  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      
      this.ws.on('open', () => {
        console.log('✅ Connected to Event-Sourced Server');
        resolve();
      });
      
      this.ws.on('message', (data) => {
        this.handleMessage(JSON.parse(data.toString()));
      });
      
      this.ws.on('close', () => {
        console.log('❌ Disconnected from server');
      });
      
      this.ws.on('error', (err) => {
        console.error('❌ WebSocket error:', err);
        reject(err);
      });
    });
  }
  
  handleMessage(message) {
    switch (message.type) {
      case 'welcome':
        this.clientId = message.clientId;
        console.log(`📋 Client ID: ${this.clientId}`);
        console.log(`🔧 Server capabilities: ${message.capabilities.join(', ')}`);
        break;
        
      case 'authentication_success':
        console.log(`🔐 Authenticated successfully as ${message.message}`);
        break;
        
      case 'command_accepted':
        console.log(`✅ Command accepted: Event ${message.eventId} at position ${message.globalPosition}`);
        break;
        
      case 'command_rejected':
        console.log(`❌ Command rejected: ${message.error}`);
        break;
        
      case 'event':
        console.log(`📨 Event received:`);
        console.log(`   Type: ${message.envelope.event.eventType}`);
        console.log(`   Aggregate: ${message.envelope.event.aggregateId}`);
        console.log(`   Position: ${message.envelope.globalPosition}`);
        break;
        
      case 'query_result':
        console.log(`📊 Query result:`, JSON.stringify(message.result, null, 2));
        break;
        
      case 'subscription_confirmed':
        console.log(`📡 Subscribed to: ${message.eventTypes?.join(', ') || message.streams?.join(', ')}`);
        break;
        
      case 'ImageGeneratedEvent':
        console.log(`🎨 Image generated!`);
        console.log(`   Request ID: ${message.requestId}`);
        console.log(`   Image URL: ${message.imageUrl}`);
        console.log(`   Image Path: ${message.imagePath}`);
        break;
        
      case 'error':
        console.log(`❌ Error: ${message.message}`);
        break;
        
      default:
        console.log(`📩 Message [${message.type}]:`, message);
    }
  }
  
  // Authentication
  authenticate(clientType = 'example-client', metadata = {}) {
    this.send({
      type: 'authenticate',
      clientType,
      metadata
    });
  }
  
  // Send a command (write operation)
  sendCommand(aggregateId, commandType, payload, expectedVersion = null) {
    const commandId = `cmd_${Date.now()}`;
    this.send({
      type: 'command',
      commandId,
      aggregateId,
      commandType,
      payload,
      expectedVersion
    });
    return commandId;
  }
  
  // Query the event store
  query(queryType, parameters) {
    const queryId = `query_${Date.now()}`;
    this.send({
      type: 'query',
      queryId,
      queryType,
      parameters
    });
    return queryId;
  }
  
  // Subscribe to events
  subscribe(eventTypes = [], streams = []) {
    this.send({
      type: 'subscribe',
      eventTypes,
      streams
    });
    eventTypes.forEach(type => this.subscriptions.add(type));
    streams.forEach(stream => this.subscriptions.add(stream));
  }
  
  // Request image generation (domain-specific)
  requestImageGeneration(prompt, fileName, options = {}) {
    const requestId = `img_req_${Date.now()}`;
    this.send({
      type: 'ImageGenerationRequestedEvent',
      requestId,
      prompt,
      fileName,
      downloadFolder: options.downloadFolder || './images',
      domainName: options.domainName || 'chatgpt.com',
      model: options.model || 'dall-e-3',
      parameters: options.parameters || {}
    });
    return requestId;
  }
  
  // Replay events
  replayEvents(fromPosition = 0, limit = 100, filter = null) {
    this.send({
      type: 'replay',
      correlationId: `replay_${Date.now()}`,
      fromPosition,
      limit,
      filter
    });
  }
  
  // Send raw message
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('❌ WebSocket not connected');
    }
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Interactive CLI
async function interactiveCLI() {
  const client = new EventSourcedClient();
  
  console.log('🚀 Event-Sourced Client Example');
  console.log('================================\n');
  
  try {
    await client.connect();
    
    // Authenticate
    client.authenticate('interactive-client', { 
      user: 'example-user',
      version: '1.0.0'
    });
    
    // Set up readline interface
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '\n> '
    });
    
    console.log('\n📚 Available Commands:');
    console.log('  1. Send Command');
    console.log('  2. Query Event Store');
    console.log('  3. Subscribe to Events');
    console.log('  4. Request Image Generation');
    console.log('  5. Replay Events');
    console.log('  6. Get Projection');
    console.log('  7. Exit');
    
    rl.prompt();
    
    rl.on('line', async (line) => {
      const choice = line.trim();
      
      switch (choice) {
        case '1':
          // Send Command
          const aggregateId = `order_${Date.now()}`;
          client.sendCommand(
            aggregateId,
            'CreateOrder',
            {
              customerId: 'cust_123',
              items: ['item1', 'item2'],
              total: 99.99
            }
          );
          break;
          
        case '2':
          // Query Event Store
          const streamId = await question(rl, 'Enter stream ID: ');
          client.query('stream', {
            streamId,
            fromVersion: 0
          });
          break;
          
        case '3':
          // Subscribe to Events
          const eventType = await question(rl, 'Enter event type to subscribe: ');
          client.subscribe([eventType], []);
          break;
          
        case '4':
          // Request Image Generation
          const prompt = await question(rl, 'Enter image prompt: ');
          const fileName = await question(rl, 'Enter file name: ');
          client.requestImageGeneration(prompt, fileName);
          break;
          
        case '5':
          // Replay Events
          client.replayEvents(0, 10);
          break;
          
        case '6':
          // Get Projection
          const projectionName = await question(rl, 'Enter projection name: ');
          client.query('projection', { projectionName });
          break;
          
        case '7':
          // Exit
          console.log('👋 Goodbye!');
          client.disconnect();
          process.exit(0);
          break;
          
        default:
          console.log('Invalid choice. Please try again.');
      }
      
      rl.prompt();
    });
    
  } catch (error) {
    console.error('❌ Failed to connect:', error);
    process.exit(1);
  }
}

// Helper function for async readline
function question(rl, query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Example: Automated test scenario
async function automatedExample() {
  const client = new EventSourcedClient();
  
  console.log('🤖 Running Automated Example...\n');
  
  try {
    // Connect and authenticate
    await client.connect();
    client.authenticate('automated-test', { test: true });
    
    await delay(1000);
    
    // Subscribe to events
    console.log('\n📡 Subscribing to events...');
    client.subscribe(['OrderCreated', 'OrderUpdated', 'ImageGenerationRequested'], []);
    
    await delay(500);
    
    // Create some commands
    console.log('\n📝 Sending commands...');
    for (let i = 0; i < 3; i++) {
      client.sendCommand(
        `test_aggregate_${i}`,
        'TestCommand',
        { 
          index: i,
          timestamp: new Date().toISOString()
        }
      );
      await delay(100);
    }
    
    await delay(500);
    
    // Query projections
    console.log('\n📊 Querying projections...');
    client.query('projection', { projectionName: 'ImageGenerationStats' });
    
    await delay(500);
    
    // Request image generation
    console.log('\n🎨 Requesting image generation...');
    client.requestImageGeneration(
      'A futuristic city with flying cars',
      'futuristic-city.png',
      { model: 'dall-e-3' }
    );
    
    await delay(2000);
    
    // Replay events
    console.log('\n🔄 Replaying events...');
    client.replayEvents(0, 5);
    
    await delay(2000);
    
    console.log('\n✅ Example completed!');
    client.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    client.disconnect();
    process.exit(1);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--interactive') || args.includes('-i')) {
    interactiveCLI();
  } else if (args.includes('--automated') || args.includes('-a')) {
    automatedExample();
  } else {
    console.log('Usage:');
    console.log('  node example-client.js --interactive  # Interactive CLI mode');
    console.log('  node example-client.js --automated    # Run automated example');
    process.exit(0);
  }
}