#!/usr/bin/env node
/**
 * WebSocket Server for Semantest POC
 * Handles bidirectional communication between CLI and Chrome Extension
 */

const WebSocket = require('ws');
const http = require('http');
const EventEmitter = require('events');

class SemantestServer extends EventEmitter {
  constructor(httpPort = 8080, wsPort = 8081) {
    super();
    this.httpPort = httpPort;
    this.wsPort = wsPort;
    this.extensionConnections = new Set();
    this.eventQueue = [];
    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      connectionsTotal: 0,
      currentConnections: 0
    };
  }

  start() {
    this.startHttpServer();
    this.startWebSocketServer();
    console.log(`🚀 Semantest Server Started
    HTTP: http://localhost:${this.httpPort}
    WebSocket: ws://localhost:${this.wsPort}
    Status: Ready for connections`);
  }

  startHttpServer() {
    const server = http.createServer((req, res) => {
      if (req.url === '/events' && req.method === 'POST') {
        this.handleHttpEvent(req, res);
      } else if (req.url === '/status') {
        this.handleStatus(res);
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Semantest WebSocket Server POC');
      }
    });

    server.listen(this.httpPort);
  }

  handleHttpEvent(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        console.log(`📥 HTTP Event: ${event.type}`);
        this.broadcastToExtensions(event);
        this.stats.messagesReceived++;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'accepted',
          connections: this.extensionConnections.size,
          correlationId: event.payload?.correlationId 
        }));
      } catch (error) {
        console.error('❌ Invalid JSON:', error.message);
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
  }

  handleStatus(res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      stats: this.stats,
      uptime: process.uptime()
    }));
  }

  startWebSocketServer() {
    const wss = new WebSocket.Server({ port: this.wsPort });
    
    wss.on('connection', (ws) => {
      this.handleNewConnection(ws);
    });
  }

  handleNewConnection(ws) {
    console.log('✅ New WebSocket connection');
    this.extensionConnections.add(ws);
    this.stats.connectionsTotal++;
    this.stats.currentConnections++;
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'ServerConnectedEvent',
      payload: {
        message: 'Connected to Semantest POC Server',
        timestamp: Date.now(),
        queuedEvents: this.eventQueue.length
      }
    }));
    
    // Send any queued events
    this.eventQueue.forEach(event => ws.send(JSON.stringify(event)));
    
    ws.on('message', (message) => {
      this.handleWebSocketMessage(ws, message);
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket disconnected');
      this.extensionConnections.delete(ws);
      this.stats.currentConnections--;
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
      this.extensionConnections.delete(ws);
    });
  }

  handleWebSocketMessage(ws, message) {
    try {
      const event = JSON.parse(message);
      console.log(`📨 WS Event: ${event.type}`);
      this.stats.messagesReceived++;
      
      // Emit for handling
      this.emit('event', event);
      
      // Handle specific events
      if (event.type === 'ChatGPTStateEvent') {
        console.log(`💡 ChatGPT: ${event.payload.isIdle ? 'IDLE' : 'BUSY'}`);
      } else if (event.type === 'ImageGeneratedEvent') {
        console.log(`🖼️ Image URL: ${event.payload.imageUrl}`);
      }
    } catch (error) {
      console.error('Invalid message:', error.message);
    }
  }

  broadcastToExtensions(event) {
    console.log(`📤 Broadcasting to ${this.extensionConnections.size} connection(s)`);
    
    if (this.extensionConnections.size === 0) {
      console.log('⚠️ No connections - queuing event');
      this.eventQueue.push(event);
      if (this.eventQueue.length > 100) {
        this.eventQueue.shift(); // Keep queue size manageable
      }
    } else {
      this.extensionConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(event));
          this.stats.messagesSent++;
        }
      });
    }
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new SemantestServer();
  server.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    process.exit(0);
  });
}

module.exports = SemantestServer;