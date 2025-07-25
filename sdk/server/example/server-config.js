/**
 * WebSocket Server Configuration
 * Updated to use port 3004 instead of 8080
 */

module.exports = {
  // Server port - changed from 8080 to 3004 to avoid conflicts
  port: process.env.WEBSOCKET_PORT || 3004,
  
  // Server host
  host: process.env.WEBSOCKET_HOST || '0.0.0.0',
  
  // Heartbeat interval (ms)
  heartbeatInterval: 30000,
  
  // Request timeout (ms)
  requestTimeout: 10000,
  
  // Maximum concurrent connections
  maxConnections: 100,
  
  // WebSocket path
  path: '/'
};