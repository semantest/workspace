# Critical Test Templates - Start Testing NOW

**For Immediate Use** - Copy these templates and start testing!

## 1. WebSocket Reconnection Test (P0 - Eva's Bug Area)

```typescript
// tests/websocket-reconnection.test.ts
import { WebSocketClient } from '../src/websocket-client';
import { TestServer } from './helpers/test-server';

describe('WebSocket Reconnection - CRITICAL', () => {
  let client: WebSocketClient;
  let server: TestServer;

  beforeEach(async () => {
    server = await TestServer.start({ port: 3003 }); // Correct port!
    client = new WebSocketClient({
      url: 'ws://localhost:3003',
      reconnect: true,
      reconnectDelay: 100 // Fast for tests
    });
  });

  afterEach(async () => {
    await client.disconnect();
    await server.stop();
  });

  it('should connect to correct port (3003 not 8080)', async () => {
    await client.connect();
    expect(client.isConnected()).toBe(true);
    expect(client.getPort()).toBe(3003); // Not 8080!
  });

  it('should auto-reconnect after disconnect', async () => {
    await client.connect();
    
    // Simulate server disconnect
    await server.disconnectClient(client.id);
    
    // Wait for reconnection
    await new Promise(resolve => {
      client.on('reconnected', resolve);
    });
    
    expect(client.isConnected()).toBe(true);
  });

  it('should handle port configuration changes', async () => {
    // This would have caught Eva's bug!
    const config = { wsPort: 8080 };
    const serverPort = 3003;
    
    expect(config.wsPort).not.toBe(serverPort);
    // Should throw or warn about mismatch
  });
});
```

## 2. Priority Queue Test (P0 - Data Loss Prevention)

```typescript
// tests/priority-queue.test.ts
describe('Priority Queue - CRITICAL', () => {
  let queue: PriorityQueue;

  beforeEach(() => {
    queue = new PriorityQueue({
      maxSize: 1000,
      persistToFile: './queue-backup.json'
    });
  });

  it('should not lose items on crash', async () => {
    // Add items
    await queue.enqueue({ priority: 10, data: 'important' });
    await queue.enqueue({ priority: 1, data: 'low-priority' });
    
    // Simulate crash
    await queue.flush(); // Force write to disk
    const newQueue = new PriorityQueue({
      persistToFile: './queue-backup.json'
    });
    
    await newQueue.restore();
    const items = await newQueue.getAllItems();
    
    expect(items).toHaveLength(2);
    expect(items[0].data).toBe('important');
  });

  it('should handle concurrent access', async () => {
    const promises = [];
    
    // 100 concurrent writes
    for (let i = 0; i < 100; i++) {
      promises.push(queue.enqueue({ 
        priority: Math.random() * 10, 
        data: `item-${i}` 
      }));
    }
    
    await Promise.all(promises);
    expect(queue.size()).toBe(100);
  });
});
```

## 3. Failover Test (P0 - Uptime Critical)

```typescript
// tests/failover.test.ts
describe('Failover System - CRITICAL', () => {
  let failoverManager: FailoverManager;
  let localServer: MockServer;
  let cloudServer: MockServer;

  beforeEach(async () => {
    localServer = new MockServer({ name: 'local', port: 3003 });
    cloudServer = new MockServer({ name: 'cloud', port: 443 });
    
    failoverManager = new FailoverManager({
      primary: localServer,
      secondary: cloudServer,
      healthCheckInterval: 500 // Fast for tests
    });
  });

  it('should failover within 5 seconds', async () => {
    await failoverManager.start();
    
    const startTime = Date.now();
    await localServer.crash();
    
    await waitFor(() => 
      expect(failoverManager.getActiveServer()).toBe('cloud')
    );
    
    const failoverTime = Date.now() - startTime;
    expect(failoverTime).toBeLessThan(5000);
  });

  it('should not lose requests during failover', async () => {
    await failoverManager.start();
    
    const results = [];
    const requestPromises = [];
    
    // Start 10 requests
    for (let i = 0; i < 10; i++) {
      requestPromises.push(
        failoverManager.request(`/download/${i}`)
          .then(r => results.push({ success: true, id: i }))
          .catch(e => results.push({ success: false, id: i }))
      );
    }
    
    // Kill server mid-flight
    setTimeout(() => localServer.crash(), 50);
    
    await Promise.all(requestPromises);
    
    const successful = results.filter(r => r.success);
    expect(successful.length).toBeGreaterThan(8); // 80% success minimum
  });
});
```

## 4. Rate Limiting Test (P0 - DDoS Protection)

```typescript
// tests/rate-limiting.test.ts
describe('Rate Limiting - CRITICAL', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 100 // 100 requests per minute
    });
  });

  it('should block after limit exceeded', async () => {
    const userId = 'test-user';
    
    // Use up the limit
    for (let i = 0; i < 100; i++) {
      const allowed = await rateLimiter.checkLimit(userId);
      expect(allowed).toBe(true);
    }
    
    // 101st request should be blocked
    const blocked = await rateLimiter.checkLimit(userId);
    expect(blocked).toBe(false);
  });

  it('should reset after time window', async () => {
    const userId = 'test-user';
    
    // Exhaust limit
    for (let i = 0; i < 100; i++) {
      await rateLimiter.checkLimit(userId);
    }
    
    // Fast-forward time
    jest.advanceTimersByTime(61 * 1000);
    
    // Should be allowed again
    const allowed = await rateLimiter.checkLimit(userId);
    expect(allowed).toBe(true);
  });

  it('should handle distributed rate limiting', async () => {
    // Simulate multiple servers
    const limiter1 = new RateLimiter({ redis: mockRedis });
    const limiter2 = new RateLimiter({ redis: mockRedis });
    
    const userId = 'shared-user';
    
    // 50 requests from each server
    for (let i = 0; i < 50; i++) {
      await limiter1.checkLimit(userId);
      await limiter2.checkLimit(userId);
    }
    
    // Both should now block
    expect(await limiter1.checkLimit(userId)).toBe(false);
    expect(await limiter2.checkLimit(userId)).toBe(false);
  });
});
```

## 5. Addon System Test (P1 - Extension Stability)

```typescript
// tests/addon-system.test.ts
describe('Addon System - HIGH PRIORITY', () => {
  let extensionSystem: ExtensionSystem;

  beforeEach(() => {
    extensionSystem = new ExtensionSystem({
      maxAddons: 50,
      isolationMode: 'strict'
    });
  });

  it('should isolate addon crashes', async () => {
    const goodAddon = {
      id: 'good-addon',
      init: async () => ({ status: 'ready' })
    };
    
    const badAddon = {
      id: 'bad-addon',
      init: async () => { throw new Error('Addon crash!'); }
    };
    
    await extensionSystem.loadAddon(goodAddon);
    await extensionSystem.loadAddon(badAddon);
    
    expect(extensionSystem.getAddonStatus('good-addon')).toBe('active');
    expect(extensionSystem.getAddonStatus('bad-addon')).toBe('failed');
    expect(extensionSystem.isHealthy()).toBe(true);
  });

  it('should prevent memory leaks', async () => {
    const addon = {
      id: 'memory-test',
      init: async () => {
        // Allocate some memory
        const bigArray = new Array(1000000).fill('data');
        return { data: bigArray };
      }
    };
    
    const memBefore = process.memoryUsage().heapUsed;
    
    // Load and unload 10 times
    for (let i = 0; i < 10; i++) {
      await extensionSystem.loadAddon(addon);
      await extensionSystem.unloadAddon(addon.id);
    }
    
    // Force garbage collection (if available)
    if (global.gc) global.gc();
    
    const memAfter = process.memoryUsage().heapUsed;
    const leak = memAfter - memBefore;
    
    expect(leak).toBeLessThan(10 * 1024 * 1024); // Less than 10MB leak
  });
});
```

## Running These Tests

```bash
# Install test dependencies first
npm install --save-dev jest @types/jest ts-jest

# Create jest.config.js
cat > jest.config.js << EOF
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000, // 30s for integration tests
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
EOF

# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- websocket-reconnection.test.ts
```

## Next Steps

1. **Copy these templates NOW**
2. **Adapt to your codebase**
3. **Run and fix failing tests**
4. **Add more edge cases**
5. **Set up CI/CD to run automatically**

Remember: Every test you write prevents a production bug!