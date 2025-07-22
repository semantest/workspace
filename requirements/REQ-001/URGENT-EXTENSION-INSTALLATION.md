# 🚨 URGENT: Chrome Extension Installation Required

## Critical Discovery
The generate-image.sh script is timing out because the Chrome extension is NOT installed in the browser. The server sends the ImageRequestReceived event but there's no extension to handle it!

## Quick Installation Steps (2 minutes)

### 1. Locate Extension Package
```bash
/home/chous/work/semantest/extension.chrome/build/semantest-v1.0.1.zip
```

### 2. Extract the ZIP
- Extract to any folder (e.g., `~/semantest-extension/`)
- Remember this location!

### 3. Install in Chrome
1. Open Chrome
2. Go to: `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the extracted folder
6. Extension will appear!

### 4. CRITICAL: Open ChatGPT
1. Navigate to https://chat.openai.com
2. **WAIT FOR CONSENT POPUP** (appears in 3-5 seconds)
3. Choose "Allow" or "Deny" for telemetry
4. Extension is now active!

### 5. Pin Extension (Important!)
- Click puzzle piece icon in Chrome toolbar
- Find "Semantest" 
- Click pin icon to keep visible

## How It Works

1. **generate-image.sh** → Sends ImageRequestReceived event to server
2. **Server** → Broadcasts event via WebSocket
3. **Extension** → Listens for events and handles image generation in ChatGPT
4. **Extension** → Downloads image and sends ImageDownloaded event back
5. **generate-image.sh** → Receives confirmation and exits

## Testing After Installation

```bash
./generate-image.sh "A beautiful sunset over mountains"
```

Should now work without timeout!

## Troubleshooting

### Extension Not Loading?
- Make sure Developer Mode is ON
- Check you selected the correct folder (not the ZIP)
- Try refreshing extensions page

### Still Timing Out?
- Ensure ChatGPT tab is open
- Check extension is enabled (not grayed out)
- Look for errors in Chrome DevTools console

### No Consent Popup?
- Refresh ChatGPT page
- Wait 5 seconds after page loads
- Check Chrome might be blocking popups

## Architecture Flow
```
generate-image.sh
    ↓ (WebSocket)
Server (localhost:8080)
    ↓ (Broadcast)
Chrome Extension (listening)
    ↓ (Automation)
ChatGPT (generates image)
    ↓ (Download)
Extension sends confirmation
    ↓ (WebSocket)
generate-image.sh receives success
```

## Current Status
- ✅ Server: Working perfectly
- ✅ WebSocket: Communication established
- ✅ Message Format: Fixed and working
- ❌ Extension: NOT INSTALLED (blocking everything!)

---
*QA Engineer - Critical Blocker Identified!*