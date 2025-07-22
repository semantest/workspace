# Image Handler Implementation

## Overview

The Image Handler implements the `ImageRequestReceived` event handling for the Semantest WebSocket server. It processes image generation requests, manages chat creation, downloads images, and emits completion events.

## Key Features

1. **Event-Driven Architecture**: Listens for `ImageRequestReceived` events from the WebSocket server
2. **Automatic Chat Creation**: Creates new chat sessions when `chat` is null
3. **Flexible Download Location**: Supports custom download folders via metadata
4. **Progress Tracking**: Emits events for generation started, completed, and failed states
5. **Error Handling**: Comprehensive error handling with event emission

## Usage

### Starting the Server with Image Handler

```bash
# From sdk/server directory
npm run start:image-server

# Or with custom port and download directory
PORT=3000 DOWNLOAD_DIR=/path/to/downloads npm run start:image-server
```

### Testing the Implementation

```bash
# Run the test client
npm run test:image-handler
```

### Integration Example

```typescript
import { WebSocketServer } from '@semantest/server';
import { attachImageHandler } from '@semantest/server';

// Create WebSocket server
const server = new WebSocketServer({ port: 8080 });

// Attach image handler with custom download directory
const imageHandler = attachImageHandler(server, {
  downloadDir: '/custom/download/path'
});

// Start server
await server.start();
```

## Event Flow

1. **Client → Server**: Send `ImageRequestReceived` event
   ```json
   {
     "type": "custom/image/request/received",
     "payload": {
       "prompt": "A beautiful sunset",
       "project": "my-project",
       "chat": null,  // Will create new chat
       "metadata": {
         "requestId": "unique-id",
         "downloadFolder": "/custom/path"
       }
     }
   }
   ```

2. **Server → Handler**: Forward event to image handler
   - Handler processes the request
   - Creates new chat if needed
   - Downloads/generates image
   - Saves to specified folder

3. **Handler → Server → Clients**: Broadcast completion events
   - `ImageGenerationStarted`
   - `ImageGenerationCompleted`
   - `ImageDownloaded` (with file path)
   - `ImageGenerationFailed` (on error)

## Implementation Details

### File Structure

```
handlers/
├── image-handler.ts              # Core handler implementation
├── image-handler-integration.ts  # WebSocket server integration
└── README.md                     # This file
```

### Key Components

- **ImageEventHandler**: Main handler class that processes requests
- **ImageHandlerIntegration**: Connects handler to WebSocket server
- **attachImageHandler**: Factory function for easy integration

### Mock Implementation

Currently uses placeholder images for testing. In production:
- Replace `generateImage()` with actual ChatGPT API calls
- Implement real chat creation logic
- Add authentication and rate limiting

## Future Enhancements

1. **Real Image Generation**: Integrate with OpenAI DALL-E or similar APIs
2. **Chat Management**: Implement actual ChatGPT session management
3. **Image Processing**: Add image optimization and format conversion
4. **Storage Options**: Support cloud storage (S3, GCS, etc.)
5. **Caching**: Implement prompt-based caching to avoid regeneration
6. **Analytics**: Track generation metrics and usage patterns