#!/usr/bin/env node

import { WebSocketServer } from './server';
import { attachImageHandler } from './handlers/image-handler-integration';
import * as path from 'path';
import * as os from 'os';

/**
 * Start the WebSocket server with Image Handler integration
 */
async function startServer() {
  const port = parseInt(process.env.PORT || '8080', 10);
  const downloadDir = process.env.DOWNLOAD_DIR || path.join(os.homedir(), 'Downloads');

  console.log('🚀 Starting Semantest WebSocket Server with Image Handler');
  console.log(`📍 Port: ${port}`);
  console.log(`📁 Download directory: ${downloadDir}`);
  console.log('');

  // Create WebSocket server
  const server = new WebSocketServer({ port });

  // Attach image handler
  attachImageHandler(server, { downloadDir });

  // Set up server event listeners
  server.on('started', ({ port, host }) => {
    console.log(`✅ Server started on ${host}:${port}`);
    console.log('');
    console.log('📋 Image Generation Workflow:');
    console.log('1. Client sends ImageRequestReceived event');
    console.log('2. Server forwards to Image Handler');
    console.log('3. Handler creates new chat if needed');
    console.log('4. Handler downloads/generates image');
    console.log('5. Handler emits ImageDownloaded event');
    console.log('6. Server broadcasts to all clients');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
  });

  server.on('client:connected', (clientInfo) => {
    console.log(`👤 Client connected: ${clientInfo.id}`);
  });

  server.on('client:disconnected', (clientInfo) => {
    console.log(`👋 Client disconnected: ${clientInfo.id}`);
  });

  server.on('error', (error) => {
    console.error('❌ Server error:', error);
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down server...');
    await server.stop();
    process.exit(0);
  });

  // Start the server
  try {
    await server.start();
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Run the server
if (require.main === module) {
  startServer().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { startServer };