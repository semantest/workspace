// Test WebSocket client for image generation
const WebSocket = require('./sdk/server/node_modules/ws');

const ws = new WebSocket('ws://localhost:8080');
const requestId = `test-${Date.now()}`;

ws.on('open', () => {
    console.log('✅ Connected to WebSocket server');
    
    // Send ImageRequestReceived event
    const message = {
        id: `msg-${Date.now()}`,
        type: 'EVENT',
        timestamp: Date.now(),
        payload: {
            id: `evt-${Date.now()}`,
            type: 'ImageRequestReceived',
            timestamp: Date.now(),
            payload: {
                prompt: "Test prompt: A beautiful sunset",
                metadata: {
                    requestId: requestId,
                    downloadFolder: "/home/chous/Downloads",
                    timestamp: Date.now()
                }
            }
        }
    };
    
    console.log('📤 Sending ImageRequestReceived event...');
    ws.send(JSON.stringify(message));
    
    // Set timeout
    setTimeout(() => {
        console.log('⏱️ Timeout - no response received');
        ws.close();
        process.exit(1);
    }, 10000);
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data.toString());
        console.log('📥 Received message:', message.type);
        
        if (message.payload && message.payload.type === 'ImageDownloaded') {
            console.log('✅ Image downloaded successfully!');
            console.log('   Path:', message.payload.payload.imagePath);
            ws.close();
            process.exit(0);
        }
    } catch (e) {
        console.error('❌ Error parsing message:', e);
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    process.exit(1);
});

ws.on('close', () => {
    console.log('🔌 Connection closed');
});