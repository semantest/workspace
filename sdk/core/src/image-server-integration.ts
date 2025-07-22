import { WebSocketServer } from '@semantest/server';
import { ImageGenerationEndpoint } from './test-image-endpoint';
import { 
  MessageType, 
  EventMessage,
  TransportMessage,
  BaseEvent 
} from './types/events';
import { 
  ImageEventTypes,
  ImageRequestReceivedPayload,
  ImageDownloadedPayload 
} from '@semantest/contracts';
import { v4 as uuidv4 } from 'uuid';

/**
 * Integration between WebSocket server and Image Generation Endpoint
 * This demonstrates how to integrate the image endpoint with the PM system
 */
export class ImageServerIntegration {
  private server: WebSocketServer;
  private imageEndpoint: ImageGenerationEndpoint;
  private port: number;
  
  constructor(port: number = 8080) {
    this.port = port;
    this.server = new WebSocketServer({ port });
    this.imageEndpoint = new ImageGenerationEndpoint();
    
    this.setupIntegration();
  }
  
  /**
   * Set up integration between server and image endpoint
   */
  private setupIntegration(): void {
    // Forward ImageRequestReceived events from server to endpoint
    this.server.on('event', (event: BaseEvent) => {
      if (event.type === ImageEventTypes.REQUEST_RECEIVED) {
        console.log('🔄 Forwarding ImageRequestReceived to endpoint');
        this.imageEndpoint.emit(ImageEventTypes.REQUEST_RECEIVED, event);
      }
    });
    
    // Forward image generation events from endpoint back to clients
    this.setupEndpointListeners();
    
    // Log server events
    this.server.on('client:connected', (clientInfo) => {
      console.log(`👤 Client connected: ${clientInfo.id}`);
    });
    
    this.server.on('client:disconnected', (clientInfo) => {
      console.log(`👋 Client disconnected: ${clientInfo.id}`);
    });
  }
  
  /**
   * Set up listeners for endpoint events to broadcast to clients
   */
  private setupEndpointListeners(): void {
    // Forward generation started events
    this.imageEndpoint.on(ImageEventTypes.GENERATION_STARTED, (event: BaseEvent) => {
      this.broadcastEvent(event);
    });
    
    // Forward generation completed events
    this.imageEndpoint.on(ImageEventTypes.GENERATION_COMPLETED, (event: BaseEvent) => {
      this.broadcastEvent(event);
    });
    
    // Forward image downloaded events
    this.imageEndpoint.on(ImageEventTypes.DOWNLOADED, (event: BaseEvent<ImageDownloadedPayload>) => {
      this.broadcastEvent(event);
    });
    
    // Forward generation failed events
    this.imageEndpoint.on(ImageEventTypes.GENERATION_FAILED, (event: BaseEvent) => {
      this.broadcastEvent(event);
    });
  }
  
  /**
   * Broadcast event to all connected clients
   */
  private broadcastEvent(event: BaseEvent): void {
    console.log(`📡 Broadcasting ${event.type} to all clients`);
    this.server.broadcast(event);
  }
  
  /**
   * Start the integrated server
   */
  async start(): Promise<void> {
    await this.server.start();
    console.log(`🚀 Image Server Integration started on port ${this.port}`);
    console.log(`📁 Images will be saved to: ${this.imageEndpoint.getDownloadDirectory()}`);
    console.log('\nWorkflow:');
    console.log('1. Client sends ImageRequestReceived event');
    console.log('2. Server forwards to Image Endpoint');
    console.log('3. Endpoint processes and saves image');
    console.log('4. Endpoint emits ImageDownloaded event');
    console.log('5. Server broadcasts to all clients\n');
  }
  
  /**
   * Stop the integrated server
   */
  async stop(): Promise<void> {
    await this.server.stop();
    console.log('🛑 Image Server Integration stopped');
  }
  
  /**
   * Get server instance (for testing)
   */
  getServer(): WebSocketServer {
    return this.server;
  }
  
  /**
   * Get image endpoint instance (for testing)
   */
  getImageEndpoint(): ImageGenerationEndpoint {
    return this.imageEndpoint;
  }
}

// Example usage and test script
if (require.main === module) {
  async function runIntegrationExample() {
    console.log('🎯 Starting Image Server Integration Example');
    console.log('==========================================\n');
    
    const integration = new ImageServerIntegration(8080);
    
    try {
      // Start the server
      await integration.start();
      
      // Simulate some test requests after a delay
      setTimeout(async () => {
        console.log('\n📝 Simulating test image requests...\n');
        
        const endpoint = integration.getImageEndpoint();
        
        // Test 1: Normal request
        await endpoint.simulateImageRequest(
          'A futuristic city skyline',
          'demo-project',
          'demo-chat-1'
        );
        
        // Test 2: Request without project
        setTimeout(async () => {
          await endpoint.simulateImageRequest(
            'Abstract geometric patterns',
            undefined,
            'demo-chat-2'
          );
        }, 2000);
        
        // Test 3: Request without chat
        setTimeout(async () => {
          await endpoint.simulateImageRequest(
            'Nature landscape with waterfalls',
            'demo-project-2',
            undefined
          );
        }, 4000);
      }, 2000);
      
      // Keep server running
      console.log('\n✅ Server is running. Press Ctrl+C to stop.\n');
      
    } catch (error) {
      console.error('❌ Failed to start integration:', error);
      process.exit(1);
    }
  }
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down...');
    process.exit(0);
  });
  
  runIntegrationExample();
}