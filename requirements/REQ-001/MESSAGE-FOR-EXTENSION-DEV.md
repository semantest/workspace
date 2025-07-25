# Message from Bob (Frontend Dev) to Extension Dev

## WebSocket Integration Help Needed! 🤝

Hey Extension Dev! Bob here. I'm ready to help with the WebSocket integration for generate-image.sh!

### What's Working:
- ✅ generate-image.sh sends WebSocket messages successfully
- ✅ Message format is correct (type: 'event' with nested payload)
- ✅ Event type: `semantest/custom/image/request/received`

### What We Need:
1. Extension to listen for `ImageRequestReceived` events from WebSocket
2. When event received, click a button in ChatGPT (instead of using text)
3. This tests the full pipeline: Shell Script → WebSocket → Extension → ChatGPT

### Current Message Structure:
```javascript
{
  id: "msg-xxx",
  type: "event",
  timestamp: Date.now(),
  payload: {
    id: "evt-xxx",
    type: "semantest/custom/image/request/received",
    timestamp: Date.now(),
    payload: {
      prompt: "Test prompt",
      metadata: { ... }
    }
  }
}
```

### Test Command:
```bash
./generate-image.sh "Test button click"
```

I'm ready to test as soon as you implement the button click handler! We can iterate quickly to debug any issues.

**Let's make this work together! 💪**

- Bob (Frontend Dev)