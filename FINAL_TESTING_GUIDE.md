# Final Testing Guide - Complete Image Generation Flow

## What's Fixed

1. ✅ Dynamic addon loading from REST server
2. ✅ WebSocket event forwarding via custom forwarder
3. ✅ ISOLATED/MAIN world communication via DOM mutations
4. ✅ Bridge properly forwards messages to addon

## Testing Steps

### 1. Start All Services

```bash
# Terminal 1: Addon development server
cd nodejs.server
./run-addon-server.sh
# Should show: Running on http://localhost:3003

# Terminal 2: Custom WebSocket forwarder
cd /home/chous/work/semantest
./start-custom-forwarder.sh
# Should show: Custom Event Forwarder started on ws://localhost:3004
```

### 2. Reload Extension

1. Go to chrome://extensions/
2. Click reload on Semantest Extension
3. Open the service worker console (click "service worker")
4. You should see WebSocket connection messages

### 3. Open ChatGPT

1. Navigate to https://chat.openai.com
2. Wait 2-3 seconds for addon to load
3. Check extension popup - should show "Active Addon: ChatGPT"

### 4. Verify Bridge Communication

In the ChatGPT tab console (F12), you should see:
- ✅ ChatGPT addon injected dynamically
- 🌉 MAIN world bridge helper ready
- Multiple addon component messages

### 5. Test Image Generation

```bash
./generate-image-async.sh "a majestic mountain at sunset"
```

### Expected Flow

1. **Custom Forwarder Console**:
   ```
   ✅ Client connected: client-xxx (extension)
   📨 Received from client-yyy: event
   📋 Event type: semantest/custom/image/download/requested
   🔄 Forwarding to 1 other clients
   ```

2. **Service Worker Console**:
   ```
   🔍 Processing WebSocket message: event
   🔍 Event type: semantest/custom/image/download/requested
   🎯 Image download request detected!
   📤 Forwarding to ChatGPT tab xxx
   ```

3. **ChatGPT Tab Console**:
   ```
   🌉 Bridge helper received message from ISOLATED world
   🌉 Bridge helper forwarding event to addon
   [Addon processes the event and starts image generation]
   ```

4. **ChatGPT Interface**:
   - The prompt should appear in the input field
   - Image generation should start automatically

## Troubleshooting

### CSP Errors
The "Refused to execute inline script" errors are expected and don't affect functionality. They occur because ChatGPT has strict Content Security Policy.

### No Active Tab Error
This happens when testing from service worker console. Always use the generate script or ensure a ChatGPT tab is active.

### Bridge Not Working
1. Check that bridge helper is loaded in MAIN world
2. Verify DOM mutations are being observed
3. Look for "Bridge helper received message" logs

### Addon Not Responding
1. Check if all addon components are loaded
2. Verify window.chatGPTImageGenerator exists
3. Look for addon initialization messages

## Direct Testing (Bypass WebSocket)

If you want to test without the WebSocket flow:

1. Open service worker console
2. Run the test from `test-chatgpt-direct.js`
3. This sends events directly to the addon

## Success Criteria

✅ Extension loads and connects to WebSocket
✅ Addon is injected into ChatGPT
✅ Bridge forwards messages between worlds
✅ Image generation request triggers prompt input
✅ ChatGPT starts generating the image

## Known Issues

1. **Filename in payload**: The current flow doesn't include the final downloaded filename. This would need to be added in the image downloader callback.

2. **CSP warnings**: These are cosmetic and don't affect functionality.

3. **Popup errors**: The "Could not establish connection" error in popup is a timing issue and doesn't affect the main functionality.