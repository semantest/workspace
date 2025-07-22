import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import { createWriteStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { 
  BaseEvent, 
  EventHandler,
  EventMetadata,
  EVENT_TYPE_PREFIX 
} from './types/events';
import { 
  ImageEventTypes, 
  ImageRequestReceivedPayload, 
  ImageDownloadedPayload 
} from '@semantest/contracts';

/**
 * Test endpoint for image generation workflow
 * Listens for ImageRequestReceived events and:
 * 1. Processes image generation (mock/placeholder for testing)
 * 2. Saves images to ~/Downloads/
 * 3. Emits ImageDownloaded events with file paths
 */
export class ImageGenerationEndpoint extends EventEmitter {
  private downloadDir: string;
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  
  constructor() {
    super();
    
    // Set up download directory
    this.downloadDir = path.join(os.homedir(), 'Downloads', 'semantest-images');
    this.ensureDownloadDirectory();
    
    // Register internal event handler
    this.setupEventHandlers();
  }
  
  /**
   * Ensure download directory exists
   */
  private ensureDownloadDirectory(): void {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
      console.log(`📁 Created download directory: ${this.downloadDir}`);
    }
  }
  
  /**
   * Set up internal event handlers
   */
  private setupEventHandlers(): void {
    // Handle ImageRequestReceived events
    this.on(ImageEventTypes.REQUEST_RECEIVED, async (event: BaseEvent<ImageRequestReceivedPayload>) => {
      console.log('\n📨 Received ImageRequestReceived event:', {
        id: event.id,
        timestamp: new Date(event.timestamp).toISOString(),
        payload: event.payload
      });
      
      try {
        await this.processImageRequest(event);
      } catch (error) {
        console.error('❌ Error processing image request:', error);
        this.emitGenerationFailed(event, error as Error);
      }
    });
  }
  
  /**
   * Process image generation request
   */
  private async processImageRequest(event: BaseEvent<ImageRequestReceivedPayload>): Promise<void> {
    const { prompt, project, chat, metadata } = event.payload;
    const requestId = metadata?.requestId || event.id;
    
    // Emit generation started event
    this.emitGenerationStarted(requestId, prompt);
    
    // Generate filename based on prompt and timestamp
    const sanitizedPrompt = prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${sanitizedPrompt}_${timestamp}.png`;
    const filepath = path.join(this.downloadDir, filename);
    
    try {
      // For testing, download a placeholder image
      // In production, this would call the actual image generation API
      const imageUrl = this.generatePlaceholderUrl(prompt);
      await this.downloadImage(imageUrl, filepath);
      
      // Get file stats
      const stats = fs.statSync(filepath);
      
      // Emit generation completed event
      this.emitGenerationCompleted(requestId, prompt);
      
      // Emit ImageDownloaded event
      this.emitImageDownloaded(filepath, {
        size: stats.size,
        mimeType: 'image/png',
        width: 512,  // Mock dimensions
        height: 512,
        requestId
      });
      
      console.log(`✅ Image saved successfully: ${filepath}`);
      
    } catch (error) {
      // Clean up partial file if exists
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      throw error;
    }
  }
  
  /**
   * Generate placeholder image URL based on prompt
   */
  private generatePlaceholderUrl(prompt: string): string {
    // Use placeholder.com service for testing
    const encodedText = encodeURIComponent(prompt.substring(0, 30));
    return `https://via.placeholder.com/512x512/3498db/ffffff.png?text=${encodedText}`;
  }
  
  /**
   * Download image from URL to filepath
   */
  private async downloadImage(url: string, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = createWriteStream(filepath);
      
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });
        
        file.on('error', (err) => {
          fs.unlink(filepath, () => {}); // Delete incomplete file
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
  }
  
  /**
   * Emit generation started event
   */
  private emitGenerationStarted(requestId: string, prompt: string): void {
    const event: BaseEvent = {
      id: uuidv4(),
      type: ImageEventTypes.GENERATION_STARTED,
      timestamp: Date.now(),
      payload: {
        requestId,
        prompt,
        startedAt: new Date().toISOString()
      }
    };
    
    this.emit(ImageEventTypes.GENERATION_STARTED, event);
    console.log('🎨 Image generation started');
  }
  
  /**
   * Emit generation completed event
   */
  private emitGenerationCompleted(requestId: string, prompt: string): void {
    const event: BaseEvent = {
      id: uuidv4(),
      type: ImageEventTypes.GENERATION_COMPLETED,
      timestamp: Date.now(),
      payload: {
        requestId,
        prompt,
        completedAt: new Date().toISOString()
      }
    };
    
    this.emit(ImageEventTypes.GENERATION_COMPLETED, event);
    console.log('🎉 Image generation completed');
  }
  
  /**
   * Emit image downloaded event
   */
  private emitImageDownloaded(filepath: string, metadata: ImageDownloadedPayload['metadata']): void {
    const event: BaseEvent<ImageDownloadedPayload> = {
      id: uuidv4(),
      type: ImageEventTypes.DOWNLOADED,
      timestamp: Date.now(),
      payload: {
        path: filepath,
        metadata
      }
    };
    
    this.emit(ImageEventTypes.DOWNLOADED, event);
    console.log('📥 Image downloaded event emitted');
  }
  
  /**
   * Emit generation failed event
   */
  private emitGenerationFailed(originalEvent: BaseEvent<ImageRequestReceivedPayload>, error: Error): void {
    const event: BaseEvent = {
      id: uuidv4(),
      type: ImageEventTypes.GENERATION_FAILED,
      timestamp: Date.now(),
      payload: {
        requestId: originalEvent.payload.metadata?.requestId || originalEvent.id,
        prompt: originalEvent.payload.prompt,
        error: {
          message: error.message,
          stack: error.stack
        },
        failedAt: new Date().toISOString()
      }
    };
    
    this.emit(ImageEventTypes.GENERATION_FAILED, event);
    console.log('❌ Image generation failed event emitted');
  }
  
  /**
   * Simulate receiving an image request (for testing)
   */
  async simulateImageRequest(prompt: string, project?: string, chat?: string): Promise<void> {
    const event: BaseEvent<ImageRequestReceivedPayload> = {
      id: uuidv4(),
      type: ImageEventTypes.REQUEST_RECEIVED,
      timestamp: Date.now(),
      payload: {
        prompt,
        project,
        chat,
        metadata: {
          requestId: uuidv4(),
          userId: 'test-user',
          timestamp: Date.now()
        }
      }
    };
    
    this.emit(ImageEventTypes.REQUEST_RECEIVED, event);
  }
  
  /**
   * Get download directory path
   */
  getDownloadDirectory(): string {
    return this.downloadDir;
  }
  
  /**
   * List all downloaded images
   */
  listDownloadedImages(): string[] {
    try {
      return fs.readdirSync(this.downloadDir)
        .filter(file => file.endsWith('.png'))
        .map(file => path.join(this.downloadDir, file));
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Clean up old images (optional utility)
   */
  cleanupOldImages(daysOld: number = 7): number {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    
    try {
      const files = fs.readdirSync(this.downloadDir);
      
      for (const file of files) {
        const filepath = path.join(this.downloadDir, file);
        const stats = fs.statSync(filepath);
        
        if (stats.mtimeMs < cutoffTime && file.endsWith('.png')) {
          fs.unlinkSync(filepath);
          deletedCount++;
        }
      }
      
      console.log(`🧹 Cleaned up ${deletedCount} old images`);
    } catch (error) {
      console.error('❌ Error cleaning up old images:', error);
    }
    
    return deletedCount;
  }
}

// Export singleton instance for convenience
export const imageEndpoint = new ImageGenerationEndpoint();