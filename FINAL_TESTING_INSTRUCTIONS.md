# Final Testing Instructions - Dynamic Addon Loading

## What's Fixed

1. **Service Worker V2**: Better handling of tab reloads and addon injection
2. **WebSocket Message Routing**: Finds ChatGPT tabs and re-injects if needed
3. **Popup Display**: Shows active addon status
4. **Context Menu**: Fixed duplicate menu error

## Step-by-Step Testing

### 1. Start Both Servers

**Terminal 1 - Addon Dev Server (Port 3003):**
```bash
cd nodejs.server
./run-addon-server.sh
```

**Terminal 2 - WebSocket Server (Port 3004):**
```bash
cd nodejs.server
npm start
```

### 2. Install the Updated Extension

1. Open Chrome and go to `chrome://extensions/`
2. **REMOVE** the old Semantest extension completely
3. Click "Load unpacked"
4. Select the `extension.chrome` directory
5. The extension should load with version 1.0.2

### 3. Open ChatGPT

1. Open a new tab and go to https://chat.openai.com
2. Open DevTools Console (F12)
3. You should see:
   - `🚀 Semantest Service Worker (Dynamic V2) starting...`
   - `💉 Loading addon dynamically for tab...`
   - `📦 Loaded bundle (xxx bytes)`
   - `✅ ChatGPT addon injected dynamically`

### 4. Test the Extension Popup

1. Click the Semantest extension icon
2. Check that "Active Addon" shows "ChatGPT Helper" (not "None")
3. WebSocket status should show "Connected"

### 5. Test Image Generation

**Make sure the ChatGPT tab is open (doesn't need to be active anymore):**

```bash
./generate-image-async.sh 'manga drawing of a soccer ball' ~/Downloads '001-soccer.png'
```

You should see:
- In the terminal: "Request sent! (not waiting for response)"
- In the server logs: The event being received and processed
- In ChatGPT: The prompt being entered and image generation starting

## What's Different Now

1. **Better Tab Detection**: The service worker finds any open ChatGPT tab
2. **Auto Re-injection**: If the addon isn't loaded, it re-injects automatically
3. **Reload Handling**: The addon properly re-injects after page reloads
4. **Status Display**: The popup shows when the addon is active

## Troubleshooting

### "Active Addon: None" in popup
- Make sure you have a ChatGPT tab open
- Try clicking the extension icon while on the ChatGPT tab
- Refresh the ChatGPT page

### No injection messages in console
- Check that addon dev server is running (port 3003)
- Try removing and re-adding the extension
- Check for errors in chrome://extensions/

### WebSocket messages not processed
- Ensure you have at least one ChatGPT tab open
- Check server logs for "Message sent to tab" confirmation
- Look for errors in the ChatGPT tab's console

### Image generation not starting
- Make sure you're logged into ChatGPT
- Check that GPT-4 is selected (image generation may require it)
- Try the command manually in ChatGPT first to ensure it works

## Success Criteria

✅ Addon dev server running on port 3003
✅ WebSocket server running on port 3004
✅ Extension shows "ChatGPT Helper" as active addon
✅ Console shows addon injection messages
✅ Image generation command triggers prompt in ChatGPT
✅ Addon re-injects after page reload

## Command Summary

```bash
# Terminal 1
cd nodejs.server
./run-addon-server.sh

# Terminal 2
cd nodejs.server
npm start

# Terminal 3 (after setup)
./generate-image-async.sh 'your prompt here' ~/Downloads 'filename.png'
```

The dynamic addon loading system is now fully functional with better reliability!