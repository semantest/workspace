# 🧪 Semantest Testing Guide

## Current Status
The extension is refactored and ready for testing. The key insight from rydnr is that we need to **explicitly click the "Create image" tool** before sending prompts.

## Setup Steps

### 1. Reload the Extension
1. Go to `chrome://extensions`
2. Find "Semantest" extension
3. Click the reload button (↻)

### 2. Refresh ChatGPT
1. Go to ChatGPT tab
2. Refresh the page (Ctrl+R or Cmd+R)
3. Open console (F12)

### 3. Enable "Create image" Tool
**IMPORTANT**: ChatGPT doesn't show the "Create image" tool by default. You need to enable it:

1. Look for the **sparkle button** (✨) in the input area
2. Click it to open the tools menu
3. Find and enable "Create image" (DALL-E)
4. The tool should now appear in your interface

## Testing Methods

### Method 1: Debug Check (Recommended First)
```javascript
// In ChatGPT console, run:
window.debugChatGPT()
```

This will show you:
- Current mode (text vs image)
- Available tools
- Interface status

### Method 2: Direct Test
```javascript
// After enabling "Create image" tool:
window.chatGPTImageGenerator.generateImage("A pixel art of a robot playing guitar")
```

### Method 3: WebSocket Test
1. Open the browser test page:
   ```
   file:///home/chous/work/semantest/test-websocket-browser.html
   ```
2. Click "Send Image Request"
3. Check ChatGPT tab for the action

## Expected Behavior

When successful, you should see:
1. The "Create image" tool being clicked
2. The interface switching to image mode
3. Your prompt being entered
4. The generate button being clicked

## Troubleshooting

### "Create image" tool not found
- **Solution**: Click the sparkle (✨) button and enable "Create image" from the tools menu
- **Note**: You need ChatGPT Plus for DALL-E access

### Wrong button clicked
- The extension now skips upload/attachment buttons
- It looks for the actual send/generate button

### Nothing happens
1. Check extension popup - should show "Connected"
2. Check console for errors
3. Make sure you've enabled the "Create image" tool

## Console Commands Reference

```javascript
// Debug interface
window.debugChatGPT()

// Test image generation
window.chatGPTImageGenerator.generateImage("Your prompt here")

// Check if components are loaded
console.log(window.chatGPTImageGenerator)  // Should not be undefined
console.log(window.chatGPTController)      // Should not be undefined
```

## Architecture Notes

The flow is:
1. **WebSocket Server** (port 3004) receives image request
2. **Service Worker** routes it to ChatGPT tab
3. **ChatGPT Addon** receives the message
4. **Image Generator** clicks "Create image" tool
5. **Prompt** is entered and submitted

## Next Steps

After successful testing:
1. Test with different prompts
2. Test error cases (tool not enabled)
3. Test with multiple ChatGPT tabs
4. Verify the full CLI → Extension → ChatGPT flow