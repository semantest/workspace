#!/usr/bin/env node

/**
 * Test Script for Event-Sourced System
 * Tests the complete flow of event sourcing with WebSocket communication
 */

const WebSocket = require('ws');
const EventSourcedWebSocketServer = require('./nodejs.server/src/websocket-event-sourced-enhanced');
const ImageGenerationSaga = require('./images.google.com/infrastructure/saga/image-generation-saga');

// Test configuration
const TEST_PORT = 8083;
const TEST_PATH = '/ws-test';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

class EventSourcedSystemTest {
  constructor() {
    this.server = null;
    this.testResults = [];
  }
  
  async run() {
    try {
      logSection('EVENT-SOURCED SYSTEM TEST SUITE');
      
      // Start server
      await this.startServer();
      
      // Run tests
      await this.testBasicConnection();
      await this.testEventSourcing();
      await this.testSagaOrchestration();
      await this.testCorrelationTracking();
      await this.testProjections();
      await this.testEventReplay();
      await this.testConcurrency();
      
      // Print results
      this.printResults();
      
      // Cleanup
      await this.cleanup();
      
    } catch (error) {
      log(`Test suite failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }
  
  async startServer() {
    logSection('Starting Event-Sourced WebSocket Server');
    
    this.server = new EventSourcedWebSocketServer(TEST_PORT, {
      path: TEST_PATH,
      storePath: './test-data/events',
      snapshotPath: './test-data/snapshots'
    });
    
    // Sagas are already registered in the enhanced server
    
    await this.server.start();
    
    log(`✅ Server started on port ${TEST_PORT}`, 'green');
    
    // Wait for server to be ready
    await this.delay(1000);
  }
  
  async testBasicConnection() {
    logSection('Test 1: Basic WebSocket Connection');
    
    try {
      const client = await this.createClient();
      
      // Wait for welcome message
      const welcome = await this.waitForMessage(client, 'welcome');
      
      if (welcome.type === 'welcome') {
        log('✅ Received welcome message', 'green');
        this.addResult('Basic Connection', true);
      } else {
        throw new Error('Did not receive welcome message');
      }
      
      client.close();
      
    } catch (error) {
      log(`❌ Basic connection test failed: ${error.message}`, 'red');
      this.addResult('Basic Connection', false, error.message);
    }
  }
  
  async testEventSourcing() {
    logSection('Test 2: Event Sourcing');
    
    try {
      const client = await this.createClient();
      
      // Authenticate
      await this.authenticate(client, 'test-client');
      
      // Send a command to create an event
      const command = {
        type: 'command',
        commandId: `cmd_${Date.now()}`,
        aggregateId: `test_aggregate_${Date.now()}`,
        commandType: 'TestCommandExecuted',
        payload: {
          testData: 'Hello Event Sourcing',
          timestamp: new Date().toISOString()
        },
        expectedVersion: null
      };
      
      client.send(JSON.stringify(command));
      
      // Wait for command acceptance
      const response = await this.waitForMessage(client, 'command_accepted');
      
      if (response.type === 'command_accepted') {
        log(`✅ Command accepted: Event ${response.eventId} at position ${response.globalPosition}`, 'green');
        
        // Query the event
        const query = {
          type: 'query',
          queryId: `query_${Date.now()}`,
          queryType: 'stream',
          parameters: {
            streamId: command.aggregateId,
            fromVersion: 0
          }
        };
        
        client.send(JSON.stringify(query));
        
        const queryResult = await this.waitForMessage(client, 'query_result');
        
        if (queryResult.result && queryResult.result.length > 0) {
          log(`✅ Event retrieved from store: ${queryResult.result[0].eventType}`, 'green');
          this.addResult('Event Sourcing', true);
        } else {
          throw new Error('Event not found in store');
        }
      } else {
        throw new Error('Command not accepted');
      }
      
      client.close();
      
    } catch (error) {
      log(`❌ Event sourcing test failed: ${error.message}`, 'red');
      this.addResult('Event Sourcing', false, error.message);
    }
  }
  
  async testSagaOrchestration() {
    logSection('Test 3: Saga Orchestration');
    
    try {
      const client = await this.createClient();
      await this.authenticate(client, 'test-client');
      
      // Create mock extension client
      const extensionClient = await this.createClient();
      await this.authenticate(extensionClient, 'extension');
      
      // Subscribe to events
      client.send(JSON.stringify({
        type: 'subscribe',
        eventTypes: ['ImageGenerationRequested', 'ImageGenerated', 'ImageGenerationWorkflowCompleted']
      }));
      
      // Send image generation request
      const request = {
        type: 'ImageGenerationRequestedEvent',
        requestId: `test_req_${Date.now()}`,
        prompt: 'A beautiful sunset over mountains',
        fileName: 'test-image.png',
        downloadFolder: './test-images',
        domainName: 'chatgpt.com',
        model: 'dall-e-3'
      };
      
      const correlationId = this.server.correlationTracker.createCorrelation({
        test: 'saga_orchestration'
      });
      
      request.correlationId = correlationId;
      
      client.send(JSON.stringify(request));
      
      // Wait for saga to process
      await this.delay(2000);
      
      // Check correlation tracking
      const trace = this.server.correlationTracker.getTrace(correlationId);
      
      if (trace && trace.sagaCount > 0) {
        log(`✅ Saga started: ${trace.sagaCount} saga(s) tracked`, 'green');
        this.addResult('Saga Orchestration', true);
      } else {
        throw new Error('Saga not tracked in correlation');
      }
      
      client.close();
      extensionClient.close();
      
    } catch (error) {
      log(`❌ Saga orchestration test failed: ${error.message}`, 'red');
      this.addResult('Saga Orchestration', false, error.message);
    }
  }
  
  async testCorrelationTracking() {
    logSection('Test 4: Correlation ID Tracking');
    
    try {
      const correlationId = this.server.correlationTracker.createCorrelation({
        test: 'correlation_tracking'
      });
      
      // Track various activities
      this.server.correlationTracker.trackRequest(correlationId, 'req_001');
      this.server.correlationTracker.trackRequest(correlationId, 'req_002');
      
      this.server.correlationTracker.trackEvent(correlationId, {
        eventId: 'evt_001',
        eventType: 'TestEvent',
        aggregateId: 'agg_001',
        payload: {}
      });
      
      this.server.correlationTracker.trackSaga(correlationId, 'saga_001');
      
      // Generate report
      const report = this.server.correlationTracker.generateReport(correlationId);
      
      if (report && 
          report.summary.eventCount === 1 &&
          report.summary.requestCount === 2 &&
          report.summary.sagaCount === 1) {
        log('✅ Correlation tracking working correctly', 'green');
        log(`   Events: ${report.summary.eventCount}`, 'cyan');
        log(`   Requests: ${report.summary.requestCount}`, 'cyan');
        log(`   Sagas: ${report.summary.sagaCount}`, 'cyan');
        this.addResult('Correlation Tracking', true);
      } else {
        throw new Error('Correlation tracking incorrect');
      }
      
    } catch (error) {
      log(`❌ Correlation tracking test failed: ${error.message}`, 'red');
      this.addResult('Correlation Tracking', false, error.message);
    }
  }
  
  async testProjections() {
    logSection('Test 5: Event Projections');
    
    try {
      const client = await this.createClient();
      await this.authenticate(client, 'test-client');
      
      // Send some events to build projections
      for (let i = 0; i < 3; i++) {
        const request = {
          type: 'ImageGenerationRequestedEvent',
          requestId: `proj_test_${i}`,
          prompt: `Test prompt ${i}`,
          fileName: `test-${i}.png`,
          downloadFolder: './test-images'
        };
        
        client.send(JSON.stringify(request));
        await this.delay(100);
      }
      
      // Query projection
      const query = {
        type: 'query',
        queryId: `query_proj_${Date.now()}`,
        queryType: 'projection',
        parameters: {
          projectionName: 'ImageGenerationStats'
        }
      };
      
      client.send(JSON.stringify(query));
      
      const result = await this.waitForMessage(client, 'query_result');
      
      if (result.result && result.result.totalRequests >= 3) {
        log(`✅ Projection working: ${result.result.totalRequests} total requests`, 'green');
        this.addResult('Event Projections', true);
      } else {
        throw new Error('Projection not updating correctly');
      }
      
      client.close();
      
    } catch (error) {
      log(`❌ Projections test failed: ${error.message}`, 'red');
      this.addResult('Event Projections', false, error.message);
    }
  }
  
  async testEventReplay() {
    logSection('Test 6: Event Replay');
    
    try {
      const client = await this.createClient();
      await this.authenticate(client, 'test-client');
      
      // Request replay of events
      const replayRequest = {
        type: 'replay',
        correlationId: `replay_${Date.now()}`,
        fromPosition: 0,
        limit: 10
      };
      
      client.send(JSON.stringify(replayRequest));
      
      // Wait for replay batch
      const batch = await this.waitForMessage(client, 'replay_batch');
      
      if (batch.type === 'replay_batch' && batch.batch) {
        log(`✅ Event replay working: ${batch.batch.length} events in batch`, 'green');
        this.addResult('Event Replay', true);
      } else {
        throw new Error('Replay not working');
      }
      
      client.close();
      
    } catch (error) {
      log(`❌ Event replay test failed: ${error.message}`, 'red');
      this.addResult('Event Replay', false, error.message);
    }
  }
  
  async testConcurrency() {
    logSection('Test 7: Concurrency Control');
    
    try {
      const client1 = await this.createClient();
      const client2 = await this.createClient();
      
      await this.authenticate(client1, 'client1');
      await this.authenticate(client2, 'client2');
      
      const aggregateId = `concurrency_test_${Date.now()}`;
      
      // First client creates aggregate
      const command1 = {
        type: 'command',
        commandId: `cmd1_${Date.now()}`,
        aggregateId,
        commandType: 'InitialCommand',
        payload: { value: 1 },
        expectedVersion: null
      };
      
      client1.send(JSON.stringify(command1));
      const response1 = await this.waitForMessage(client1, 'command_accepted');
      
      // Second client tries to update with wrong version
      const command2 = {
        type: 'command',
        commandId: `cmd2_${Date.now()}`,
        aggregateId,
        commandType: 'UpdateCommand',
        payload: { value: 2 },
        expectedVersion: 0 // Wrong version (should be 1)
      };
      
      client2.send(JSON.stringify(command2));
      const response2 = await this.waitForMessage(client2, ['command_accepted', 'command_rejected']);
      
      if (response2.type === 'command_rejected' && response2.error.includes('Concurrency')) {
        log('✅ Concurrency control working: Conflicting update rejected', 'green');
        this.addResult('Concurrency Control', true);
      } else {
        throw new Error('Concurrency control not working');
      }
      
      client1.close();
      client2.close();
      
    } catch (error) {
      log(`❌ Concurrency test failed: ${error.message}`, 'red');
      this.addResult('Concurrency Control', false, error.message);
    }
  }
  
  // Helper methods
  
  async createClient() {
    return new Promise((resolve, reject) => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_PATH}`);
      
      client.on('open', () => resolve(client));
      client.on('error', reject);
      
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  }
  
  async authenticate(client, clientType) {
    client.send(JSON.stringify({
      type: 'authenticate',
      clientType,
      metadata: { testClient: true }
    }));
    
    const response = await this.waitForMessage(client, 'authentication_success');
    if (response.type !== 'authentication_success') {
      throw new Error('Authentication failed');
    }
  }
  
  waitForMessage(client, expectedType, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${expectedType}`));
      }, timeout);
      
      const messageHandler = (data) => {
        const message = JSON.parse(data.toString());
        
        const types = Array.isArray(expectedType) ? expectedType : [expectedType];
        if (types.includes(message.type)) {
          clearTimeout(timer);
          client.removeListener('message', messageHandler);
          resolve(message);
        }
      };
      
      client.on('message', messageHandler);
    });
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  addResult(testName, passed, error = null) {
    this.testResults.push({ testName, passed, error });
  }
  
  printResults() {
    logSection('TEST RESULTS');
    
    let passed = 0;
    let failed = 0;
    
    this.testResults.forEach(result => {
      if (result.passed) {
        log(`✅ ${result.testName}`, 'green');
        passed++;
      } else {
        log(`❌ ${result.testName}: ${result.error}`, 'red');
        failed++;
      }
    });
    
    console.log('\n' + '-'.repeat(60));
    log(`Total: ${passed + failed} tests`, 'bright');
    log(`Passed: ${passed}`, 'green');
    if (failed > 0) {
      log(`Failed: ${failed}`, 'red');
    }
    
    if (failed === 0) {
      log('\n🎉 All tests passed!', 'green');
    }
  }
  
  async cleanup() {
    logSection('Cleanup');
    
    if (this.server) {
      await this.server.shutdown();
      log('✅ Server shut down', 'green');
    }
    
    // Clean up test data
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      await fs.rm(path.join(__dirname, 'test-data'), { recursive: true, force: true });
      await fs.rm(path.join(__dirname, 'test-images'), { recursive: true, force: true });
      log('✅ Test data cleaned up', 'green');
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new EventSourcedSystemTest();
  tester.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}