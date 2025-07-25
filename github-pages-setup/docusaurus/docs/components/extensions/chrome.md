---
id: chrome
title: Chrome Extension
sidebar_label: Chrome Extension
---

# Chrome Extension

The Semantest Chrome Extension is the core component that enables browser automation through semantic commands. It acts as the bridge between your automation scripts and the web pages you want to interact with.

## Overview

The Chrome Extension provides:
- 🌐 **Content Script Injection** - Interacts with web pages
- 🔌 **WebSocket Communication** - Real-time connection to server
- 🎯 **Semantic Understanding** - Interprets intent-based commands
- 📸 **Visual Feedback** - Shows automation progress
- 🔒 **Secure Execution** - Sandboxed and permission-controlled

## Installation

### From Chrome Web Store (Recommended)

1. Visit the [Semantest Extension](https://chrome.google.com/webstore/detail/semantest) page
2. Click "Add to Chrome"
3. Accept the required permissions

### From Source (Development)

```bash
# Clone the repository
git clone https://github.com/semantest/extension.chrome
cd extension.chrome

# Install dependencies
npm install

# Build the extension
npm run build

# For development with hot reload
npm run dev
```

Load in Chrome:
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

## Architecture

### Component Structure

```
extension.chrome/
├── src/
│   ├── background/       # Service worker
│   ├── content/         # Content scripts
│   ├── popup/          # Extension popup UI
│   ├── options/        # Options page
│   └── shared/         # Shared utilities
├── manifest.json       # Extension manifest
└── webpack.config.js   # Build configuration
```

### Key Components

#### 1. Service Worker (Background)
Manages the extension lifecycle and coordinates communication:

```typescript
// background/index.ts
chrome.runtime.onInstalled.addListener(() => {
  console.log('Semantest extension installed');
  
  // Initialize WebSocket connection
  websocketManager.connect();
  
  // Set up message listeners
  messageHandler.initialize();
});
```

#### 2. Content Scripts
Injected into web pages to perform automation:

```typescript
// content/injector.ts
export class ContentInjector {
  async executeCommand(command: SemanticCommand) {
    const element = await this.findElement(command.target);
    await this.performAction(element, command.action);
  }
}
```

#### 3. WebSocket Manager
Maintains real-time connection with the server:

```typescript
// shared/websocket.ts
export class WebSocketManager {
  private socket: Socket;
  
  connect() {
    this.socket = io('http://localhost:3000', {
      transports: ['websocket'],
      auth: { extension: true }
    });
  }
}
```

## Permissions

The extension requires these permissions:

### Required Permissions
- **`activeTab`** - Access to the current tab
- **`storage`** - Store configuration and state
- **`webNavigation`** - Navigate and monitor page loads

### Optional Permissions
- **`downloads`** - Save files (for image downloads)
- **`clipboardWrite`** - Copy data to clipboard
- **`notifications`** - Show desktop notifications

### Host Permissions
Dynamically requested based on domains you automate.

## Configuration

### Extension Options

Access via the extension icon → Options:

```javascript
{
  "serverUrl": "http://localhost:3000",
  "debugMode": false,
  "visualFeedback": true,
  "autoConnect": true,
  "timeout": 30000
}
```

### Environment-Specific Settings

```typescript
// config/environments.ts
export const config = {
  development: {
    serverUrl: 'http://localhost:3000',
    debug: true
  },
  production: {
    serverUrl: 'https://api.semantest.com',
    debug: false
  }
};
```

## Usage

### Basic Automation

The extension listens for commands from the WebSocket server:

```typescript
// Example command structure
{
  type: 'DOWNLOAD_IMAGE',
  target: {
    selector: 'img',
    index: 0,
    attributes: {
      alt: 'contains:sunset'
    }
  },
  options: {
    quality: 'high',
    format: 'jpeg'
  }
}
```

### Event Flow

1. **Client** sends command to server
2. **Server** validates and forwards to extension
3. **Extension** executes on the active tab
4. **Results** sent back through the same chain

### Debugging

Enable debug mode in options to see detailed logs:

```javascript
// In DevTools console
chrome.storage.local.set({ debugMode: true });
```

View logs in:
- Extension service worker console
- Content script console (on web pages)
- Popup console (when popup is open)

## Security

### Content Security Policy

The extension enforces strict CSP:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'"
  }
}
```

### Message Validation

All messages are validated before execution:

```typescript
validateCommand(command: unknown): command is SemanticCommand {
  return commandSchema.safeParse(command).success;
}
```

### Sandboxing

Content scripts run in an isolated world, preventing access to page JavaScript.

## Development

### Building from Source

```bash
# Development build with source maps
npm run build:dev

# Production build (minified)
npm run build:prod

# Watch mode for development
npm run watch
```

### Testing

```bash
# Unit tests
npm test

# E2E tests with Puppeteer
npm run test:e2e

# Test coverage
npm run test:coverage
```

### Debugging Tips

1. **Extension Errors**: Check `chrome://extensions/` for errors
2. **Service Worker**: Inspect via extension details page
3. **Content Scripts**: Use page DevTools console
4. **Network**: Monitor WebSocket frames in Network tab

## API Reference

### Extension → Server Messages

```typescript
interface ExtensionMessage {
  type: 'READY' | 'RESULT' | 'ERROR' | 'PROGRESS';
  correlationId: string;
  data: any;
  timestamp: number;
}
```

### Server → Extension Commands

```typescript
interface SemanticCommand {
  id: string;
  type: CommandType;
  target: TargetDescriptor;
  action: ActionDescriptor;
  options?: CommandOptions;
  timeout?: number;
}
```

## Troubleshooting

### Extension Not Connecting
- Check server is running on correct port
- Verify no firewall blocking WebSocket
- Check extension permissions

### Commands Not Executing
- Ensure you're on a supported domain
- Check content script injection
- Verify command format

### Performance Issues
- Disable visual feedback for faster execution
- Increase timeout for slow pages
- Check Chrome performance profiler

## Contributing

See our [Contributing Guide](/docs/developer-guide/contributing) for:
- Development setup
- Code style guidelines
- Testing requirements
- Pull request process

## Resources

- [Extension API Docs](https://developer.chrome.com/docs/extensions/reference/)
- [WebSocket Protocol](/docs/api/websocket-protocol)
- [Command Reference](/docs/api/commands)
- [Examples](/docs/resources/examples)