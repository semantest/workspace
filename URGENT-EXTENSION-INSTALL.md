# 🚨 URGENT: Chrome Extension Installation Required!

## CRITICAL BLOCKER FOUND:
The extension is NOT installed in the browser, so `generate-image.sh` times out waiting for a response!

## IMMEDIATE ACTION REQUIRED:

### Step 1: Build the Extension (if not already built)
```bash
cd /home/chous/work/semantest/extension.chrome
npm install
npm run build
```

### Step 2: Load Extension in Chrome/Chromium

1. **Open Chrome/Chromium**
2. **Navigate to**: `chrome://extensions/`
3. **Enable "Developer mode"** (toggle in top right)
4. **Click "Load unpacked"**
5. **Select directory**: `/home/chous/work/semantest/extension.chrome`
6. **Verify extension appears** with name "Semantest"

### Step 3: Verify Installation

1. **Look for Semantest icon** in browser toolbar
2. **Click the icon** - popup should appear with health status
3. **Check ChatGPT tab** - ensure you're logged in
4. **Open Developer Console** on ChatGPT tab
5. **Look for**: "🏥 ChatGPT Health Check Addon loaded"

### Step 4: Test the Flow

```bash
cd /home/chous/work/semantest
./generate-image.sh "Test prompt"
```

## EXPECTED BEHAVIOR:
1. Script connects to WebSocket server ✅
2. Server receives ImageRequestReceived event ✅
3. Extension content script processes event ✅
4. Extension downloads image to ~/Downloads ✅
5. Extension sends ImageDownloaded event back ✅
6. Script receives response and exits ✅

## CURRENT PROBLEM:
- Extension not installed = no handler for events
- Script times out waiting for response
- Testing completely blocked

## TROUBLESHOOTING:

### If Extension Won't Load:
1. Check for build errors in `/extension.chrome/build/`
2. Ensure all referenced files exist
3. Check Chrome console for errors

### If Content Script Not Loading:
1. Refresh the ChatGPT tab after installing extension
2. Check if URL matches patterns in manifest.json
3. Look for errors in extension's background page console

### If Still Timing Out:
1. Check extension popup - is health status green?
2. Check server logs at `/tmp/semantest-server.log`
3. Verify WebSocket connection in browser DevTools Network tab

## CRITICAL PATH:
1. Install extension NOW
2. Verify content scripts loaded
3. Test generate-image.sh
4. Report results

**This is blocking ALL testing and user functionality!**