# Debug Steps for Extension

## 1. Test Simple WebSocket Message

Run this simpler test that just sends a message:
```bash
./test-image-simple.sh "Test sunset image"
```

This script:
- Connects to ws://localhost:3004
- Sends the image request event
- Doesn't try to start any servers

## 2. Check Extension Popup

After running the test:
1. Click the Semantest extension icon
2. Look for a message with type: `semantest/custom/image/request/received`
3. If messages disappeared, try clicking "Reconnect" button

## 3. Check Service Worker Console

1. Go to chrome://extensions/
2. Find Semantest extension
3. Click "service worker" link
4. Look for these logs:
   ```
   📨 WebSocket message: {type: "event", payload: {...}}
   🎨 Handling image request: {prompt: "Test sunset image"}
   ```

## 4. Check ChatGPT Tab

1. Go to ChatGPT tab
2. Press F12 for console
3. Look for:
   ```
   🚀 ChatGPT Addon initializing...
   📨 ChatGPT Addon received message
   🎨 ChatGPT Addon: Received image generation request
   ```

## 5. If Messages Are Clearing

The popup might be losing messages when the WebSocket reconnects. Try:

1. Open popup and keep it open
2. Run the test script
3. Watch for messages appearing

## 6. Manual Test in Service Worker Console

If nothing else works, try this in the service worker console:

```javascript
// Check WebSocket status
wsHandler.getStatus()

// Send test message manually
wsHandler.handleImageRequest({
  prompt: "Test manual prompt",
  requestId: "test-123"
})
```

## Troubleshooting

### "No ChatGPT tabs found"
- Make sure you have a ChatGPT tab open
- The URL should be https://chat.openai.com or https://chatgpt.com

### Messages not appearing in popup
- The service worker might be restarting
- Try keeping the popup open while testing
- Check if "Clear" button was accidentally clicked

### WebSocket disconnecting
- The server might be restarting
- Check server logs
- Make sure only ONE server is running on port 3004