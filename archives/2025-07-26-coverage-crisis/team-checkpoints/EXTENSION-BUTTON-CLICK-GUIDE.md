# Extension Button Click Implementation Guide

## Objective
Modify the extension to click a button when receiving `ImageRequestReceived` event from the WebSocket server.

## Implementation Steps

### 1. WebSocket Connection (in background.js)
```javascript
// Connect to local WebSocket server
const socket = new WebSocket('ws://localhost:8080');

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'event' && data.payload?.type === 'ImageRequestReceived') {
    // Forward to content script in active ChatGPT tab
    chrome.tabs.query({url: '*://chatgpt.com/*'}, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'CLICK_BUTTON',
          eventData: data.payload
        });
      }
    });
  }
};
```

### 2. Content Script Handler (in chatgpt-controller.js)
```javascript
// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CLICK_BUTTON') {
    // Find the button to click
    const button = findTargetButton();
    
    if (button) {
      button.click();
      console.log('Button clicked successfully!');
      sendResponse({success: true});
    } else {
      console.error('Button not found');
      sendResponse({success: false, error: 'Button not found'});
    }
  }
});

function findTargetButton() {
  // Try multiple selectors to find the right button
  const selectors = [
    'button[data-testid="send-button"]',
    'button[class*="send"]',
    'button svg[class*="send"]',
    // Add more selectors as needed
  ];
  
  for (const selector of selectors) {
    const button = document.querySelector(selector);
    if (button) return button;
  }
  
  return null;
}
```

### 3. Testing the Flow

1. **Start the WebSocket server** (should already be running)
2. **Load the extension** in Chrome
3. **Open ChatGPT** in a tab
4. **Run generate-image.sh** to trigger the event
5. **Watch for button click** in ChatGPT

### 4. Event Flow Diagram
```
generate-image.sh 
    ↓ (sends WebSocket message)
WebSocket Server (port 8080)
    ↓ (broadcasts event)
Extension background.js
    ↓ (forwards to content script)
Content Script
    ↓ (finds and clicks button)
ChatGPT UI Response
```

## Current Event Format
The server sends events in this format:
```json
{
  "id": "msg_123",
  "type": "event",
  "timestamp": "2025-07-23T...",
  "payload": {
    "type": "ImageRequestReceived",
    "prompt": "Generate an image of...",
    "metadata": {}
  }
}
```

## Debugging Tips

1. **Check WebSocket connection**:
   ```javascript
   socket.onopen = () => console.log('WebSocket connected');
   socket.onerror = (error) => console.error('WebSocket error:', error);
   ```

2. **Log all received messages**:
   ```javascript
   socket.onmessage = (event) => {
     console.log('Received:', event.data);
   };
   ```

3. **Verify content script injection**:
   - Check if content script is loaded in ChatGPT tab
   - Use Chrome DevTools to inspect

## Security Considerations

- Validate event source
- Only click buttons in expected domains
- Log all automated actions
- Implement rate limiting

## Next Steps After Button Click Works

Once button clicking is verified:
1. Add prompt text insertion
2. Handle response detection
3. Implement error recovery
4. Add progress notifications

Remember: **All commits must be GPG signed!**