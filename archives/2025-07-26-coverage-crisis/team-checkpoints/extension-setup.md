# Chrome Extension CI/CD Setup Guide

## Overview
This repository now includes a complete CI/CD pipeline for a ChatGPT browser extension with automated testing, building, and deployment to the Chrome Web Store.

## Workflows

### 1. Main CI/CD Pipeline (`chrome-extension-ci.yml`)
- **Triggers**: Push to main/develop, pull requests, releases
- **Jobs**:
  - Lint and unit tests with coverage
  - Build extension and create ZIP package
  - Chrome compatibility testing
  - Security scanning
  - Automated Chrome Web Store deployment (on release)

### 2. Automated Testing (`extension-test.yml`)
- **Test Types**:
  - Unit tests (Node 16, 18, 20)
  - Integration tests with Puppeteer
  - E2E tests with Playwright
  - Accessibility tests
  - Performance tests
- **Features**:
  - Code coverage reports
  - Test artifacts storage
  - Multi-browser testing

### 3. Release Workflow (`extension-release.yml`)
- **Manual trigger** with release type selection
- **Features**:
  - Automatic version bumping
  - Release notes generation
  - GitHub release creation
  - Chrome Web Store deployment
  - Beta channel support
  - Rollback on failure

## Required Secrets

Add these secrets to your GitHub repository:

```
CHROME_EXTENSION_ID     # Your extension ID from Chrome Web Store
CHROME_CLIENT_ID        # OAuth client ID for Chrome Web Store API
CHROME_CLIENT_SECRET    # OAuth client secret
CHROME_REFRESH_TOKEN    # OAuth refresh token
SLACK_WEBHOOK          # (Optional) Slack notifications
```

## Project Structure

Expected files in your repository:

```
/
├── manifest.json        # Chrome extension manifest
├── package.json         # Node.js dependencies
├── src/                 # Source code
│   ├── popup.js        # Popup script
│   ├── popup.html      # Popup UI
│   ├── background.js   # Service worker
│   └── content.js      # Content script
├── dist/               # Built extension (git-ignored)
└── tests/              # Test files
```

## Getting Chrome Web Store Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Chrome Web Store API
4. Create OAuth 2.0 credentials
5. Use the [Chrome Web Store API documentation](https://developer.chrome.com/docs/webstore/using_webstore_api/) to get refresh token

## Usage

### Daily Development
```bash
# Install dependencies
npm install

# Run tests
npm test

# Build extension
npm run build

# Lint code
npm run lint
```

### Creating a Release

1. Go to Actions → "Chrome Extension Release Workflow"
2. Click "Run workflow"
3. Select:
   - Release type (patch/minor/major)
   - Release channel (production/beta/dev)
4. The workflow will:
   - Bump version automatically
   - Run all tests
   - Build the extension
   - Create GitHub release
   - Deploy to Chrome Web Store (if production)

### Beta Testing

Beta releases create a GitHub issue for testers with:
- Download links
- Testing checklist
- Feedback collection

## Scripts to Add to package.json

```json
{
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch",
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:report": "jest --coverage --coverageReporters=html",
    "lint": "eslint src/**/*.js",
    "lint:fix": "eslint src/**/*.js --fix"
  }
}
```

## Sample Test Structure

```javascript
// tests/unit/popup.test.js
describe('Popup functionality', () => {
  test('initializes correctly', () => {
    // Test popup initialization
  });
});

// tests/integration/extension.test.js
describe('Extension integration', () => {
  test('communicates with background script', async () => {
    // Test message passing
  });
});
```

## Monitoring

- GitHub Actions dashboard shows all workflow runs
- Failed builds trigger notifications (if Slack configured)
- Test results and coverage reports available as artifacts
- Chrome Web Store provides download and user statistics

## Troubleshooting

### Common Issues

1. **Build fails**: Check Node version and dependencies
2. **Chrome Store upload fails**: Verify API credentials
3. **Tests timeout**: Increase timeout in test config
4. **Extension doesn't load**: Check manifest.json validity

### Local Testing

```bash
# Test the build locally
npm run build

# Load in Chrome
1. Open chrome://extensions/
2. Enable Developer mode
3. Click "Load unpacked"
4. Select the dist/ folder
```

## Security Notes

- Never commit API keys or tokens
- Use GitHub Secrets for sensitive data
- Enable branch protection on main
- Review security scan results
- Keep dependencies updated

## Next Steps

1. Customize the workflows for your specific extension
2. Add more test cases
3. Set up monitoring dashboards
4. Configure auto-updates for users
5. Implement A/B testing for new features