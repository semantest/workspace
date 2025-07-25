# 🎯 Rydnr Test Instructions

Based on your debug output, I can see that you have many previous image generations but the "Create image" tool button is not visible in the interface.

## Current Situation
- ✅ Extension loaded without chrome.runtime errors
- ✅ Debug tools working
- ✅ Many image-related buttons from previous generations
- ❌ "Create image" tool not found in interface
- ✅ Tools menu button found (id="radix-«rm»")

## Step 1: Reload Extension & Page
1. Go to `chrome://extensions`
2. Click reload on Semantest extension
3. Go back to ChatGPT tab and refresh (Ctrl+R)

## Step 2: Enable Create Image Tool

### Option A: Click the Tools Menu
```javascript
// In console, click the tools menu button:
document.querySelector('button[id^="radix-"][aria-haspopup="menu"]').click()
```

Then look for "Create image" or "DALL-E" in the menu and enable it.

### Option B: Try Slash Command
```javascript
// Type this in the ChatGPT input:
/imagine

// Or use our helper:
window.testSlashCommand("A robot painting")
```

### Option C: Manual Approach
1. Look for any button with a menu icon or sparkle icon (✨)
2. Click it to open tools/features menu
3. Find and enable "Create image" or "DALL-E"

## Step 3: Test Image Generation

Once "Create image" is enabled:

```javascript
// Run updated debug to confirm
window.debugChatGPT()

// If "Create image" tool is now visible, test:
window.chatGPTImageGenerator.generateImage("A pixel art robot")
```

## Step 4: WebSocket Test

After enabling the tool:

1. Open browser test:
   ```
   file:///home/chous/work/semantest/test-websocket-browser.html
   ```

2. Click "Send Image Request"

3. Watch ChatGPT tab for automatic image generation

## Troubleshooting

### If tools menu doesn't show "Create image":
- You might need ChatGPT Plus subscription
- Try typing a message first to activate the interface
- Look for a "GPT-4" dropdown that might have tools

### If slash commands don't work:
- ChatGPT might have changed the UI
- Try typing normally: "Create an image of..."
- ChatGPT might suggest switching to image mode

### Alternative Approach:
If the automatic tool detection continues to fail:
1. Manually ask ChatGPT to create an image
2. When it switches to image mode, the placeholder will change
3. Then our extension can detect and use that mode

## Quick Debug Commands

```javascript
// Check current state
window.debugChatGPT()

// Test slash command
window.testSlashCommand("test prompt")

// Direct test (if in image mode)
window.chatGPTImageGenerator.generateImage("test")

// Check if components loaded
console.log({
  generator: window.chatGPTImageGenerator,
  controller: window.chatGPTController,
  bridge: window.semantestBridge
})
```

## Next Steps

1. First, try to enable the "Create image" tool using the menu button
2. If that doesn't work, try the slash command approach
3. Let me know which approach works so I can update the extension accordingly

The key insight from your debug is that the tools menu button exists (`radix-«rm»`), we just need to click it and enable the image tool.