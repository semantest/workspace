# CSP Solution - Direct File Injection

## The Problem
ChatGPT has extremely strict Content Security Policy (CSP) that blocks:
- ❌ Inline scripts (`<script>` tags)
- ❌ `eval()` function
- ❌ `new Function()` constructor
- ❌ Any form of dynamic code execution

This means we cannot load addon bundles dynamically from a REST server.

## The Solution
Inject addon files directly from the extension's file system using `chrome.scripting.executeScript` with file paths instead of code strings.

## Implementation

### Updated Service Worker
The service worker now injects files individually instead of trying to execute a bundle:

```javascript
// Inject each addon file in order
const addonFiles = [
  'src/addons/chatgpt/state-detector.js',
  'src/addons/chatgpt/controller.js',
  'src/addons/chatgpt/button-clicker.js',
  'src/addons/chatgpt/direct-send.js',
  'src/addons/chatgpt/image-generator.js',
  'src/addons/chatgpt/image-downloader.js',
  'src/addons/chatgpt/queue-manager.js',
  'src/addons/chatgpt/debug-listener.js',
  'src/addons/chatgpt/index.js'
];

for (const file of addonFiles) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [file],
    world: 'MAIN'
  });
}
```

### Manifest Configuration
The manifest already has the correct configuration:
```json
"web_accessible_resources": [
  {
    "resources": [
      "src/addons/*/*.js"
    ],
    "matches": ["<all_urls>"]
  }
]
```

## Testing Instructions

### 1. Reload Extension
```
1. Go to chrome://extensions/
2. Click reload on Semantest Extension
3. Check service worker is active
```

### 2. Start Servers
```bash
# Terminal 1 - Custom WebSocket forwarder
./start-custom-forwarder.sh

# Terminal 2 - Addon server (optional, not used for injection)
./run-addon-server.sh
```

### 3. Open ChatGPT
```
1. Close all ChatGPT tabs
2. Open fresh tab: https://chat.openai.com
3. Open DevTools console (F12)
4. Look for injection messages
```

### 4. Verify Addon Loaded
In ChatGPT console:
```javascript
// All should return true or object
console.log({
  addon: window.chatGPTAddonInjected,
  generator: !!window.chatGPTImageGenerator,
  queue: !!window.imageGenerationQueue,
  bridge: !!window.semantestBridge
});
```

### 5. Test Image Generation
```bash
./generate-image-async.sh "a beautiful sunset"
```

## What This Means

### Pros:
- ✅ Works with strict CSP
- ✅ No security warnings
- ✅ Files load reliably
- ✅ Full addon functionality

### Cons:
- ❌ Cannot load addons from remote server
- ❌ Addons must be bundled with extension
- ❌ Dynamic loading limited to pre-packaged addons

## Future Options

1. **Hybrid Approach**: 
   - Bundle core addons with extension
   - Use remote server for configuration/updates only

2. **External Scripts**:
   - Host addon files on allowed domains
   - Load via `<script src="">` if domain is whitelisted

3. **Browser Extension API**:
   - Use `chrome.scripting.registerContentScripts()` for dynamic registration
   - Still requires files in extension package

## Conclusion

The strict CSP means true dynamic addon loading from external servers isn't possible for ChatGPT. The addon files must be part of the extension package and injected directly. This is a security limitation of the ChatGPT website, not a bug in our implementation.

The current solution works perfectly for the intended use case - the addon loads, receives events, and can generate images. The only limitation is that new addons require updating the extension package.