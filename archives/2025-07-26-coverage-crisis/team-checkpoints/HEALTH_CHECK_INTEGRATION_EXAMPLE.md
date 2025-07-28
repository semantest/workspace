# Health Check Integration Example

## 🔄 Complete Flow Example

### 1. Update generate-image.sh
```bash
# Already implemented - just checks server
if ! check_server; then
    start_server || exit 1
fi
```

### 2. Server Implementation (sdk/server/src/server.ts)
```typescript
import { BrowserHealthCheck } from './health-checks/browser-health';
import express from 'express';

export class WebSocketServer {
  private browserHealth: BrowserHealthCheck;
  private app: express.Application;
  
  constructor() {
    this.browserHealth = new BrowserHealthCheck();
    this.app = express();
    this.setupHealthEndpoint();
  }
  
  private setupHealthEndpoint(): void {
    // Health endpoint ONLY checks browser availability
    this.app.get('/health', async (req, res) => {
      const health = await this.browserHealth.getHealthStatus();
      res.json(health);
    });
  }
  
  async handleImageRequest(payload: ImageRequestReceivedPayload): Promise<void> {
    // Step 1: Check our layer (browser)
    if (!await this.browserHealth.canLaunchBrowser()) {
      throw new Error('Browser not available. Please install Chrome or set CHROME_PATH');
    }
    
    // Step 2: We launch browser and let extension handle its checks
    const browser = await puppeteer.launch({
      executablePath: await this.browserHealth.getBrowserPath()
    });
    
    // Step 3: Extension will handle tab checks
    // Step 4: Addon will handle session checks
    // We don't need to know about those details!
  }
}
```

### 3. Extension Background Script (extension.chrome/src/background.ts)
```typescript
import { TabHealthCheck } from './health-checks/tab-health';

const tabHealth = new TabHealthCheck();

// Listen for health checks from server
chrome.runtime.onMessageExternal.addListener(
  async (request, sender, sendResponse) => {
    if (request.type === 'HEALTH_CHECK') {
      const health = await tabHealth.getHealthStatus();
      sendResponse(health);
    }
  }
);

// Handle image generation requests
chrome.runtime.onMessageExternal.addListener(
  async (request, sender, sendResponse) => {
    if (request.type === 'IMAGE_REQUEST') {
      // Ensure we have a ChatGPT tab
      const tab = await tabHealth.ensureChatGPTTab();
      
      // Pass request to addon
      chrome.tabs.sendMessage(tab.id!, {
        type: 'GENERATE_IMAGE',
        payload: request.payload
      });
    }
  }
);
```

### 4. Addon Content Script (chatgpt.com/content.js)
```typescript
import { SessionHealthCheck } from './health-checks/session-health';

const sessionHealth = new SessionHealthCheck();

// Already set up in session-health.ts
// Listens for CHECK_SESSION messages

// Handle image generation
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === 'GENERATE_IMAGE') {
    // Check if logged in
    if (!await sessionHealth.isLoggedIn()) {
      sendResponse({
        error: 'Not logged in',
        action: 'Please log in at: https://chat.openai.com/auth/login'
      });
      return;
    }
    
    // We're logged in! Generate the image
    await generateImage(request.payload.prompt);
    sendResponse({ success: true });
  }
});
```

## 🧪 Testing Each Layer Independently

### Test Server Health:
```bash
# Should show browser status only
curl http://localhost:8080/health

# Response:
{
  "component": "server",
  "healthy": true,
  "message": "Browser available at: /usr/bin/google-chrome"
}
```

### Test Extension Health:
```javascript
// In extension background console
const tabHealth = new TabHealthCheck();
const status = await tabHealth.getHealthStatus();
console.log(status);

// Response includes child health from addon:
{
  "component": "extension",
  "healthy": true,
  "message": "ChatGPT tab found (ID: 123)",
  "childHealth": {
    "component": "addon",
    "healthy": false,
    "message": "Not logged in to ChatGPT",
    "action": "https://chat.openai.com/auth/login"
  }
}
```

### Test Addon Health:
```javascript
// In ChatGPT page console
const sessionHealth = new SessionHealthCheck();
const status = await sessionHealth.getHealthStatus();
console.log(status);

// Response:
{
  "component": "addon",
  "healthy": true,
  "message": "Logged in as: user@example.com"
}
```

## 📊 Complete Health Chain Response

When all layers are healthy:
```json
{
  "component": "server",
  "healthy": true,
  "message": "Browser available at: /usr/bin/google-chrome",
  "childHealth": {
    "component": "extension",
    "healthy": true,
    "message": "ChatGPT tab found (ID: 123)",
    "childHealth": {
      "component": "addon",
      "healthy": true,
      "message": "Logged in as: user@example.com"
    }
  }
}
```

When addon layer is unhealthy:
```json
{
  "component": "server",
  "healthy": true,
  "message": "Browser available",
  "childHealth": {
    "component": "extension",
    "healthy": true,
    "message": "ChatGPT tab found",
    "childHealth": {
      "component": "addon",
      "healthy": false,
      "message": "Not logged in to ChatGPT",
      "action": "https://chat.openai.com/auth/login"
    }
  }
}
```

## 🎯 Key Benefits Demonstrated

1. **Server** doesn't know about tabs or login
2. **Extension** doesn't know about browser paths or login  
3. **Addon** doesn't know about infrastructure
4. Each layer can be developed, tested, and deployed independently
5. Clear error messages guide users to fix issues
6. No tight coupling between layers