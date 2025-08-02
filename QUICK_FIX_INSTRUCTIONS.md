# Quick Fix Instructions

If you're still getting errors, here's a quick workaround:

## Option 1: Use Original Service Worker (Temporary)
Edit `manifest.json` and change:
```json
"service_worker": "src/background/service-worker-dynamic.js"
```
back to:
```json
"service_worker": "src/background/service-worker.js"
```

This will use the original hardcoded addon loading while I fix the dynamic loading issues.

## Option 2: Clear Chrome Extension Cache
1. Go to chrome://extensions/
2. Remove the extension completely
3. Clear browser cache
4. Re-add the extension

## Option 3: Check Console Errors
Open the service worker console:
1. Go to chrome://extensions/
2. Find Semantest extension
3. Click "Inspect views: service worker"
4. Check for specific error messages

The main issue was that the service worker was trying to use `window` object which doesn't exist in that context. I've fixed the references, but you might need to reload the extension.