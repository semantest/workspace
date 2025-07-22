# 🚨 URGENT: Chrome Extension Installation Instructions

## GOOD NEWS: Extension is already built! ✅

Location: `/home/chous/work/semantest/extension.chrome/build/`

## IMMEDIATE INSTALLATION STEPS:

### 1. Open Chrome/Chromium Developer Mode
1. Open your Chromium browser
2. Navigate to: `chrome://extensions/`
3. Toggle ON "Developer mode" (top right corner)

### 2. Load the Extension
1. Click "Load unpacked" button
2. Navigate to: `/home/chous/work/semantest/extension.chrome/build/`
3. Click "Select" or "Open"

### 3. Verify Installation
- You should see "Semantest" extension appear in the list
- Extension ID will be shown
- Make sure it's ENABLED (toggle should be ON)

### 4. Configure Extension for ChatGPT
1. Click on the extension icon in Chrome toolbar
2. If not visible, click puzzle piece icon and pin Semantest
3. Navigate to https://chatgpt.com
4. Make sure you're logged in to ChatGPT

### 5. Verify Extension is Active
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. You should see messages like:
   - "Semantest extension loaded"
   - "WebSocket connection established"
   - "Listening for ImageRequestReceived events"

### 6. Test the Full Flow
```bash
cd /home/chous/work/semantest
./generate-image.sh "test prompt"
```

## Expected Result:
1. Script connects to WebSocket ✅
2. Server receives event ✅
3. Extension receives event ✅
4. Extension triggers ChatGPT ✅
5. Image downloads to ~/Downloads ✅

## Troubleshooting:
- If extension doesn't load: Check manifest.json is valid
- If no WebSocket connection: Refresh ChatGPT page
- If events not received: Check extension console for errors

## Files in Build Directory:
- `manifest.json` - Extension configuration
- `background.js` - Service worker handling events
- `content_script.js` - Injected into ChatGPT
- `popup.js` - Extension popup UI
- `popup.html` - Extension popup interface

**The extension is built and ready - just needs to be loaded into Chrome!**