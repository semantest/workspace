#!/usr/bin/env node

/**
 * WebSocket Security Test Script
 * Tests for common vulnerabilities in the WebSocket server
 */

const WebSocket = require('ws');
const chalk = require('chalk');

const SERVER_URL = process.env.WS_URL || 'ws://localhost:3003/ws';
const TEST_RESULTS = [];

// Test result tracking
function logTest(testName, passed, details) {
  const status = passed ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
  console.log(`${status} ${testName}`);
  if (details) {
    console.log(chalk.gray(`  ${details}`));
  }
  TEST_RESULTS.push({ testName, passed, details });
}

// Test 1: Connection Flood Test
async function testConnectionFlooding() {
  console.log(chalk.yellow('\n🔍 Test 1: Connection Flooding (DDoS)'));
  
  const connections = [];
  let successfulConnections = 0;
  
  try {
    // Try to create 200 connections
    const promises = [];
    for (let i = 0; i < 200; i++) {
      promises.push(new Promise((resolve) => {
        const ws = new WebSocket(SERVER_URL);
        
        ws.on('open', () => {
          successfulConnections++;
          connections.push(ws);
          resolve();
        });
        
        ws.on('error', () => resolve());
        
        setTimeout(resolve, 5000); // Timeout after 5 seconds
      }));
    }
    
    await Promise.all(promises);
    
    // Check results
    if (successfulConnections >= 200) {
      logTest('Connection Limit', false, 
        `Server accepted ${successfulConnections} connections (no limit enforced)`);
    } else {
      logTest('Connection Limit', true, 
        `Server limited connections to ${successfulConnections}`);
    }
    
    // Cleanup
    connections.forEach(ws => ws.close());
    
  } catch (error) {
    logTest('Connection Limit', false, `Error: ${error.message}`);
  }
}

// Test 2: Unauthenticated Message Test
async function testUnauthenticatedAccess() {
  console.log(chalk.yellow('\n🔍 Test 2: Unauthenticated Access'));
  
  return new Promise((resolve) => {
    const ws = new WebSocket(SERVER_URL);
    
    ws.on('open', () => {
      // Try to send a message without authentication
      const testMessage = {
        id: 'test-123',
        type: 'event',
        timestamp: Date.now(),
        payload: {
          type: 'test.event',
          data: 'This should not be allowed without auth'
        }
      };
      
      ws.send(JSON.stringify(testMessage));
      
      // Wait for response
      let responded = false;
      ws.on('message', (data) => {
        responded = true;
        try {
          const response = JSON.parse(data);
          
          if (response.type === 'error' || response.type === 'auth_required') {
            logTest('Authentication Required', true, 'Server requires authentication');
          } else {
            logTest('Authentication Required', false, 
              'Server processed message without authentication');
          }
        } catch (e) {
          logTest('Authentication Required', false, 'Invalid response format');
        }
        
        ws.close();
        resolve();
      });
      
      // Timeout check
      setTimeout(() => {
        if (!responded) {
          logTest('Authentication Required', false, 
            'Server did not respond (possible vulnerability)');
          ws.close();
          resolve();
        }
      }, 3000);
    });
    
    ws.on('error', (error) => {
      logTest('Authentication Required', false, `Connection error: ${error.message}`);
      resolve();
    });
  });
}

// Test 3: Message Rate Limiting
async function testRateLimiting() {
  console.log(chalk.yellow('\n🔍 Test 3: Message Rate Limiting'));
  
  return new Promise((resolve) => {
    const ws = new WebSocket(SERVER_URL);
    let messagesSent = 0;
    let errorsReceived = 0;
    
    ws.on('open', () => {
      // Send 200 messages rapidly
      const interval = setInterval(() => {
        if (messagesSent >= 200) {
          clearInterval(interval);
          
          setTimeout(() => {
            if (errorsReceived > 0) {
              logTest('Rate Limiting', true, 
                `Rate limiting enforced after ${messagesSent - errorsReceived} messages`);
            } else {
              logTest('Rate Limiting', false, 
                'No rate limiting - accepted all 200 messages');
            }
            
            ws.close();
            resolve();
          }, 1000);
          
          return;
        }
        
        const message = {
          id: `msg-${messagesSent}`,
          type: 'event',
          timestamp: Date.now(),
          payload: { type: 'test', data: messagesSent }
        };
        
        ws.send(JSON.stringify(message));
        messagesSent++;
      }, 5); // Send every 5ms (200 msgs/second)
      
      ws.on('message', (data) => {
        try {
          const response = JSON.parse(data);
          if (response.type === 'error' && 
              (response.payload.code === 'RATE_LIMIT_EXCEEDED' || 
               response.payload.message.includes('rate'))) {
            errorsReceived++;
          }
        } catch (e) {
          // Ignore parse errors
        }
      });
    });
    
    ws.on('error', (error) => {
      logTest('Rate Limiting', false, `Connection error: ${error.message}`);
      resolve();
    });
  });
}

// Test 4: Large Message Attack
async function testLargeMessage() {
  console.log(chalk.yellow('\n🔍 Test 4: Large Message Handling'));
  
  return new Promise((resolve) => {
    const ws = new WebSocket(SERVER_URL);
    
    ws.on('open', () => {
      // Create a 10MB message
      const largeData = 'A'.repeat(10 * 1024 * 1024);
      const largeMessage = {
        id: 'large-msg',
        type: 'event',
        timestamp: Date.now(),
        payload: { type: 'test', data: largeData }
      };
      
      try {
        ws.send(JSON.stringify(largeMessage));
        
        let responded = false;
        ws.on('message', (data) => {
          responded = true;
          try {
            const response = JSON.parse(data);
            if (response.type === 'error') {
              logTest('Message Size Limit', true, 'Large messages rejected');
            } else {
              logTest('Message Size Limit', false, 
                'Server accepted 10MB message (vulnerability)');
            }
          } catch (e) {
            logTest('Message Size Limit', true, 'Server rejected large message');
          }
          ws.close();
          resolve();
        });
        
        ws.on('close', () => {
          if (!responded) {
            logTest('Message Size Limit', true, 
              'Connection closed (likely due to message size)');
          }
          resolve();
        });
        
      } catch (error) {
        logTest('Message Size Limit', true, 
          `Client prevented sending large message: ${error.message}`);
        ws.close();
        resolve();
      }
    });
    
    ws.on('error', (error) => {
      logTest('Message Size Limit', false, `Connection error: ${error.message}`);
      resolve();
    });
  });
}

// Test 5: Malformed Message Handling
async function testMalformedMessages() {
  console.log(chalk.yellow('\n🔍 Test 5: Malformed Message Handling'));
  
  return new Promise((resolve) => {
    const ws = new WebSocket(SERVER_URL);
    
    ws.on('open', () => {
      // Test various malformed messages
      const malformedMessages = [
        'not json at all',
        '{"incomplete": ',
        '{"type": "test", "no_id": true}',
        '{"id": "123", "no_type": true}',
        '{"id": "123", "type": "test", "timestamp": "not-a-number"}',
        JSON.stringify({ id: '123', type: '<script>alert("xss")</script>' })
      ];
      
      let testsPassed = 0;
      let testsCompleted = 0;
      
      malformedMessages.forEach((msg, index) => {
        setTimeout(() => {
          ws.send(msg);
          
          // Give server time to respond
          setTimeout(() => {
            testsCompleted++;
            if (ws.readyState === WebSocket.OPEN) {
              testsPassed++;
            }
            
            if (testsCompleted === malformedMessages.length) {
              if (testsPassed === malformedMessages.length) {
                logTest('Malformed Message Handling', true, 
                  'Server handled all malformed messages gracefully');
              } else {
                logTest('Malformed Message Handling', false, 
                  `Server crashed on ${malformedMessages.length - testsPassed} malformed messages`);
              }
              ws.close();
              resolve();
            }
          }, 500);
        }, index * 100);
      });
    });
    
    ws.on('error', (error) => {
      logTest('Malformed Message Handling', false, 
        `Connection error: ${error.message}`);
      resolve();
    });
  });
}

// Test 6: Protocol Check (WSS vs WS)
async function testProtocolSecurity() {
  console.log(chalk.yellow('\n🔍 Test 6: Protocol Security'));
  
  const isSecure = SERVER_URL.startsWith('wss://');
  
  if (isSecure) {
    logTest('Secure Protocol', true, 'Using WSS (encrypted)');
  } else {
    logTest('Secure Protocol', false, 'Using WS (unencrypted) - vulnerable to MITM');
  }
}

// Run all tests
async function runSecurityTests() {
  console.log(chalk.blue.bold('\n🛡️  WebSocket Security Test Suite'));
  console.log(chalk.blue('================================'));
  console.log(chalk.gray(`Testing server at: ${SERVER_URL}\n`));
  
  try {
    await testProtocolSecurity();
    await testConnectionFlooding();
    await testUnauthenticatedAccess();
    await testRateLimiting();
    await testLargeMessage();
    await testMalformedMessages();
    
    // Summary
    console.log(chalk.blue.bold('\n📊 Test Summary'));
    console.log(chalk.blue('==============='));
    
    const passed = TEST_RESULTS.filter(r => r.passed).length;
    const failed = TEST_RESULTS.filter(r => !r.passed).length;
    const total = TEST_RESULTS.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(chalk.green(`Passed: ${passed}`));
    console.log(chalk.red(`Failed: ${failed}`));
    
    const score = Math.round((passed / total) * 100);
    let scoreColor = chalk.red;
    if (score >= 80) scoreColor = chalk.green;
    else if (score >= 60) scoreColor = chalk.yellow;
    
    console.log(scoreColor.bold(`\nSecurity Score: ${score}/100`));
    
    if (failed > 0) {
      console.log(chalk.red.bold('\n⚠️  CRITICAL: Security vulnerabilities detected!'));
      console.log(chalk.red('The WebSocket server is NOT secure for production use.\n'));
      
      // List failed tests
      console.log(chalk.red('Failed Tests:'));
      TEST_RESULTS.filter(r => !r.passed).forEach(r => {
        console.log(chalk.red(`  - ${r.testName}`));
      });
    } else {
      console.log(chalk.green.bold('\n✅ All security tests passed!'));
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Test suite error:'), error);
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

// Check if server is reachable
async function checkServerConnection() {
  return new Promise((resolve) => {
    const ws = new WebSocket(SERVER_URL);
    
    ws.on('open', () => {
      ws.close();
      resolve(true);
    });
    
    ws.on('error', () => {
      resolve(false);
    });
    
    setTimeout(() => resolve(false), 5000);
  });
}

// Main
(async () => {
  console.log(chalk.blue('🔌 Checking WebSocket server connection...'));
  
  const serverReachable = await checkServerConnection();
  
  if (!serverReachable) {
    console.error(chalk.red(`\n❌ Cannot connect to WebSocket server at ${SERVER_URL}`));
    console.error(chalk.yellow('Please ensure the server is running and try again.'));
    process.exit(1);
  }
  
  console.log(chalk.green('✓ Server is reachable\n'));
  
  await runSecurityTests();
})();