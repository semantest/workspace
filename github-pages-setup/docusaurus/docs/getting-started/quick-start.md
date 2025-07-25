---
id: quick-start
title: Quick Start
sidebar_label: Quick Start
---

# Quick Start Guide

Get up and running with Semantest in just 5 minutes! This guide will walk you through installation, basic setup, and your first automation.

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- Chrome browser (latest version)
- npm or yarn package manager

## Installation

### 1. Install the Chrome Extension

```bash
# Clone the extension
git clone https://github.com/semantest/extension.chrome
cd extension.chrome

# Install dependencies
npm install

# Build the extension
npm run build
```

Then load the extension in Chrome:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

### 2. Install the SDK

```bash
npm install @semantest/client @semantest/server
```

### 3. Start the WebSocket Server

```bash
# Using npx
npx @semantest/server

# Or install globally
npm install -g @semantest/server
semantest-server
```

The server will start on `http://localhost:3000`.

## Your First Automation

### Example: Download Images from Google

Create a new file `download-images.ts`:

```typescript
import { SemantestClient } from '@semantest/client';

async function downloadImages() {
  // Initialize the client
  const client = new SemantestClient({
    serverUrl: 'http://localhost:3000'
  });

  try {
    // Connect to the server
    await client.connect();
    console.log('Connected to Semantest server');

    // Download images semantically
    const results = await client.downloadImages({
      source: 'google.com',
      query: 'beautiful landscapes',
      count: 5,
      quality: 'high'
    });

    console.log(`Downloaded ${results.images.length} images`);
    results.images.forEach((image, index) => {
      console.log(`${index + 1}. ${image.filename} (${image.size})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Disconnect when done
    await client.disconnect();
  }
}

// Run the automation
downloadImages();
```

Run your script:

```bash
# Using ts-node
npx ts-node download-images.ts

# Or compile and run
npx tsc download-images.ts
node download-images.js
```

## Understanding the Flow

Here's what happens when you run the automation:

1. **Client connects** to the WebSocket server
2. **Server validates** the connection and authentication
3. **Client sends** a semantic download request
4. **Extension receives** the request through the server
5. **Extension navigates** to Google Images
6. **Extension searches** for your query
7. **Extension downloads** images based on your criteria
8. **Server returns** results to your client

## Configuration Options

### Client Configuration

```typescript
const client = new SemantestClient({
  serverUrl: 'http://localhost:3000',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  debug: true // Enable debug logging
});
```

### Download Options

```typescript
await client.downloadImages({
  source: 'google.com',
  query: 'nature photography',
  count: 10,
  quality: 'high', // 'low', 'medium', 'high'
  safeSearch: true,
  license: 'commercial', // 'any', 'commercial', 'creative-commons'
  color: 'color', // 'color', 'grayscale', 'transparent'
  size: 'large', // 'icon', 'medium', 'large', 'xlarge'
  type: 'photo', // 'photo', 'clipart', 'lineart', 'animated'
  timeRange: 'month' // 'day', 'week', 'month', 'year'
});
```

## Common Use Cases

### 1. Batch Download with Metadata

```typescript
const results = await client.downloadImages({
  source: 'google.com',
  query: 'modern architecture',
  count: 20,
  includeMetadata: true
});

// Access metadata
results.images.forEach(image => {
  console.log(`Title: ${image.metadata.title}`);
  console.log(`Source: ${image.metadata.sourceUrl}`);
  console.log(`Dimensions: ${image.metadata.width}x${image.metadata.height}`);
});
```

### 2. Multiple Queries

```typescript
const queries = ['sunset', 'sunrise', 'golden hour'];

for (const query of queries) {
  const results = await client.downloadImages({
    source: 'google.com',
    query,
    count: 5,
    outputDir: `./images/${query}`
  });
  console.log(`Downloaded ${results.images.length} images for "${query}"`);
}
```

### 3. Custom Event Handling

```typescript
client.on('download:start', (event) => {
  console.log(`Starting download: ${event.url}`);
});

client.on('download:progress', (event) => {
  console.log(`Progress: ${event.percent}%`);
});

client.on('download:complete', (event) => {
  console.log(`Completed: ${event.filename}`);
});
```

## Troubleshooting

### Extension Not Connected
- Ensure the Chrome extension is installed and enabled
- Check that the WebSocket server is running
- Verify no firewall is blocking port 3000

### Downloads Failing
- Check your internet connection
- Ensure Chrome has download permissions
- Verify the download directory exists and is writable

### Server Connection Issues
```typescript
// Enable debug mode for more information
const client = new SemantestClient({
  serverUrl: 'http://localhost:3000',
  debug: true
});

// Listen for connection events
client.on('connect', () => console.log('Connected'));
client.on('disconnect', () => console.log('Disconnected'));
client.on('error', (error) => console.error('Error:', error));
```

## What's Next?

Now that you have Semantest running:

- 📚 Read the [Architecture Overview](/docs/architecture/introduction) to understand how it works
- 🧪 Explore [Testing Guide](/docs/developer-guide/testing) to write tests
- 🔌 Learn about [Custom Domains](/docs/components/domains/custom) to add new websites
- 🚀 Check out [Deployment Guide](/docs/deployment/docker) for production setup

## Need Help?

- 💬 Join our [Discord community](https://discord.gg/semantest)
- 🐛 Report issues on [GitHub](https://github.com/semantest/workspace/issues)
- 📧 Email us at support@semantest.com

Happy automating! 🎉