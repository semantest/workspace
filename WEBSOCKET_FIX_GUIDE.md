# WebSocket Event Forwarding Fix

## The Problem
The existing WebSocket server validates events and expects them to start with `custom/`, but we're sending `semantest/custom/image/download/requested`. This causes the server to log "Unknown event type" and not forward the events to the extension.

## The Solution
I've created a custom event forwarder that specifically handles `semantest/custom/*` events and forwards them to all connected clients (like the extension).

## How to Use

### Step 1: Stop Existing Servers
```bash
# Kill any existing process on port 3004
lsof -ti:3004 | xargs kill -9
```

### Step 2: Start Custom Forwarder
```bash
# In the semantest directory
./start-custom-forwarder.sh
```

You should see:
```
🚀 Custom Event Forwarder started on ws://localhost:3004
📋 This server will forward semantest/custom/* events to all clients
🎯 Ready to forward semantest/custom/* events!
```

### Step 3: Reload Extension
1. Go to chrome://extensions/
2. Click reload on Semantest Extension
3. Open the service worker console

### Step 4: Open ChatGPT
1. Navigate to https://chat.openai.com
2. Wait for the addon to load
3. Check that you see "Active Addon: ChatGPT" in the extension popup

### Step 5: Test Image Generation
```bash
./generate-image-async.sh "a beautiful sunset over mountains"
```

### What Should Happen

1. **In Forwarder Console**:
   - ✅ Client connected (from extension)
   - 📨 Received event message
   - 🔄 Forwarding semantest/custom/image/download/requested

2. **In Service Worker Console**:
   - 🔍 Processing WebSocket message
   - 🎯 Image download request detected!
   - 📤 Forwarding to ChatGPT tab

3. **In ChatGPT Tab**:
   - The prompt should appear and start generating

## Alternative: Direct Testing
If you want to bypass the WebSocket server entirely:
1. Open service worker console
2. Copy contents of `test-chatgpt-direct.js`
3. Paste and run
4. This sends the event directly to the addon

## Why This Works
- The custom forwarder doesn't validate event types
- It specifically forwards `semantest/custom/*` events
- It maintains the exact message structure the extension expects
- No modifications needed to the extension or addon code

## Permanent Fix Options
1. Update the server's event validator to accept `semantest/custom/*` events
2. Change the event type in generate-image-async.sh to match server expectations
3. Update the image handler to listen for the correct event type

The custom forwarder is a working solution that requires no code changes!