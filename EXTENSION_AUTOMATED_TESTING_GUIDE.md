# Chrome Extension Automated Testing Guide

## Current Testing Infrastructure

The extension already has:
- Jest configured for unit tests
- TypeScript support
- Test coverage requirements (80% threshold)
- ESLint for code quality

## Automated Testing Options

### 1. Unit Testing (Already Available)
```bash
cd extension.chrome
npm test              # Run all tests
npm run test:watch    # Watch mode
npm test -- --coverage # With coverage report
```

### 2. E2E Browser Testing with Puppeteer

Install dependencies:
```bash
npm install --save-dev puppeteer @types/puppeteer
```

Create test file:
```typescript
// tests/e2e/extension.e2e.test.ts
import puppeteer from 'puppeteer';
import path from 'path';

describe('Extension E2E Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    const extensionPath = path.join(__dirname, '../../build');
    browser = await puppeteer.launch({
      headless: false, // Set to true for CI
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  test('Extension loads correctly', async () => {
    page = await browser.newPage();
    await page.goto('chrome://extensions');
    // Add assertions
  });

  test('Extension popup works', async () => {
    const targets = await browser.targets();
    const extensionTarget = targets.find(target => 
      target.type() === 'service_worker' || 
      target.type() === 'background_page'
    );
    
    const extensionId = extensionTarget.url().split('/')[2];
    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    
    page = await browser.newPage();
    await page.goto(popupUrl);
    
    // Test popup functionality
    const title = await page.title();
    expect(title).toBe('Semantest Extension');
  });
});
```

### 3. Integration Testing with Chrome Extension Testing Framework

Install Chrome Extension Testing library:
```bash
npm install --save-dev sinon-chrome jest-chrome
```

Mock Chrome APIs:
```typescript
// tests/unit/background.test.ts
import chrome from 'sinon-chrome';
import { messageHandler } from '../../src/background';

describe('Background Script', () => {
  beforeEach(() => {
    global.chrome = chrome;
    chrome.flush();
  });

  test('handles messages correctly', () => {
    const sendResponse = jest.fn();
    messageHandler({ type: 'GET_DATA' }, {}, sendResponse);
    
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      data: expect.any(Object)
    });
  });

  test('handles tab updates', () => {
    chrome.tabs.onUpdated.addListener.yields(1, { status: 'complete' });
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });
});
```

### 4. WebSocket Testing

For testing WebSocket connections:
```typescript
// tests/integration/websocket.test.ts
import WS from 'jest-websocket-mock';
import { WebSocketClient } from '../../src/websocket-client';

describe('WebSocket Integration', () => {
  let server;
  let client;

  beforeEach(async () => {
    server = new WS('ws://localhost:8080');
    client = new WebSocketClient('ws://localhost:8080');
    await server.connected;
  });

  afterEach(() => {
    WS.clean();
  });

  test('connects successfully', async () => {
    expect(client.isConnected()).toBe(true);
  });

  test('handles messages', async () => {
    server.send({ type: 'greeting', data: 'hello' });
    await expect(client.waitForMessage()).resolves.toEqual({
      type: 'greeting',
      data: 'hello'
    });
  });
});
```

### 5. Automated CI/CD Testing

GitHub Actions workflow:
```yaml
# .github/workflows/extension-test.yml
name: Extension Tests

on:
  push:
    paths:
      - 'extension.chrome/**'
  pull_request:
    paths:
      - 'extension.chrome/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        cd extension.chrome
        npm ci
        
    - name: Run linting
      run: |
        cd extension.chrome
        npm run lint
        
    - name: Run type checking
      run: |
        cd extension.chrome
        npm run typecheck
        
    - name: Run unit tests
      run: |
        cd extension.chrome
        npm test -- --coverage
        
    - name: Build extension
      run: |
        cd extension.chrome
        npm run build
        
    - name: Run E2E tests
      run: |
        cd extension.chrome
        npm run test:e2e
```

### 6. Automated Load Testing

Test extension performance:
```javascript
// tests/performance/load.test.js
const { performance } = require('perf_hooks');

describe('Extension Performance', () => {
  test('popup loads within 500ms', async () => {
    const start = performance.now();
    
    // Load popup
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForSelector('#app');
    
    const loadTime = performance.now() - start;
    expect(loadTime).toBeLessThan(500);
  });

  test('handles 1000 messages without crashing', async () => {
    const messages = Array(1000).fill({
      type: 'TEST_MESSAGE',
      data: { timestamp: Date.now() }
    });

    for (const msg of messages) {
      await chrome.runtime.sendMessage(msg);
    }

    // Check extension still responsive
    const response = await chrome.runtime.sendMessage({ type: 'PING' });
    expect(response).toEqual({ type: 'PONG' });
  });
});
```

### 7. Security Testing

Automated security checks:
```javascript
// tests/security/permissions.test.js
describe('Extension Security', () => {
  test('does not request excessive permissions', () => {
    const manifest = require('../../manifest.json');
    const dangerousPerms = ['<all_urls>', 'webNavigation', 'proxy'];
    
    const hasUnsafePerms = manifest.permissions.some(perm => 
      dangerousPerms.includes(perm)
    );
    
    expect(hasUnsafePerms).toBe(false);
  });

  test('content security policy is strict', () => {
    const manifest = require('../../manifest.json');
    expect(manifest.content_security_policy).toContain("script-src 'self'");
    expect(manifest.content_security_policy).not.toContain("'unsafe-eval'");
  });
});
```

## Running All Tests

Create a comprehensive test script:
```json
// package.json
{
  "scripts": {
    "test:all": "npm run lint && npm run typecheck && npm test && npm run test:e2e",
    "test:ci": "npm run test:all -- --ci --coverage",
    "test:e2e": "jest --config jest.e2e.config.js",
    "test:watch:all": "concurrently \"npm:test:watch\" \"npm:test:e2e:watch\""
  }
}
```

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock External Services**: Don't rely on real APIs in tests
3. **Test User Flows**: Focus on real user scenarios
4. **Performance Benchmarks**: Set and monitor performance targets
5. **Security Scanning**: Regular automated security checks
6. **Visual Regression**: Screenshot comparison for UI changes
7. **Accessibility Testing**: Automated a11y checks

## Next Steps

1. Set up Puppeteer for E2E testing
2. Add performance benchmarks
3. Configure CI/CD pipeline
4. Add visual regression testing
5. Set up automated security scanning