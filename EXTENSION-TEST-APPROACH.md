# Extension Testing Approach

## What Playwright CAN'T Do
- ❌ Install/uninstall extensions dynamically
- ❌ Access chrome://extensions page
- ❌ Modify extension settings after browser launch

## What Playwright CAN Do
- ✅ Launch Chrome with extension pre-loaded
- ✅ Navigate to ChatGPT and login
- ✅ Click buttons and interact with page
- ✅ Monitor network/WebSocket traffic
- ✅ Verify extension behavior on the page

## Recommended Testing Flow

### 1. Manual Steps (Once)
```bash
# Build extension
cd /home/chous/work/semantest/extension.chrome
npm run build  # if needed

# Note the extension path for Playwright
EXTENSION_PATH="/home/chous/work/semantest/extension.chrome"
```

### 2. Automated Test Script
```javascript
// launch-with-extension.js
const { chromium } = require('playwright');

async function testExtension() {
  // Launch Chrome with extension
  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`
    ]
  });

  const page = await browser.newPage();
  
  // Navigate to ChatGPT
  await page.goto('https://chatgpt.com');
  
  // Wait for login if needed
  // await page.waitForSelector('[data-testid="login-button"]');
  
  // Test extension functionality
  // ... your tests here ...
  
  await browser.close();
}
```

### 3. Speed Up Development Cycle

Instead of manual reload each time:
1. Keep browser open with extension loaded
2. Only reload the ChatGPT tab
3. Use Playwright to quickly test changes
4. Manually reload extension only when code changes

### 4. WebSocket Testing
```javascript
// Monitor WebSocket messages
page.on('websocket', ws => {
  ws.on('framereceived', frame => {
    console.log('WS received:', frame.payload);
  });
});
```

## Quick Test Commands
```bash
# Run automated test
node launch-with-extension.js

# Or use Playwright test runner
npx playwright test extension.spec.js
```

This approach eliminates most manual steps except the initial extension loading!