# Layered Health Check Architecture

## 🏗️ Architecture Overview

```
generate-image.sh
    ↓ (checks server)
Node.js Server (port 8080)
    ↓ (checks browser can launch)
Chrome Extension
    ↓ (checks for chatgpt.com tabs)
ChatGPT Addon
    ↓ (checks logged-in session)
Image Generation Ready ✅
```

## 📋 Component Responsibilities

### 1. generate-image.sh (Shell Script)
**ONLY cares about**: WebSocket server availability
```bash
# Responsibility: Check if server responds on ws://localhost:8080
check_server() {
    nc -z localhost 8080 2>/dev/null
    return $?
}
```

### 2. Node.js Server (sdk/server)
**ONLY cares about**: Browser launch capability
```typescript
// In sdk/server/src/health-checks/browser-health.ts
export class BrowserHealthCheck {
  async canLaunchBrowser(): Promise<boolean> {
    try {
      // Check if Chrome/Chromium is available
      const browserPath = await this.findBrowserExecutable();
      return !!browserPath;
    } catch {
      return false;
    }
  }
  
  private async findBrowserExecutable(): Promise<string | null> {
    // Check common browser locations
    const paths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      process.env.CHROME_PATH
    ];
    // Return first valid path
  }
}
```

### 3. Chrome Extension (extension.chrome)
**ONLY cares about**: ChatGPT.com tab existence
```typescript
// In extension.chrome/src/health-checks/tab-health.ts
export class TabHealthCheck {
  async hasChatGPTTab(): Promise<boolean> {
    const tabs = await chrome.tabs.query({ 
      url: '*://chat.openai.com/*' 
    });
    return tabs.length > 0;
  }
  
  async createChatGPTTab(): Promise<chrome.tabs.Tab> {
    return await chrome.tabs.create({ 
      url: 'https://chat.openai.com' 
    });
  }
}
```

### 4. ChatGPT Addon (chatgpt.com)
**ONLY cares about**: Logged-in session
```typescript
// In chatgpt.com/src/health-checks/session-health.ts
export class SessionHealthCheck {
  async isLoggedIn(): Promise<boolean> {
    // Check for session indicators
    const sessionIndicators = [
      document.querySelector('[data-testid="profile-button"]'),
      document.cookie.includes('__Secure-next-auth.session-token'),
      window.__NEXT_DATA__?.props?.pageProps?.user
    ];
    return sessionIndicators.some(indicator => !!indicator);
  }
  
  getLoginUrl(): string {
    return 'https://chat.openai.com/auth/login';
  }
}
```

## 🔄 Health Check Flow

### 1. Server Startup Health Check
```typescript
// In sdk/server/src/server.ts
class WebSocketServer {
  private browserHealth: BrowserHealthCheck;
  
  async start() {
    // Level 1: Server starts
    console.log('✅ WebSocket server running on port 8080');
    
    // Level 2: Check browser availability
    this.browserHealth = new BrowserHealthCheck();
    const canLaunch = await this.browserHealth.canLaunchBrowser();
    
    if (!canLaunch) {
      console.warn('⚠️  Browser not available for automation');
      // Server still runs, but flags capability issue
    } else {
      console.log('✅ Browser automation available');
    }
  }
}
```

### 2. Image Request Health Check Chain
```typescript
// In sdk/server/src/handlers/image-handler.ts
async handleImageRequest(payload: ImageRequestReceivedPayload) {
  // Check 1: Browser available? (Server responsibility)
  if (!await this.browserHealth.canLaunchBrowser()) {
    throw new Error('Browser not available for image generation');
  }
  
  // Delegate to extension for next check
  const extensionResponse = await this.sendToExtension({
    type: 'CHECK_CHATGPT_TAB',
    payload: {}
  });
  
  // Extension handles tab check and delegates to addon
  // Addon handles session check
  // Each component only cares about its layer
}
```

### 3. Extension Health Response
```typescript
// In extension.chrome/src/background.ts
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === 'CHECK_CHATGPT_TAB') {
    const tabHealth = new TabHealthCheck();
    const hasTab = await tabHealth.hasChatGPTTab();
    
    if (!hasTab) {
      // Create tab if needed
      const tab = await tabHealth.createChatGPTTab();
      // Let addon check session
    }
    
    // Delegate session check to addon
    chrome.tabs.sendMessage(tabId, {
      type: 'CHECK_SESSION'
    });
  }
});
```

### 4. Addon Session Response
```typescript
// In chatgpt.com/content.js
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === 'CHECK_SESSION') {
    const sessionHealth = new SessionHealthCheck();
    const isLoggedIn = await sessionHealth.isLoggedIn();
    
    sendResponse({
      healthy: isLoggedIn,
      action: isLoggedIn ? null : sessionHealth.getLoginUrl()
    });
  }
});
```

## 📊 Health Status Response Format

Each layer returns a consistent health status:
```typescript
interface HealthStatus {
  component: string;           // 'server' | 'extension' | 'addon'
  healthy: boolean;           // Can this component do its job?
  message?: string;           // Human-readable status
  action?: string;            // What to do if unhealthy
  childHealth?: HealthStatus; // Next layer's health
}
```

Example composite response:
```json
{
  "component": "server",
  "healthy": true,
  "message": "Server running, browser available",
  "childHealth": {
    "component": "extension",
    "healthy": true,
    "message": "ChatGPT tab active",
    "childHealth": {
      "component": "addon",
      "healthy": false,
      "message": "Not logged in to ChatGPT",
      "action": "https://chat.openai.com/auth/login"
    }
  }
}
```

## 🎯 Implementation Tasks

### Server Team (Backend):
1. Implement `BrowserHealthCheck` class
2. Add health endpoint: `GET /health`
3. Check browser on startup
4. Pass health info to image handler

### Extension Team (Architect):
1. Implement `TabHealthCheck` class
2. Listen for health check messages
3. Create tab if missing
4. Forward to addon for session check

### Addon Team (Frontend):
1. Implement `SessionHealthCheck` class
2. Listen for session check messages
3. Detect login state
4. Return login URL if needed

## 🧪 Testing Each Layer

### Test Server Only:
```bash
curl http://localhost:8080/health
# Should return: {"component":"server","healthy":true,"message":"Browser available"}
```

### Test Extension Only:
```javascript
// In extension console
chrome.runtime.sendMessage({type: 'CHECK_CHATGPT_TAB'}, response => {
  console.log('Tab check:', response);
});
```

### Test Addon Only:
```javascript
// In ChatGPT page console
window.postMessage({type: 'CHECK_SESSION'}, '*');
```

## 🚀 Benefits

1. **Separation of Concerns**: Each component only knows about its responsibilities
2. **Graceful Degradation**: Higher layers can work even if lower layers fail
3. **Clear Error Messages**: Users know exactly what's wrong and how to fix it
4. **Testability**: Each layer can be tested independently
5. **Maintainability**: Changes to one layer don't affect others