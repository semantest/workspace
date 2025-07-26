---
id: client
title: Client SDK API
sidebar_label: Client SDK
---

# Client SDK API Reference

The Semantest Client SDK provides a TypeScript/JavaScript interface for automating web interactions through semantic commands.

## Installation

```bash
npm install @semantest/client
# or
yarn add @semantest/client
```

## Quick Start

```typescript
import { SemantestClient } from '@semantest/client';

const client = new SemantestClient({
  serverUrl: 'http://localhost:3000'
});

await client.connect();
const result = await client.downloadImages({
  source: 'google.com',
  query: 'nature',
  count: 5
});
```

## Class: SemantestClient

### Constructor

```typescript
new SemantestClient(options?: ClientOptions)
```

#### ClientOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `serverUrl` | `string` | `'http://localhost:3000'` | WebSocket server URL |
| `timeout` | `number` | `30000` | Default timeout for operations (ms) |
| `retryAttempts` | `number` | `3` | Number of retry attempts |
| `retryDelay` | `number` | `1000` | Delay between retries (ms) |
| `debug` | `boolean` | `false` | Enable debug logging |
| `auth` | `AuthOptions` | `undefined` | Authentication configuration |

#### AuthOptions

```typescript
interface AuthOptions {
  type: 'jwt' | 'apiKey';
  token?: string;        // For JWT
  apiKey?: string;       // For API key
  username?: string;     // For login
  password?: string;     // For login
}
```

### Methods

#### connect()

Establishes connection to the WebSocket server.

```typescript
await client.connect(): Promise<void>
```

**Example:**
```typescript
try {
  await client.connect();
  console.log('Connected successfully');
} catch (error) {
  console.error('Connection failed:', error);
}
```

#### disconnect()

Closes the connection to the server.

```typescript
await client.disconnect(): Promise<void>
```

#### downloadImages()

Downloads images based on semantic search criteria.

```typescript
await client.downloadImages(options: DownloadOptions): Promise<DownloadResult>
```

**DownloadOptions:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `source` | `string` | Yes | Domain to search (e.g., 'google.com') |
| `query` | `string` | Yes | Search query |
| `count` | `number` | No | Number of images to download (default: 10) |
| `quality` | `'low' \| 'medium' \| 'high'` | No | Image quality preference |
| `safeSearch` | `boolean` | No | Enable safe search (default: true) |
| `license` | `LicenseType` | No | License filter |
| `color` | `ColorType` | No | Color filter |
| `size` | `SizeType` | No | Size filter |
| `type` | `ImageType` | No | Image type filter |
| `outputDir` | `string` | No | Local directory for downloads |
| `metadata` | `boolean` | No | Include image metadata |

**DownloadResult:**

```typescript
interface DownloadResult {
  success: boolean;
  images: Array<{
    id: string;
    filename: string;
    url: string;
    path: string;
    size: number;
    metadata?: ImageMetadata;
  }>;
  errors: Array<{
    url: string;
    error: string;
  }>;
  stats: {
    requested: number;
    downloaded: number;
    failed: number;
    duration: number;
  };
}
```

**Example:**
```typescript
const result = await client.downloadImages({
  source: 'google.com',
  query: 'sunset photography',
  count: 20,
  quality: 'high',
  license: 'commercial',
  metadata: true
});

console.log(`Downloaded ${result.images.length} images`);
```

#### navigate()

Navigates to a specific URL.

```typescript
await client.navigate(url: string, options?: NavigateOptions): Promise<void>
```

**NavigateOptions:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `waitUntil` | `LoadEvent` | `'load'` | When to consider navigation complete |
| `timeout` | `number` | `30000` | Navigation timeout (ms) |

#### click()

Clicks on an element matching the semantic description.

```typescript
await client.click(target: TargetDescriptor, options?: ClickOptions): Promise<void>
```

**TargetDescriptor:**

```typescript
interface TargetDescriptor {
  text?: string;           // Text content
  selector?: string;       // CSS selector
  xpath?: string;          // XPath expression
  attributes?: Record<string, string>;  // Element attributes
  index?: number;          // Element index (0-based)
  semantic?: string;       // Semantic description
}
```

**Example:**
```typescript
// Click by text
await client.click({ text: 'Download' });

// Click by semantic description
await client.click({ 
  semantic: 'primary download button for high-res image' 
});
```

#### type()

Types text into an input field.

```typescript
await client.type(target: TargetDescriptor, text: string, options?: TypeOptions): Promise<void>
```

**TypeOptions:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `delay` | `number` | `0` | Delay between keystrokes (ms) |
| `clear` | `boolean` | `false` | Clear field before typing |

#### waitFor()

Waits for an element or condition.

```typescript
await client.waitFor(target: TargetDescriptor | WaitCondition, options?: WaitOptions): Promise<void>
```

**WaitCondition:**

```typescript
type WaitCondition = 
  | { visible: TargetDescriptor }
  | { hidden: TargetDescriptor }
  | { text: string }
  | { url: string | RegExp }
  | { function: () => boolean };
```

#### screenshot()

Takes a screenshot of the current page.

```typescript
await client.screenshot(options?: ScreenshotOptions): Promise<Buffer>
```

**ScreenshotOptions:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `fullPage` | `boolean` | `false` | Capture full page |
| `clip` | `Rectangle` | - | Clip area |
| `quality` | `number` | `80` | JPEG quality (0-100) |
| `type` | `'png' \| 'jpeg'` | `'png'` | Image format |

### Events

The client extends EventEmitter and emits various events:

#### Connection Events

```typescript
client.on('connect', () => {
  console.log('Connected to server');
});

client.on('disconnect', (reason: string) => {
  console.log('Disconnected:', reason);
});

client.on('error', (error: Error) => {
  console.error('Client error:', error);
});
```

#### Command Events

```typescript
client.on('command:start', (command: Command) => {
  console.log('Executing command:', command.type);
});

client.on('command:progress', (progress: Progress) => {
  console.log(`Progress: ${progress.percent}%`);
});

client.on('command:complete', (result: Result) => {
  console.log('Command completed:', result);
});
```

#### Download Events

```typescript
client.on('download:start', (download: Download) => {
  console.log('Starting download:', download.url);
});

client.on('download:progress', (progress: DownloadProgress) => {
  console.log(`Downloading: ${progress.percent}%`);
});

client.on('download:complete', (file: DownloadedFile) => {
  console.log('Downloaded:', file.filename);
});
```

## Advanced Usage

### Custom Authentication

```typescript
// JWT Authentication
const client = new SemantestClient({
  auth: {
    type: 'jwt',
    token: 'your-jwt-token'
  }
});

// API Key Authentication
const client = new SemantestClient({
  auth: {
    type: 'apiKey',
    apiKey: 'your-api-key'
  }
});

// Login Authentication
const client = new SemantestClient();
await client.login('username', 'password');
```

### Session Management

```typescript
// Create a persistent session
const session = await client.createSession({
  name: 'my-automation',
  persistent: true
});

// Resume a session
await client.resumeSession(session.id);

// Share session with another client
const shareToken = await client.shareSession(session.id, {
  permissions: ['read'],
  expiresIn: '1h'
});
```

### Batch Operations

```typescript
// Execute multiple commands in sequence
const batch = client.batch();

batch
  .navigate('https://example.com')
  .click({ text: 'Images' })
  .type({ selector: '#search' }, 'sunset')
  .click({ text: 'Search' })
  .downloadImages({ count: 10 });

const results = await batch.execute();
```

### Custom Commands

```typescript
// Register custom command handler
client.registerCommand('customAction', async (params) => {
  // Custom implementation
  return { success: true, data: params };
});

// Execute custom command
const result = await client.execute('customAction', {
  custom: 'parameters'
});
```

### Error Handling

```typescript
import { 
  SemantestError, 
  ConnectionError, 
  TimeoutError, 
  CommandError 
} from '@semantest/client';

try {
  await client.downloadImages({ 
    source: 'google.com',
    query: 'test' 
  });
} catch (error) {
  if (error instanceof TimeoutError) {
    console.error('Operation timed out');
  } else if (error instanceof CommandError) {
    console.error('Command failed:', error.details);
  } else if (error instanceof ConnectionError) {
    console.error('Connection issue:', error.message);
  }
}
```

## Type Definitions

### Common Types

```typescript
type LoadEvent = 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';

type LicenseType = 'any' | 'commercial' | 'creative-commons';

type ColorType = 'color' | 'grayscale' | 'transparent' | 
                 'red' | 'orange' | 'yellow' | 'green' | 
                 'teal' | 'blue' | 'purple' | 'pink' | 
                 'white' | 'gray' | 'black' | 'brown';

type SizeType = 'icon' | 'small' | 'medium' | 'large' | 'xlarge';

type ImageType = 'photo' | 'clipart' | 'lineart' | 'animated' | 'face';

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageMetadata {
  title?: string;
  sourceUrl?: string;
  width?: number;
  height?: number;
  format?: string;
  license?: string;
  author?: string;
  tags?: string[];
}
```

## Best Practices

### Connection Management

```typescript
// Always handle connection lifecycle
const client = new SemantestClient();

try {
  await client.connect();
  // Perform operations
} finally {
  await client.disconnect();
}
```

### Error Recovery

```typescript
// Implement retry logic for transient failures
async function downloadWithRetry(client, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.downloadImages(options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### Resource Cleanup

```typescript
// Clean up resources and listeners
client.removeAllListeners();
await client.disconnect();
```

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

## Support

- [GitHub Issues](https://github.com/semantest/client/issues)
- [Discord Community](https://discord.gg/semantest)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/semantest)