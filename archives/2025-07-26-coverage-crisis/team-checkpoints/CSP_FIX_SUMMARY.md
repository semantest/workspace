# 🔧 Content Security Policy Fix

## Issue
Extension pages showing CSP error:
```
Refused to apply inline style because it violates the following Content Security Policy directive: "default-src 'self'"
```

## Fix Applied
Updated `manifest.json` to add `style-src` directive:
```json
"content_security_policy": {
  "extension_pages": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; connect-src 'self' http://localhost:* ws://localhost:*;"
}
```

## What Changed
- Added: `style-src 'self' 'unsafe-inline';`
- This allows the extension to use inline styles in popup and other extension pages

## Next Steps
1. **Reload the extension** in Chrome:
   - Go to `chrome://extensions/`
   - Click refresh button on Semantest
   
2. **Test again**:
   - Click extension icon
   - Popup should now display correctly without CSP errors
   - Try the Image Download Test

## Note
The `'unsafe-inline'` is needed because the extension uses inline styles. In a future update, we could refactor to use external stylesheets for better security.