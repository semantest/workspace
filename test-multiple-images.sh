#!/usr/bin/env bash

# Test script for sending multiple image generation requests
# This demonstrates the queue functionality

# Configuration
WS_URL="ws://localhost:3004"
TIMEOUT=300  # 5 minutes total timeout

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🎨 Multiple Image Generation Test${NC}"
echo -e "${PURPLE}================================${NC}"
echo ""

# Check if server is running
if ! nc -z localhost 3004 2>/dev/null; then
    echo "❌ Semantest server is not running on localhost:3004"
    echo "Please start it with: cd sdk/server && npm run dev"
    exit 1
fi

# Array of prompts to generate
PROMPTS=(
    "A futuristic robot painting on a holographic canvas"
    "A cyberpunk city at sunset with neon lights"
    "A steampunk airship floating above Victorian London"
    "A magical forest with glowing mushrooms at night"
    "An underwater city with bioluminescent creatures"
)

# Create Node.js script for sending multiple requests
TMP_SCRIPT="/tmp/semantest-multi-image-$$.js"
cat > "$TMP_SCRIPT" << 'EOF'
const WebSocket = require('ws');

const WS_URL = process.argv[2];
const prompts = JSON.parse(process.argv[3]);

const ws = new WebSocket(WS_URL);
let requestsSent = 0;
let responsesReceived = 0;
const requests = {};

ws.on('open', () => {
    console.log('✅ Connected to Semantest server');
    
    // Send all requests with a small delay between each
    prompts.forEach((prompt, index) => {
        setTimeout(() => {
            const requestId = `img-${Date.now()}-${index}`;
            requests[requestId] = {
                prompt: prompt,
                sent: Date.now(),
                status: 'sent'
            };
            
            const message = {
                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'event',
                timestamp: Date.now(),
                payload: {
                    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: 'semantest/custom/image/download/requested',
                    timestamp: Date.now(),
                    payload: {
                        prompt: prompt,
                        metadata: {
                            requestId: requestId,
                            index: index,
                            timestamp: Date.now()
                        }
                    }
                }
            };
            
            console.log(`📤 [${index + 1}/${prompts.length}] Sending: "${prompt}"`);
            ws.send(JSON.stringify(message));
            requestsSent++;
        }, index * 500); // 500ms delay between requests
    });
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data.toString());
        
        // Handle different message types
        if (message.type === 'event' && message.payload) {
            const eventType = message.payload.type;
            const eventData = message.payload.payload;
            
            if (eventType === 'addon:response' && eventData.queued) {
                console.log(`📋 Request queued: ID ${eventData.requestId}`);
            } else if (eventType === 'addon:queue:status') {
                console.log(`📊 Queue status: ${eventData.queue.length} items waiting`);
            } else if (eventType === 'addon:request:status') {
                const req = eventData.request;
                console.log(`🔄 Request ${req.id} status: ${req.status}`);
                
                if (req.status === 'completed' || req.status === 'failed') {
                    responsesReceived++;
                    requests[req.id].status = req.status;
                    requests[req.id].completed = Date.now();
                }
            } else if (eventType === 'semantest/custom/image/downloaded') {
                console.log(`\n🎉 Image downloaded!`);
                console.log(`📍 File: ${eventData.filename}`);
                console.log(`📏 Size: ${eventData.size} bytes`);
                responsesReceived++;
            }
        } else if (message.type === 'addon:response') {
            // Direct response format
            if (message.queued) {
                console.log(`📋 Request queued`);
            }
        }
        
        // Check if all requests are processed
        if (responsesReceived >= requestsSent && requestsSent === prompts.length) {
            console.log('\n✅ All requests processed!');
            
            // Print summary
            console.log('\n📊 Summary:');
            console.log(`Total requests: ${requestsSent}`);
            console.log(`Total responses: ${responsesReceived}`);
            
            // Calculate time taken
            const times = Object.values(requests)
                .filter(r => r.completed)
                .map(r => r.completed - r.sent);
            
            if (times.length > 0) {
                const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
                console.log(`Average time: ${Math.round(avgTime / 1000)}s`);
            }
            
            ws.close();
            process.exit(0);
        }
    } catch (error) {
        console.error('Error parsing message:', error.message);
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    process.exit(1);
});

ws.on('close', () => {
    console.log('Connection closed');
});

// Timeout after 5 minutes
setTimeout(() => {
    console.error('\n❌ Timeout: Test did not complete within 5 minutes');
    console.log(`Sent: ${requestsSent}, Received: ${responsesReceived}`);
    process.exit(1);
}, 300000);
EOF

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Set NODE_PATH to include sdk's node_modules
export NODE_PATH="$SCRIPT_DIR/sdk/node_modules:$NODE_PATH"

# Convert prompts array to JSON
PROMPTS_JSON=$(printf '%s\n' "${PROMPTS[@]}" | jq -R . | jq -s .)

echo -e "${BLUE}📋 Sending ${#PROMPTS[@]} image generation requests...${NC}"
echo ""

# Run the test
node "$TMP_SCRIPT" "$WS_URL" "$PROMPTS_JSON"

# Cleanup
rm -f "$TMP_SCRIPT"