import { ImageUrl, ImageMetadata } from '../../domain/value-objects';
import { GoogleImagesRepository, ImageDownloadResult } from '../../domain/repositories';
import { UrlResolutionService } from '../../domain/services';

/**
 * Google Images Download Service
 * 
 * Application service for handling Google Images download operations
 */
export class GoogleImagesDownloadService {
  constructor(
    private readonly repository: GoogleImagesRepository,
    private readonly urlResolutionService: UrlResolutionService
  ) {}

  /**
   * Download a single image
   */
  async downloadImage(imageUrl: string, options: DownloadOptions = {}): Promise<DownloadResult> {
    try {
      // Validate and create image URL
      const url = new ImageUrl(imageUrl);
      
      // Resolve high-resolution URL if needed
      const finalUrl = options.highResolution 
        ? await this.urlResolutionService.resolveHighResolutionUrl(url) || url
        : url;

      // Generate filename
      const filename = options.filename || this.generateFilename(finalUrl, options);

      // Set destination path
      const destinationPath = options.destinationPath || './downloads';

      // Download the image
      const downloadResult = await this.repository.downloadImage(finalUrl, `${destinationPath}/${filename}`);

      return {
        success: downloadResult.success,
        imageUrl: finalUrl,
        localPath: downloadResult.localPath,
        filename: downloadResult.filename,
        error: downloadResult.error,
        downloadedAt: downloadResult.downloadedAt,
        fileSize: downloadResult.fileSize,
        metadata: await this.getImageMetadata(finalUrl)
      };

    } catch (error) {
      return {
        success: false,
        imageUrl: new ImageUrl(imageUrl),
        error: error instanceof Error ? error.message : 'Unknown error',
        downloadedAt: new Date(),
        fileSize: 0
      };
    }
  }

  /**
   * Download multiple images
   */
  async downloadImages(imageUrls: string[], options: DownloadOptions = {}): Promise<BatchDownloadResult> {
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const imageUrl of imageUrls) {
      try {
        const result = await this.downloadImage(imageUrl, options);
        results.push(result);
        
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }

        // Add delay between downloads to avoid rate limiting
        if (options.delayBetweenDownloads) {
          await this.delay(options.delayBetweenDownloads);
        }

      } catch (error) {
        results.push({
          success: false,
          imageUrl: new ImageUrl(imageUrl),
          error: error instanceof Error ? error.message : 'Unknown error',
          downloadedAt: new Date(),
          fileSize: 0
        });
        failureCount++;
      }
    }

    return {
      results,
      totalCount: imageUrls.length,
      successCount,
      failureCount,
      completedAt: new Date()
    };
  }

  /**
   * Get download progress
   */
  async getDownloadHistory(limit: number = 50): Promise<DownloadHistory> {
    const history = await this.repository.getDownloadHistory(limit);
    
    return {
      downloads: history,
      totalCount: history.length,
      totalSize: history.reduce((sum, record) => sum + record.fileSize, 0),
      lastDownloadAt: history.length > 0 ? history[0].downloadedAt : null
    };
  }

  /**
   * Clean up downloaded files
   */
  async cleanup(): Promise<void> {
    await this.repository.cleanup();
  }

  /**
   * Generate filename for downloaded image
   */
  private generateFilename(imageUrl: ImageUrl, options: DownloadOptions): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const extension = imageUrl.extension || 'jpg';
    
    if (options.baseFilename) {
      return `${options.baseFilename}_${timestamp}.${extension}`;
    }

    // Generate from URL
    const urlPath = new URL(imageUrl.url).pathname;
    const baseName = urlPath.split('/').pop()?.split('.')[0] || 'image';
    
    return `${baseName}_${timestamp}.${extension}`;
  }

  /**
   * Get image metadata
   */
  private async getImageMetadata(imageUrl: ImageUrl): Promise<ImageMetadata | undefined> {
    try {
      return await this.repository.getImageMetadata(imageUrl);
    } catch (error) {
      console.debug(`Failed to get metadata for ${imageUrl.url}:`, error);
      return undefined;
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Download Options
 */
export interface DownloadOptions {
  filename?: string;
  baseFilename?: string;
  destinationPath?: string;
  highResolution?: boolean;
  delayBetweenDownloads?: number;
}

/**
 * Download Result
 */
export interface DownloadResult {
  success: boolean;
  imageUrl: ImageUrl;
  localPath?: string;
  filename?: string;
  error?: string;
  downloadedAt: Date;
  fileSize: number;
  metadata?: ImageMetadata;
}

/**
 * Batch Download Result
 */
export interface BatchDownloadResult {
  results: DownloadResult[];
  totalCount: number;
  successCount: number;
  failureCount: number;
  completedAt: Date;
}

/**
 * Download History
 */
export interface DownloadHistory {
  downloads: any[];
  totalCount: number;
  totalSize: number;
  lastDownloadAt: Date | null;
}