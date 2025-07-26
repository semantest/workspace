---
id: client
title: Client SDK
sidebar_label: Client SDK
---

# Semantest Client SDK

The Semantest Client SDK provides a comprehensive TypeScript/JavaScript interface for automating web interactions through semantic commands. It enables developers to integrate Semantest's powerful automation capabilities into their applications.

## Overview

The Client SDK acts as:
- 🔌 **Connection Manager** - Handles WebSocket connections to the Semantest server
- 📡 **Command Interface** - Provides high-level API for semantic automation
- 🔄 **Event Emitter** - Real-time updates on command execution
- 🛡️ **Error Handler** - Robust error handling and recovery
- 📊 **Progress Tracker** - Monitor download and execution progress

## Features

- **Semantic Commands**: Natural language-like API for web automation
- **Real-time Communication**: WebSocket-based for instant feedback
- **Batch Operations**: Execute multiple commands efficiently
- **Session Management**: Persistent sessions across connections
- **TypeScript Support**: Full type definitions included
- **Event-Driven**: Subscribe to detailed execution events
- **Error Recovery**: Automatic retry with exponential backoff

## Installation

```bash
npm install @semantest/client
# or
yarn add @semantest/client
# or
pnpm add @semantest/client
```

## Quick Start

```typescript
import { SemantestClient } from '@semantest/client';

// Create client instance
const client = new SemantestClient({
  serverUrl: 'http://localhost:3000'
});

// Connect to server
await client.connect();

// Download images with semantic command
const result = await client.downloadImages({
  source: 'unsplash.com',
  query: 'sunset photography',
  count: 10,
  quality: 'high'
});

console.log(`Downloaded ${result.images.length} images`);
```

## Core Concepts

### Semantic Commands

Commands represent high-level intentions rather than low-level browser actions:

```typescript
// Instead of:
// 1. Navigate to site
// 2. Find search input
// 3. Type query
// 4. Click search button
// 5. Wait for results
// 6. Find images
// 7. Download each image

// Simply:
await client.downloadImages({
  source: 'google.com',
  query: 'architecture'
});
```

### Connection Lifecycle

```typescript
// Connection with retry logic
const client = new SemantestClient({
  serverUrl: 'http://localhost:3000',
  retryAttempts: 3,
  retryDelay: 1000
});

// Handle connection events
client.on('connect', () => {
  console.log('Connected to Semantest server');
});

client.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

client.on('error', (error) => {
  console.error('Connection error:', error);
});

// Connect
await client.connect();

// Use client...

// Clean disconnect
await client.disconnect();
```

### Event Handling

```typescript
// Subscribe to command lifecycle events
client.on('command:start', (command) => {
  console.log('Executing:', command.type);
});

client.on('command:progress', (progress) => {
  console.log(`Progress: ${progress.percent}%`);
});

client.on('command:complete', (result) => {
  console.log('Completed:', result);
});

// Download-specific events
client.on('download:start', (download) => {
  console.log('Downloading:', download.url);
});

client.on('download:progress', ({ url, percent, bytesReceived }) => {
  console.log(`${url}: ${percent}% (${bytesReceived} bytes)`);
});

client.on('download:complete', (file) => {
  console.log('Saved:', file.path);
});

client.on('download:error', (error) => {
  console.error('Download failed:', error);
});
```

## Advanced Usage

### Authentication

```typescript
// JWT Authentication
const client = new SemantestClient({
  auth: {
    type: 'jwt',
    token: await getAuthToken()
  }
});

// API Key Authentication
const client = new SemantestClient({
  auth: {
    type: 'apiKey',
    apiKey: process.env.SEMANTEST_API_KEY
  }
});

// Login with credentials
const client = new SemantestClient();
await client.login('username', 'password');
```

### Session Management

```typescript
// Create persistent session
const session = await client.createSession({
  name: 'product-images',
  persistent: true,
  metadata: {
    project: 'e-commerce',
    category: 'products'
  }
});

console.log('Session ID:', session.id);

// Resume session later
const client2 = new SemantestClient();
await client2.connect();
await client2.resumeSession(session.id);

// Share session with team
const shareToken = await client.shareSession(session.id, {
  permissions: ['read', 'execute'],
  expiresIn: '7d'
});
```

### Batch Operations

```typescript
// Create batch for sequential operations
const batch = client.batch();

batch
  .navigate('https://example.com')
  .click({ text: 'Gallery' })
  .waitFor({ visible: { selector: '.images' } })
  .downloadImages({ 
    selector: 'img.gallery-image',
    count: 20 
  });

// Execute batch
const results = await batch.execute();

// Parallel downloads from multiple sources
const sources = [
  { source: 'unsplash.com', query: 'nature' },
  { source: 'pexels.com', query: 'nature' },
  { source: 'pixabay.com', query: 'nature' }
];

const downloads = await Promise.all(
  sources.map(opts => client.downloadImages({ ...opts, count: 5 }))
);
```

### Custom Commands

```typescript
// Register custom command handler
client.registerCommand('scrapeMetadata', async (params) => {
  const { url, selector } = params;
  
  await client.navigate(url);
  const elements = await client.findElements(selector);
  
  const metadata = await Promise.all(
    elements.map(el => el.getAttribute('data-meta'))
  );
  
  return { metadata };
});

// Use custom command
const result = await client.execute('scrapeMetadata', {
  url: 'https://example.com',
  selector: '[data-meta]'
});
```

### Progress Monitoring

```typescript
// Monitor long-running operations
const controller = new AbortController();

const downloadPromise = client.downloadImages({
  source: 'website.com',
  query: 'large dataset',
  count: 1000
}, {
  signal: controller.signal,
  onProgress: (progress) => {
    console.log(`Overall: ${progress.percent}%`);
    console.log(`Downloaded: ${progress.completed}/${progress.total}`);
    console.log(`Current: ${progress.current?.filename}`);
    
    // Cancel if needed
    if (shouldCancel) {
      controller.abort();
    }
  }
});

try {
  const result = await downloadPromise;
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Download cancelled');
  }
}
```

## Error Handling

### Error Types

```typescript
import { 
  SemantestError,
  ConnectionError,
  AuthenticationError,
  TimeoutError,
  CommandError,
  ValidationError
} from '@semantest/client';

try {
  await client.downloadImages({ 
    source: 'invalid-site',
    query: 'test' 
  });
} catch (error) {
  if (error instanceof ConnectionError) {
    // Handle connection issues
    console.error('Server connection failed:', error.message);
    
  } else if (error instanceof AuthenticationError) {
    // Handle auth failures
    console.error('Authentication failed:', error.message);
    await client.refreshAuth();
    
  } else if (error instanceof TimeoutError) {
    // Handle timeouts
    console.error('Operation timed out:', error.message);
    
  } else if (error instanceof CommandError) {
    // Handle command execution errors
    console.error('Command failed:', error.details);
    
  } else if (error instanceof ValidationError) {
    // Handle validation errors
    console.error('Invalid parameters:', error.validationErrors);
  }
}
```

### Retry Strategies

```typescript
// Configure automatic retry
const client = new SemantestClient({
  retryAttempts: 3,
  retryDelay: 1000,
  retryBackoff: 'exponential', // or 'linear'
  retryCondition: (error) => {
    // Only retry on network errors
    return error instanceof ConnectionError;
  }
});

// Manual retry with custom logic
async function downloadWithRetry(options, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await client.downloadImages(options);
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`Retry ${attempt}/${maxAttempts} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Performance Optimization

### Connection Pooling

```typescript
// Reuse connections across multiple operations
const pool = new SemantestClientPool({
  maxClients: 5,
  serverUrl: 'http://localhost:3000'
});

// Get client from pool
const client = await pool.acquire();

try {
  await client.downloadImages(options);
} finally {
  // Return to pool
  pool.release(client);
}
```

### Caching

```typescript
// Enable response caching
const client = new SemantestClient({
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
    maxSize: 100 // MB
  }
});

// Cache will be used for identical requests
const result1 = await client.downloadImages(options);
const result2 = await client.downloadImages(options); // From cache
```

## Testing

### Mock Client

```typescript
import { MockSemantestClient } from '@semantest/client/testing';

// Create mock client for testing
const mockClient = new MockSemantestClient();

// Configure mock responses
mockClient.mockDownloadImages({
  success: true,
  images: [
    { id: '1', filename: 'test1.jpg', size: 1024 },
    { id: '2', filename: 'test2.jpg', size: 2048 }
  ]
});

// Use in tests
const result = await mockClient.downloadImages({
  source: 'test.com',
  query: 'test'
});

expect(result.images).toHaveLength(2);
```

### Integration Testing

```typescript
import { TestServer } from '@semantest/testing';

describe('Client Integration', () => {
  let server: TestServer;
  let client: SemantestClient;
  
  beforeAll(async () => {
    server = await TestServer.start();
    client = new SemantestClient({
      serverUrl: server.url
    });
  });
  
  afterAll(async () => {
    await client.disconnect();
    await server.stop();
  });
  
  it('should download images', async () => {
    const result = await client.downloadImages({
      source: 'test.com',
      query: 'test'
    });
    
    expect(result.success).toBe(true);
  });
});
```

## Troubleshooting

### Debug Mode

```typescript
// Enable detailed logging
const client = new SemantestClient({
  debug: true,
  logger: {
    level: 'debug',
    transport: 'console'
  }
});

// Custom logger
const client = new SemantestClient({
  logger: {
    log: (level, message, meta) => {
      myLogger.log({ level, message, ...meta });
    }
  }
});
```

### Common Issues

1. **Connection Timeout**
   ```typescript
   // Increase timeout
   const client = new SemantestClient({
     timeout: 60000 // 60 seconds
   });
   ```

2. **Large Downloads**
   ```typescript
   // Adjust for large files
   const client = new SemantestClient({
     downloadTimeout: 300000, // 5 minutes
     maxPayloadSize: 100 * 1024 * 1024 // 100MB
   });
   ```

3. **Memory Usage**
   ```typescript
   // Stream large downloads
   const stream = await client.downloadImagesStream(options);
   
   stream.on('image', (image) => {
     // Process one at a time
     processImage(image);
   });
   ```

## API Reference

See the [full API documentation](/docs/api/client) for detailed method signatures and options.

## Migration Guide

### From v1.x to v2.x

```typescript
// v1.x
const client = new SemantestClient('http://localhost:3000');
client.download({ /* options */ });

// v2.x
const client = new SemantestClient({ 
  serverUrl: 'http://localhost:3000' 
});
await client.downloadImages({ /* options */ });
```

## Best Practices

1. **Always handle disconnections**
2. **Use event handlers for progress tracking**
3. **Implement proper error handling**
4. **Clean up resources with disconnect()**
5. **Use TypeScript for better type safety**
6. **Monitor memory usage for large operations**
7. **Implement retry logic for production**

## Resources

- [API Reference](/docs/api/client)
- [Example Projects](https://github.com/semantest/examples)
- [TypeScript Definitions](https://github.com/semantest/client/blob/main/index.d.ts)
- [Troubleshooting Guide](/docs/troubleshooting)