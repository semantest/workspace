# ChatGPT Image Integration Test Plan

## 🎯 Test Objective
End-to-end testing of the image generation workflow:
1. Send `ImageRequestReceived` event with prompt
2. Process through WebSocket server
3. Generate/download image
4. Respond with `ImageDownloaded` event containing file path

## 📋 Test Components Created

### 1. Test Client (`test-image-flow.js`)
```javascript
// Sends ImageRequestReceived event
const testEvent = {
  type: 'image:request/received',
  payload: {
    project: 'test-project',
    chat: 'test-chat-123',
    prompt: 'A futuristic robot coding at a holographic terminal'
  }
};
```

### 2. Server Handler
```javascript
// Handles image generation and download
wss.on('connection', (ws) => {
  ws.on('message', async (data) => {
    if (message.type === 'image:request/received') {
      // 1. Generate/download image
      // 2. Save to ~/Downloads
      // 3. Send ImageDownloaded event
    }
  });
});
```

### 3. Response Event
```javascript
// ImageDownloaded event format
{
  type: 'image:downloaded',
  payload: {
    project: 'test-project',
    chat: 'test-chat-123',
    prompt: 'A futuristic robot coding at a holographic terminal',
    imagePath: '/home/user/Downloads/robot_coding_1234567890.png',
    fileName: 'robot_coding_1234567890.png',
    timestamp: '2024-01-22T08:45:00.000Z'
  }
}
```

## 🚀 Running the Test

### Option 1: Using the Simple Test Script
```bash
# From the SDK directory
node test-image-flow.js
```

### Option 2: Using the TypeScript Test
```bash
# Compile and run
npx ts-node test-image-integration.ts
```

### Option 3: Manual Testing with Existing Server

1. **Start the WebSocket server**:
```bash
npm run dev:server
```

2. **Run test client**:
```javascript
// test-client.js
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'image:request/received',
    payload: {
      project: 'test-project',
      chat: 'test-chat-123',
      prompt: 'A futuristic robot coding at a holographic terminal'
    }
  }));
});

ws.on('message', (data) => {
  console.log('Received:', JSON.parse(data));
});
```

## 📦 Implementation Details

### Event Types (Already Implemented)
```typescript
// contracts/src/custom-events.ts
export const ImageEventTypes = {
  REQUEST_RECEIVED: createCustomEventType('image', 'request/received'),
  DOWNLOADED: createCustomEventType('image', 'downloaded'),
} as const;
```

### Image Upload Component (Already Created)
```typescript
// client/src/react/ImageUpload.tsx
- Drag-and-drop support
- File validation
- Progress tracking
- Sends ImageRequestReceived event
```

### Server Integration Points
```typescript
// server/src/server.ts
- WebSocket message handling
- Event routing
- Security validation
- Rate limiting (100/sec)
```

## 🧪 Test Scenarios

### Success Case
1. Client sends `ImageRequestReceived` with valid prompt
2. Server processes request
3. Image generated/downloaded to ~/Downloads
4. Server sends `ImageDownloaded` with file path
5. Client receives event and verifies file exists

### Error Cases
1. Invalid prompt → Error response
2. Download failure → Error response
3. File system error → Error response
4. Rate limit exceeded → 429 response

## 📊 Expected Output

```
🚀 ChatGPT Image Integration Test
==================================

1️⃣ Starting WebSocket server...
✅ Server listening on port 8080

2️⃣ Creating test client...
✅ Client connected

3️⃣ Setting up event handlers...

4️⃣ Sending ImageRequestReceived event...
📤 Event: {
  type: 'image:request/received',
  payload: {
    project: 'test-project',
    chat: 'test-chat-123',
    prompt: 'A futuristic robot coding at a holographic terminal'
  }
}

⏳ Waiting for response...

📨 Server received: [event data]
🎨 Generating image for: "A futuristic robot coding at a holographic terminal"
📥 Downloading to: /home/user/Downloads/robot_coding_1234567890.png
📤 Sending ImageDownloaded event

📨 Client received: {
  type: 'image:downloaded',
  payload: {
    project: 'test-project',
    chat: 'test-chat-123',
    prompt: 'A futuristic robot coding at a holographic terminal',
    imagePath: '/home/user/Downloads/robot_coding_1234567890.png',
    fileName: 'robot_coding_1234567890.png',
    timestamp: '2024-01-22T08:45:00.000Z'
  }
}

🎉 SUCCESS! Image download completed
📍 Image saved to: /home/user/Downloads/robot_coding_1234567890.png
✅ File verified: 12345 bytes

✅ Test PASSED! End-to-end flow working correctly
=====================================
```

## 🔧 Integration with Production

### Backend Requirements
1. Replace placeholder image URL with actual image generation API
2. Add authentication for image generation service
3. Implement proper error handling and retries
4. Add image metadata storage

### Security Considerations
1. Validate prompt content (no malicious input)
2. Rate limit image generation requests
3. Authenticate WebSocket connections
4. Sanitize file names
5. Limit file size

### Monitoring
1. Log all image generation requests
2. Track success/failure rates
3. Monitor file system usage
4. Alert on errors

## ✅ Current Status

- ✅ Event types defined
- ✅ WebSocket server ready
- ✅ Security integration complete
- ✅ Rate limiting active
- ✅ Test scripts created
- ✅ UI component ready
- 🔄 Ready for production image API integration

The system is fully prepared for end-to-end testing. The test scripts simulate the complete flow and can be easily adapted to use a real image generation service.