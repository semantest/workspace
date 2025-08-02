# Debugging Dynamic Addon - Current Status

## What's Working ✅
- Addon dev server is serving the bundle
- Extension loads and shows "Active Addon: ChatGPT"
- Bridge and addon are injected into ChatGPT
- WebSocket server receives the image generation events

## What's Not Working ❌
- WebSocket messages aren't reaching the addon
- The server shows "Unknown event type" (but this is just a log, not an error)

## Debug Steps

### 1. Restart the Addon Server
The bundle now includes debug logging. Restart the addon server:
```bash
# Kill the current server (Ctrl+C)
# Start it again
cd nodejs.server
./run-addon-server.sh
```

### 2. Reload Everything
1. Go to chrome://extensions/
2. Click the refresh icon on Semantest
3. Close all ChatGPT tabs
4. Open a fresh ChatGPT tab
5. Open DevTools Console (F12)

### 3. Look for Debug Messages
You should see:
```
🚀 Semantest Service Worker (Dynamic V2) starting...
💉 Loading addon dynamically for tab...
📦 Loaded bundle (xxxxx bytes)
🌉 ChatGPT Bridge loaded
🌉 MAIN world bridge helper ready
✅ ChatGPT addon injected dynamically
🔍 Debug listener initializing...
🔍 Debug listener ready
🔍 Addon components check:
  - imageGenerationQueue: object
  - chatGPTImageGenerator: object
  - semantestBridge: object
```

### 4. Test the Bridge
Run the test script:
```bash
./test-bridge.sh
```

Watch the ChatGPT console for:
```
🔍 semantest-message received: {type: "websocket:message", ...}
🎯 Image download request detected!
🎯 Prompt: test watercolor painting
```

## If Messages Aren't Showing

This means the bridge isn't forwarding messages. Possible causes:

1. **Tab ID mismatch**: The service worker might be sending to wrong tab
2. **Bridge not connected**: The bridge script didn't load properly
3. **Timing issue**: Message sent before addon is ready

## Quick Test in Console

While on the ChatGPT tab, paste this in the console to test the addon directly:
```javascript
// Test if addon is listening
window.dispatchEvent(new CustomEvent('semantest-message', {
  detail: {
    type: 'websocket:message',
    payload: {
      type: 'semantest/custom/image/download/requested',
      payload: {
        prompt: 'console test: beautiful sunset',
        metadata: {
          requestId: 'test-123',
          timestamp: Date.now()
        }
      }
    }
  }
}));
```

If this triggers the addon (you'll see debug messages), then the issue is with the service worker forwarding.

## Next Steps

After running these tests, let me know:
1. Which debug messages you see
2. Whether the console test works
3. Any errors in the console

This will help pinpoint exactly where the communication is breaking down.