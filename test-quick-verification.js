#!/usr/bin/env node

const WebSocket = require('ws');
const EventSourcedWebSocketServer = require('./nodejs.server/src/websocket-event-sourced-enhanced');

async function quickTest() {
  console.log('Starting quick verification test...\n');
  
  const server = new EventSourcedWebSocketServer(8086, {
    path: '/ws-test'
  });
  
  await server.start();
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Welcome message
  console.log('Test 1: Welcome Message');
  try {
    const client = await createClient(8086);
    const welcome = await waitForMessage(client, 'welcome', 2000);
    if (welcome.type === 'welcome') {
      console.log('✅ Welcome message received\n');
      testsPassed++;
    }
    client.close();
  } catch (err) {
    console.log('❌ Welcome message failed:', err.message, '\n');
    testsFailed++;
  }
  
  // Test 2: Correlation Tracking
  console.log('Test 2: Correlation Tracking');
  try {
    const correlationId = server.correlationTracker.createCorrelation({ test: 'quick' });
    server.correlationTracker.trackRequest(correlationId, 'req_001');
    server.correlationTracker.trackSaga(correlationId, 'saga_001');
    
    const trace = server.correlationTracker.getTrace(correlationId);
    if (trace && trace.requestCount === 1 && trace.sagaCount === 1) {
      console.log('✅ Correlation tracking works\n');
      testsPassed++;
    } else {
      throw new Error('Tracking counts incorrect');
    }
  } catch (err) {
    console.log('❌ Correlation tracking failed:', err.message, '\n');
    testsFailed++;
  }
  
  // Test 3: Projections
  console.log('Test 3: Projections');
  try {
    const client = await createClient(8086);
    
    // Authenticate
    client.send(JSON.stringify({
      type: 'authenticate',
      clientType: 'test'
    }));
    await waitForMessage(client, 'authentication_success', 2000);
    
    // Send events
    for (let i = 0; i < 3; i++) {
      client.send(JSON.stringify({
        type: 'ImageGenerationRequestedEvent',
        requestId: `test_${i}`,
        prompt: `Test ${i}`,
        fileName: `test-${i}.png`,
        downloadFolder: './test'
      }));
      await delay(100);
    }
    
    await delay(500);
    
    // Query projection
    client.send(JSON.stringify({
      type: 'query',
      queryId: 'q1',
      queryType: 'projection',
      parameters: {
        projectionName: 'ImageGenerationStats'
      }
    }));
    
    const result = await waitForMessage(client, 'query_result', 2000);
    if (result.result && result.result.totalRequests >= 3) {
      console.log('✅ Projections working: ' + result.result.totalRequests + ' requests\n');
      testsPassed++;
    } else {
      throw new Error('Projection count incorrect');
    }
    
    client.close();
  } catch (err) {
    console.log('❌ Projections failed:', err.message, '\n');
    testsFailed++;
  }
  
  // Summary
  console.log('=' . repeat(50));
  console.log(`Tests Passed: ${testsPassed}`);
  console.log(`Tests Failed: ${testsFailed}`);
  console.log('=' . repeat(50));
  
  await server.shutdown();
  process.exit(testsFailed > 0 ? 1 : 0);
}

function createClient(port) {
  return new Promise((resolve, reject) => {
    const client = new WebSocket(`ws://localhost:${port}/ws-test`);
    client.on('open', () => resolve(client));
    client.on('error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), 3000);
  });
}

function waitForMessage(client, expectedType, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${expectedType}`));
    }, timeout);
    
    const handler = (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === expectedType) {
        clearTimeout(timer);
        client.removeListener('message', handler);
        resolve(message);
      }
    };
    
    client.on('message', handler);
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

quickTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});