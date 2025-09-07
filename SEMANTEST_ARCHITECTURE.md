# SEMANTEST Architecture

## What is Semantest?

**Semantest** is an event-driven architecture that enables programmatic interaction with browser tabs through events. It is NOT ChatGPT-Buddy or any other system.

## Core Components

### 1. CLI (Command Line Interface)
- Sends events to the HTTP server
- Example: `semantest send ImageGenerationRequestedEvent --prompt "a cat" --output-path "/tmp/cat.png"`

### 2. HTTP Server (nodejs.server)
- Receives events from CLI via HTTP
- Forwards events to browser extension via WebSocket
- Handles responses and file downloads

### 3. WebSocket Connection
- Bidirectional communication between server and extension
- Event routing in both directions

### 4. Browser Extension (extension.chrome)
- Receives events from server
- Interacts with browser tabs (like ChatGPT)
- Detects page states (idle/busy)
- Sends response events back to server

### 5. Browser Tab
- The actual web page (e.g., ChatGPT)
- Controlled via DOM manipulation and event simulation

## Event Flow

```
CLI → HTTP POST → Server
                    ↓
                WebSocket
                    ↓
              Extension
                    ↓
             Browser Tab
                    ↓
              Extension
                    ↓
                WebSocket
                    ↓
                Server
                    ↓
              Response/File
```

## Key Events

### ImageGenerationRequestedEvent
```json
{
  "type": "ImageGenerationRequestedEvent",
  "payload": {
    "domain": "chatgpt.com",
    "prompt": "a beautiful sunset",
    "outputPath": "/home/user/sunset.png",
    "correlationId": "uuid-here"
  }
}
```

### ChatGPTStateEvent
```json
{
  "type": "ChatGPTStateEvent",
  "payload": {
    "domain": "chatgpt.com",
    "state": "idle|busy",
    "canSendMessage": true|false,
    "correlationId": "uuid-here"
  }
}
```

### ImageGeneratedEvent
```json
{
  "type": "ImageGeneratedEvent",
  "payload": {
    "domain": "chatgpt.com",
    "imageUrl": "https://...",
    "correlationId": "uuid-here"
  }
}
```

## Domain-Based Tab Routing

**CRITICAL**: All events MUST include a `domain` field in the payload. This tells Semantest which browser tab to target.

### How It Works:
1. CLI includes `domain: "chatgpt.com"` in event payload
2. Server forwards event with domain intact
3. Extension finds tab with matching domain
4. Event is sent to the correct tab

### Example Tab Finding Logic:
```javascript
// In extension background script
async function findTabByDomain(domain) {
  const tabs = await chrome.tabs.query({});
  return tabs.find(tab => {
    const url = new URL(tab.url);
    return url.hostname === domain || url.hostname === `www.${domain}`;
  });
}
```

## Implementation Priority

1. **Detect ChatGPT idle/busy state** (PRIMARY BOTTLENECK)
2. Establish WebSocket connection
3. Route events from CLI to extension
4. Handle ImageGenerationRequestedEvent
5. Download and save generated images

## NOT ChatGPT-Buddy

This is **Semantest**, a clean event-driven architecture. Any references to ChatGPT-Buddy should be ignored or corrected.