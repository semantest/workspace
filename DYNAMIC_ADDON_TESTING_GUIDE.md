# Dynamic Addon Loading - Testing Guide

## Overview
The dynamic addon loading system has been implemented and fixed. The ChatGPT addon is now loaded from a REST server instead of being bundled with the extension.

## Current Status ✅
- Dynamic addon manager implemented
- Service worker fixed (no window errors, no duplicate injections)
- CORS configuration corrected
- Simple development server created to bypass TypeScript errors

## How to Test

### 1. Start the Development Server

```bash
cd nodejs.server
./run-addon-server.sh
```

Or manually:
```bash
cd nodejs.server
node addon-dev-server.js
```

The server will start on http://localhost:3003 with these endpoints:
- `GET /api/addons` - List all available addons
- `GET /api/addons/chatgpt/manifest` - Get ChatGPT addon manifest
- `GET /api/addons/chatgpt/bundle` - Get bundled ChatGPT addon code

### 2. Reload the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. **Remove the old extension** (important to clear cached scripts)
3. Click "Load unpacked" and select the `extension.chrome` directory
4. The extension should load with the new dynamic service worker

### 3. Test the Dynamic Loading

1. Navigate to https://chat.openai.com
2. Open the browser console (F12)
3. You should see messages like:
   - `💉 Loading addon dynamically for tab...`
   - `📋 Loaded manifest for chatgpt_addon`
   - `📦 Loaded bundle (xxx bytes)`
   - `✅ ChatGPT addon injected dynamically`

### 4. Verify Functionality

1. The ChatGPT addon should work as before
2. Try generating images or using other addon features
3. Check that the addon only loads on ChatGPT domains

## What Changed

1. **Service Worker**: Now uses `service-worker-fixed.js` with:
   - Injection tracking to prevent duplicates
   - No window references (service worker compatible)
   - Dynamic addon loading on tab updates

2. **Addon Manager**: Created `addon-manager-dynamic.js` with:
   - Remote addon fetching from REST server
   - Caching mechanism
   - Fallback to local files if server unavailable

3. **Server**: Simple Express server that:
   - Serves addon manifest and bundle
   - Handles CORS for chrome extensions
   - Bypasses TypeScript compilation issues

## Troubleshooting

### Server not starting?
- Make sure port 3003 is free
- Check that express and cors are installed: `npm install express cors`

### Extension not loading?
- Remove and re-add the extension to clear cache
- Check manifest.json uses "service-worker-fixed.js"

### Addon not injecting?
- Check browser console for errors
- Verify server is running and accessible
- Try refreshing the ChatGPT tab

### CORS errors?
- Make sure you're using the addon-dev-server.js (not the TypeScript server)
- The server should allow chrome-extension:// origins

## Benefits Achieved ✅

1. **Smaller Extension Size**: ChatGPT addon no longer bundled
2. **Dynamic Updates**: Can update addon without republishing extension
3. **Foundation for Marketplace**: Ready for Phase 2 (domain validation, multiple addons)
4. **Better Architecture**: Cleaner separation of concerns

## Next Steps (Phase 2)

- Add domain validation (only load addons for verified domains)
- Support multiple addons
- Add user preferences for addon loading
- Create UI for addon marketplace
- Implement addon versioning and updates