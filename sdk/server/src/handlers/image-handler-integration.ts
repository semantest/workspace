import { WebSocketServer } from '../server';
import { ImageEventHandler } from './image-handler';
import { BaseEvent } from '@semantest/core';
import { ImageEventTypes, ImageRequestReceivedPayload } from '@semantest/contracts';

/**
 * Integration module that connects the WebSocket server with the Image Event Handler
 * Listens for events from the WebSocket server and processes image requests
 */
export class ImageHandlerIntegration {
  private server: WebSocketServer;
  private imageHandler: ImageEventHandler;

  constructor(server: WebSocketServer, options?: { downloadDir?: string }) {
    this.server = server;
    this.imageHandler = new ImageEventHandler(options?.downloadDir);
    this.setupIntegration();
  }

  /**
   * Set up the integration between WebSocket server and Image Handler
   */
  private setupIntegration(): void {
    // Listen for ImageRequestReceived events from the WebSocket server
    this.server.on('event', async (event: BaseEvent) => {
      if (event.type === ImageEventTypes.REQUEST_RECEIVED) {
        console.log('🔄 ImageHandlerIntegration: Forwarding ImageRequestReceived to handler');
        await this.imageHandler.handleImageRequest(event.payload as ImageRequestReceivedPayload);
      }
    });

    // Forward events from image handler back to WebSocket clients
    this.setupHandlerListeners();

    console.log('✅ Image Handler Integration initialized');
  }

  /**
   * Set up listeners for events from the image handler
   */
  private setupHandlerListeners(): void {
    // Forward ImageDownloaded events to WebSocket clients
    this.imageHandler.on(ImageEventTypes.DOWNLOADED, (payload) => {
      const event: BaseEvent = {
        id: `img-downloaded-${Date.now()}`,
        type: ImageEventTypes.DOWNLOADED,
        timestamp: Date.now(),
        payload
      };
      console.log('📡 Broadcasting ImageDownloaded event to clients');
      this.server.broadcast(event);
    });

    // Forward error events
    this.imageHandler.on('error', (error) => {
      console.error('❌ Image handler error:', error);
      // Optionally broadcast error to clients
      const errorEvent: BaseEvent = {
        id: `img-error-${Date.now()}`,
        type: 'image.error',
        timestamp: Date.now(),
        payload: {
          message: error.message,
          type: error.type || 'IMAGE_GENERATION_ERROR'
        }
      };
      this.server.broadcast(errorEvent);
    });

    // Log other image events
    this.imageHandler.on(ImageEventTypes.GENERATION_STARTED, (payload) => {
      console.log('🎨 Image generation started:', payload);
      const event: BaseEvent = {
        id: `img-started-${Date.now()}`,
        type: ImageEventTypes.GENERATION_STARTED,
        timestamp: Date.now(),
        payload
      };
      this.server.broadcast(event);
    });

    this.imageHandler.on(ImageEventTypes.GENERATION_COMPLETED, (payload) => {
      console.log('🎉 Image generation completed:', payload);
      const event: BaseEvent = {
        id: `img-completed-${Date.now()}`,
        type: ImageEventTypes.GENERATION_COMPLETED,
        timestamp: Date.now(),
        payload
      };
      this.server.broadcast(event);
    });

    this.imageHandler.on(ImageEventTypes.GENERATION_FAILED, (payload) => {
      console.log('❌ Image generation failed:', payload);
      const event: BaseEvent = {
        id: `img-failed-${Date.now()}`,
        type: ImageEventTypes.GENERATION_FAILED,
        timestamp: Date.now(),
        payload
      };
      this.server.broadcast(event);
    });
  }

  /**
   * Get the image handler instance
   */
  getImageHandler(): ImageEventHandler {
    return this.imageHandler;
  }
}

/**
 * Factory function to create and attach image handler to WebSocket server
 */
export function attachImageHandler(
  server: WebSocketServer,
  options?: { downloadDir?: string }
): ImageHandlerIntegration {
  return new ImageHandlerIntegration(server, options);
}