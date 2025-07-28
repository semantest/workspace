# Semantest Extension Architecture

## Overview
The Semantest Extension follows a modular, event-driven architecture with clear separation between core functionality and domain-specific addons.

## Core Architecture Decisions

### 1. Addon Loading Strategy: Hybrid Approach
**Decision**: Manifest-based registration with event-driven activation

```typescript
// Addon Manifest Structure
{
  "addon_id": "chatgpt_addon",
  "version": "1.0.0",
  "domains": ["chat.openai.com"],
  "entry_point": "chatgpt/index.js",
  "permissions": ["activeTab"],
  "events": ["pageLoad", "domMutation"],
  "websocket_events": ["core:message", "addon:chatgpt:*"]
}
```

**Rationale**:
- Static metadata enables security validation
- Event-driven activation reduces memory footprint
- Clear permission boundaries per addon

### 2. Communication Architecture: Typed Message Bus

```typescript
// Core Message Bus Interface
interface MessageBus {
  // One-way communication
  emit<T>(event: string, data: T): void;
  on<T>(event: string, handler: (data: T) => void): void;
  
  // Request-response pattern
  request<T, R>(event: string, data: T): Promise<R>;
  
  // Event namespacing
  namespace(prefix: string): MessageBus;
}

// Usage Example
const bus = new MessageBus();

// Core emits to addons
bus.emit('core:websocket:connected', { url: 'ws://localhost:3004' });

// Addon emits to core
addonBus.emit('addon:image:download', {
  url: 'https://example.com/image.jpg',
  metadata: { source: 'google-images' }
});
```

### 3. Message Logging: Hybrid Storage Pattern

```typescript
class MessageLogger {
  private buffer: Message[] = [];
  private readonly BUFFER_SIZE = 100;
  private readonly PERSIST_INTERVAL = 5000;
  private readonly MAX_STORAGE_SIZE = 50;
  
  constructor() {
    // Restore from storage on init
    this.restore();
    
    // Periodic persistence
    setInterval(() => this.persist(), this.PERSIST_INTERVAL);
  }
  
  async log(message: Message) {
    this.buffer.push({
      ...message,
      timestamp: Date.now()
    });
    
    // Trigger immediate persist on buffer overflow
    if (this.buffer.length > this.BUFFER_SIZE) {
      await this.persist();
      this.buffer = this.buffer.slice(-this.BUFFER_SIZE / 2);
    }
  }
  
  async getMessages(limit = 50): Promise<Message[]> {
    return this.buffer.slice(-limit);
  }
  
  private async persist() {
    await chrome.storage.local.set({ 
      messages: this.buffer.slice(-this.MAX_STORAGE_SIZE),
      lastPersisted: Date.now()
    });
  }
  
  private async restore() {
    const { messages = [] } = await chrome.storage.local.get('messages');
    this.buffer = messages;
  }
}
```

### 4. WebSocket vs REST: Hybrid Approach

#### WebSocket (Port 3004)
Used for:
- Real-time event streaming
- Bidirectional addon ↔ server communication
- Live operation status updates
- Message log streaming

```typescript
// WebSocket Event Patterns
ws.on('core:connected', handler);
ws.on('addon:chatgpt:message', handler);
ws.on('system:error', handler);
```

#### REST API (Port 3000)
Used for:
- Image download requests (POST /api/downloads)
- Queue management (GET /api/queue/:id)
- Historical data (GET /api/messages?since=timestamp)
- Addon registry (GET /api/addons)

```typescript
// REST API Examples
POST /api/downloads
{
  "imageUrl": "https://...",
  "addonId": "google-images",
  "quality": "high",
  "metadata": {}
}

GET /api/queue/status
Response: {
  "pending": 5,
  "processing": 2,
  "completed": 150
}
```

### 5. Addon Discovery & Injection

```typescript
class AddonManager {
  private addons: Map<string, AddonManifest> = new Map();
  
  async initialize() {
    // 1. Load all addon manifests
    const manifests = await this.loadManifests();
    
    // 2. Validate and register
    for (const manifest of manifests) {
      if (this.validateManifest(manifest)) {
        this.addons.set(manifest.addon_id, manifest);
      }
    }
    
    // 3. Setup domain matching
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate);
  }
  
  private handleTabUpdate = async (tabId: number, info: any, tab: Tab) => {
    if (info.status === 'complete' && tab.url) {
      const addon = this.findAddonForUrl(tab.url);
      if (addon) {
        await this.injectAddon(tabId, addon);
      }
    }
  }
  
  private async injectAddon(tabId: number, addon: AddonManifest) {
    // Inject addon with isolated context
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [addon.entry_point],
      world: 'ISOLATED'
    });
    
    // Establish message channel
    this.createAddonChannel(tabId, addon.addon_id);
  }
}
```

## Directory Structure

```
semantest-extension/
├── core/
│   ├── services/
│   │   ├── message-bus.ts         # Event communication system
│   │   ├── addon-manager.ts       # Addon lifecycle management
│   │   ├── websocket-client.ts    # WebSocket connection handler
│   │   └── message-logger.ts      # Message persistence service
│   ├── interfaces/
│   │   ├── addon.interface.ts     # Addon contracts
│   │   └── message.interface.ts   # Message types
│   └── background.ts              # Service worker entry
├── addons/
│   ├── chatgpt/
│   │   ├── manifest.json          # Addon metadata
│   │   ├── index.ts              # Entry point
│   │   └── services/             # Addon-specific services
│   └── google-images/
│       ├── manifest.json
│       ├── index.ts
│       └── services/
├── popup/
│   ├── components/
│   │   ├── MessageList.tsx       # Message display
│   │   └── MessageFilter.tsx     # Filtering controls
│   └── index.tsx                 # Popup entry
└── manifest.json                 # Extension manifest
```

## Event Flow Architecture

### Image Download Flow
```
1. User Action (in addon content script)
   ↓
2. Addon emits: 'addon:image:downloadRequested'
   ↓
3. Core receives and validates
   ↓
4. Core REST API: POST /api/downloads
   ↓
5. Server queues download
   ↓
6. Server WebSocket: 'download:queued'
   ↓
7. Core forwards to addon
   ↓
8. Addon updates UI
```

### Message Logging Flow
```
1. Any event occurs
   ↓
2. Core MessageLogger.log()
   ↓
3. In-memory buffer update
   ↓
4. Conditional persistence
   ↓
5. Popup queries messages
   ↓
6. Display in MessageList
```

## Security Considerations

1. **Addon Isolation**: Each addon runs in isolated context
2. **Permission Scoping**: Addons declare required permissions
3. **Event Validation**: All events validated before processing
4. **CSP Compliance**: Strict Content Security Policy
5. **Secure Communication**: HTTPS/WSS in production

## Performance Optimization

1. **Lazy Loading**: Addons loaded only when needed
2. **Message Buffering**: Batch operations to reduce overhead
3. **Efficient Storage**: Circular buffer with size limits
4. **WebSocket Reconnection**: Exponential backoff strategy
5. **Memory Management**: Automatic cleanup of unused addons

## Next Steps

1. Implement core MessageBus service
2. Create AddonManager with manifest validation
3. Refactor popup to message viewer
4. Extract ChatGPT-specific code to addon
5. Setup WebSocket event routing
6. Implement REST API endpoints