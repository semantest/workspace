# Semantest-Powered Extensions Architecture

## Overview

Due to Content Security Policy (CSP) restrictions on sites like ChatGPT, true dynamic addon loading from external servers is not possible. This architecture describes how to create separate Semantest-powered browser extensions for each restrictive platform.

## Architecture Components

### 1. Core Semantest Library
A shared library containing the core Semantest functionality that all extensions will use.

```
semantest-core/
├── package.json
├── src/
│   ├── websocket/
│   │   ├── client.js        # WebSocket connection management
│   │   └── message-handler.js
│   ├── bridge/
│   │   ├── isolated-world.js
│   │   └── main-world.js
│   ├── events/
│   │   ├── dispatcher.js
│   │   └── listener.js
│   └── utils/
│       ├── logger.js
│       └── state-manager.js
└── dist/
    └── semantest-core.min.js
```

### 2. Extension Template
A boilerplate for creating new Semantest-powered extensions.

```
semantest-extension-template/
├── manifest.json
├── package.json
├── webpack.config.js
├── src/
│   ├── background/
│   │   └── service-worker.js
│   ├── content/
│   │   ├── bridge.js
│   │   └── injector.js
│   ├── popup/
│   │   ├── popup.html
│   │   └── popup.js
│   └── addon/
│       ├── index.js         # Platform-specific code
│       ├── controller.js
│       └── manifest.json
└── assets/
    └── icons/
```

### 3. Platform-Specific Extensions

#### ChatGPT Extension
```
semantest-chatgpt/
├── manifest.json
├── src/
│   └── addon/
│       ├── state-detector.js
│       ├── controller.js
│       ├── button-clicker.js
│       ├── direct-send.js
│       ├── image-generator.js
│       ├── image-downloader.js
│       ├── queue-manager.js
│       └── index.js
```

#### Claude Extension
```
semantest-claude/
├── manifest.json
├── src/
│   └── addon/
│       ├── state-detector.js
│       ├── controller.js
│       ├── artifact-handler.js
│       └── index.js
```

## Key Design Decisions

### 1. Bundling Strategy
- Each extension bundles its addon code directly
- No dynamic loading required, avoiding CSP issues
- Smaller, focused extensions for each platform

### 2. Shared Core
- Common functionality in `semantest-core` npm package
- Extensions depend on core as a library
- Reduces code duplication and maintenance

### 3. Communication Architecture
```
WebSocket Server ←→ Service Worker ←→ Content Script ←→ Page Script
                                         (ISOLATED)      (MAIN)
```

### 4. Build Process
```bash
# Build core library
cd semantest-core
npm run build

# Build specific extension
cd semantest-chatgpt
npm install @semantest/core
npm run build
```

## Extension Template Structure

### manifest.json (Template)
```json
{
  "manifest_version": 3,
  "name": "Semantest for [Platform]",
  "version": "1.0.0",
  "description": "Semantest-powered automation for [Platform]",
  "background": {
    "service_worker": "dist/background.js"
  },
  "content_scripts": [
    {
      "matches": ["[platform-urls]"],
      "js": ["dist/content.js"],
      "run_at": "document_start"
    }
  ],
  "action": {
    "default_popup": "popup.html"
  },
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "[platform-urls]",
    "ws://localhost:3004"
  ]
}
```

### Service Worker Template
```javascript
import { WebSocketClient, MessageHandler } from '@semantest/core';

class PlatformServiceWorker {
  constructor() {
    this.ws = new WebSocketClient('ws://localhost:3004');
    this.messageHandler = new MessageHandler();
    this.setupListeners();
  }

  setupListeners() {
    // Platform-specific message handling
    this.messageHandler.on('platform-specific-event', async (payload) => {
      // Handle platform-specific events
    });
  }
}

new PlatformServiceWorker();
```

### Content Script Template
```javascript
import { BridgeIsolated } from '@semantest/core';
import { PlatformAddon } from './addon';

class PlatformContentScript {
  constructor() {
    this.bridge = new BridgeIsolated();
    this.addon = new PlatformAddon();
    this.inject();
  }

  inject() {
    // Inject addon into MAIN world
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('dist/addon.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  }
}

new PlatformContentScript();
```

## Development Workflow

### 1. Creating a New Extension
```bash
# Clone template
git clone https://github.com/semantest/extension-template semantest-[platform]
cd semantest-[platform]

# Install dependencies
npm install

# Configure for platform
npm run configure -- --platform=[platform] --url=[platform-url]
```

### 2. Development
```bash
# Watch mode for development
npm run dev

# Build for production
npm run build

# Package for distribution
npm run package
```

### 3. Testing
```bash
# Unit tests
npm test

# E2E tests with extension loaded
npm run test:e2e
```

## Migration Guide

### From Monolithic Extension
1. Extract platform-specific code from `src/addons/[platform]/`
2. Create new extension using template
3. Copy addon files to new extension
4. Update manifest.json with platform URLs
5. Test thoroughly

### WebSocket Events
No changes needed - events remain the same:
- `semantest/custom/image/download/requested`
- `semantest/custom/text/send/requested`
- Platform-specific events

## Benefits

### 1. Security
- No dynamic code execution
- Complies with strictest CSP policies
- Smaller attack surface

### 2. Performance
- Smaller extension size
- Platform-specific optimizations
- No unused code

### 3. Maintenance
- Independent release cycles
- Platform-specific bug fixes
- Easier to test

### 4. User Experience
- Clear purpose for each extension
- Platform-specific features
- Better store descriptions

## Distribution

### Chrome Web Store
```
semantest-chatgpt/
├── dist/              # Bundled extension
├── store-assets/
│   ├── screenshots/
│   ├── icon-128.png
│   └── description.md
└── chrome-web-store.zip
```

### Firefox Add-ons
```
semantest-chatgpt/
├── dist/              # Bundled extension
├── firefox-assets/
└── firefox-addon.xpi
```

## Future Enhancements

### 1. Extension Manager
A companion app to manage multiple Semantest extensions:
- Install/uninstall extensions
- Configure WebSocket server
- Monitor active extensions
- Unified settings

### 2. Plugin System
Allow third-party developers to create Semantest addons:
- Plugin API
- Developer documentation
- Plugin marketplace

### 3. Cloud Sync
Sync settings and data across extensions:
- User preferences
- Automation scripts
- Cross-platform workflows