const { WebSocketServer, createOrchestratorIntegration } = require('../dist');

// Create orchestration system
const orchestration = createOrchestratorIntegration({
  dbPath: './semantest-test-results.db',
  securityPolicy: {
    maxEventsPerSecond: 100,
    maxEventSize: 1024 * 1024, // 1MB
    requireAuthentication: false
  }
});

// Get WebSocket handlers
const handlers = orchestration.createWebSocketHandlers();

// Create WebSocket server with orchestration
const server = new WebSocketServer({
  port: 8080,
  host: 'localhost'
});

// Override the message handler to integrate orchestration
const originalHandleMessage = server.handleMessage.bind(server);

server.handleMessage = async function(client, message) {
  try {
    // Parse message
    const parsedMessage = JSON.parse(message.toString());
    
    // Handle orchestration-specific messages
    switch (parsedMessage.type) {
      case 'event':
        // Validate and handle event through orchestration
        const validationResult = await handlers.onValidateEvent(parsedMessage.payload);
        if (validationResult.valid) {
          await handlers.onEvent(parsedMessage.payload);
          
          // Continue with normal event handling
          await originalHandleMessage(client, message);
        } else {
          // Send validation error
          client.send(JSON.stringify({
            type: 'error',
            error: {
              message: 'Event validation failed',
              code: 'VALIDATION_ERROR',
              details: validationResult.errors
            }
          }));
        }
        break;
        
      case 'startTestRun':
        const runStatus = await handlers.onStartTestRun(parsedMessage.payload);
        client.send(JSON.stringify({
          type: 'testRunStarted',
          payload: runStatus
        }));
        break;
        
      case 'endTestRun':
        const finalStatus = await handlers.onEndTestRun(parsedMessage.payload.runId);
        client.send(JSON.stringify({
          type: 'testRunEnded',
          payload: finalStatus
        }));
        break;
        
      case 'getActiveRuns':
        const activeRuns = handlers.onGetActiveRuns();
        client.send(JSON.stringify({
          type: 'activeRuns',
          payload: activeRuns
        }));
        break;
        
      case 'getRunStatus':
        const status = handlers.onGetRunStatus(parsedMessage.payload.runId);
        client.send(JSON.stringify({
          type: 'runStatus',
          payload: status
        }));
        break;
        
      case 'getStatistics':
        const stats = await handlers.onGetStatistics();
        client.send(JSON.stringify({
          type: 'statistics',
          payload: stats
        }));
        break;
        
      default:
        // Pass through to original handler
        await originalHandleMessage(client, message);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    client.send(JSON.stringify({
      type: 'error',
      error: {
        message: error.message,
        code: 'INTERNAL_ERROR'
      }
    }));
  }
};

// Start server
server.start().then(() => {
  console.log('Orchestrated WebSocket server started on ws://localhost:8080');
  console.log('Features:');
  console.log('- Test orchestration and state management');
  console.log('- Event persistence with SQLite');
  console.log('- Plugin system for extensibility');
  console.log('- Security with validation and rate limiting');
  console.log('- Event replay capability');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await orchestration.shutdown();
  await server.stop();
  process.exit(0);
});