import { ImageEventTypes, ImageRequestReceivedPayload, ImageDownloadedPayload } from '@semantest/contracts';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { createWriteStream } from 'fs';
import { BrowserHealthCheck } from '../health-checks/browser-health';

/**
 * Image Event Handler
 * Handles ImageRequestReceived events and manages image generation/download workflow
 */
export class ImageEventHandler extends EventEmitter {
  private downloadDir: string;
  private browserHealthCheck: BrowserHealthCheck;

  constructor(defaultDownloadDir?: string) {
    super();
    this.downloadDir = defaultDownloadDir || path.join(process.env.HOME || '', 'Downloads');
    this.browserHealthCheck = new BrowserHealthCheck();
    this.ensureDownloadDir();
  }

  /**
   * Ensure download directory exists
   */
  private ensureDownloadDir(): void {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  /**
   * Handle ImageRequestReceived event
   */
  async handleImageRequest(payload: ImageRequestReceivedPayload): Promise<void> {
    console.log('🎨 Processing image request:', payload);

    // Check browser health before processing
    const canLaunchBrowser = await this.browserHealthCheck.canLaunchBrowser();
    if (!canLaunchBrowser) {
      console.error('❌ Cannot process image request: Browser not available');
      this.emit('error', {
        type: 'BROWSER_UNAVAILABLE',
        message: 'Browser is not available for image generation',
        statusCode: 503,
        payload
      });
      return;
    }

    try {
      // Extract request details
      const { prompt, project, chat, metadata } = payload;
      const requestId = metadata?.requestId || `img-${Date.now()}`;
      // Type assertion to access custom metadata field
      const customMetadata = metadata as any;
      const downloadFolder = customMetadata?.downloadFolder || this.downloadDir;

      // Ensure custom download folder exists
      if (downloadFolder !== this.downloadDir) {
        if (!fs.existsSync(downloadFolder)) {
          fs.mkdirSync(downloadFolder, { recursive: true });
        }
      }

      // Handle chat creation if needed
      let chatId = chat;
      if (!chatId) {
        console.log('📝 Creating new chat for image generation...');
        chatId = await this.createNewChat(prompt);
      }

      // Generate image (mock implementation - replace with actual ChatGPT API call)
      const imageUrl = await this.generateImage(prompt, chatId, project);

      // Download image
      const fileName = `chatgpt_${requestId}_${Date.now()}.png`;
      const filePath = path.join(downloadFolder, fileName);
      
      await this.downloadImage(imageUrl, filePath);

      // Emit ImageDownloaded event
      const downloadedPayload: ImageDownloadedPayload = {
        path: filePath,
        metadata: {
          requestId,
          size: fs.statSync(filePath).size,
          mimeType: 'image/png'
        }
      };

      this.emit(ImageEventTypes.DOWNLOADED, downloadedPayload);
      console.log('✅ Image downloaded successfully:', filePath);

    } catch (error) {
      console.error('❌ Error handling image request:', error);
      this.emit('error', {
        type: 'IMAGE_GENERATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        payload
      });
    }
  }

  /**
   * Create a new chat session
   * TODO: Implement actual ChatGPT API integration
   */
  private async createNewChat(_prompt: string): Promise<string> {
    // Mock implementation
    const chatId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📝 Created new chat: ${chatId}`);
    return chatId;
  }

  /**
   * Generate image using ChatGPT
   * TODO: Implement actual ChatGPT image generation API
   */
  private async generateImage(prompt: string, chatId: string, project?: string): Promise<string> {
    console.log(`🎨 Generating image...`);
    console.log(`   Prompt: ${prompt}`);
    console.log(`   Chat: ${chatId}`);
    if (project) {
      console.log(`   Project: ${project}`);
    }

    // Mock implementation - return placeholder image
    // In production, this would call the actual ChatGPT image generation API
    return 'https://via.placeholder.com/512x512.png?text=Generated+Image';
  }

  /**
   * Download image from URL to local file
   */
  private downloadImage(url: string, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = createWriteStream(filePath);

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
          fs.unlink(filePath, () => {}); // Delete the file on error
          reject(err);
        });
      }).on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete the file on error
        reject(err);
      });
    });
  }

  /**
   * Get the browser health check instance
   */
  getBrowserHealthCheck(): BrowserHealthCheck {
    return this.browserHealthCheck;
  }
}

/**
 * Factory function to create and configure image handler
 */
export function createImageHandler(options?: {
  downloadDir?: string;
}): ImageEventHandler {
  return new ImageEventHandler(options?.downloadDir);
}