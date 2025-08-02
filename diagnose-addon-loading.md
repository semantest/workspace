# Diagnosing Addon Loading Issue

## The Problem
The addon isn't being injected into ChatGPT pages. No console messages appear.

## How to Check Service Worker Logs

### 1. Open Service Worker Console
1. Go to `chrome://extensions/`
2. Find Semantest extension
3. Click on "service worker" link (NOT "Inspect views")
4. This opens the service worker DevTools

### 2. Check for These Messages
In the service worker console, you should see:
- `🚀 Semantest Service Worker (Dynamic V2) starting...`
- `💉 Loading addon dynamically for tab...`
- `📋 Loaded manifest for chatgpt_addon`
- `📦 Loaded bundle (xxxxx bytes)`

### 3. Common Issues

#### No "Loading addon dynamically" message?
The tab detection isn't working. Check:
- Is the URL exactly `https://chat.openai.com/...`?
- Try navigating to the ChatGPT home page

#### "Failed to fetch manifest" error?
The addon server isn't accessible. Check:
- Is addon server running on port 3003?
- Try: `curl http://localhost:3003/api/addons/chatgpt/manifest`

#### "Failed to inject" error?
There's a script injection issue. Check:
- Any errors about missing files?
- Permission errors?

## Quick Debug Steps

### 1. Test URL Detection
In the service worker console, run:
```javascript
chrome.tabs.query({}, (tabs) => {
  tabs.forEach(tab => {
    if (tab.url && tab.url.includes('chat.openai.com')) {
      console.log('ChatGPT tab found:', tab.id, tab.url);
    }
  });
});
```

### 2. Force Addon Injection
With a ChatGPT tab open, run in service worker console:
```javascript
chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
  if (tabs[0]) {
    console.log('Forcing injection into tab:', tabs[0].id);
    await loadAddonDynamically(tabs[0].id, tabs[0].url, true);
  }
});
```

### 3. Check Permissions
Run in service worker console:
```javascript
chrome.permissions.getAll((perms) => console.log('Permissions:', perms));
```

## Manual Test in ChatGPT Console

If the addon IS loaded but not working, test in ChatGPT console:
```javascript
// Check if components exist
console.log('Components:', {
  bridge: typeof window.semantestBridge,
  queue: typeof window.imageGenerationQueue,
  generator: typeof window.chatGPTImageGenerator
});

// Manually trigger image generation
if (window.chatGPTImageGenerator) {
  window.chatGPTImageGenerator.generateImage('test: red apple');
}
```

## What to Report Back

Please check the service worker console and let me know:
1. Which messages you see (if any)
2. Any errors in red
3. Results of the debug commands
4. Whether the ChatGPT tab URL starts with `https://chat.openai.com/`

This will help pinpoint exactly why the addon isn't loading.