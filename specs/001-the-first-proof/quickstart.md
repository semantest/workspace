# Quick Start: Image Generation via Browser Automation

## Prerequisites

1. **Node.js**: Version 16+ installed
2. **Chrome Browser**: Latest version
3. **npm**: Version 8+ installed
4. **ChatGPT Account**: Active account with image generation access

## Setup Steps

### 1. Install Dependencies
```bash
# From workspace root
npm install

# Install workspace dependencies
npm run install:all
```

### 2. Build the Project
```bash
# Build all modules
npm run build
```

### 3. Start the Server
```bash
# Terminal 1: Start the Node.js server
cd nodejs.server
npm start

# Server should show:
# ✅ HTTP Server listening on port 8080
# ✅ WebSocket Server listening on port 8081
```

### 4. Load Chrome Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `extension.chrome/dist` directory
5. Extension should appear with "Semantest" name

### 5. Open ChatGPT
1. Navigate to https://chatgpt.com
2. Log in to your account
3. Ensure you can manually generate images (test with "a red circle")

## Running Your First Test

### Basic Image Generation
```bash
# Terminal 2: Send a test request via CLI
cd typescript.client
npm run cli -- generate-image \
  --prompt "a green house with a red door" \
  --filename "green-house.png" \
  --folder "$HOME/Downloads"

# Expected output:
# ✅ Request sent: <correlationId>
# ⏳ Waiting for image generation...
# ✅ Image downloaded: ~/Downloads/green-house.png
```

### Verify the Flow
1. **CLI Output**: Should show request accepted
2. **Server Logs**: Should show WebSocket message routing
3. **Extension Icon**: Should briefly show activity
4. **ChatGPT Tab**: Should show prompt being entered
5. **Downloads Folder**: Should contain the generated image

## Testing the Complete Flow

### Run Integration Tests
```bash
# From workspace root
npm test

# Should show:
# PASS Contract tests (WebSocket protocol)
# PASS Integration tests (CLI to Server)
# PASS Integration tests (Server to Extension)
# PASS E2E test (Full flow)
```

### Manual Validation Steps
1. **Test Queue**: Send multiple requests rapidly
   ```bash
   npm run cli -- generate-image --prompt "test 1" --filename "test1.png" --folder "$HOME/Downloads"
   npm run cli -- generate-image --prompt "test 2" --filename "test2.png" --folder "$HOME/Downloads"
   ```
   Both should complete sequentially

2. **Test Error Handling**: Send invalid request
   ```bash
   npm run cli -- generate-image --prompt "" --filename "test.png" --folder "$HOME/Downloads"
   # Should show: Error: Prompt is required
   ```

3. **Test Connection Recovery**: 
   - Stop the server (Ctrl+C in Terminal 1)
   - Extension should show disconnected state
   - Restart server
   - Extension should automatically reconnect

## Monitoring

### Server Health Check
```bash
curl http://localhost:8080/health

# Expected response:
{
  "status": "healthy",
  "websocket": {
    "connected": true,
    "clients": 1
  },
  "queue": {
    "size": 0,
    "processing": 0
  }
}
```

### Check Request Status
```bash
# Using the correlationId from a previous request
curl http://localhost:8080/status/<correlationId>

# Shows current status: pending, processing, completed, or failed
```

## Troubleshooting

### Extension Not Connecting
1. Check extension is loaded in Chrome
2. Verify server is running on ports 8080/8081
3. Check browser console for errors (F12 → Console)
4. Reload extension from chrome://extensions/

### Image Not Downloading
1. Verify download folder exists and is writable
2. Check Chrome download settings
3. Ensure ChatGPT successfully generated the image
4. Check server logs for error messages

### WebSocket Connection Issues
1. Verify no firewall blocking port 8081
2. Check for other processes using the port: `lsof -i :8081`
3. Restart both server and extension
4. Clear browser cache and reload

## Configuration

### Environment Variables
```bash
# Create .env file in nodejs.server/
IMAGE_GENERATION_TIMEOUT=300000  # 5 minutes in ms
MAX_QUEUE_SIZE=100               # Maximum pending requests
MAX_FILE_SIZE=52428800           # 50MB in bytes
WEBSOCKET_PORT=8081
HTTP_PORT=8080
```

### CLI Options
```bash
npm run cli -- generate-image --help

Options:
  --prompt, -p     Text prompt for image generation [required]
  --filename, -f   Output filename [required]
  --folder, -d     Download folder path [required]
  --domain         AI tool domain [default: chatgpt.com]
  --timeout        Generation timeout in seconds [default: 300]
```

## Success Criteria

✅ **The test is successful when:**
1. CLI command executes without errors
2. Server logs show event routing
3. ChatGPT tab shows automated interaction
4. Image file appears in specified folder
5. File has the specified name (or timestamped variant)
6. Integration tests pass

## Next Steps

After successful quickstart:
1. Review generated image quality
2. Test with different prompt types
3. Measure generation time for various prompts
4. Test error scenarios (network loss, timeout)
5. Run performance tests with multiple requests