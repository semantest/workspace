# 🔌 WebSocket Implementation Notes

## Current State (v1.0.2)
The extension is working WITHOUT direct WebSocket! Instead, it uses:
- Service worker message handling
- Chrome extension messaging APIs
- Content script injection

## Why WebSocket is Commented Out
Looking at lines 753-789 in service-worker.js:
```javascript
// For now, we'll use the test buttons to simulate server events
// In production, you can implement:
// 1. Long polling to a server endpoint
// 2. Server-Sent Events (SSE)
// 3. Native messaging with a local app that has WebSocket
// 4. Periodic fetch to check for new tasks
```

## The Challenge
Chrome extensions have restrictions on WebSocket connections:
- Manifest V3 service workers can't maintain persistent connections
- WebSocket would disconnect when service worker sleeps
- Need alternative approaches for real-time communication

## Solutions for REQ-002 Bulk Generation

### Option 1: Native Messaging (Recommended)
```javascript
// Extension connects to local app
chrome.runtime.connectNative('com.semantest.websocket_bridge');

// Local app maintains WebSocket to server
// Bridges messages between extension and server
```

### Option 2: Long Polling
```javascript
async checkForTasks() {
  const response = await fetch('http://localhost:3003/tasks/pending', {
    // Long timeout for server to hold connection
    signal: AbortSignal.timeout(30000)
  });
  
  if (response.ok) {
    const tasks = await response.json();
    // Process tasks
  }
  
  // Immediately poll again
  this.checkForTasks();
}
```

### Option 3: Server-Sent Events (SSE)
```javascript
const eventSource = new EventSource('http://localhost:3003/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  handleServerEvent(data);
};

// SSE auto-reconnects!
```

### Option 4: Periodic Fetch (Current Approach)
Already partially implemented in `checkServerTasks()` method

## For Bulk Generation Requirements
- Progress updates every ~5 seconds is fine
- Don't need true real-time for comic generation
- Focus on reliability over speed

## Recommendation
Start with Option 4 (Periodic Fetch) since it's:
1. Already partially implemented
2. Simple and reliable
3. Works with Manifest V3 restrictions
4. Good enough for v1.x

Move to Native Messaging for v2.0 when we need true real-time for multiple sites.

---
*Let's message extension-dev and coordinate on this!*