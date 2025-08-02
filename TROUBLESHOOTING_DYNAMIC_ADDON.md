# Troubleshooting Dynamic Addon Loading

## The Issue
When you run the image generation script, the server logs show:
- "Unknown event type: semantest/custom/image/download/requested"
- The event is received but not processed by the addon

## Root Cause
The WebSocket message is reaching the server, but the addon in the Chrome extension isn't active to process it. This happens when:
1. The addon dev server isn't running (port 3003)
2. The extension hasn't loaded the addon dynamically
3. The ChatGPT tab isn't active or doesn't have the addon injected

## Complete Setup Process

### Step 1: Start BOTH Servers

#### 1.1 Start the Addon Dev Server (Port 3003)
```bash
cd nodejs.server
./run-addon-server.sh
```

You should see:
```
🚀 Dev server running on http://localhost:3003
📍 Addon endpoints:
   GET http://localhost:3003/api/addons
   GET http://localhost:3003/api/addons/chatgpt/manifest
   GET http://localhost:3003/api/addons/chatgpt/bundle
✅ CORS configured for Chrome extensions
```

#### 1.2 Start the WebSocket Server (Port 3004)
In a new terminal:
```bash
cd nodejs.server
npm start
```

### Step 2: Install the Updated Extension

1. Open Chrome and go to `chrome://extensions/`
2. **IMPORTANT**: Remove the old Semantest extension completely
3. Click "Load unpacked"
4. Select the `extension.chrome` directory
5. Note the extension ID (looks like: mfllfdpmdiocdkkmmiinhfgknighlgop)

### Step 3: Load ChatGPT with the Addon

1. Open a NEW tab and navigate to https://chat.openai.com
2. Open DevTools (F12) and go to Console
3. You MUST see these messages:
   ```
   🚀 Semantest Service Worker (Fixed) starting...
   💉 Loading addon dynamically for tab 123
   📋 Loaded manifest for chatgpt_addon
   📦 Loaded bundle (12345 bytes)
   ✅ ChatGPT addon injected dynamically
   ```

If you DON'T see these messages, the addon isn't loaded!

### Step 4: Keep ChatGPT Tab Active

**IMPORTANT**: The image generation only works when the ChatGPT tab is the active tab!

1. Keep the ChatGPT tab open and active
2. Run the image generation script:
   ```bash
   ./generate-image-async.sh 'manga drawing of a soccer ball' ~/Downloads '001-soccer.png'
   ```

## Quick Verification Script

Run this to check your setup:
```bash
./test-dynamic-addon.sh
```

## Common Problems and Solutions

### Problem: "Unknown event type" in server logs
**Solution**: The WebSocket server is working, but the addon isn't loaded. Follow steps 2-3 above.

### Problem: No messages in ChatGPT console
**Solution**: 
- Make sure addon dev server is running on port 3003
- Remove and reinstall the extension
- Refresh the ChatGPT page

### Problem: CORS errors
**Solution**: The addon dev server must be running on port 3003 with proper CORS headers

### Problem: Addon loads but image generation doesn't work
**Solution**: 
- Ensure ChatGPT tab is the active tab when running the script
- Check browser console for any errors
- Try refreshing the ChatGPT page

## Expected Flow

1. WebSocket server receives image generation request ✅ (you see this)
2. Service worker forwards message to active ChatGPT tab
3. Addon in ChatGPT tab processes the request
4. Addon triggers image generation in ChatGPT
5. Image is downloaded when ready

Currently, you're stuck at step 2 because the addon isn't loaded in the ChatGPT tab.

## Next Steps

1. Run `./test-dynamic-addon.sh` to verify your setup
2. Ensure BOTH servers are running (ports 3003 and 3004)
3. Reinstall the extension completely
4. Open ChatGPT and verify addon loads in console
5. Keep ChatGPT tab active and try image generation again