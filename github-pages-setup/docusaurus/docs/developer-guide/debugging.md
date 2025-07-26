---
id: debugging
title: Debugging Guide
sidebar_label: Debugging
---

# Debugging Guide

This guide provides comprehensive debugging strategies and tools for troubleshooting issues across all Semantest components.

## Debugging Setup

### Development Environment

```bash
# Enable debug mode globally
export DEBUG=semantest:*

# Enable specific namespaces
export DEBUG=semantest:server,semantest:websocket
export DEBUG=semantest:extension:*

# Enable with timestamps
export DEBUG_TIMESTAMPS=true

# Enable color output
export DEBUG_COLORS=true
```

### VS Code Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/packages/server/src/index.ts",
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "DEBUG": "semantest:*",
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Extension",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/packages/chrome-extension",
      "sourceMaps": true
    }
  ]
}
```

## Component-Specific Debugging

### Chrome Extension Debugging

#### Background Script

```javascript
// Enable verbose logging
chrome.runtime.onInstalled.addListener(() => {
  if (process.env.NODE_ENV === 'development') {
    chrome.storage.local.set({ debugMode: true });
  }
});

// Debug logging helper
function debug(...args) {
  if (debugMode) {
    console.log('[Semantest BG]', new Date().toISOString(), ...args);
  }
}

// Log all messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debug('Message received:', {
    message,
    sender: sender.tab ? `Tab ${sender.tab.id}` : 'Extension',
    url: sender.url
  });
});
```

#### Content Script

```javascript
// Debug injection
(function() {
  const debug = window.__SEMANTEST_DEBUG__ = {
    logLevel: 'debug',
    commands: [],
    errors: [],
    
    log(level, ...args) {
      const entry = {
        timestamp: Date.now(),
        level,
        args
      };
      
      this.commands.push(entry);
      console.log(`[Semantest CS ${level}]`, ...args);
    },
    
    dumpState() {
      console.group('Semantest Debug State');
      console.log('Commands:', this.commands);
      console.log('Errors:', this.errors);
      console.log('DOM State:', document.readyState);
      console.log('Active Elements:', document.activeElement);
      console.groupEnd();
    }
  };
  
  // Override console methods
  const originalError = console.error;
  console.error = function(...args) {
    debug.errors.push({ timestamp: Date.now(), args });
    originalError.apply(console, args);
  };
})();
```

#### DevTools Panel

```javascript
// Create custom DevTools panel
chrome.devtools.panels.create(
  "Semantest",
  "icons/icon16.png",
  "devtools/panel.html",
  (panel) => {
    panel.onShown.addListener((window) => {
      // Initialize debugging panel
      window.initializeDebugPanel();
    });
  }
);

// Panel implementation
function initializeDebugPanel() {
  const commands = [];
  const errors = [];
  
  // Listen for debug messages
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'DEBUG_COMMAND') {
      commands.push(msg);
      updateCommandList();
    }
  });
  
  // Display command history
  function updateCommandList() {
    const list = document.getElementById('command-list');
    list.innerHTML = commands.map(cmd => `
      <div class="command-entry">
        <span class="time">${new Date(cmd.timestamp).toLocaleTimeString()}</span>
        <span class="type">${cmd.command.type}</span>
        <pre>${JSON.stringify(cmd.command, null, 2)}</pre>
      </div>
    `).join('');
  }
}
```

### WebSocket Server Debugging

#### Connection Debugging

```typescript
import debug from 'debug';

const log = debug('semantest:server');
const wsLog = debug('semantest:websocket');
const authLog = debug('semantest:auth');

// Connection lifecycle logging
io.on('connection', (socket) => {
  const clientId = socket.id;
  const clientIp = socket.handshake.address;
  
  log('New connection:', {
    id: clientId,
    ip: clientIp,
    transport: socket.conn.transport.name,
    headers: socket.handshake.headers
  });
  
  socket.on('disconnect', (reason) => {
    log('Client disconnected:', {
      id: clientId,
      reason,
      duration: Date.now() - socket.handshake.time
    });
  });
  
  // Message debugging
  socket.use((packet, next) => {
    wsLog('Incoming packet:', {
      type: packet[0],
      data: packet[1],
      id: clientId
    });
    next();
  });
});
```

#### Performance Monitoring

```typescript
// Request timing middleware
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e6; // Convert to ms
    
    log('Request completed:', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      size: res.get('content-length')
    });
  });
  
  next();
});

// Memory usage monitoring
setInterval(() => {
  const usage = process.memoryUsage();
  log('Memory usage:', {
    rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`
  });
}, 60000); // Every minute
```

### SDK Debugging

#### Request/Response Logging

```typescript
export class SemantestClient {
  private debug: Debugger;
  
  constructor(options: ClientOptions) {
    this.debug = createDebugger('semantest:client');
    
    if (options.debug) {
      this.enableDebugMode();
    }
  }
  
  private enableDebugMode() {
    // Log all socket events
    this.socket.onAny((event, ...args) => {
      this.debug('Socket event:', { event, args });
    });
    
    // Log all method calls
    const methods = Object.getOwnPropertyNames(
      Object.getPrototypeOf(this)
    );
    
    methods.forEach(method => {
      if (typeof this[method] === 'function') {
        const original = this[method];
        this[method] = (...args) => {
          this.debug(`Calling ${method}:`, args);
          const result = original.apply(this, args);
          
          if (result instanceof Promise) {
            result
              .then(res => {
                this.debug(`${method} resolved:`, res);
                return res;
              })
              .catch(err => {
                this.debug(`${method} rejected:`, err);
                throw err;
              });
          }
          
          return result;
        };
      }
    });
  }
}
```

#### Network Inspection

```typescript
// HTTP request interceptor
import { interceptors } from './interceptors';

interceptors.request.use(
  (config) => {
    console.group(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
    console.log('Headers:', config.headers);
    console.log('Data:', config.data);
    console.groupEnd();
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

interceptors.response.use(
  (response) => {
    console.group(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`);
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    console.log('Data:', response.data);
    console.groupEnd();
    return response;
  },
  (error) => {
    console.group(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    console.error('Error:', error.message);
    console.error('Response:', error.response?.data);
    console.groupEnd();
    return Promise.reject(error);
  }
);
```

## Common Issues

### Connection Problems

#### WebSocket Connection Failures

```javascript
// Client-side diagnostics
function diagnoseConnection() {
  const diagnostics = {
    url: socket.io.uri,
    readyState: socket.connected,
    transport: socket.io.engine.transport.name,
    reconnectionAttempts: socket.io._reconnectionAttempts,
    lastError: socket.io.lastError
  };
  
  console.table(diagnostics);
  
  // Test connectivity
  fetch(socket.io.uri.replace('ws://', 'http://') + '/health')
    .then(res => res.json())
    .then(data => console.log('Server health:', data))
    .catch(err => console.error('Server unreachable:', err));
}

// Server-side diagnostics
app.get('/debug/connections', (req, res) => {
  const sockets = Array.from(io.sockets.sockets.values());
  
  res.json({
    total: sockets.length,
    connections: sockets.map(s => ({
      id: s.id,
      connected: s.connected,
      transport: s.conn.transport.name,
      ip: s.handshake.address,
      userAgent: s.handshake.headers['user-agent']
    }))
  });
});
```

#### Authentication Issues

```typescript
// Debug authentication flow
socket.on('connect_error', (error) => {
  if (error.type === 'UnauthorizedError') {
    console.error('Authentication failed:', {
      message: error.message,
      data: error.data,
      token: socket.auth.token ? 'Present' : 'Missing'
    });
    
    // Attempt token refresh
    refreshAuthToken()
      .then(newToken => {
        socket.auth.token = newToken;
        socket.connect();
      })
      .catch(err => {
        console.error('Token refresh failed:', err);
      });
  }
});
```

### Performance Issues

#### Memory Leaks

```javascript
// Detect memory leaks in Chrome extension
class MemoryMonitor {
  constructor() {
    this.baseline = null;
    this.samples = [];
  }
  
  start() {
    // Take baseline measurement
    if (chrome.runtime.getManifest().version === '3') {
      chrome.runtime.getPlatformInfo((info) => {
        this.baseline = performance.memory;
        this.monitor();
      });
    }
  }
  
  monitor() {
    setInterval(() => {
      const current = performance.memory;
      const delta = {
        usedJSHeapSize: current.usedJSHeapSize - this.baseline.usedJSHeapSize,
        totalJSHeapSize: current.totalJSHeapSize - this.baseline.totalJSHeapSize
      };
      
      this.samples.push({
        timestamp: Date.now(),
        ...current,
        delta
      });
      
      // Detect potential leak
      if (delta.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB increase
        console.warn('Potential memory leak detected:', {
          increase: `${(delta.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          samples: this.samples.slice(-10)
        });
      }
    }, 30000); // Every 30 seconds
  }
}
```

#### Slow Operations

```typescript
// Performance profiling
class PerformanceProfiler {
  private marks: Map<string, number> = new Map();
  
  mark(name: string) {
    this.marks.set(name, performance.now());
  }
  
  measure(name: string, startMark: string) {
    const start = this.marks.get(startMark);
    if (!start) {
      console.warn(`Start mark '${startMark}' not found`);
      return;
    }
    
    const duration = performance.now() - start;
    console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} (${duration.toFixed(2)}ms)`);
      console.trace();
    }
    
    return duration;
  }
  
  async profile<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.mark(`${name}-start`);
    try {
      const result = await fn();
      this.measure(name, `${name}-start`);
      return result;
    } catch (error) {
      this.measure(`${name}-error`, `${name}-start`);
      throw error;
    }
  }
}

// Usage
const profiler = new PerformanceProfiler();
await profiler.profile('downloadImages', async () => {
  return await downloadImages(options);
});
```

## Debugging Tools

### Browser DevTools

```javascript
// Custom formatters for DevTools
if (typeof window !== 'undefined') {
  window.devtoolsFormatters = [{
    header(obj) {
      if (obj instanceof SemanticCommand) {
        return ['div', { style: 'color: #00a' },
          ['span', {}, 'SemanticCommand'],
          ['span', { style: 'margin-left: 10px; color: #0a0' }, obj.type]
        ];
      }
      return null;
    },
    hasBody() { return true; },
    body(obj) {
      return ['div', {},
        ['div', {}, `ID: ${obj.id}`],
        ['div', {}, `Target: ${JSON.stringify(obj.target)}`],
        ['div', {}, `Options: ${JSON.stringify(obj.options)}`]
      ];
    }
  }];
}
```

### Debug Commands

```typescript
// Add debug commands to global scope
if (process.env.NODE_ENV === 'development') {
  global.semantest = {
    // Dump current state
    dumpState() {
      console.log({
        connections: io.sockets.sockets.size,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        env: process.env.NODE_ENV
      });
    },
    
    // Clear all data
    async clearAll() {
      await redis.flushall();
      console.log('All Redis data cleared');
    },
    
    // Simulate errors
    simulateError(type: string) {
      switch (type) {
        case 'memory':
          const leak = [];
          setInterval(() => {
            leak.push(new Array(1000000).fill('x'));
          }, 100);
          break;
        case 'crash':
          process.exit(1);
          break;
      }
    }
  };
}
```

### Logging Best Practices

```typescript
// Structured logging
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'semantest' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Context-aware logging
class ContextLogger {
  constructor(private context: string) {}
  
  log(level: string, message: string, meta?: any) {
    logger.log(level, message, {
      context: this.context,
      ...meta
    });
  }
  
  error(message: string, error?: Error, meta?: any) {
    this.log('error', message, {
      error: error?.message,
      stack: error?.stack,
      ...meta
    });
  }
}
```

## Production Debugging

### Remote Debugging

```bash
# Enable Node.js debugging in production
node --inspect=0.0.0.0:9229 server.js

# SSH tunnel for secure access
ssh -L 9229:localhost:9229 user@production-server

# Connect Chrome DevTools
chrome://inspect
```

### Error Tracking

```typescript
// Sentry integration
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  }
});

// Custom error context
Sentry.configureScope((scope) => {
  scope.setTag('component', 'websocket-server');
  scope.setContext('runtime', {
    node: process.version,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});
```

## Debugging Checklist

### Initial Investigation
- [ ] Check error messages and stack traces
- [ ] Verify environment variables
- [ ] Check network connectivity
- [ ] Validate configuration files
- [ ] Review recent code changes

### Data Collection
- [ ] Enable debug logging
- [ ] Capture network traffic
- [ ] Take memory snapshots
- [ ] Record performance metrics
- [ ] Save error logs

### Analysis
- [ ] Reproduce issue locally
- [ ] Isolate problem component
- [ ] Check for patterns
- [ ] Review similar issues
- [ ] Test potential fixes

### Resolution
- [ ] Implement fix
- [ ] Add regression test
- [ ] Update documentation
- [ ] Deploy with monitoring
- [ ] Verify in production

## Resources

- [Chrome DevTools Documentation](https://developer.chrome.com/docs/devtools/)
- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [VS Code Debugging](https://code.visualstudio.com/docs/editor/debugging)
- [Socket.IO Debugging](https://socket.io/docs/v4/troubleshooting-connection-issues/)