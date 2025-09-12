#!/usr/bin/env node

/**
 * Communication Server Startup Script
 * Starts the complete event-driven communication layer for ChatGPT image generation
 */

const CommunicationServer = require('./infrastructure/communication-server');
const path = require('path');

// ASCII Art Banner
function printBanner() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║    CHATGPT IMAGE GENERATION - COMMUNICATION SERVER              ║
║                                                                  ║
║    Event-Driven Architecture for Seamless Image Generation      ║
║    Components: CLI ↔ Server ↔ Extension/Playwright             ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    environment: process.env.NODE_ENV || 'development',
    configDir: process.env.CONFIG_DIR || path.join(__dirname, 'config'),
    enableMonitoring: process.env.ENABLE_MONITORING !== 'false',
    logLevel: process.env.LOG_LEVEL || 'info'
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--env':
      case '-e':
        options.environment = args[++i];
        break;
      case '--config-dir':
      case '-c':
        options.configDir = args[++i];
        break;
      case '--no-monitoring':
        options.enableMonitoring = false;
        break;
      case '--log-level':
      case '-l':
        options.logLevel = args[++i];
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
    }
  }
  
  return options;
}

// Print usage information
function printUsage() {
  console.log(`
Usage: node start-communication-server.js [options]

Options:
  --env, -e <env>           Environment (development, production, test)
  --config-dir, -c <dir>    Configuration directory
  --no-monitoring           Disable system monitoring
  --log-level, -l <level>   Log level (debug, info, warn, error)
  --help, -h                Show this help message

Environment Variables:
  NODE_ENV                  Environment (development, production, test)
  CONFIG_DIR                Configuration directory
  ENABLE_MONITORING         Enable system monitoring (true/false)
  LOG_LEVEL                 Log level
  HTTP_PORT                 HTTP server port (default: 8080)
  WS_PORT                   WebSocket server port (default: 8081)
  EXT_PORT                  Extension server port (default: 8082)
`);
}

// Setup logger based on log level
function setupLogger(logLevel) {
  const levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };
  
  const currentLevel = levels[logLevel] || levels.info;
  
  return {
    debug: (...args) => {
      if (currentLevel <= levels.debug) {
        console.log(`[${new Date().toISOString()}] [DEBUG]`, ...args);
      }
    },
    info: (...args) => {
      if (currentLevel <= levels.info) {
        console.log(`[${new Date().toISOString()}] [INFO]`, ...args);
      }
    },
    warn: (...args) => {
      if (currentLevel <= levels.warn) {
        console.warn(`[${new Date().toISOString()}] [WARN]`, ...args);
      }
    },
    error: (...args) => {
      if (currentLevel <= levels.error) {
        console.error(`[${new Date().toISOString()}] [ERROR]`, ...args);
      }
    }
  };
}

// Main startup function
async function main() {
  const options = parseArgs();
  const logger = setupLogger(options.logLevel);
  
  printBanner();
  
  logger.info('🚀 Initializing Communication Server...');
  logger.info(`📋 Startup Configuration:`);
  logger.info(`   Environment: ${options.environment}`);
  logger.info(`   Config Directory: ${options.configDir}`);
  logger.info(`   Monitoring: ${options.enableMonitoring ? 'Enabled' : 'Disabled'}`);
  logger.info(`   Log Level: ${options.logLevel}`);
  
  // Create and start the communication server
  const server = new CommunicationServer({
    ...options,
    logger
  });
  
  // Set up event listeners
  server.on('started', (info) => {
    logger.info('✅ Communication Server is ready!');
    logger.info('');
    logger.info('📡 API Endpoints:');
    logger.info(`   HTTP API: http://localhost:${info.configuration.server?.ports?.http || 8080}`);
    logger.info(`   WebSocket: ws://localhost:${info.configuration.server?.ports?.websocket || 8081}`);
    logger.info(`   Extension: ws://localhost:${info.configuration.server?.ports?.extension || 8082}`);
    logger.info('');
    logger.info('🔧 Management:');
    logger.info(`   Health: GET /health`);
    logger.info(`   Metrics: GET /api/metrics`);
    logger.info(`   Status: GET /api/status`);
    logger.info('');
    logger.info('📸 Image Generation:');
    logger.info(`   Generate: POST /api/generate-image`);
    logger.info(`   Status: GET /api/status/:requestId`);
    logger.info(`   Trace: GET /api/trace/:correlationId`);
    logger.info('');
    logger.info('Ready to process image generation requests! 🎨');
  });
  
  server.on('alert', (alert) => {
    logger.warn(`🚨 SYSTEM ALERT: ${alert.type}`, alert.data);
  });
  
  server.on('metricsCollected', (metrics) => {
    if (options.logLevel === 'debug') {
      logger.debug('📊 Metrics collected:', {
        requests: metrics.requests.total,
        errors: metrics.errors.total,
        uptime: Math.round(metrics.system.uptime / 1000) + 's'
      });
    }
  });
  
  server.on('configurationChanged', (event) => {
    logger.info('⚙️ Configuration changed, restarting may be required');
  });
  
  server.on('shutdown', (info) => {
    logger.info(`✅ Server shutdown completed in ${info.shutdownTime}ms`);
  });
  
  // Start the server
  try {
    await server.start();
    
    // Set up periodic status logging
    if (options.logLevel === 'debug') {
      setInterval(() => {
        const status = server.getStatus();
        logger.debug('📊 Server Status:', {
          uptime: Math.round(status.uptime / 1000) + 's',
          components: Object.entries(status.components)
            .filter(([, healthy]) => healthy)
            .map(([name]) => name)
        });
      }, 30000); // Every 30 seconds
    }
    
  } catch (error) {
    logger.error('❌ Failed to start communication server:', error);
    process.exit(1);
  }
}

// Handle CLI example requests
function setupCLIExamples(server, logger) {
  // Add CLI command handlers for testing
  if (process.env.NODE_ENV === 'development') {
    const readline = require('readline');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    logger.info('');
    logger.info('🎮 Development Mode - CLI Commands Available:');
    logger.info('   status     - Show server status');
    logger.info('   metrics    - Show performance metrics');
    logger.info('   test       - Test image generation request');
    logger.info('   config     - Show configuration');
    logger.info('   help       - Show available commands');
    logger.info('   exit       - Shutdown server');
    logger.info('');
    
    rl.on('line', async (input) => {
      const command = input.trim().toLowerCase();
      
      try {
        switch (command) {
          case 'status':
            const status = server.getStatus();
            console.log('📊 Server Status:');
            console.log(JSON.stringify(status, null, 2));
            break;
            
          case 'metrics':
            const metrics = server.getPerformanceReport();
            console.log('📈 Performance Metrics:');
            console.log(JSON.stringify(metrics, null, 2));
            break;
            
          case 'test':
            const testRequest = {
              prompt: 'A beautiful sunset over mountains',
              fileName: 'test-image.png',
              downloadFolder: './downloads',
              domainName: 'chatgpt.com'
            };
            
            const result = await server.processImageGenerationRequest(testRequest);
            console.log('🧪 Test Request Result:');
            console.log(JSON.stringify(result, null, 2));
            break;
            
          case 'config':
            const config = server.getConfiguration();
            console.log('⚙️ Configuration:');
            console.log(JSON.stringify(config, null, 2));
            break;
            
          case 'help':
            console.log('Available commands: status, metrics, test, config, help, exit');
            break;
            
          case 'exit':
            console.log('👋 Shutting down...');
            await server.shutdown();
            process.exit(0);
            break;
            
          case '':
            // Ignore empty lines
            break;
            
          default:
            console.log(`❓ Unknown command: ${command}. Type 'help' for available commands.`);
        }
      } catch (error) {
        logger.error('Error executing command:', error.message);
      }
    });
  }
}

// Run the startup process
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Startup failed:', error);
    process.exit(1);
  });
}

module.exports = { main, parseArgs, setupLogger };