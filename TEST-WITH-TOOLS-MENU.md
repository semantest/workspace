# 🎯 Test Guide: Using Tools Menu

Based on Rydnr's feedback: **"The 'Create image' option is only visible when I click on the 'Tools' icon."**

## Quick Test Steps

### 1. Reload Extension
- Go to `chrome://extensions`
- Click reload on Semantest
- Go back to ChatGPT tab and refresh

### 2. Test Tools Menu Helper
```javascript
// Open the tools menu
window.toolsMenuHelper.openToolsMenu()

// Find and click "Create image"
window.toolsMenuHelper.findAndClickCreateImage()
```

### 3. Once Image Mode is Active
```javascript
// Test image generation
window.chatGPTImageGenerator.generateImage("A beautiful robot painting")
```

### 4. Full Automated Test
```javascript
// This will:
// 1. Click Tools menu
// 2. Find and click "Create image"
// 3. Enter your prompt
// 4. Click generate
async function fullImageTest(prompt) {
  // First activate image mode
  const result = await window.toolsMenuHelper.findAndClickCreateImage();
  if (!result.success) {
    console.error('Failed to activate image mode:', result.error);
    return;
  }
  
  // Wait a bit
  await new Promise(r => setTimeout(r, 1000));
  
  // Now generate the image
  return await window.chatGPTImageGenerator.generateImage(prompt);
}

// Run it
fullImageTest("A pixel art spaceship")
```

## Manual Steps (if automation fails)

1. **Click the Tools icon** manually
2. **Click "Create image"** in the menu
3. **Then run**: `window.chatGPTImageGenerator.generateImage("your prompt")`

## WebSocket Test

After setting up image mode:

1. Open: `file:///home/chous/work/semantest/test-websocket-browser.html`
2. Click "Send Image Request"
3. Watch ChatGPT generate the image

## Debug Commands

```javascript
// Check what's loaded
console.log({
  toolsHelper: window.toolsMenuHelper,
  imageGenerator: window.chatGPTImageGenerator,
  bridge: window.semantestBridge
})

// Debug current state
window.debugChatGPT()

// See all menu items when tools menu is open
document.querySelectorAll('[role="menuitem"]').forEach(item => 
  console.log(item.textContent)
)
```

## Expected Flow

1. **Tools Menu Click** → Menu opens with options
2. **"Create image" Click** → ChatGPT switches to image mode
3. **Prompt Entry** → Extension enters your prompt
4. **Generate Click** → Image generation starts

The key insight is that we need to programmatically click the Tools menu first, then find and click "Create image" from that menu.