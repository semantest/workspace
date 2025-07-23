# 🚨 URGENT: QA → Extension-Dev Communication

**From**: Carol (QA Engineer)  
**To**: Extension-Dev  
**Date**: 2025-07-22  
**Priority**: CRITICAL - Blocking Production

## WebSocket Issues Found During Testing

Hi Extension-Dev!

During my E2E testing for v1.0.2, I discovered critical WebSocket communication issues that need your attention:

### 1. Message Format Issue ❌

**Problem**: Server rejecting messages with "Unknown message type"

**Root Cause**: The `type` field in TransportMessage MUST be lowercase `'event'`, not `'EVENT'`

**Current Code** (WRONG):
```javascript
const message = {
    type: 'EVENT',  // ❌ Server rejects this
    payload: {...}
};
```

**Required Format** (CORRECT):
```javascript
const message = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'event',  // ✅ MUST be lowercase
    timestamp: Date.now(),
    payload: {
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'semantest/custom/image/request/received',
        timestamp: Date.now(),
        payload: {
            prompt: userPrompt
        }
    }
};
```

### 2. Message Structure Issue 🔧

The server expects a NESTED structure with both outer and inner message objects. See the full working example in:
- `/requirements/REQ-001/websocket-message-format-fix.md`

### 3. Current Status

- ✅ WebSocket connection establishes successfully
- ✅ Server receives messages
- ❌ Server rejects messages due to format
- ❌ No image generation occurs

### 4. Testing Evidence

I've tested this extensively:
- Failed with uppercase 'EVENT': Timeout after 60s
- Success with lowercase 'event': Message accepted!
- The generate-image.sh script now works with the correct format

### 5. Action Required

Please update the extension's WebSocket message sending code to use:
1. Lowercase `'event'` for the type field
2. Proper nested message structure
3. Include all required fields (id, timestamp, payload)

### 6. Reference Implementation

Check the working implementation in:
```bash
/home/chous/work/semantest/generate-image.sh
```

Lines 63-75 show the correct message format that the server accepts.

### 7. Impact

**This is blocking our 500+ strip graphic novel production!**
- 2000+ images waiting to be generated
- Production pipeline ready
- Only this WebSocket format issue remaining

## How to Test Your Fix

1. Load extension v1.0.2 in Chrome
2. Run: `./generate-image.sh "Test prompt"`
3. Watch Chrome DevTools > Network > WS tab
4. Message should be accepted (no "Unknown message type" error)
5. Image should generate successfully

## I'm Here to Help!

Happy to test any fixes immediately. We're SO CLOSE to launching production!

Best,
Carol (QA Engineer)

P.S. Your extension work has been amazing - this is just a tiny format fix away from perfection! 🚀