# 🎨 Image Generation Test Instructions

## Current Status
✅ WebSocket server is running (you see server status messages)
✅ Extension popup is connected and receiving messages
✅ Extension is loaded successfully

## Test Steps

### Option 1: Browser-Based Test (Recommended)

1. **Open the test page**:
   ```bash
   # In Chrome, open:
   file:///home/chous/work/semantest/test-websocket-browser.html
   ```

2. **Click "Send Image Request"**
   - This will send the image request via WebSocket
   - You should see it in the extension popup

3. **Check ChatGPT tab**:
   - The addon should receive the message
   - Look for "Create image" button being clicked
   - The prompt should be entered

### Option 2: Direct Console Test

1. **In ChatGPT tab, open console (F12)**

2. **Test the image generator directly**:
   ```javascript
   // This should click the "Create image" tool and enter your prompt
   window.chatGPTImageGenerator.generateImage("A beautiful sunset over mountains")
   ```

3. **Watch for**:
   - "Create image" tool being clicked
   - Image interface appearing
   - Prompt being entered

### What's Happening

1. **WebSocket Flow**:
   ```
   Test → ws://localhost:3004 → Extension → ChatGPT Addon → Click "Create image" → Enter prompt
   ```

2. **In Extension Popup**, you should see:
   - Type: `semantest/custom/image/request/received`
   - Direction: incoming
   - Payload with your prompt

3. **In ChatGPT Console**, you should see:
   ```
   🎨 Using explicit image tool activation...
   🔍 Looking for "Create image" tool...
   ✅ Found image tool button
   🖱️ Clicking image tool...
   ```

## Troubleshooting

### If "Create image" tool not found:
- Make sure you have access to DALL-E (ChatGPT Plus)
- Try refreshing the ChatGPT page
- The tool might be in a menu or grid

### If nothing happens:
1. Reload the extension
2. Refresh the ChatGPT tab
3. Make sure popup shows "Connected"

### Manual Override:
If the automatic tool detection fails, you can help by:
1. Manually clicking "Create image" tool
2. Then run the console command to just enter the prompt