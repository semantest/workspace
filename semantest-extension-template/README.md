# Semantest Extension Template

Template for creating Semantest-powered browser extensions for specific platforms.

## Quick Start

1. Clone this template:
```bash
git clone https://github.com/semantest/extension-template semantest-yourplatform
cd semantest-yourplatform
```

2. Configure for your platform:
```bash
npm run configure -- --platform=yourplatform --url=https://yourplatform.com
```

3. Install dependencies:
```bash
npm install
```

4. Start development:
```bash
npm run dev
```

## Project Structure

```
semantest-extension-template/
├── manifest.json          # Extension manifest (update for your platform)
├── webpack.config.js      # Build configuration
├── src/
│   ├── background/        # Service worker
│   │   └── service-worker.js
│   ├── content/           # Content scripts
│   │   └── content-script.js
│   ├── addon/             # Platform-specific code
│   │   ├── index.js       # Main addon entry
│   │   └── manifest.json  # Addon metadata
│   └── popup/             # Extension popup
│       ├── popup.html
│       ├── popup.css
│       └── popup.js
└── assets/                # Icons and images
```

## Customization Guide

### 1. Update manifest.json

Replace placeholders with your platform details:

```json
{
  "name": "Semantest for YourPlatform",
  "description": "AI-powered automation for YourPlatform",
  "host_permissions": [
    "https://yourplatform.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://yourplatform.com/*"]
    }
  ]
}
```

### 2. Implement Platform-Specific Code

Create your addon in `src/addon/`:

```javascript
// src/addon/index.js
class YourPlatformAddon {
  constructor() {
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('semantest-message', (event) => {
      // Handle messages from extension
    });
  }
}
```

### 3. Customize UI Detection

Update `src/addon/state-detector.js`:

```javascript
export function detectState() {
  return {
    isReady: !!document.querySelector('.your-ready-selector'),
    isProcessing: !!document.querySelector('.your-processing-selector')
  };
}
```

### 4. Handle Platform Events

Implement event handlers for your platform:

```javascript
// Handle platform-specific events
handlePlatformEvent(event) {
  switch(event.type) {
    case 'your-platform/action':
      // Handle action
      break;
  }
}
```

## Building

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Package for Store
```bash
npm run package
```

## Testing

### Unit Tests
```bash
npm test
```

### Manual Testing
1. Load unpacked extension from `dist/`
2. Navigate to your platform
3. Test all features

## WebSocket Events

Standard Semantest events your extension should handle:

```javascript
// Incoming events
{
  "type": "semantest/custom/text/send/requested",
  "payload": { "text": "..." }
}

// Outgoing events
{
  "type": "addon:response",
  "success": true,
  "data": { /* ... */ }
}
```

## Best Practices

1. **Error Handling**: Always wrap operations in try-catch
2. **Logging**: Use the Logger from @semantest/core
3. **State Management**: Use StateManager for consistency
4. **Communication**: Use the bridge for all cross-world messaging
5. **Performance**: Minimize DOM queries and observers

## Common Patterns

### Message Forwarding
```javascript
// From service worker to addon
chrome.tabs.sendMessage(tabId, {
  type: 'websocket:message',
  payload: wsMessage
});

// From addon to service worker
window.semantestBridge.sendToExtension({
  type: 'addon:response',
  data: responseData
});
```

### State Detection
```javascript
const state = {
  isReady: checkIfReady(),
  isProcessing: checkIfProcessing(),
  canInteract: checkIfCanInteract()
};
```

### Queue Management
```javascript
class TaskQueue {
  add(task) { /* ... */ }
  process() { /* ... */ }
  canProcess() { /* ... */ }
}
```

## Publishing

1. Update version in `manifest.json` and `package.json`
2. Build production bundle: `npm run build`
3. Create package: `npm run package`
4. Submit to Chrome Web Store

## Support

- [Documentation](https://github.com/semantest/workspace)
- [Discord Community](https://discord.gg/semantest)
- [Issue Tracker](https://github.com/semantest/extension-template/issues)