# WebSocket Message Format Fix

## Issue
The generate-image.sh script sends incorrectly formatted messages to the WebSocket server.

## Root Cause
The script sends:
```javascript
{
    type: "semantest/custom/image/request/received",
    payload: { prompt, metadata }
}
```

But based on the integration tests, the server expects:
```javascript
{
    id: 'msg-123',
    type: MessageType.EVENT,  // Must be 'event' (lowercase)
    timestamp: Date.now(),
    payload: {
        id: 'event-123',
        type: 'semantest/custom/image/request/received',  // Custom event type goes here
        timestamp: Date.now(),
        payload: { prompt, metadata }
    }
}
```

## Complete Fix for generate-image.sh

Replace the WebSocket client section (around line 209-220) with:

```javascript
ws.on('open', () => {
    console.log('✅ Connected to Semantest server');
    
    // Create properly formatted message
    const message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'event',  // MUST be lowercase 'event'
        timestamp: Date.now(),
        payload: {
            id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: EVENT_TYPE,  // This is 'semantest/custom/image/request/received'
            timestamp: Date.now(),
            payload: PAYLOAD
        }
    };
    
    console.log('📤 Sending ImageRequestReceived event...');
    ws.send(JSON.stringify(message));
    
    // Set timeout
    timeoutId = setTimeout(() => {
        console.error('❌ Timeout: No response received within ' + (TIMEOUT/1000) + ' seconds');
        process.exit(1);
    }, TIMEOUT);
});
```

## Key Points
1. `type` must be lowercase `'event'` not `'EVENT'`
2. Message needs unique `id` field
3. Message needs `timestamp` field
4. The custom event type goes in `payload.type`
5. The actual event payload goes in `payload.payload`

## Expected Server Response
Once fixed, the server should accept the message and either:
1. Send back an ImageDownloaded event
2. Send an error message with details
3. Route the event to appropriate handlers

## Testing
After applying this fix:
```bash
./generate-image.sh "Test prompt"
```

Should result in proper WebSocket communication without "Unknown message type" error.

---
*QA Engineer - Message Format Analysis Complete*