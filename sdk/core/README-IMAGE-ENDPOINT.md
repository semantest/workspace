# Image Generation Test Endpoint

This module provides a test implementation for the image generation workflow in the Semantest SDK. It demonstrates the complete event-driven flow from receiving image requests to saving images and emitting completion events.

## Overview

The image generation workflow follows this sequence:
1. **ImageRequestReceived** event is received
2. Image generation is processed (using placeholder images for testing)
3. Image is saved to `~/Downloads/semantest-images/`
4. **ImageDownloaded** event is emitted with the file path

## Components

### 1. ImageGenerationEndpoint (`test-image-endpoint.ts`)

The core endpoint that handles image generation workflow:

```typescript
import { ImageGenerationEndpoint } from '@semantest/core';

const endpoint = new ImageGenerationEndpoint();

// Listen for events
endpoint.on(ImageEventTypes.DOWNLOADED, (event) => {
  console.log('Image saved to:', event.payload.path);
});

// Simulate a request
endpoint.simulateImageRequest('A beautiful sunset', 'project-id', 'chat-id');
```

**Features:**
- Automatic directory creation at `~/Downloads/semantest-images/`
- Event emission for all workflow stages
- File management utilities
- Mock image generation using placeholder service

### 2. ImageServerIntegration (`image-server-integration.ts`)

Integration layer between WebSocket server and image endpoint:

```typescript
import { ImageServerIntegration } from '@semantest/core';

const integration = new ImageServerIntegration(8080);
await integration.start();
```

**Features:**
- WebSocket server integration
- Event forwarding between server and endpoint
- Client broadcast for all image events
- PM (Package Manager) system compatibility

### 3. Test Scripts

#### Basic Test (`test-image-endpoint.test.ts`)
```bash
npm run test:image-endpoint
```

Tests various scenarios:
- Simple image request with project and chat
- Request without project (no project creation)
- Request without chat (new chat creation)

#### Integration Test (`test-image-integration.ts`)
```bash
npm run test:image-integration
```

Full end-to-end test with WebSocket client/server communication.

## Event Types

### Input Event
**ImageRequestReceived** (`custom/image/request/received`)
```typescript
{
  project?: string,  // Optional project ID (null = no project)
  chat?: string,     // Optional chat ID (null = create new)
  prompt: string,    // Image generation prompt
  metadata?: {
    requestId?: string,
    userId?: string,
    timestamp?: number
  }
}
```

### Output Events

**ImageDownloaded** (`custom/image/downloaded`)
```typescript
{
  path: string,      // Absolute file path
  metadata?: {
    size?: number,
    mimeType?: string,
    width?: number,
    height?: number,
    requestId?: string
  }
}
```

**Additional Events:**
- `custom/image/generation/started` - Processing began
- `custom/image/generation/completed` - Generation finished
- `custom/image/generation/failed` - Error occurred

## Usage Examples

### Standalone Endpoint
```typescript
import { ImageGenerationEndpoint } from '@semantest/core';

const endpoint = new ImageGenerationEndpoint();

// Set up event listeners
endpoint.on(ImageEventTypes.DOWNLOADED, (event) => {
  console.log(`Image saved: ${event.payload.path}`);
});

// Process a request
endpoint.simulateImageRequest('A robot coding', 'my-project', 'chat-123');
```

### With WebSocket Server
```typescript
import { ImageServerIntegration } from '@semantest/core';

const server = new ImageServerIntegration(8080);
await server.start();

// Server now listens for ImageRequestReceived events
// and broadcasts ImageDownloaded events to all clients
```

### Client Integration
```typescript
import { ChatGPTClient } from '@semantest/client';

const client = new ChatGPTClient({ url: 'ws://localhost:8080' });

// Listen for download completion
client.on(ImageEventTypes.DOWNLOADED, (event) => {
  console.log(`Image ready: ${event.payload.path}`);
});

// Send request
await client.emit({
  type: ImageEventTypes.REQUEST_RECEIVED,
  payload: {
    prompt: 'A futuristic city',
    project: 'my-project'
  }
});
```

## File Structure

Images are saved with the following naming convention:
```
~/Downloads/semantest-images/
├── beautiful-sunset_2024-01-15T10-30-45-123Z.png
├── robot-coding_2024-01-15T10-31-20-456Z.png
└── abstract-art_2024-01-15T10-32-15-789Z.png
```

## Utilities

### List Downloaded Images
```typescript
const images = endpoint.listDownloadedImages();
console.log(`Found ${images.length} images`);
```

### Cleanup Old Images
```typescript
const deleted = endpoint.cleanupOldImages(7); // Remove images older than 7 days
console.log(`Cleaned up ${deleted} images`);
```

## Testing

Run the test suite:
```bash
# Build the project first
npm run build

# Run endpoint test
node dist/test-image-endpoint.test.js

# Run server integration
node dist/image-server-integration.js

# Run full integration test
node dist/test-image-integration.js
```

## Production Considerations

This is a **test implementation** that uses placeholder images. For production:

1. Replace `generatePlaceholderUrl()` with actual image generation API calls
2. Implement proper error handling and retry logic
3. Add authentication and rate limiting
4. Consider using a queue for high-volume requests
5. Implement proper file cleanup strategies
6. Add metrics and monitoring

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure write access to `~/Downloads/`
2. **Port Already in Use**: Change port in server configuration
3. **Image Download Fails**: Check network connectivity
4. **Events Not Received**: Verify WebSocket connection

### Debug Mode

Enable debug logging:
```typescript
const endpoint = new ImageGenerationEndpoint();
endpoint.on('*', (event) => console.log('Event:', event));
```

## Integration with PM System

The implementation is designed to work seamlessly with the Semantest PM (Package Manager) system:

1. Events follow the standard `BaseEvent` interface
2. Transport layer uses WebSocket for real-time communication
3. Error handling includes proper event emission
4. All file paths are absolute for cross-process compatibility

## Next Steps

1. Integrate with actual image generation service
2. Add support for different image formats
3. Implement image optimization and compression
4. Add metadata extraction from generated images
5. Create admin UI for monitoring and management