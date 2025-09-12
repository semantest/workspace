#!/usr/bin/env node

/**
 * Quick Validation Script for ChatGPT Image Generation System
 * 
 * This is a fast smoke test to verify basic system functionality
 * before running comprehensive validation suites.
 * 
 * Usage: node quick-validation.js
 */

const WebSocket = require('ws');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class QuickValidation {
  constructor() {
    this.config = {
      eventServerUrl: 'ws://localhost:8082/ws-events',
      orchestratorUrl: 'http://localhost:8080',
      wsUrl: 'ws://localhost:8081',
      timeout: 15000,
      testDir: './tests/quick-test-results'
    };
    
    this.results = [];
    this.startTime = Date.now();
  }

  async run() {
    console.log('🚀 Quick Validation - ChatGPT Image Generation System');
    console.log('======================================================\n');
    
    try {
      await this.setupTestEnvironment();
      
      // Basic connectivity tests
      await this.testServerConnectivity();
      await this.testWebSocketConnection();
      await this.testEventSystemBasics();
      
      // Quick functional test
      await this.testBasicImageRequest();
      
      // Generate quick report
      this.generateQuickReport();
      
    } catch (error) {
      console.error('❌ Quick validation failed:', error.message);
      process.exit(1);
    }
  }

  async setupTestEnvironment() {
    try {
      await fs.mkdir(this.config.testDir, { recursive: true });
      console.log('✅ Test environment ready');
    } catch (error) {
      throw new Error(`Environment setup failed: ${error.message}`);
    }
  }

  async testServerConnectivity() {
    console.log('🔌 Testing Server Connectivity...');
    
    const servers = [
      { name: 'Orchestrator', url: `${this.config.orchestratorUrl}/health` },
      // Note: WebSocket servers tested separately
    ];
    
    for (const server of servers) {
      try {
        const startTime = Date.now();
        const response = await axios.get(server.url, { 
          timeout: this.config.timeout 
        });
        const responseTime = Date.now() - startTime;
        
        if (response.status === 200) {
          console.log(`  ✅ ${server.name}: Connected (${responseTime}ms)`);
          this.addResult('Connectivity', server.name, true, responseTime);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
        
      } catch (error) {
        console.log(`  ❌ ${server.name}: ${error.message}`);
        this.addResult('Connectivity', server.name, false, 0, error.message);
      }
    }
  }

  async testWebSocketConnection() {
    console.log('\n💬 Testing WebSocket Connections...');
    
    const wsEndpoints = [
      { name: 'Event Server', url: this.config.eventServerUrl },
      { name: 'Main WebSocket', url: this.config.wsUrl }
    ];
    
    for (const endpoint of wsEndpoints) {
      try {
        const startTime = Date.now();
        await this.testWebSocketEndpoint(endpoint.url);
        const responseTime = Date.now() - startTime;
        
        console.log(`  ✅ ${endpoint.name}: Connected (${responseTime}ms)`);
        this.addResult('WebSocket', endpoint.name, true, responseTime);
        
      } catch (error) {
        console.log(`  ❌ ${endpoint.name}: ${error.message}`);
        this.addResult('WebSocket', endpoint.name, false, 0, error.message);
      }
    }
  }

  async testWebSocketEndpoint(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout'));
      }, this.config.timeout);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async testEventSystemBasics() {
    console.log('\n📡 Testing Event System Basics...');
    
    try {
      const client = await this.createEventClient();
      
      // Test authentication
      await this.authenticateClient(client);
      console.log('  ✅ Authentication: Working');
      this.addResult('Event System', 'Authentication', true);
      
      // Test event subscription
      await this.testEventSubscription(client);
      console.log('  ✅ Event Subscription: Working');
      this.addResult('Event System', 'Subscription', true);
      
      // Test basic command sending
      await this.testBasicCommand(client);
      console.log('  ✅ Command Processing: Working');
      this.addResult('Event System', 'Commands', true);
      
      client.close();
      
    } catch (error) {
      console.log(`  ❌ Event System: ${error.message}`);
      this.addResult('Event System', 'Overall', false, 0, error.message);
    }
  }

  async testBasicImageRequest() {
    console.log('\n🎨 Testing Basic Image Request...');
    
    try {
      const client = await this.createEventClient();
      await this.authenticateClient(client);
      
      const testRequest = {
        type: 'ImageGenerationRequestedEvent',
        requestId: `quick-test-${Date.now()}`,
        prompt: 'A simple test image for validation',
        fileName: 'quick-validation-test.png',
        downloadFolder: this.config.testDir,
        model: 'dall-e-3'
      };
      
      const startTime = Date.now();
      
      // Send the request
      client.send(JSON.stringify(testRequest));
      
      // Wait for response (with timeout)
      const result = await this.waitForImageResponse(client, testRequest.requestId);
      const responseTime = Date.now() - startTime;
      
      if (result.success) {
        console.log(`  ✅ Image Request: Processed successfully (${responseTime}ms)`);
        this.addResult('Image Generation', 'Basic Request', true, responseTime);
      } else {
        console.log(`  ⚠️  Image Request: ${result.message} (${responseTime}ms)`);
        this.addResult('Image Generation', 'Basic Request', false, responseTime, result.message);
      }
      
      client.close();
      
    } catch (error) {
      console.log(`  ❌ Image Request: ${error.message}`);
      this.addResult('Image Generation', 'Basic Request', false, 0, error.message);
    }
  }

  async createEventClient() {
    return new Promise((resolve, reject) => {
      const client = new WebSocket(this.config.eventServerUrl);
      
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, this.config.timeout);
      
      client.on('open', () => {
        clearTimeout(timeout);
        resolve(client);
      });
      
      client.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async authenticateClient(client) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 5000);
      
      const authHandler = (data) => {
        const message = JSON.parse(data);
        if (message.type === 'authentication_success' || message.type === 'welcome') {
          clearTimeout(timeout);
          client.removeListener('message', authHandler);
          resolve();
        } else if (message.type === 'error') {
          clearTimeout(timeout);
          client.removeListener('message', authHandler);
          reject(new Error(message.message || 'Authentication failed'));
        }
      };
      
      client.on('message', authHandler);
      
      // Send authentication request
      client.send(JSON.stringify({
        type: 'authenticate',
        clientType: 'quick-validation',
        metadata: { test: true }
      }));
    });
  }

  async testEventSubscription(client) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Subscription timeout'));
      }, 5000);
      
      const subscriptionHandler = (data) => {
        const message = JSON.parse(data);
        if (message.type === 'subscription_confirmed') {
          clearTimeout(timeout);
          client.removeListener('message', subscriptionHandler);
          resolve();
        }
      };
      
      client.on('message', subscriptionHandler);
      
      // Send subscription request
      client.send(JSON.stringify({
        type: 'subscribe',
        eventTypes: ['ImageGenerationRequested', 'ImageGenerated'],
        streams: []
      }));
    });
  }

  async testBasicCommand(client) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'));
      }, 5000);
      
      const commandHandler = (data) => {
        const message = JSON.parse(data);
        if (message.type === 'command_accepted') {
          clearTimeout(timeout);
          client.removeListener('message', commandHandler);
          resolve();
        } else if (message.type === 'command_rejected') {
          clearTimeout(timeout);
          client.removeListener('message', commandHandler);
          reject(new Error(message.error || 'Command rejected'));
        }
      };
      
      client.on('message', commandHandler);
      
      // Send test command
      client.send(JSON.stringify({
        type: 'command',
        commandId: `quick-test-cmd-${Date.now()}`,
        aggregateId: `quick-test-aggregate-${Date.now()}`,
        commandType: 'TestCommand',
        payload: { test: true },
        expectedVersion: null
      }));
    });
  }

  async waitForImageResponse(client, requestId) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, message: 'Response timeout - this may be expected for image generation' });
      }, 10000); // Shorter timeout for quick test
      
      const responseHandler = (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'ImageGenerated' && message.requestId === requestId) {
          clearTimeout(timeout);
          client.removeListener('message', responseHandler);
          resolve({ success: true, message: 'Image generated successfully' });
        } else if (message.type === 'error' && message.requestId === requestId) {
          clearTimeout(timeout);
          client.removeListener('message', responseHandler);
          resolve({ success: false, message: message.message || 'Generation failed' });
        } else if (message.type === 'command_accepted') {
          // Request was accepted, continue waiting
        }
      };
      
      client.on('message', responseHandler);
    });
  }

  addResult(category, test, success, responseTime = 0, error = null) {
    this.results.push({
      category,
      test,
      success,
      responseTime,
      error,
      timestamp: Date.now()
    });
  }

  generateQuickReport() {
    const endTime = Date.now();
    const totalTime = endTime - this.startTime;
    
    console.log('\n📊 QUICK VALIDATION RESULTS');
    console.log('============================');
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const successRate = (passedTests / totalTests) * 100;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`Total Time: ${totalTime}ms\n`);
    
    // Group results by category
    const categories = {};
    for (const result of this.results) {
      if (!categories[result.category]) {
        categories[result.category] = [];
      }
      categories[result.category].push(result);
    }
    
    // Print detailed results
    for (const [category, tests] of Object.entries(categories)) {
      console.log(`${category}:`);
      for (const test of tests) {
        const status = test.success ? '✅' : '❌';
        const time = test.responseTime > 0 ? ` (${test.responseTime}ms)` : '';
        const error = test.error ? ` - ${test.error}` : '';
        console.log(`  ${status} ${test.test}${time}${error}`);
      }
      console.log('');
    }
    
    // Overall assessment
    console.log('🎯 SYSTEM STATUS');
    console.log('================');
    
    if (successRate >= 90) {
      console.log('✅ SYSTEM HEALTHY - Ready for comprehensive testing');
    } else if (successRate >= 70) {
      console.log('⚠️  SYSTEM FUNCTIONAL - Some issues detected, investigate before full testing');
    } else {
      console.log('❌ SYSTEM ISSUES - Major problems detected, fix before proceeding');
    }
    
    // Critical path check
    const criticalComponents = ['Connectivity', 'WebSocket', 'Event System'];
    const criticalIssues = this.results.filter(r => 
      criticalComponents.includes(r.category) && !r.success
    );
    
    if (criticalIssues.length === 0) {
      console.log('✅ All critical components functional');
    } else {
      console.log('❌ Critical component issues detected:');
      for (const issue of criticalIssues) {
        console.log(`   - ${issue.category}: ${issue.test}`);
      }
    }
    
    // Next steps
    console.log('\n📋 NEXT STEPS');
    console.log('=============');
    
    if (successRate >= 90) {
      console.log('1. Run full production validation suite: node tests/production-validation-suite.js');
      console.log('2. Execute performance benchmarks: node tests/performance-benchmark.js');
      console.log('3. Conduct manual testing: See tests/manual-testing-guide.md');
    } else if (failedTests > 0) {
      console.log('1. Fix failing components identified above');
      console.log('2. Re-run quick validation');
      console.log('3. Once all tests pass, proceed with comprehensive testing');
    }
    
    // Save results
    this.saveResults({
      timestamp: new Date().toISOString(),
      totalTime,
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate
      },
      results: this.results,
      assessment: successRate >= 90 ? 'HEALTHY' : successRate >= 70 ? 'FUNCTIONAL' : 'ISSUES'
    });
  }

  async saveResults(report) {
    try {
      const reportPath = path.join(this.config.testDir, `quick-validation-${Date.now()}.json`);
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Results saved: ${reportPath}`);
    } catch (error) {
      console.log(`⚠️  Could not save results: ${error.message}`);
    }
  }
}

// Run validation if executed directly
if (require.main === module) {
  const validator = new QuickValidation();
  validator.run().catch(error => {
    console.error('Quick validation failed:', error);
    process.exit(1);
  });
}

module.exports = QuickValidation;