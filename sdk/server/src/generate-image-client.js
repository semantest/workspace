#!/usr/bin/env node

const WebSocket = require('ws');

// Arguments from command line
const WS_URL = process.argv[2] || 'ws://localhost:8080';
const PROMPT = process.argv[3] || 'A futuristic robot coding';
const DOWNLOAD_FOLDER = process.argv[4] || process.env.HOME + '/Downloads';
const TIMEOUT = (parseInt(process.argv[5]) || 30) * 1000;

const ws = new WebSocket(WS_URL);
let timeoutId;

// Generate unique IDs
const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const eventId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const requestId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

ws.on('open', () => {
    console.log('✅ Connected to Semantest server');
    
    // Create properly formatted WebSocket message
    const transportMessage = {
        id: messageId,
        type: 'EVENT',  // MessageType.EVENT
        timestamp: Date.now(),
        payload: {
            id: eventId,
            type: 'custom/image/request/received',  // ImageEventTypes.REQUEST_RECEIVED
            timestamp: Date.now(),
            payload: {
                prompt: PROMPT,
                project: null,  // Optional
                chat: null,     // Will create new chat
                metadata: {
                    requestId: requestId,
                    userId: 'cli-user',
                    timestamp: Date.now(),
                    downloadFolder: DOWNLOAD_FOLDER
                }
            }
        }
    };
    
    console.log('📤 Sending ImageRequestReceived event...');
    console.log(`   Prompt: ${PROMPT}`);
    console.log(`   Download folder: ${DOWNLOAD_FOLDER}`);
    console.log(`   Request ID: ${requestId}`);
    
    ws.send(JSON.stringify(transportMessage));
    
    // Set timeout
    timeoutId = setTimeout(() => {
        console.error('❌ Timeout: No response received within ' + (TIMEOUT/1000) + ' seconds');
        process.exit(1);
    }, TIMEOUT);
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data.toString());
        
        // Check if it's an EVENT message
        if (message.type === 'EVENT' && message.payload) {
            const event = message.payload;
            
            // Log all events for debugging
            console.log(`📨 Received event: ${event.type}`);
            
            switch (event.type) {
                case 'custom/image/generation/started':
                    console.log('🎨 Image generation started!');
                    break;
                    
                case 'custom/image/generation/completed':
                    console.log('🎉 Image generation completed!');
                    break;
                    
                case 'custom/image/downloaded':
                    clearTimeout(timeoutId);
                    console.log('\n✅ SUCCESS! Image downloaded');
                    console.log(`📁 File saved to: ${event.payload.path}`);
                    if (event.payload.metadata) {
                        console.log('📊 File size:', event.payload.metadata.size, 'bytes');
                        console.log('📝 MIME type:', event.payload.metadata.mimeType);
                    }
                    ws.close();
                    process.exit(0);
                    break;
                    
                case 'custom/image/generation/failed':
                    clearTimeout(timeoutId);
                    console.error('❌ Image generation failed:', event.payload.error);
                    ws.close();
                    process.exit(1);
                    break;
                    
                case 'image.error':
                    clearTimeout(timeoutId);
                    console.error('❌ Error:', event.payload.message);
                    ws.close();
                    process.exit(1);
                    break;
            }
        } else if (message.type === 'ERROR') {
            clearTimeout(timeoutId);
            console.error('❌ Server error:', message.payload.message || 'Unknown error');
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
    console.error('Make sure the Semantest server is running on ' + WS_URL);
    process.exit(1);
});

ws.on('close', () => {
    clearTimeout(timeoutId);
    console.log('🔌 Connection closed');
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n⚠️  Interrupted by user');
    if (ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
    process.exit(0);
});