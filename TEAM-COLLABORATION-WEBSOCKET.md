# 🤝 TEAM COLLABORATION: WebSocket Implementation

## To: extension-dev
## From: architect/backend-support
## Date: 2025-07-22 23:15 UTC
## RE: WebSocket Help for v1.0.2 and Beyond

---

## 🎉 CONGRATULATIONS ON v1.0.2!

First, amazing work getting the extension working! rydnr confirmed it's functional, which is a huge milestone!

## 📋 WebSocket Analysis

I've reviewed the service-worker.js code and understand the WebSocket situation:

### Current State (Lines 753-789):
```javascript
initWebSocket() {
  console.log('🔌 Initializing server connection...');
  
  // For now, we'll use the test buttons to simulate server events
  // In production, you can implement:
  // 1. Long polling to a server endpoint
  // 2. Server-Sent Events (SSE)
  // 3. Native messaging with a local app that has WebSocket
  // 4. Periodic fetch to check for new tasks
  
  console.log('✅ Server connection ready (using test mode)');
}
```

### The Challenge:
Chrome Manifest V3 service workers have restrictions:
- Can't maintain persistent WebSocket connections
- Service worker sleeps after 30 seconds of inactivity
- WebSocket disconnects when worker sleeps

## 🚀 Solutions for REQ-002 Bulk Generation

### Option 1: Periodic Fetch (Recommended for v1.x)
```javascript
// Already partially implemented in checkServerTasks()
async checkServerTasks() {
  const response = await fetch('http://localhost:3003/tasks/pending');
  const tasks = await response.json();
  
  // Process image generation tasks
  for (const task of tasks) {
    if (task.type === 'bulkImageGeneration') {
      await this.processBulkImages(task);
    }
  }
  
  // Poll every 5 seconds
  setTimeout(() => this.checkServerTasks(), 5000);
}
```

**Pros**: Simple, reliable, works with Manifest V3
**Cons**: Not real-time, but fine for comic generation

### Option 2: Server-Sent Events (SSE)
```javascript
// One-way real-time from server to extension
const eventSource = new EventSource('http://localhost:3003/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'panelGenerationProgress') {
    updateProgress(data.completed, data.total);
  }
};

// SSE auto-reconnects on disconnect!
```

**Pros**: Real-time updates, auto-reconnect, simpler than WebSocket
**Cons**: One-way only (server → client)

### Option 3: Native Messaging (For v2.0)
```javascript
// Extension talks to local app that maintains WebSocket
const port = chrome.runtime.connectNative('com.semantest.bridge');

port.onMessage.addListener((msg) => {
  if (msg.type === 'websocketMessage') {
    handleWebSocketData(msg.data);
  }
});

// Local app handles persistent WebSocket connection
```

**Pros**: True bidirectional WebSocket
**Cons**: Requires separate native app installation

## 💡 My Recommendation

For REQ-002 (500 comic strips), start with **Option 1 (Periodic Fetch)**:
- It's already partially implemented
- Simple and reliable
- Good enough for progress updates
- No additional infrastructure needed

## 🤔 Questions for You

1. **Current Issues**: What specific WebSocket problems are you facing?
2. **Server Side**: Is the server at localhost:3003 already set up?
3. **Real-time Needs**: Do we need instant updates or is 5-second polling OK?
4. **Architecture Preference**: Simple now, or build for future scale?

## 🛠️ How I Can Help

1. **Backend Server**: Implement the server-side endpoints for any approach
2. **Protocol Design**: Define the message format for bulk operations
3. **Error Handling**: Robust retry logic and recovery
4. **Testing**: Create test harness for communication
5. **Documentation**: Clear guides for the chosen approach

## 📝 Proposed Event Structure for Bulk Generation

```javascript
// Request
{
  type: 'bulkGenerationRequested',
  payload: {
    batchId: 'batch-123',
    panels: [
      { id: 1, prompt: 'Hero enters cave' },
      { id: 2, prompt: 'Discovers artifact' },
      // ... up to 500
    ],
    options: {
      style: 'noir',
      parallel: 10
    }
  }
}

// Progress Update
{
  type: 'generationProgress',
  payload: {
    batchId: 'batch-123',
    completed: 45,
    total: 500,
    current: 'Panel 46: Monster appears',
    eta: '47 minutes remaining'
  }
}

// Completion
{
  type: 'panelCompleted',
  payload: {
    batchId: 'batch-123',
    panelId: 46,
    imageUrl: 'https://...',
    downloadPath: '~/Downloads/panel-46.png'
  }
}
```

## 🎯 Next Steps

1. **Choose Approach**: Which option fits our immediate needs?
2. **Define Protocol**: Finalize message formats
3. **Implement Together**: I'll handle server, you handle extension
4. **Test with rydnr**: Real-world validation!

## 💬 Let's Talk!

I'm here to help make the WebSocket (or alternative) implementation smooth and successful. The fact that v1.0.2 is already working gives us a solid foundation to build on!

What are your thoughts on the approach? What specific help do you need?

---

*P.S. - Amazing work on v1.0.2! Let's make REQ-002 even better! 🚀*