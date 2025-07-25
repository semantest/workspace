#!/usr/bin/env bash
# Simple test script to send image request via WebSocket

PROMPT="${1:-Generate a beautiful sunset}"

echo "🎨 Sending image request..."
echo "Prompt: $PROMPT"

# Create simple Node.js script to send WebSocket message
cat > /tmp/send-image-request.js << 'EOF'
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3004');
const prompt = process.argv[2];

ws.on('open', () => {
  console.log('✅ Connected to WebSocket');
  
  // Send message in the format the server expects
  const message = {
    id: `msg-${Date.now()}`,
    type: 'event',
    timestamp: Date.now(),
    payload: {
      id: `evt-${Date.now()}`,
      type: 'semantest/custom/image/request/received',
      timestamp: Date.now(),
      payload: {
        prompt: prompt,
        requestId: `req-${Date.now()}`
      }
    }
  };
  
  console.log('📤 Sending:', JSON.stringify(message, null, 2));
  ws.send(JSON.stringify(message));
  
  // Close after sending
  setTimeout(() => {
    ws.close();
    console.log('✅ Message sent!');
  }, 1000);
});

ws.on('error', (err) => {
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});
EOF

# Run it
node /tmp/send-image-request.js "$PROMPT"

# Cleanup
rm -f /tmp/send-image-request.js
