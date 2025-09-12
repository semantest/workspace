#!/usr/bin/env node

/**
 * Test Suite for Enhanced SEMANTEST CLI
 * Tests various CLI functions and validates event structure
 */

const EnhancedSemantestCLI = require('./enhanced-semantest-cli');
const fs = require('fs');
const path = require('path');

class CLITester {
  constructor() {
    this.cli = new EnhancedSemantestCLI();
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🧪 Starting Enhanced SEMANTEST CLI Tests\n');

    const tests = [
      this.testEventStructure,
      this.testParameterValidation,
      this.testBatchFileGeneration,
      this.testBatchFileValidation,
      this.testDirectoryCreation,
      this.testServerValidation
    ];

    for (const test of tests) {
      try {
        await test.call(this);
        this.recordTest(test.name, true);
      } catch (error) {
        this.recordTest(test.name, false, error.message);
        console.error(`❌ ${test.name} failed:`, error.message);
      }
    }

    this.printResults();
  }

  async testEventStructure() {
    console.log('🔍 Testing event structure validation...');

    const options = {
      prompt: 'Test prompt',
      outputPath: 'test.png',
      downloadFolder: './test-images',
      correlationId: 'test-123',
      parameters: { model: 'dall-e-3' }
    };

    // Mock axios to capture the event structure
    const originalAxios = require('axios');
    const mockAxios = {
      post: async (url, data, config) => {
        // Validate event structure
        if (!data.id || !data.type || !data.eventType || !data.payload) {
          throw new Error('Invalid event structure');
        }

        if (data.type !== 'ImageGenerationRequestedEvent') {
          throw new Error('Incorrect event type');
        }

        if (data.payload.prompt !== 'Test prompt') {
          throw new Error('Prompt not correctly set');
        }

        if (data.payload.correlationId !== 'test-123') {
          throw new Error('Correlation ID not correctly set');
        }

        if (!data.payload.parameters || data.payload.parameters.model !== 'dall-e-3') {
          throw new Error('Parameters not correctly set');
        }

        return { data: { success: true, eventId: data.id } };
      }
    };

    // Temporarily replace axios
    require.cache[require.resolve('axios')].exports = mockAxios;

    try {
      const result = await this.cli.sendImageGenerationEvent(options);
      console.log('✅ Event structure validation passed');
    } finally {
      // Restore original axios
      require.cache[require.resolve('axios')].exports = originalAxios;
    }
  }

  async testParameterValidation() {
    console.log('🔍 Testing parameter validation...');

    // Test empty prompt
    try {
      await this.cli.sendImageGenerationEvent({ prompt: '', outputPath: 'test.png' });
      throw new Error('Should have failed with empty prompt');
    } catch (error) {
      if (!error.message.includes('Prompt cannot be empty')) {
        throw new Error('Wrong error for empty prompt');
      }
    }

    // Test empty output path
    try {
      await this.cli.sendImageGenerationEvent({ prompt: 'test', outputPath: '' });
      throw new Error('Should have failed with empty output path');
    } catch (error) {
      if (!error.message.includes('Output path cannot be empty')) {
        throw new Error('Wrong error for empty output path');
      }
    }

    console.log('✅ Parameter validation passed');
  }

  async testBatchFileGeneration() {
    console.log('🔍 Testing batch file generation...');

    const testFile = './test-batch.json';
    
    // Clean up any existing test file
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }

    this.cli.generateSampleBatch(testFile);

    if (!fs.existsSync(testFile)) {
      throw new Error('Batch file was not created');
    }

    const batchData = JSON.parse(fs.readFileSync(testFile, 'utf8'));

    if (!batchData.requests || !Array.isArray(batchData.requests)) {
      throw new Error('Batch file does not have requests array');
    }

    if (batchData.requests.length === 0) {
      throw new Error('Batch file has no sample requests');
    }

    // Clean up
    fs.unlinkSync(testFile);

    console.log('✅ Batch file generation passed');
  }

  async testBatchFileValidation() {
    console.log('🔍 Testing batch file validation...');

    const invalidFile = './invalid-batch.json';
    fs.writeFileSync(invalidFile, '{ "invalid": true }');

    try {
      await this.cli.processBatch(invalidFile);
      throw new Error('Should have failed with invalid batch file');
    } catch (error) {
      if (!error.message.includes('must contain a "requests" array')) {
        throw new Error('Wrong error for invalid batch file');
      }
    } finally {
      fs.unlinkSync(invalidFile);
    }

    console.log('✅ Batch file validation passed');
  }

  async testDirectoryCreation() {
    console.log('🔍 Testing directory creation...');

    const testDir = './test-temp-directory';
    
    // Clean up any existing directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }

    this.cli.ensureDirectoryExists(testDir);

    if (!fs.existsSync(testDir)) {
      throw new Error('Directory was not created');
    }

    // Clean up
    fs.rmSync(testDir, { recursive: true });

    console.log('✅ Directory creation passed');
  }

  async testServerValidation() {
    console.log('🔍 Testing server validation...');

    // Test with a server that definitely doesn't exist
    this.cli.serverUrl = 'http://localhost:99999';
    
    const isValid = await this.cli.validateServer();
    
    if (isValid) {
      throw new Error('Should have returned false for non-existent server');
    }

    console.log('✅ Server validation passed');
  }

  recordTest(testName, passed, error = null) {
    this.testResults.push({
      name: testName,
      passed,
      error
    });
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('═══════════════════════════════\n');

    let passed = 0;
    let total = this.testResults.length;

    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const name = result.name.replace('test', '').replace(/([A-Z])/g, ' $1').trim();
      
      console.log(`${status} ${name}`);
      
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.passed) passed++;
    });

    console.log(`\n📈 Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! CLI is ready for use.');
    } else {
      console.log('⚠️ Some tests failed. Please review the errors above.');
    }
  }
}

// Demo function to show CLI capabilities
async function runDemo() {
  console.log('🎬 Running Enhanced SEMANTEST CLI Demo\n');

  const cli = new EnhancedSemantestCLI();

  console.log('1. Generating sample batch file...');
  cli.generateSampleBatch('demo-batch.json');

  console.log('\n2. Demonstrating event structure...');
  
  // Mock a successful event (won't actually send to server)
  const demoOptions = {
    prompt: 'A beautiful landscape painting',
    outputPath: 'landscape.png',
    downloadFolder: './demo-images',
    correlationId: 'demo-001',
    parameters: { model: 'dall-e-3', quality: 'high' }
  };

  console.log('📤 Demo Event Structure:');
  const demoEvent = {
    id: 'demo-uuid',
    type: 'ImageGenerationRequestedEvent',
    eventType: 'ImageGenerationRequested',
    payload: {
      domain: 'chatgpt.com',
      ...demoOptions,
      timestamp: Date.now()
    }
  };
  
  console.log(JSON.stringify(demoEvent, null, 2));

  console.log('\n3. Available CLI commands:');
  console.log('   • node enhanced-semantest-cli.js -p "sunset" -o sunset.png');
  console.log('   • node enhanced-semantest-cli.js batch --batch demo-batch.json');
  console.log('   • node enhanced-semantest-cli.js validate');
  console.log('   • node enhanced-semantest-cli.js monitor --monitor id1,id2');

  console.log('\n✨ Demo completed! Check demo-batch.json for batch processing example.');
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--demo')) {
    runDemo();
  } else {
    const tester = new CLITester();
    tester.runAllTests();
  }
}

module.exports = CLITester;