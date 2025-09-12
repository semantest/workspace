#!/usr/bin/env node

/**
 * Production-Ready Event-Sourced WebSocket Server
 * 
 * This server implements a complete event-sourcing system with:
 * - Append-only event store
 * - Saga orchestration for workflows
 * - Event projections for read models
 * - Correlation ID tracking across the system
 * - WebSocket-based real-time communication
 * - Compensating transactions for failure handling
 */

const EventSourcedWebSocketServer = require('./nodejs.server/src/websocket-event-sourced-enhanced');

// Configuration
const config = {
  port: process.env.WS_PORT || 8082,
  path: process.env.WS_PATH || '/ws-events',
  storePath: process.env.EVENT_STORE_PATH || './data/events',
  snapshotPath: process.env.SNAPSHOT_PATH || './data/snapshots',
  snapshotFrequency: parseInt(process.env.SNAPSHOT_FREQUENCY || '100')
};

// ASCII Art Banner
function printBanner() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     SEMANTEST EVENT-SOURCED WEBSOCKET SERVER              ║
║                                                            ║
║     Architecture: Event Sourcing + CQRS                   ║
║     Patterns: Saga, Event Store, Projections              ║
║     Communication: WebSocket + Async Messaging            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
}

// Start server
async function startServer() {
  printBanner();
  
  console.log('📋 Configuration:');
  console.log(`   Port: ${config.port}`);
  console.log(`   Path: ${config.path}`);
  console.log(`   Event Store: ${config.storePath}`);
  console.log(`   Snapshots: ${config.snapshotPath}`);
  console.log(`   Snapshot Frequency: ${config.snapshotFrequency} events\n`);
  
  const server = new EventSourcedWebSocketServer(config.port, config);
  
  try {
    await server.start();
    
    console.log('\n📊 Server Capabilities:');
    console.log('   ✅ Event Sourcing - Append-only event log');
    console.log('   ✅ Saga Orchestration - Long-running workflows');
    console.log('   ✅ Event Projections - Real-time read models');
    console.log('   ✅ Correlation Tracking - Request tracing');
    console.log('   ✅ Compensating Transactions - Failure recovery');
    console.log('   ✅ WebSocket Communication - Real-time messaging');
    
    console.log('\n🔌 Connection Info:');
    console.log(`   WebSocket URL: ws://localhost:${config.port}${config.path}`);
    console.log(`   Status: RUNNING`);
    
    // Log statistics periodically
    setInterval(() => {
      const stats = getServerStats(server);
      console.log(`\n📈 Server Stats [${new Date().toISOString()}]:`);
      console.log(`   Active Connections: ${stats.connections}`);
      console.log(`   Total Events: ${stats.events}`);
      console.log(`   Active Sagas: ${stats.sagas}`);
      console.log(`   Projections: ${stats.projections}`);
    }, 30000); // Every 30 seconds
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Received SIGINT, shutting down gracefully...');
      await handleShutdown(server);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n\n🛑 Received SIGTERM, shutting down gracefully...');
      await handleShutdown(server);
    });
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      handleShutdown(server);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Get server statistics
function getServerStats(server) {
  return {
    connections: server.connections.size,
    events: server.eventStore.globalEventLog.length,
    sagas: server.sagaManager.sagas.size,
    projections: server.eventStore.projections.size
  };
}

// Handle graceful shutdown
async function handleShutdown(server) {
  try {
    // Log final statistics
    const stats = getServerStats(server);
    console.log('\n📊 Final Statistics:');
    console.log(`   Total Events Processed: ${stats.events}`);
    console.log(`   Total Connections Served: ${stats.connections}`);
    console.log(`   Active Sagas: ${stats.sagas}`);
    
    // Shutdown server
    await server.shutdown();
    
    console.log('\n✅ Server shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Health check endpoint (optional - can be used with a separate HTTP server)
function setupHealthCheck(server) {
  const http = require('http');
  
  const healthServer = http.createServer((req, res) => {
    if (req.url === '/health') {
      const stats = getServerStats(server);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        stats
      }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  
  const healthPort = process.env.HEALTH_PORT || 8083;
  healthServer.listen(healthPort, () => {
    console.log(`\n🏥 Health check endpoint: http://localhost:${healthPort}/health`);
  });
}

// Main execution
if (require.main === module) {
  startServer().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}