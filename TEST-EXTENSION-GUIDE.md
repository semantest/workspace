# 🧪 Extension Testing Guide

## Prerequisites

1. **Extension Loaded**
   - Chrome → chrome://extensions/
   - Semantest extension should show no errors
   - Service worker should be active

2. **Server Running**
   ```bash
   cd /home/chous/work/semantest
   npm start  # Should run on port 3004
   ```

3. **ChatGPT Tab Open**
   - Navigate to https://chat.openai.com
   - Make sure you're logged in

## Test Steps

### 1. Check Extension Popup
- Click Semantest extension icon
- Should see:
  - Connection status indicator
  - Empty message log
  - "Active Addon: None" (will update when on ChatGPT)

### 2. Run E2E Test
```bash
cd /home/chous/work/semantest
node test-extension-e2e.js
```

Expected output:
```
🧪 Testing Extension WebSocket Integration...
📡 Test 1: Checking WebSocket server on port 3004...
✅ WebSocket connected successfully!
📨 Test 2: Sending test image request...
🎨 Test 3: Running generate-image.sh...
✅ generate-image.sh executed successfully!
```

### 3. Verify in Extension Popup
After running the test:
1. Click extension icon again
2. You should see a new message:
   - Type: `semantest/custom/image/request/received`
   - Direction: incoming
   - Payload should contain the prompt

### 4. Check ChatGPT Tab
1. Switch to ChatGPT tab
2. Press F12 to open console
3. Look for:
   ```
   🚀 ChatGPT Addon initializing...
   📦 ChatGPT Addon: Setting up event listeners...
   🎨 ChatGPT Addon: Received image generation request
   ```

4. The prompt should be automatically sent to ChatGPT

## Troubleshooting

### Extension Not Loading
- Check chrome://extensions/ for errors
- Click "service worker" link to see console
- Try reloading extension

### WebSocket Not Connecting
- Check server is running: `npm start`
- Verify port 3004 is free: `lsof -i :3004`
- Check server logs for errors

### Messages Not Appearing in Popup
- Open extension popup
- Click "Reconnect" button
- Check connection status shows "Connected"

### ChatGPT Not Receiving Prompt
- Make sure you're on chat.openai.com
- Refresh the ChatGPT tab
- Check F12 console for addon initialization
- Try "Test Direct Send" button in old popup

## Manual Test Command
If the script doesn't work, test manually:
```bash
./generate-image.sh "Generate a test image of a sunset"
```

Then check:
1. Extension popup for the message
2. ChatGPT tab for the prompt being sent