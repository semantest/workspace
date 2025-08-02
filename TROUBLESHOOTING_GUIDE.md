# Troubleshooting Guide - Semantest Extension

## Common Issues and Solutions

### 1. "Could not establish connection. Receiving end does not exist"

**Cause**: The service worker tries to send a message to a tab that doesn't have the content script loaded yet.

**Solutions**:
1. **Reload the ChatGPT tab** - This forces the addon to be re-injected
2. **Wait a few seconds** - The improved error handling will retry with proper delays
3. **Check the service worker console** - Look for "Bridge verified active" messages

### 2. CSP (Content Security Policy) Errors

**Error**: "Refused to execute inline script because it violates the following Content Security Policy directive"

**Status**: These are **cosmetic errors** and don't affect functionality. ChatGPT has strict CSP rules, but the addon still works.

### 3. Bridge Not Working

**Symptoms**: Messages not reaching the addon

**Debug Steps**:
1. Open ChatGPT tab console (F12)
2. Run: `window.chatGPTAddonInjected`
   - Should return `true`
3. Run: `typeof window.semantestBridge`
   - Should return `"object"`
4. Check for "MAIN world bridge helper ready" message

### 4. WebSocket Connection Issues

**Check WebSocket Status**:
```bash
# Check if custom forwarder is running
lsof -i :3004

# Check if addon server is running
lsof -i :3003
```

**Fix**:
1. Kill existing processes: `lsof -ti:3004 | xargs kill -9`
2. Restart forwarder: `./start-custom-forwarder.sh`

### 5. Addon Not Loading

**Debug in Service Worker Console**:
```javascript
// Check if addon server is accessible
fetch('http://localhost:3003/api/addons').then(r => r.json()).then(console.log)

// Manually inject addon
chrome.tabs.query({url: '*://chat.openai.com/*'}, tabs => {
  if (tabs[0]) {
    loadAddonDynamically(tabs[0].id, tabs[0].url, true);
  }
});
```

### 6. Image Generation Not Starting

**Check Each Component**:
1. **WebSocket Message Received?**
   - Custom forwarder console should show forwarding
   
2. **Service Worker Processing?**
   - Should show "🎯 Image download request detected!"
   
3. **Bridge Forwarding?**
   - ChatGPT console: "Bridge helper received message"
   
4. **Addon Processing?**
   - Should show image generation logs

### 7. Popup Shows Error

**Error**: "Could not establish connection" in popup

**Cause**: This is a timing issue when the popup tries to query tabs before they're ready.

**Fix**: This doesn't affect core functionality. Just close and reopen the popup.

## Quick Diagnostic Commands

### In Service Worker Console:
```javascript
// Check WebSocket status
extensionState.wsConnected

// Check injected tabs
extensionState.injectedTabs

// View recent messages
messageLogger.getMessages()

// Force reconnect WebSocket
wsHandler.connect()
```

### In ChatGPT Tab Console:
```javascript
// Check addon components
{
  addon: window.chatGPTAddonInjected,
  bridge: typeof window.semantestBridge,
  generator: typeof window.chatGPTImageGenerator,
  queue: typeof window.imageGenerationQueue
}
```

## Testing Without WebSocket

Use the direct test script:
1. Open service worker console
2. Copy contents of `test-chatgpt-direct.js`
3. Paste and run

This bypasses the WebSocket server and tests the addon directly.

## Logs to Monitor

### 1. Custom Forwarder
- ✅ Client connected
- 🔄 Forwarding semantest/custom/image/download/requested

### 2. Service Worker
- ✅ WebSocket connected
- ✅ Bridge verified active
- 🎯 Image download request detected!

### 3. ChatGPT Tab
- ✅ ChatGPT addon injected dynamically
- 🌉 MAIN world bridge helper ready
- 🌉 Bridge helper received message

## Performance Tips

1. **Keep ChatGPT tab active** when sending requests
2. **Don't reload extension** while processing
3. **Wait for "Active Addon: ChatGPT"** in popup before testing
4. **Use one ChatGPT tab** to avoid confusion

## Emergency Reset

If everything is broken:
1. Stop all servers: `pkill -f node`
2. Reload extension in Chrome
3. Close all ChatGPT tabs
4. Start servers fresh
5. Open new ChatGPT tab
6. Wait 5 seconds before testing