#!/usr/bin/env node

/**
 * Enhanced SEMANTEST CLI - Unified Image Generation Tool
 * Combines simple CLI functionality with advanced features
 * Supports batch processing, progress tracking, and comprehensive error handling
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

class EnhancedSemantestCLI {
  constructor() {
    this.serverUrl = 'http://localhost:8080';
    this.defaultDomain = 'chatgpt.com';
    this.defaultFolder = './images';
    this.defaultTimeout = 30000;
    this.verbose = false;
  }

  /**
   * Send a single image generation event
   */
  async sendImageGenerationEvent(options) {
    const {
      domain = this.defaultDomain,
      prompt,
      outputPath,
      downloadFolder = this.defaultFolder,
      correlationId = uuidv4(),
      timeout = this.defaultTimeout,
      parameters = {}
    } = options;

    // Validate required parameters
    if (!prompt?.trim()) {
      throw new Error('Prompt cannot be empty');
    }
    if (!outputPath?.trim()) {
      throw new Error('Output path cannot be empty');
    }

    // Ensure download folder exists
    if (downloadFolder !== './images') {
      this.ensureDirectoryExists(downloadFolder);
    }

    const event = {
      id: uuidv4(),
      type: 'ImageGenerationRequestedEvent',
      eventType: 'ImageGenerationRequested',
      payload: {
        domain,
        prompt,
        outputPath,
        imagePath: outputPath,
        downloadFolder,
        correlationId,
        timestamp: Date.now(),
        ...parameters
      }
    };

    this.logEventDetails(event, this.serverUrl);

    try {
      const response = await axios.post(
        `${this.serverUrl}/events`,
        event,
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SEMANTEST-CLI/2.0.0'
          },
          timeout
        }
      );

      this.logSuccess(response.data, event);
      return { success: true, data: response.data, correlationId };

    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Process a batch of image generation requests
   */
  async processBatch(batchFile, options = {}) {
    if (!fs.existsSync(batchFile)) {
      throw new Error(`Batch file not found: ${batchFile}`);
    }

    let batchData;
    try {
      const content = fs.readFileSync(batchFile, 'utf8');
      batchData = JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid batch file format: ${error.message}`);
    }

    if (!batchData.requests || !Array.isArray(batchData.requests)) {
      throw new Error('Batch file must contain a "requests" array');
    }

    const results = [];
    const total = batchData.requests.length;
    
    console.log(`📦 Processing batch of ${total} image requests...\n`);

    // Override CLI options with batch file settings
    if (batchData.serverUrl) {
      this.serverUrl = batchData.serverUrl;
    }

    for (let i = 0; i < batchData.requests.length; i++) {
      const request = batchData.requests[i];
      const requestNumber = i + 1;
      
      console.log(`🎨 [${requestNumber}/${total}] Processing: "${request.prompt}"`);

      try {
        const result = await this.sendImageGenerationEvent({
          ...request,
          ...options  // CLI options override batch options
        });
        
        results.push({ success: true, request: requestNumber, ...result });
        console.log(`✅ [${requestNumber}/${total}] Request sent successfully\n`);

        // Add delay between requests
        if (i < total - 1 && (options.delay || batchData.delay)) {
          const delay = options.delay || batchData.delay;
          console.log(`⏳ Waiting ${delay}ms before next request...\n`);
          await this.sleep(delay);
        }

      } catch (error) {
        results.push({ success: false, request: requestNumber, error: error.message });
        console.error(`❌ [${requestNumber}/${total}] Failed: ${error.message}\n`);
        
        if (options.stopOnError) {
          console.error('🛑 Stopping batch processing due to error (--stop-on-error)');
          break;
        }
      }
    }

    this.logBatchResults(results, total);
    return results;
  }

  /**
   * Monitor progress of requests by correlation IDs
   */
  async monitorProgress(correlationIds, options = {}) {
    const { duration = 60000, interval = 2000 } = options;
    const startTime = Date.now();
    
    console.log(`📊 Monitoring ${correlationIds.length} requests for ${duration/1000}s...`);
    console.log(`🔍 Correlation IDs: ${correlationIds.join(', ')}`);
    
    const checkProgress = async () => {
      try {
        const response = await axios.get(`${this.serverUrl}/status/batch`, {
          params: { correlationIds: correlationIds.join(',') },
          timeout: 5000
        });
        
        this.displayProgressStatus(response.data);
      } catch (error) {
        console.log('⚠️ Could not fetch progress status');
      }
    };

    const intervalId = setInterval(checkProgress, interval);
    
    setTimeout(() => {
      clearInterval(intervalId);
      console.log('\n⏰ Monitoring timeout reached');
    }, duration);

    await checkProgress(); // Initial check
  }

  /**
   * Validate server connectivity
   */
  async validateServer() {
    console.log(`🔍 Checking server connectivity: ${this.serverUrl}`);
    
    try {
      const response = await axios.get(`${this.serverUrl}/health`, { timeout: 5000 });
      console.log('✅ Server is accessible');
      console.log(`📊 Server status: ${response.data.status || 'unknown'}`);
      return true;
    } catch (error) {
      console.error('❌ Server is not accessible');
      console.error(`   Error: ${error.message}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.error('💡 Make sure the SEMANTEST server is running on port 8080');
      }
      return false;
    }
  }

  /**
   * Generate a sample batch file
   */
  generateSampleBatch(outputFile = 'sample-batch.json') {
    const sampleBatch = {
      serverUrl: "http://localhost:8080",
      delay: 1000,
      requests: [
        {
          prompt: "A beautiful sunset over mountains",
          outputPath: "sunset.png",
          downloadFolder: "./generated-images"
        },
        {
          prompt: "A cute cat playing with a ball of yarn",
          outputPath: "cat.png",
          downloadFolder: "./generated-images",
          parameters: { model: "dall-e-3" }
        },
        {
          prompt: "Abstract geometric art in blue and gold",
          outputPath: "abstract.png",
          downloadFolder: "./generated-images",
          correlationId: "custom-id-001"
        }
      ]
    };

    fs.writeFileSync(outputFile, JSON.stringify(sampleBatch, null, 2));
    console.log(`📝 Sample batch file created: ${outputFile}`);
    console.log('💡 Edit the file and run: node enhanced-semantest-cli.js --batch sample-batch.json');
  }

  // Helper methods
  logEventDetails(event, serverUrl) {
    console.log('📤 Sending SEMANTEST event:');
    console.log(`   Domain: ${event.payload.domain}`);
    console.log(`   Prompt: "${event.payload.prompt}"`);
    console.log(`   Output: ${event.payload.outputPath}`);
    console.log(`   Folder: ${event.payload.downloadFolder}`);
    console.log(`   Server: ${serverUrl}`);
    console.log(`   Correlation ID: ${event.payload.correlationId}`);
    console.log('');
  }

  logSuccess(responseData, event) {
    console.log('✅ Event sent successfully!');
    
    if (this.verbose && responseData) {
      console.log('📬 Server Response:', responseData);
    }
    
    console.log('\n📊 Processing Pipeline:');
    console.log('   1. ✅ Event created and validated');
    console.log('   2. ✅ Sent to server successfully'); 
    console.log('   3. ⏳ Server routing to browser extension...');
    console.log('   4. ⏳ Extension processing request...');
    console.log('   5. ⏳ Image generation in progress...');
    console.log('   6. ⏳ Image download and save pending...');
    
    console.log(`\n💡 Track progress with: ${event.payload.correlationId}`);
    console.log(`🖼️ Image will be saved to: ${event.payload.outputPath}`);
    console.log(`📁 In download folder: ${event.payload.downloadFolder}`);
  }

  handleError(error) {
    if (error.response) {
      console.error(`❌ Server error (${error.response.status}):`, error.response.data);
    } else if (error.request) {
      console.error('❌ Network error: No response from server');
      console.error('💡 Check if the SEMANTEST server is running');
    } else {
      console.error('❌ Request error:', error.message);
    }
  }

  logBatchResults(results, total) {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log('\n🎉 Batch Processing Complete!');
    console.log(`📊 Results: ${successful}/${total} successful, ${failed} failed`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Requests:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   Request ${r.request}: ${r.error}`);
      });
    }
  }

  displayProgressStatus(statusData) {
    console.log(`📊 Progress Update (${new Date().toLocaleTimeString()}):`);
    if (statusData.requests) {
      statusData.requests.forEach(req => {
        const status = req.status || 'unknown';
        const emoji = status === 'completed' ? '✅' : status === 'failed' ? '❌' : '⏳';
        console.log(`   ${emoji} ${req.correlationId}: ${status}`);
      });
    }
    console.log('');
  }

  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dirPath}`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showHelp() {
    console.log(`
🚀 Enhanced SEMANTEST CLI - Unified Image Generation Tool

USAGE:
  node enhanced-semantest-cli.js [command] [options]

COMMANDS:
  generate    Generate a single image (default)
  batch       Process multiple images from a file
  monitor     Monitor progress of requests
  validate    Check server connectivity
  sample      Generate a sample batch file

GENERATE OPTIONS:
  -p, --prompt <text>        Image generation prompt (required)
  -o, --output <path>        Output filename (required)
  -d, --domain <domain>      Target domain (default: chatgpt.com)
  -f, --folder <path>        Download folder (default: ./images)
  -s, --server <url>         Server URL (default: http://localhost:8080)
  -c, --correlation-id <id>  Custom correlation ID
  -t, --timeout <seconds>    Request timeout (default: 30)
  -m, --model <model>        AI model to use
  --verbose                  Show detailed output

BATCH OPTIONS:
  --batch <file>             Process batch file
  --delay <ms>               Delay between requests
  --stop-on-error           Stop batch on first error

MONITOR OPTIONS:
  --monitor <ids>           Monitor correlation IDs (comma-separated)
  --duration <ms>           Monitoring duration (default: 60000)
  --interval <ms>           Check interval (default: 2000)

EXAMPLES:
  # Single image generation
  node enhanced-semantest-cli.js -p "sunset" -o sunset.png

  # With custom folder and model
  node enhanced-semantest-cli.js -p "cat" -o cat.png -f ./my-images --model dall-e-3

  # Batch processing
  node enhanced-semantest-cli.js batch --batch images.json --delay 2000

  # Generate sample batch file
  node enhanced-semantest-cli.js sample

  # Monitor progress
  node enhanced-semantest-cli.js monitor --monitor id1,id2,id3 --duration 120000

  # Validate server
  node enhanced-semantest-cli.js validate
`);
  }
}

// Main execution
async function main() {
  const cli = new EnhancedSemantestCLI();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    cli.showHelp();
    process.exit(0);
  }

  // Parse command and options
  const command = args[0].startsWith('-') ? 'generate' : args.shift();
  const options = {};
  const remainingArgs = command === 'generate' ? [command, ...args] : args;

  // Parse arguments
  for (let i = 0; i < remainingArgs.length; i++) {
    const arg = remainingArgs[i];
    
    switch (arg) {
      case '-p': case '--prompt':
        options.prompt = remainingArgs[++i];
        break;
      case '-o': case '--output':
        options.outputPath = remainingArgs[++i];
        break;
      case '-d': case '--domain':
        options.domain = remainingArgs[++i];
        break;
      case '-f': case '--folder':
        options.downloadFolder = remainingArgs[++i];
        break;
      case '-s': case '--server':
        cli.serverUrl = remainingArgs[++i];
        break;
      case '-c': case '--correlation-id':
        options.correlationId = remainingArgs[++i];
        break;
      case '-t': case '--timeout':
        options.timeout = parseInt(remainingArgs[++i]) * 1000;
        break;
      case '-m': case '--model':
        options.parameters = { ...options.parameters, model: remainingArgs[++i] };
        break;
      case '--verbose':
        cli.verbose = true;
        break;
      case '--batch':
        options.batchFile = remainingArgs[++i];
        break;
      case '--delay':
        options.delay = parseInt(remainingArgs[++i]);
        break;
      case '--stop-on-error':
        options.stopOnError = true;
        break;
      case '--monitor':
        options.correlationIds = remainingArgs[++i].split(',');
        break;
      case '--duration':
        options.duration = parseInt(remainingArgs[++i]);
        break;
      case '--interval':
        options.interval = parseInt(remainingArgs[++i]);
        break;
      case '--help': case '-h':
        cli.showHelp();
        process.exit(0);
    }
  }

  try {
    switch (command) {
      case 'generate':
        if (!options.prompt || !options.outputPath) {
          console.error('❌ Error: --prompt and --output are required for generate command');
          process.exit(1);
        }
        await cli.sendImageGenerationEvent(options);
        console.log('✨ Generation request completed!');
        break;

      case 'batch':
        if (!options.batchFile) {
          console.error('❌ Error: --batch file is required for batch command');
          process.exit(1);
        }
        await cli.processBatch(options.batchFile, options);
        break;

      case 'monitor':
        if (!options.correlationIds) {
          console.error('❌ Error: --monitor with correlation IDs is required');
          process.exit(1);
        }
        await cli.monitorProgress(options.correlationIds, options);
        break;

      case 'validate':
        const isValid = await cli.validateServer();
        process.exit(isValid ? 0 : 1);
        break;

      case 'sample':
        cli.generateSampleBatch();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run --help for usage information');
        process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Operation failed:', error.message);
    if (cli.verbose) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = EnhancedSemantestCLI;