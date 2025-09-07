# 🚨 CEO PRIORITY - Image Generation via CLI

## STATUS: READY FOR TESTING

### ✅ What's Been Implemented

1. **WebSocket Server** (`nodejs.server/semantest-server.js`)
   - HTTP endpoint on port 8080 for CLI
   - WebSocket on port 8082 for extension
   - Image download handler ready
   - Currently running and accepting events

2. **Chrome Extension Updates**
   - `background.js`: Updated to connect to port 8082
   - `content-script-ceo.js`: New enhanced version with:
     - Automatic prompt sending to ChatGPT
     - Image detection in responses
     - State monitoring (IDLE/BUSY)

3. **Test Scripts**
   - `test-ceo-priority.sh`: Full integration test
   - `test-semantest-flow.sh`: Basic flow test

### 🎯 How to Test NOW

#### Step 1: Ensure Server is Running
```bash
# Check if running
curl http://localhost:8080

# If not running, start it:
cd nodejs.server
node semantest-server.js
```

#### Step 2: Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `/home/chous/github/rydnr/claude/semantest-workspace/extension.chrome/`
5. **IMPORTANT**: Replace content-script.js with content-script-ceo.js
   ```bash
   cd extension.chrome
   cp content-script-ceo.js content-script.js
   ```
6. Reload the extension

#### Step 3: Open ChatGPT
1. Open https://chatgpt.com
2. Log in if needed
3. Open DevTools (F12) and check Console
4. Look for: "🚨 CEO PRIORITY - SEMANTEST ready for image generation!"

#### Step 4: Send Test Command
```bash
# Quick test
curl -X POST http://localhost:8080/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ImageGenerationRequestedEvent",
    "payload": {
      "domain": "chatgpt.com",
      "prompt": "Create an image: a small red circle on white background",
      "outputPath": "/tmp/ceo-test.png",
      "correlationId": "ceo-001"
    }
  }'
```

#### Step 5: Watch the Magic
1. Extension receives event via WebSocket
2. Waits for ChatGPT to be idle
3. Types prompt and sends it
4. Monitors for image in response
5. Sends image URL back to server
6. Server downloads image to `/tmp/ceo-test.png`

### 📊 Current Status

- ✅ HTTP Server: Running on 8080
- ✅ WebSocket: Running on 8082
- ✅ Event routing: Working
- ⏳ Extension connection: Need to reload with new content script
- ⏳ Image detection: Ready but needs testing
- ✅ Image download: Handler implemented

### 🚨 URGENT NEXT STEPS

1. **Replace content script and reload extension**
   ```bash
   cd extension.chrome
   cp content-script-ceo.js content-script.js
   # Then reload extension in Chrome
   ```

2. **Verify WebSocket connection**
   - Check server logs for "✅ Extension connected via WebSocket"
   - Check Chrome console for connection messages

3. **Run full test**
   ```bash
   ./test-ceo-priority.sh
   ```

### 🎯 Success Criteria

Image file appears at `/tmp/ceo-test.png` after sending CLI command!

---
**Rafa, Tech Lead**: This is TOP PRIORITY. All systems are GO. Just need to reload the extension with the new content script!