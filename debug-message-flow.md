# Debug Message Flow

## Current Issue
The service worker is trying to send messages to the content script, but getting "Could not establish connection. Receiving end does not exist."

## Message Flow Architecture
1. WebSocket Server → Service Worker ✅ (Working)
2. Service Worker → Content Script ❌ (Failing)
3. Content Script → MAIN world addon
4. Addon processes the request

## Quick Debug in Service Worker Console

### 1. Check if content script is injected:
```javascript
chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
  if (tabs[0]) {
    try {
      const response = await chrome.tabs.sendMessage(tabs[0].id, {type: 'ping'});
      console.log('Content script responded:', response);
    } catch (e) {
      console.error('Content script not found:', e);
    }
  }
});
```

### 2. Check injection status:
```javascript
extensionState.injectedTabs
```

### 3. Force re-injection with bridge:
```javascript
chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
  if (tabs[0]) {
    // Clear injection tracking
    extensionState.injectedTabs.delete(tabs[0].id);
    
    // Force re-inject
    await loadAddonDynamically(tabs[0].id, tabs[0].url, true);
  }
});
```

## Manual Test in ChatGPT Tab Console

Check if the bridge is listening:
```javascript
// This should trigger the bridge
window.dispatchEvent(new CustomEvent('semantest-response', {
  detail: { type: 'test', message: 'Bridge test' }
}));
```

Check if addon components exist:
```javascript
console.log({
  bridge: typeof window.semantestBridge,
  queue: typeof window.imageGenerationQueue,
  generator: typeof window.chatGPTImageGenerator,
  controller: typeof window.chatGPTController
});
```

## The Problem

The error suggests that when `chrome.tabs.sendMessage` is called, there's no content script listening. This could be because:

1. The bridge is injected in ISOLATED world but not properly connected
2. The tab ID is wrong
3. The content script crashed or was unloaded
4. The injection happened but the listener wasn't set up

## Solution

Try this in the service worker console to manually test the full flow:
```javascript
// Get the active tab
chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
  if (tabs[0] && tabs[0].url.includes('chat.openai.com')) {
    const tabId = tabs[0].id;
    console.log('Testing with tab:', tabId);
    
    // Try to send a test message
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'websocket:message',
        payload: {
          type: 'semantest/custom/image/download/requested',
          payload: {
            prompt: 'manual test: red apple',
            metadata: { requestId: 'manual-test' }
          }
        }
      });
      console.log('Success! Response:', response);
    } catch (e) {
      console.error('Failed:', e);
      console.log('Trying to re-inject...');
      
      // Force re-injection
      extensionState.injectedTabs.delete(tabId);
      await loadAddonDynamically(tabId, tabs[0].url, true);
      
      console.log('Re-injection complete. Try the test again.');
    }
  }
});
```