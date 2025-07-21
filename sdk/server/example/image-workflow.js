/**
 * Example implementation of image generation workflow
 * Orchestrator requirement: ImageRequestReceived → Process → ImageDownloaded
 */

const { WebSocketServer } = require('../dist/server');
const { MessageType } = require('@semantest/core');
const { ImageEventTypes } = require('@semantest/contracts');

// Mock image generation service
async function generateImage(prompt) {
  // Simulate image generation delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Return mock image path
  return `/generated/images/${Date.now()}-${prompt.slice(0, 20).replace(/\s+/g, '-')}.png`;
}

// Create server with image workflow handler
const server = new WebSocketServer({
  port: 8080,
  onConnection: (clientId) => {
    console.log(`Client ${clientId} connected`);
  }
});

// Handle ImageRequestReceived events
server.on('message', async (message, clientId) => {
  if (message.type === MessageType.EVENT && 
      message.payload.type === ImageEventTypes.REQUEST_RECEIVED) {
    
    const event = message.payload;
    const { project, chat, prompt, metadata } = event.payload;
    
    console.log(`Image request from ${clientId}:`, { project, chat, prompt });
    
    // Logic: If project is null, don't create project
    if (project === null) {
      console.log('No project specified, processing without project context');
    }
    
    // Logic: If chat is null, create new chat
    if (chat === null) {
      const newChatId = `chat-${Date.now()}`;
      console.log(`Creating new chat: ${newChatId}`);
    }
    
    try {
      // Send generation started event
      await server.sendToClient(clientId, {
        id: `${Date.now()}-started`,
        type: MessageType.EVENT,
        timestamp: Date.now(),
        payload: {
          id: `evt-${Date.now()}`,
          type: ImageEventTypes.GENERATION_STARTED,
          timestamp: Date.now(),
          payload: { prompt, requestId: metadata?.requestId }
        }
      });
      
      // Generate image
      const imagePath = await generateImage(prompt);
      
      // Send ImageDownloaded event
      await server.sendToClient(clientId, {
        id: `${Date.now()}-complete`,
        type: MessageType.EVENT,
        timestamp: Date.now(),
        payload: {
          id: `evt-${Date.now()}`,
          type: ImageEventTypes.DOWNLOADED,
          timestamp: Date.now(),
          payload: {
            path: imagePath,
            metadata: {
              size: 1024 * 512, // Mock 512KB
              mimeType: 'image/png',
              width: 1024,
              height: 1024,
              requestId: metadata?.requestId
            }
          }
        }
      });
      
      console.log(`Image generated and downloaded: ${imagePath}`);
      
    } catch (error) {
      // Send failure event
      await server.sendToClient(clientId, {
        id: `${Date.now()}-failed`,
        type: MessageType.EVENT,
        timestamp: Date.now(),
        payload: {
          id: `evt-${Date.now()}`,
          type: ImageEventTypes.GENERATION_FAILED,
          timestamp: Date.now(),
          payload: {
            error: error.message,
            requestId: metadata?.requestId
          }
        }
      });
    }
  }
});

// Start server
server.start().then(() => {
  console.log('Image workflow server running on ws://localhost:8080');
  console.log('Workflow: ImageRequestReceived → Process → ImageDownloaded');
});