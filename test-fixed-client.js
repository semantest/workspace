const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080');
const TIMEOUT = 30000;

const PAYLOAD = {
    prompt: "A beautiful sunset over mountains",
    metadata: {
        requestId: `img-${Date.now()}-test`,
        downloadFolder: "/home/chous/Downloads",
        timestamp: Date.now()
    }
};

let timeoutId;

ws.on('open', () => {
    console.log('✅ Connected to Semantest server');
    
    // Create properly formatted message
    const message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'event',  // MUST be lowercase 'event'
        timestamp: Date.now(),
        payload: {
            id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'semantest/custom/image/request/received',
            timestamp: Date.now(),
            payload: PAYLOAD
        }
    };
    
    console.log('📤 Sending ImageRequestReceived event...');
    console.log('Message structure:', JSON.stringify(message, null, 2));
    ws.send(JSON.stringify(message));
    
    // Set timeout
    timeoutId = setTimeout(() => {
        console.error('❌ Timeout: No response received within 30 seconds');
        process.exit(1);
    }, TIMEOUT);
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data.toString());
        console.log('📥 Received message type:', message.type);
        
        if (message.type === 'event' && message.payload) {
            console.log('Event type:', message.payload.type);
            
            if (message.payload.type === 'semantest/custom/image/downloaded') {
                clearTimeout(timeoutId);
                console.log('\n🎉 SUCCESS! Image downloaded');
                console.log('📍 File path:', message.payload.payload.path || message.payload.payload.imagePath);
                ws.close();
                process.exit(0);
            }
        } else if (message.type === 'error') {
            clearTimeout(timeoutId);
            console.error('❌ Error:', message.payload?.message || 'Unknown error');
            ws.close();
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error parsing message:', error.message);
    }
});

ws.on('error', (error) => {
    clearTimeout(timeoutId);
    console.error('❌ WebSocket error:', error.message);
    process.exit(1);
});

ws.on('close', () => {
    clearTimeout(timeoutId);
    console.log('Connection closed');
});