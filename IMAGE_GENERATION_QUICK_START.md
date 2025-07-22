# Image Generation Quick Start Guide

## 🚀 Quick Start

### 1. Start the Server
```bash
cd sdk/server
npm install
npm run dev
```

### 2. Run Image Generation
```bash
./generate-image.sh "a cat playing piano"
```

## 📋 Event Flow

```
User → generate-image.sh → WebSocket → ImageRequestReceived → Handler
                                                                  ↓
User ← Success Message ← ImageDownloaded ← Download Service ← Generate
```

## 🔑 Key Files

### Already Implemented ✅
- `sdk/contracts/src/custom-events.ts` - Event definitions
- `generate-image.sh` - Shell script wrapper
- `sdk/test-image-integration.ts` - Integration test

### Need Implementation 🚧
- `sdk/server/src/handlers/image-handler.ts` - Event handler (template provided)
- ChatGPT API integration
- Download service integration

## 📝 Event Structures

### ImageRequestReceived
```typescript
{
  project?: string;    // Optional
  chat?: string;       // Optional - create new if null
  prompt: string;      // Required
  metadata?: {
    requestId?: string;
    downloadFolder?: string;
  }
}
```

### ImageDownloaded
```typescript
{
  path: string;        // Required - file path
  metadata?: {
    size?: number;
    mimeType?: string;
    requestId?: string;
  }
}
```

## 🧪 Testing

### Quick Test
```bash
# Basic test
./generate-image.sh "test prompt"

# Custom folder
./generate-image.sh "test" ~/Pictures/

# Run integration test
cd sdk
npm run test:image-integration
```

## 🐛 Debugging

### Check Server Logs
```bash
# In server terminal
npm run dev
# Watch for incoming events
```

### Test WebSocket Connection
```bash
# Install wscat
npm install -g wscat

# Connect to server
wscat -c ws://localhost:8080

# Send test event
{"type":"semantest/custom/image/request/received","payload":{"prompt":"test"}}
```

## ⚡ Common Issues

### Server Not Running
```
❌ WebSocket error: connect ECONNREFUSED
```
**Fix**: Start the server with `npm run dev`

### Permission Denied
```
❌ Error: EACCES: permission denied
```
**Fix**: Check folder permissions or use default ~/Downloads/

### Module Not Found
```
❌ Error: Cannot find module 'ws'
```
**Fix**: Script will auto-install, or run `npm install ws`

## 🎯 Success Criteria

- ✅ Shell script sends event successfully
- ✅ Server receives and processes event
- ✅ Image downloads to specified folder
- ✅ User sees success message with path
- ✅ Events follow correct structure

## 📞 Need Help?

1. Check server logs for errors
2. Verify WebSocket connection
3. Test with integration script
4. Review event structures
5. Ask project manager for clarification