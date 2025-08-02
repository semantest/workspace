# Migration Guide: From Dynamic Loading to Semantest-Powered Extensions

## Overview

This guide helps you migrate from the monolithic Semantest extension with dynamic addon loading to separate platform-specific extensions.

## Why Migrate?

1. **CSP Compliance**: Sites like ChatGPT have strict Content Security Policies that block dynamic code execution
2. **Better Performance**: Smaller, focused extensions load faster
3. **Easier Maintenance**: Independent release cycles for each platform
4. **Enhanced Security**: No dynamic code execution reduces attack surface

## Migration Steps

### Step 1: Identify Your Platforms

List all platforms you want to support:
- ChatGPT
- Claude
- Bard
- Custom sites

### Step 2: Create Platform-Specific Extensions

For each platform:

```bash
# Clone the template
git clone https://github.com/semantest/extension-template semantest-[platform]
cd semantest-[platform]

# Install dependencies
npm install

# Copy your addon files
cp -r /path/to/old/extension/src/addons/[platform]/* src/addon/
```

### Step 3: Update Configuration

#### manifest.json
Update the manifest for your platform:

```json
{
  "name": "Semantest for [Platform]",
  "host_permissions": [
    "https://[platform-domain]/*",
    "ws://localhost:3004"
  ],
  "content_scripts": [
    {
      "matches": ["https://[platform-domain]/*"],
      "js": ["dist/content.js"]
    }
  ]
}
```

#### Service Worker
No changes needed - the template handles WebSocket communication.

#### Content Script
The template provides the bridge. You may need to adjust DOM element detection.

### Step 4: Test Your Extension

1. Build the extension:
```bash
npm run build
```

2. Load in Chrome:
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

3. Test all features:
   - WebSocket connection
   - Message forwarding
   - Platform-specific features

### Step 5: Package for Distribution

```bash
npm run package
```

This creates a `.zip` file ready for Chrome Web Store submission.

## Code Changes Required

### From Dynamic Bundle Loading

Before (dynamic loading):
```javascript
// Old approach - fails with CSP
const bundle = await fetch('http://localhost:3003/api/addons/chatgpt/bundle');
const code = await bundle.text();
new Function(code)(); // CSP blocks this
```

After (direct bundling):
```javascript
// New approach - bundled directly
import './addon/index.js';
// All addon code is bundled at build time
```

### From Monolithic to Modular

Before (all addons in one extension):
```
extension.chrome/
├── src/addons/
│   ├── chatgpt/
│   ├── claude/
│   └── bard/
```

After (separate extensions):
```
semantest-chatgpt/
├── src/addon/
│   └── [chatgpt files only]

semantest-claude/
├── src/addon/
│   └── [claude files only]
```

### WebSocket Events

No changes! Events remain the same:

```javascript
// Still works exactly the same
{
  "type": "semantest/custom/image/download/requested",
  "payload": {
    "text": "Generate an image"
  }
}
```

## Common Issues

### Issue: Addon files have dependencies

**Solution**: Update webpack config to bundle dependencies:

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    fallback: {
      "crypto": require.resolve("crypto-browserify"),
      // Add other polyfills as needed
    }
  }
};
```

### Issue: Global variables not available

**Solution**: Explicitly attach to window:

```javascript
// Before
const myAddon = { /* ... */ };

// After
window.myAddon = { /* ... */ };
```

### Issue: Chrome runtime API not available in addon

**Solution**: Use the bridge for communication:

```javascript
// Instead of chrome.runtime.sendMessage
window.semantestBridge.sendToExtension({
  type: 'my-message',
  data: { /* ... */ }
});
```

## Benefits After Migration

1. **Faster Load Times**: 50-70% reduction in extension size
2. **No CSP Issues**: All code is static and bundled
3. **Better User Experience**: Clear purpose for each extension
4. **Easier Debugging**: Smaller codebase to troubleshoot
5. **Independent Updates**: Fix platform-specific issues without affecting others

## Next Steps

1. Create a GitHub repository for each extension
2. Set up CI/CD for automated builds
3. Submit to Chrome Web Store
4. Document platform-specific features
5. Create user guides for each extension

## Support

If you encounter issues during migration:
1. Check the [template repository](https://github.com/semantest/extension-template) for updates
2. Open an issue in the specific extension repository
3. Join our [Discord community](https://discord.gg/semantest) for help