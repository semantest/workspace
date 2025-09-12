const WebSocket = require('ws');

console.log('Testing WebSocket connection to localhost:8081...');
const ws = new WebSocket('ws://localhost:8081');

ws.on('open', () => {
    console.log('✅ WebSocket connected successfully!');
    console.log('Sending test message...');
    ws.send(JSON.stringify({
        type: 'TEST',
        payload: { message: 'Hello from test script' }
    }));
});

ws.on('message', (data) => {
    console.log('📬 Received:', data.toString());
});

ws.on('error', (error) => {
    console.log('❌ WebSocket error:', error.message);
});

setTimeout(() => {
    console.log('Closing connection...');
    ws.close();
    process.exit(0);
}, 2000);
