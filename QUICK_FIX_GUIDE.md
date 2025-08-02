# Quick Fix Guide - Addon Not Loading

## The Issue
The addon isn't being injected automatically when you reload the ChatGPT tab.

## Quick Solutions

### Solution 1: Manual Injection (Fastest)
1. Open ChatGPT tab
2. Open service worker console (chrome://extensions/ → Semantest → "service worker")
3. Copy and paste this entire script:

```javascript
// Force inject addon
chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
  if (tabs[0]?.url?.includes('chat')) {
    await injectLocalAddon(tabs[0].id);
    console.log('✅ Addon injected!');
  } else {
    console.log('❌ Please switch to ChatGPT tab first');
  }
});
```

4. Press Enter
5. Check ChatGPT tab - you should see addon messages

### Solution 2: Debug What's Wrong
1. In service worker console, paste the contents of `debug-injection.js`
2. This will show you:
   - Which tabs are detected
   - Whether injection is attempted
   - Any errors that occur

### Solution 3: Bypass REST Server
The service worker tries to load from http://localhost:3003 first. If that's not running:

1. Make sure the addon server is NOT running
2. Reload the extension
3. The service worker will fall back to local files

### Common Issues

#### "Could not establish connection"
This happens when:
- The tab was closed/reloaded during injection
- The content script didn't load properly
- There's a race condition

Fix: Wait 2-3 seconds after tab loads, then run manual injection

#### No Console Messages
This means injection didn't happen at all. Check:
- Is the service worker active? (Should show "Service worker" not "Service worker (Inactive)")
- Are you on the correct domain? (chat.openai.com or chatgpt.com)
- Try manual injection

#### Components Not Loading
If bridge works but addon components are missing:
- Check for JavaScript errors in ChatGPT console
- Make sure all addon files exist in the extension directory
- Try reloading the extension

## Testing After Injection

Once injected, test with:
```bash
./generate-image-async.sh "test image"
```

Or in ChatGPT console:
```javascript
// Check components
console.log({
  generator: !!window.chatGPTImageGenerator,
  queue: !!window.imageGenerationQueue,
  bridge: !!window.semantestBridge
});
```

## Why This Happens

The automatic injection on tab reload can fail due to:
1. Timing issues - page not ready when injection attempted
2. REST server check failing and not falling back properly
3. Chrome's content script injection limitations
4. Race conditions between page load and extension load

The manual injection bypasses all these issues by forcing local file injection when you know the page is ready.