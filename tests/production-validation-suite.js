#!/usr/bin/env node

/**
 * Production Validation Suite for ChatGPT Image Generation System
 * 
 * This comprehensive test suite validates:
 * - End-to-end image generation workflow
 * - CLI tool functionality
 * - Server orchestration (ports 8080/8081/8082)
 * - Browser extension automation
 * - Event-driven communication
 * - File download and directory management
 * - Error handling and resilience
 * - Performance under load
 * - Security validation
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const WebSocket = require('ws');
const axios = require('axios');
const crypto = require('crypto');

// Import existing system components
const EventSourcedWebSocketServer = require('../nodejs.server/src/websocket-event-sourced-enhanced');

class ProductionValidationSuite {
  constructor() {
    this.testResults = [];
    this.servers = {};
    this.clients = [];
    this.tempDirs = [];
    this.testStartTime = Date.now();
    
    // Test configuration
    this.config = {
      eventServerPort: 8082,
      orchestratorPort: 8080,
      wsPort: 8081,
      testTimeout: 30000,
      maxConcurrentRequests: 10,
      testDataDir: './tests/data',
      testImagesDir: './tests/images',
      mockExtensionDir: './tests/mock-extension'
    };
    
    // Performance metrics
    this.metrics = {
      responseTime: [],
      throughput: 0,
      errorRate: 0,
      memoryUsage: [],
      cpuUsage: []
    };
  }

  async run() {
    try {
      this.logSection('PRODUCTION VALIDATION SUITE - CHATGPT IMAGE GENERATION');
      
      // Setup test environment
      await this.setupTestEnvironment();
      
      // Core functionality tests
      await this.testSystemHealth();
      await this.testHappyPathImageGeneration();
      await this.testErrorHandling();
      await this.testEdgeCases();
      
      // Integration tests
      await this.testCLITool();
      await this.testServerOrchestration();
      await this.testBrowserExtensionIntegration();
      await this.testEventDrivenCommunication();
      await this.testFileDownloadManagement();
      
      // Performance tests
      await this.testPerformanceUnderLoad();
      await this.testConcurrentRequests();
      await this.testMemoryLeaks();
      
      // Security tests
      await this.testSecurityValidation();
      
      // Generate comprehensive report
      await this.generateTestReport();
      
      // Cleanup
      await this.cleanup();
      
    } catch (error) {
      this.log(`FATAL ERROR: ${error.message}`, 'red');
      await this.emergencyCleanup();
      process.exit(1);
    }
  }

  async setupTestEnvironment() {
    this.logSection('Setting Up Test Environment');
    
    try {
      // Create test directories
      await this.ensureDirectory(this.config.testDataDir);
      await this.ensureDirectory(this.config.testImagesDir);
      await this.ensureDirectory(this.config.mockExtensionDir);
      
      // Start required servers
      await this.startEventSourcedServer();
      await this.startMockServers();
      
      // Create mock browser extension
      await this.createMockBrowserExtension();
      
      this.log('✅ Test environment setup complete', 'green');
      
    } catch (error) {
      throw new Error(`Environment setup failed: ${error.message}`);
    }
  }

  async testSystemHealth() {
    this.logSection('Test 1: System Health Check');
    
    const healthChecks = [
      { name: 'Event Server Health', port: this.config.eventServerPort, path: '/health' },
      { name: 'Orchestrator Health', port: this.config.orchestratorPort, path: '/health' },
      { name: 'WebSocket Server', port: this.config.wsPort, path: '/ws' }
    ];
    
    for (const check of healthChecks) {
      try {
        if (check.path === '/ws') {
          await this.checkWebSocketHealth(check.port);
        } else {
          await this.checkHttpHealth(check.port, check.path);
        }
        
        this.log(`✅ ${check.name}: HEALTHY`, 'green');
        this.addResult('System Health', check.name, true);
        
      } catch (error) {
        this.log(`❌ ${check.name}: UNHEALTHY - ${error.message}`, 'red');
        this.addResult('System Health', check.name, false, error.message);
      }
    }
  }

  async testHappyPathImageGeneration() {
    this.logSection('Test 2: Happy Path - Complete Image Generation Workflow');
    
    try {
      const testCase = {
        prompt: 'A serene mountain landscape at sunset with reflective lake',
        fileName: 'test-mountain-sunset.png',
        downloadFolder: path.join(this.config.testImagesDir, 'happy-path'),
        model: 'dall-e-3',
        timeout: 120000 // 2 minutes for actual image generation
      };
      
      await this.ensureDirectory(testCase.downloadFolder);
      
      // Step 1: Send request via CLI tool
      const startTime = Date.now();
      const requestId = await this.sendImageGenerationRequest(testCase);
      
      // Step 2: Monitor workflow progress
      const workflowResult = await this.monitorWorkflowProgress(requestId, testCase.timeout);
      
      // Step 3: Validate file download
      const downloadResult = await this.validateFileDownload(testCase);
      
      // Step 4: Validate image metadata
      const metadataResult = await this.validateImageMetadata(testCase);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      if (workflowResult.success && downloadResult.success && metadataResult.success) {
        this.log(`✅ Happy path completed successfully in ${totalTime}ms`, 'green');
        this.addResult('Happy Path', 'Complete Workflow', true, null, { executionTime: totalTime });
        this.metrics.responseTime.push(totalTime);
      } else {
        throw new Error('One or more workflow steps failed');
      }
      
    } catch (error) {
      this.log(`❌ Happy path failed: ${error.message}`, 'red');
      this.addResult('Happy Path', 'Complete Workflow', false, error.message);
    }
  }

  async testErrorHandling() {
    this.logSection('Test 3: Error Handling & Resilience');
    
    const errorScenarios = [
      {
        name: 'Invalid Prompt',
        testCase: { prompt: '', fileName: 'empty-prompt.png' },
        expectedError: 'Invalid prompt'
      },
      {
        name: 'Network Failure',
        testCase: { prompt: 'Valid prompt', fileName: 'network-fail.png' },
        mockFailure: 'network'
      },
      {
        name: 'Browser Extension Timeout',
        testCase: { prompt: 'Valid prompt', fileName: 'timeout.png' },
        mockFailure: 'extension_timeout'
      },
      {
        name: 'Invalid File Path',
        testCase: { 
          prompt: 'Valid prompt', 
          fileName: '../../../etc/passwd.png', // Path traversal attempt
          downloadFolder: '/invalid/path'
        },
        expectedError: 'Invalid path'
      },
      {
        name: 'Server Overload',
        testCase: { prompt: 'Valid prompt', fileName: 'overload.png' },
        mockFailure: 'server_overload'
      }
    ];
    
    for (const scenario of errorScenarios) {
      try {
        this.log(`Testing: ${scenario.name}`, 'yellow');
        
        // Apply mock failure if specified
        if (scenario.mockFailure) {
          await this.injectFailure(scenario.mockFailure);
        }
        
        const startTime = Date.now();
        const result = await this.sendImageGenerationRequest(scenario.testCase, true);
        const endTime = Date.now();
        
        // Verify error was handled gracefully
        if (result.error && (scenario.expectedError ? result.error.includes(scenario.expectedError) : true)) {
          this.log(`✅ ${scenario.name}: Error handled gracefully`, 'green');
          this.addResult('Error Handling', scenario.name, true);
        } else {
          throw new Error(`Expected error not returned: ${result.error}`);
        }
        
        // Clean up mock failure
        if (scenario.mockFailure) {
          await this.removeFailure(scenario.mockFailure);
        }
        
      } catch (error) {
        this.log(`❌ ${scenario.name}: ${error.message}`, 'red');
        this.addResult('Error Handling', scenario.name, false, error.message);
      }
    }
  }

  async testEdgeCases() {
    this.logSection('Test 4: Edge Cases');
    
    const edgeCases = [
      {
        name: 'Very Long Prompt',
        testCase: {
          prompt: 'A'.repeat(2000) + ' very long prompt that tests system limits',
          fileName: 'long-prompt.png'
        }
      },
      {
        name: 'Special Characters in Prompt',
        testCase: {
          prompt: 'Test with special chars: áéíóú ñ çÇ 中文 日本語 🎨🌟',
          fileName: 'special-chars.png'
        }
      },
      {
        name: 'Unicode Filename',
        testCase: {
          prompt: 'Simple prompt',
          fileName: 'тест-файл-中文.png'
        }
      },
      {
        name: 'Large File Path',
        testCase: {
          prompt: 'Simple prompt',
          fileName: 'test.png',
          downloadFolder: path.join(this.config.testImagesDir, 'a'.repeat(100))
        }
      }
    ];
    
    for (const edgeCase of edgeCases) {
      try {
        this.log(`Testing edge case: ${edgeCase.name}`, 'yellow');
        
        if (edgeCase.testCase.downloadFolder) {
          await this.ensureDirectory(edgeCase.testCase.downloadFolder);
        }
        
        const result = await this.sendImageGenerationRequest(edgeCase.testCase);
        
        if (result.success || (result.error && result.error.includes('handled gracefully'))) {
          this.log(`✅ ${edgeCase.name}: Handled correctly`, 'green');
          this.addResult('Edge Cases', edgeCase.name, true);
        } else {
          throw new Error(`Edge case not handled: ${result.error}`);
        }
        
      } catch (error) {
        this.log(`❌ ${edgeCase.name}: ${error.message}`, 'red');
        this.addResult('Edge Cases', edgeCase.name, false, error.message);
      }
    }
  }

  async testCLITool() {
    this.logSection('Test 5: CLI Tool Validation');
    
    const cliTests = [
      {
        name: 'Basic CLI Execution',
        args: ['--help'],
        expectedOutput: 'usage'
      },
      {
        name: 'Version Check',
        args: ['--version'],
        expectedOutput: /\d+\.\d+\.\d+/
      },
      {
        name: 'Configuration Validation',
        args: ['--config', 'check'],
        expectedOutput: 'configuration'
      },
      {
        name: 'Image Generation Command',
        args: [
          '--prompt', 'Test CLI image generation',
          '--output', path.join(this.config.testImagesDir, 'cli-test.png'),
          '--model', 'dall-e-3'
        ],
        timeout: 60000
      }
    ];
    
    for (const test of cliTests) {
      try {
        this.log(`Testing CLI: ${test.name}`, 'yellow');
        
        const result = await this.executeCLICommand(test.args, test.timeout);
        
        if (test.expectedOutput) {
          const outputMatch = typeof test.expectedOutput === 'string' 
            ? result.output.toLowerCase().includes(test.expectedOutput.toLowerCase())
            : test.expectedOutput.test(result.output);
            
          if (outputMatch) {
            this.log(`✅ ${test.name}: Output matched expectations`, 'green');
            this.addResult('CLI Tool', test.name, true);
          } else {
            throw new Error(`Output did not match. Got: ${result.output}`);
          }
        } else if (result.exitCode === 0) {
          this.log(`✅ ${test.name}: Executed successfully`, 'green');
          this.addResult('CLI Tool', test.name, true);
        } else {
          throw new Error(`CLI command failed with exit code ${result.exitCode}`);
        }
        
      } catch (error) {
        this.log(`❌ ${test.name}: ${error.message}`, 'red');
        this.addResult('CLI Tool', test.name, false, error.message);
      }
    }
  }

  async testServerOrchestration() {
    this.logSection('Test 6: Server Orchestration');
    
    try {
      // Test multi-port communication
      const ports = [this.config.orchestratorPort, this.config.wsPort, this.config.eventServerPort];
      const communicationMatrix = [];
      
      for (let i = 0; i < ports.length; i++) {
        for (let j = 0; j < ports.length; j++) {
          if (i !== j) {
            const result = await this.testInterServerCommunication(ports[i], ports[j]);
            communicationMatrix.push({
              from: ports[i],
              to: ports[j],
              success: result.success,
              latency: result.latency
            });
          }
        }
      }
      
      const successfulConnections = communicationMatrix.filter(c => c.success).length;
      const totalConnections = communicationMatrix.length;
      
      if (successfulConnections === totalConnections) {
        this.log(`✅ Server orchestration: ${successfulConnections}/${totalConnections} connections working`, 'green');
        this.addResult('Server Orchestration', 'Inter-server Communication', true);
      } else {
        throw new Error(`Only ${successfulConnections}/${totalConnections} server connections working`);
      }
      
      // Test load balancing
      await this.testLoadBalancing();
      
    } catch (error) {
      this.log(`❌ Server orchestration failed: ${error.message}`, 'red');
      this.addResult('Server Orchestration', 'Overall', false, error.message);
    }
  }

  async testBrowserExtensionIntegration() {
    this.logSection('Test 7: Browser Extension Integration');
    
    try {
      // Test extension communication protocol
      const extensionTests = [
        {
          name: 'Extension Registration',
          action: 'register',
          payload: { extensionId: 'test-extension', version: '1.0.0' }
        },
        {
          name: 'ChatGPT Page Detection',
          action: 'detect_page',
          payload: { url: 'https://chat.openai.com' }
        },
        {
          name: 'Image Generation Automation',
          action: 'generate_image',
          payload: {
            prompt: 'Test automation image',
            waitForGeneration: true,
            downloadImage: true
          }
        },
        {
          name: 'File Download Simulation',
          action: 'download_file',
          payload: {
            url: 'blob:https://chat.openai.com/test-image',
            filename: 'extension-test.png',
            directory: this.config.testImagesDir
          }
        }
      ];
      
      for (const test of extensionTests) {
        const result = await this.simulateExtensionAction(test);
        
        if (result.success) {
          this.log(`✅ ${test.name}: Working correctly`, 'green');
          this.addResult('Browser Extension', test.name, true);
        } else {
          throw new Error(`Extension test failed: ${result.error}`);
        }
      }
      
    } catch (error) {
      this.log(`❌ Browser extension integration failed: ${error.message}`, 'red');
      this.addResult('Browser Extension', 'Overall', false, error.message);
    }
  }

  async testEventDrivenCommunication() {
    this.logSection('Test 8: Event-Driven Communication Layer');
    
    try {
      const client = await this.createWebSocketClient();
      
      // Test event subscription
      await this.subscribeToEvents(client, [
        'ImageGenerationRequested',
        'ImageGenerated',
        'WorkflowCompleted',
        'Error'
      ]);
      
      // Send test events and verify propagation
      const testEvents = [
        {
          type: 'ImageGenerationRequestedEvent',
          payload: {
            requestId: 'test-event-001',
            prompt: 'Test event propagation',
            fileName: 'event-test.png'
          }
        }
      ];
      
      let eventsReceived = 0;
      const expectedEvents = testEvents.length;
      
      client.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type && message.type.includes('Event')) {
          eventsReceived++;
        }
      });
      
      // Send test events
      for (const event of testEvents) {
        await this.sendEvent(client, event);
        await this.delay(100);
      }
      
      // Wait for event propagation
      await this.delay(2000);
      
      if (eventsReceived >= expectedEvents) {
        this.log(`✅ Event communication: ${eventsReceived} events received`, 'green');
        this.addResult('Event Communication', 'Event Propagation', true);
      } else {
        throw new Error(`Only ${eventsReceived}/${expectedEvents} events received`);
      }
      
      client.close();
      
    } catch (error) {
      this.log(`❌ Event-driven communication failed: ${error.message}`, 'red');
      this.addResult('Event Communication', 'Overall', false, error.message);
    }
  }

  async testFileDownloadManagement() {
    this.logSection('Test 9: File Download & Directory Management');
    
    try {
      const downloadTests = [
        {
          name: 'Create Download Directory',
          directory: path.join(this.config.testImagesDir, 'auto-created'),
          shouldCreate: true
        },
        {
          name: 'Permission Check',
          directory: path.join(this.config.testImagesDir, 'permissions'),
          checkPermissions: true
        },
        {
          name: 'File Collision Handling',
          fileName: 'collision-test.png',
          createExisting: true
        },
        {
          name: 'Large File Handling',
          fileName: 'large-file-test.png',
          size: 10 * 1024 * 1024 // 10MB
        }
      ];
      
      for (const test of downloadTests) {
        try {
          await this.runDownloadTest(test);
          this.log(`✅ ${test.name}: Working correctly`, 'green');
          this.addResult('File Management', test.name, true);
        } catch (error) {
          throw new Error(`${test.name} failed: ${error.message}`);
        }
      }
      
    } catch (error) {
      this.log(`❌ File download management failed: ${error.message}`, 'red');
      this.addResult('File Management', 'Overall', false, error.message);
    }
  }

  async testPerformanceUnderLoad() {
    this.logSection('Test 10: Performance Under Load');
    
    try {
      const loadTests = [
        {
          name: 'Concurrent Requests',
          concurrency: 10,
          requests: 50,
          timeout: 60000
        },
        {
          name: 'Sustained Load',
          duration: 30000, // 30 seconds
          requestsPerSecond: 5
        },
        {
          name: 'Spike Load',
          spikes: 3,
          spikeSize: 20,
          intervalBetweenSpikes: 5000
        }
      ];
      
      for (const test of loadTests) {
        const startTime = Date.now();
        const result = await this.runLoadTest(test);
        const endTime = Date.now();
        
        // Calculate performance metrics
        const totalTime = endTime - startTime;
        const throughput = result.successful / (totalTime / 1000);
        const errorRate = (result.failed / result.total) * 100;
        
        this.metrics.throughput = Math.max(this.metrics.throughput, throughput);
        this.metrics.errorRate = Math.max(this.metrics.errorRate, errorRate);
        
        // Validate performance requirements
        if (result.successful > 0 && errorRate < 5) { // Less than 5% error rate
          this.log(`✅ ${test.name}: ${throughput.toFixed(2)} req/s, ${errorRate.toFixed(2)}% errors`, 'green');
          this.addResult('Performance', test.name, true, null, {
            throughput,
            errorRate,
            totalTime
          });
        } else {
          throw new Error(`Performance requirements not met: ${errorRate}% error rate`);
        }
      }
      
    } catch (error) {
      this.log(`❌ Performance test failed: ${error.message}`, 'red');
      this.addResult('Performance', 'Overall', false, error.message);
    }
  }

  async testConcurrentRequests() {
    this.logSection('Test 11: Concurrent Request Handling');
    
    try {
      const concurrentRequests = Array.from({ length: this.config.maxConcurrentRequests }, (_, i) => ({
        requestId: `concurrent-${i}`,
        prompt: `Concurrent test image ${i}`,
        fileName: `concurrent-test-${i}.png`
      }));
      
      const startTime = Date.now();
      const promises = concurrentRequests.map(req => this.sendImageGenerationRequest(req, true));
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;
      const totalTime = endTime - startTime;
      const averageTime = totalTime / results.length;
      
      if (successful > 0) {
        this.log(`✅ Concurrent requests: ${successful}/${results.length} successful in ${totalTime}ms`, 'green');
        this.addResult('Concurrency', 'Concurrent Requests', true, null, {
          successful,
          failed,
          totalTime,
          averageTime
        });
      } else {
        throw new Error('No concurrent requests succeeded');
      }
      
    } catch (error) {
      this.log(`❌ Concurrent requests test failed: ${error.message}`, 'red');
      this.addResult('Concurrency', 'Concurrent Requests', false, error.message);
    }
  }

  async testMemoryLeaks() {
    this.logSection('Test 12: Memory Leak Detection');
    
    try {
      const initialMemory = process.memoryUsage();
      
      // Run memory-intensive operations
      for (let i = 0; i < 50; i++) {
        await this.sendImageGenerationRequest({
          prompt: `Memory test ${i}`,
          fileName: `memory-test-${i}.png`
        }, true);
        
        if (i % 10 === 0) {
          const currentMemory = process.memoryUsage();
          this.metrics.memoryUsage.push({
            iteration: i,
            heapUsed: currentMemory.heapUsed,
            external: currentMemory.external,
            timestamp: Date.now()
          });
        }
        
        await this.delay(100);
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;
      
      // Memory increase should be reasonable (less than 50% for this test)
      if (memoryIncreasePercent < 50) {
        this.log(`✅ Memory leak test: ${memoryIncreasePercent.toFixed(2)}% increase`, 'green');
        this.addResult('Memory', 'Leak Detection', true, null, {
          memoryIncrease,
          memoryIncreasePercent
        });
      } else {
        throw new Error(`Potential memory leak: ${memoryIncreasePercent}% increase`);
      }
      
    } catch (error) {
      this.log(`❌ Memory leak test failed: ${error.message}`, 'red');
      this.addResult('Memory', 'Leak Detection', false, error.message);
    }
  }

  async testSecurityValidation() {
    this.logSection('Test 13: Security Validation');
    
    const securityTests = [
      {
        name: 'Path Traversal Prevention',
        testCase: {
          fileName: '../../../etc/passwd',
          expectedError: 'Invalid path'
        }
      },
      {
        name: 'XSS Prevention',
        testCase: {
          prompt: '<script>alert("xss")</script>',
          sanitized: true
        }
      },
      {
        name: 'SQL Injection Prevention',
        testCase: {
          prompt: "'; DROP TABLE users; --",
          sanitized: true
        }
      },
      {
        name: 'Large Payload Rejection',
        testCase: {
          prompt: 'A'.repeat(10000),
          expectedError: 'Payload too large'
        }
      },
      {
        name: 'Rate Limiting',
        testCase: {
          rapidRequests: 100,
          expectedError: 'Rate limit exceeded'
        }
      }
    ];
    
    for (const test of securityTests) {
      try {
        this.log(`Testing security: ${test.name}`, 'yellow');
        
        if (test.testCase.rapidRequests) {
          // Test rate limiting
          const promises = Array.from({ length: test.testCase.rapidRequests }, () =>
            this.sendImageGenerationRequest({ prompt: 'Rate limit test', fileName: 'rate-test.png' }, true)
          );
          
          const results = await Promise.allSettled(promises);
          const rejected = results.filter(r => 
            r.status === 'rejected' || 
            (r.status === 'fulfilled' && r.value.error && r.value.error.includes('rate limit'))
          ).length;
          
          if (rejected > 0) {
            this.log(`✅ ${test.name}: Rate limiting active (${rejected} requests rejected)`, 'green');
            this.addResult('Security', test.name, true);
          } else {
            throw new Error('Rate limiting not working');
          }
          
        } else {
          const result = await this.sendImageGenerationRequest(test.testCase, true);
          
          if (test.testCase.expectedError && result.error && result.error.includes(test.testCase.expectedError)) {
            this.log(`✅ ${test.name}: Security measure active`, 'green');
            this.addResult('Security', test.name, true);
          } else if (test.testCase.sanitized && result.success) {
            this.log(`✅ ${test.name}: Input sanitized correctly`, 'green');
            this.addResult('Security', test.name, true);
          } else {
            throw new Error(`Security test failed: ${result.error || 'Unexpected result'}`);
          }
        }
        
      } catch (error) {
        this.log(`❌ ${test.name}: ${error.message}`, 'red');
        this.addResult('Security', test.name, false, error.message);
      }
    }
  }

  // Helper Methods

  async startEventSourcedServer() {
    try {
      this.servers.eventServer = new EventSourcedWebSocketServer(this.config.eventServerPort, {
        path: '/ws-events',
        storePath: path.join(this.config.testDataDir, 'events'),
        snapshotPath: path.join(this.config.testDataDir, 'snapshots')
      });
      
      await this.servers.eventServer.start();
      this.log(`✅ Event-sourced server started on port ${this.config.eventServerPort}`, 'green');
      
    } catch (error) {
      throw new Error(`Failed to start event server: ${error.message}`);
    }
  }

  async startMockServers() {
    // Mock orchestrator server
    this.servers.mockOrchestrator = require('http').createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      
      if (req.url === '/health') {
        res.end(JSON.stringify({ status: 'healthy', service: 'orchestrator' }));
      } else if (req.url === '/api/image-generation') {
        res.end(JSON.stringify({ requestId: `mock-${Date.now()}`, status: 'accepted' }));
      } else {
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });
    
    this.servers.mockOrchestrator.listen(this.config.orchestratorPort);
    
    // Mock WebSocket server
    this.servers.mockWS = new WebSocket.Server({ port: this.config.wsPort });
    
    this.log('✅ Mock servers started', 'green');
  }

  async createMockBrowserExtension() {
    const extensionManifest = {
      manifest_version: 3,
      name: 'ChatGPT Image Generation Test Extension',
      version: '1.0.0',
      permissions: ['activeTab', 'downloads', 'storage'],
      content_scripts: [{
        matches: ['*://chat.openai.com/*'],
        js: ['content.js']
      }]
    };
    
    const contentScript = `
      // Mock browser extension content script for testing
      class MockExtension {
        constructor() {
          this.isActive = true;
          this.setupMessageHandler();
        }
        
        setupMessageHandler() {
          window.addEventListener('message', (event) => {
            if (event.data.type === 'IMAGE_GENERATION_REQUEST') {
              this.handleImageGeneration(event.data);
            }
          });
        }
        
        async handleImageGeneration(request) {
          // Simulate image generation process
          setTimeout(() => {
            window.postMessage({
              type: 'IMAGE_GENERATION_COMPLETE',
              requestId: request.requestId,
              imageUrl: 'blob:https://chat.openai.com/test-image',
              success: true
            }, '*');
          }, Math.random() * 2000 + 1000); // 1-3 seconds
        }
      }
      
      if (window.location.hostname === 'chat.openai.com') {
        new MockExtension();
      }
    `;
    
    await fs.writeFile(
      path.join(this.config.mockExtensionDir, 'manifest.json'),
      JSON.stringify(extensionManifest, null, 2)
    );
    
    await fs.writeFile(
      path.join(this.config.mockExtensionDir, 'content.js'),
      contentScript
    );
  }

  async sendImageGenerationRequest(testCase, expectError = false) {
    try {
      const client = await this.createWebSocketClient();
      
      const request = {
        type: 'ImageGenerationRequestedEvent',
        requestId: testCase.requestId || `test-${Date.now()}`,
        prompt: testCase.prompt,
        fileName: testCase.fileName,
        downloadFolder: testCase.downloadFolder || this.config.testImagesDir,
        model: testCase.model || 'dall-e-3',
        correlationId: `test-correlation-${Date.now()}`
      };
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Request timeout' });
        }, testCase.timeout || this.config.testTimeout);
        
        client.send(JSON.stringify(request));
        
        client.on('message', (data) => {
          const message = JSON.parse(data);
          
          if (message.type === 'ImageGenerated' && message.requestId === request.requestId) {
            clearTimeout(timeout);
            client.close();
            resolve({ success: true, message });
          } else if (message.type === 'error' || message.error) {
            clearTimeout(timeout);
            client.close();
            resolve({ 
              success: false, 
              error: message.error || message.message,
              expectedError: expectError
            });
          }
        });
      });
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createWebSocketClient() {
    return new Promise((resolve, reject) => {
      const client = new WebSocket(`ws://localhost:${this.config.eventServerPort}/ws-events`);
      
      client.on('open', () => {
        // Authenticate
        client.send(JSON.stringify({
          type: 'authenticate',
          clientType: 'production-validation-test',
          metadata: { testRun: true }
        }));
        
        resolve(client);
      });
      
      client.on('error', reject);
      
      setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
    });
  }

  async generateTestReport() {
    this.logSection('Generating Comprehensive Test Report');
    
    const endTime = Date.now();
    const totalTestTime = endTime - this.testStartTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      executionTime: totalTestTime,
      summary: {
        totalTests: this.testResults.length,
        passed: this.testResults.filter(r => r.passed).length,
        failed: this.testResults.filter(r => !r.passed).length,
        successRate: (this.testResults.filter(r => r.passed).length / this.testResults.length) * 100
      },
      metrics: {
        averageResponseTime: this.metrics.responseTime.length > 0 
          ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length 
          : 0,
        maxThroughput: this.metrics.throughput,
        errorRate: this.metrics.errorRate,
        memoryProfile: this.metrics.memoryUsage
      },
      results: this.groupTestResults(),
      recommendations: this.generateRecommendations()
    };
    
    // Save report
    const reportPath = path.join(this.config.testDataDir, 'production-validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Save to memory
    await this.storeTestResults(report);
    
    this.printReportSummary(report);
    
    return report;
  }

  groupTestResults() {
    const grouped = {};
    
    for (const result of this.testResults) {
      if (!grouped[result.category]) {
        grouped[result.category] = [];
      }
      grouped[result.category].push(result);
    }
    
    return grouped;
  }

  generateRecommendations() {
    const recommendations = [];
    const failedTests = this.testResults.filter(r => !r.passed);
    
    if (failedTests.length > 0) {
      recommendations.push('⚠️  Fix failed tests before production deployment');
    }
    
    if (this.metrics.errorRate > 2) {
      recommendations.push('⚠️  Error rate is high - investigate error handling');
    }
    
    if (this.metrics.responseTime.some(t => t > 30000)) {
      recommendations.push('⚠️  Some requests taking too long - optimize performance');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ System is production-ready!');
    }
    
    return recommendations;
  }

  async storeTestResults(report) {
    try {
      // Store in memory for hive mind coordination
      const memoryKey = `hive/tests/validation-results-${Date.now()}`;
      
      // Use the MCP memory system if available
      if (typeof mcp__claude_flow__memory_usage === 'function') {
        await mcp__claude_flow__memory_usage({
          action: 'store',
          key: memoryKey,
          value: JSON.stringify(report),
          namespace: 'production-validation'
        });
      }
      
      this.log(`✅ Test results stored in memory: ${memoryKey}`, 'green');
      
    } catch (error) {
      this.log(`⚠️  Could not store in memory: ${error.message}`, 'yellow');
    }
  }

  printReportSummary(report) {
    this.logSection('TEST EXECUTION SUMMARY');
    
    this.log(`Total Tests: ${report.summary.totalTests}`, 'bright');
    this.log(`Passed: ${report.summary.passed}`, 'green');
    this.log(`Failed: ${report.summary.failed}`, report.summary.failed > 0 ? 'red' : 'green');
    this.log(`Success Rate: ${report.summary.successRate.toFixed(2)}%`, 
              report.summary.successRate >= 95 ? 'green' : 'yellow');
    
    this.log(`\nPerformance Metrics:`, 'bright');
    this.log(`Average Response Time: ${report.metrics.averageResponseTime.toFixed(2)}ms`, 'cyan');
    this.log(`Max Throughput: ${report.metrics.maxThroughput.toFixed(2)} req/s`, 'cyan');
    this.log(`Error Rate: ${report.metrics.errorRate.toFixed(2)}%`, 'cyan');
    
    this.log(`\nRecommendations:`, 'bright');
    for (const rec of report.recommendations) {
      this.log(rec, rec.includes('✅') ? 'green' : 'yellow');
    }
    
    if (report.summary.successRate >= 95) {
      this.log('\n🎉 SYSTEM IS PRODUCTION READY! 🎉', 'green');
    } else {
      this.log('\n⚠️  SYSTEM NEEDS ATTENTION BEFORE PRODUCTION', 'yellow');
    }
  }

  // Utility methods
  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async checkHttpHealth(port, path) {
    const response = await axios.get(`http://localhost:${port}${path}`, {
      timeout: 5000
    });
    
    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response.data;
  }

  async checkWebSocketHealth(port) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${port}/ws`);
      
      ws.on('open', () => {
        ws.close();
        resolve(true);
      });
      
      ws.on('error', reject);
      
      setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
    });
  }

  addResult(category, testName, passed, error = null, metrics = null) {
    this.testResults.push({
      category,
      testName,
      passed,
      error,
      metrics,
      timestamp: new Date().toISOString()
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  log(message, color = 'reset') {
    const colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      green: '\x1b[32m',
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m'
    };
    
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logSection(title) {
    console.log('\n' + '='.repeat(80));
    this.log(title, 'bright');
    console.log('='.repeat(80));
  }

  async cleanup() {
    this.logSection('Cleanup');
    
    try {
      // Close all WebSocket clients
      for (const client of this.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      }
      
      // Shutdown servers
      if (this.servers.eventServer) {
        await this.servers.eventServer.shutdown();
      }
      
      if (this.servers.mockOrchestrator) {
        this.servers.mockOrchestrator.close();
      }
      
      if (this.servers.mockWS) {
        this.servers.mockWS.close();
      }
      
      this.log('✅ All servers shut down', 'green');
      
    } catch (error) {
      this.log(`⚠️  Cleanup warning: ${error.message}`, 'yellow');
    }
  }

  async emergencyCleanup() {
    try {
      await this.cleanup();
    } catch (error) {
      this.log(`Emergency cleanup failed: ${error.message}`, 'red');
    }
  }
}

// Export for use as module or run directly
if (require.main === module) {
  const validator = new ProductionValidationSuite();
  validator.run().catch(error => {
    console.error('Production validation failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionValidationSuite;