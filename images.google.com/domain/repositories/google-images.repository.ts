import { ImageUrl, SearchQuery, ImageMetadata } from '../value-objects';

/**
 * Google Images Repository Interface
 * 
 * Defines the contract for persisting and retrieving Google Images domain entities
 */
export interface GoogleImagesRepository {
  /**
   * Search for images based on query
   */
  searchImages(query: SearchQuery, limit?: number): Promise<ImageSearchResult[]>;

  /**
   * Download an image from a URL
   */
  downloadImage(imageUrl: ImageUrl, destinationPath: string): Promise<ImageDownloadResult>;

  /**
   * Get image metadata
   */
  getImageMetadata(imageUrl: ImageUrl): Promise<ImageMetadata>;

  /**
   * Save search session
   */
  saveSearchSession(session: SearchSession): Promise<void>;

  /**
   * Get search session by ID
   */
  getSearchSession(sessionId: string): Promise<SearchSession | null>;

  /**
   * Get download history
   */
  getDownloadHistory(limit?: number): Promise<DownloadRecord[]>;

  /**
   * Clean up temporary files
   */
  cleanup(): Promise<void>;
}

/**
 * Image Search Result
 */
export interface ImageSearchResult {
  imageUrl: ImageUrl;
  thumbnailUrl?: ImageUrl;
  metadata: ImageMetadata;
  sourcePageUrl?: string;
  rank: number;
}

/**
 * Image Download Result
 */
export interface ImageDownloadResult {
  success: boolean;
  localPath?: string;
  filename?: string;
  error?: string;
  downloadedAt: Date;
  fileSize: number;
}

/**
 * Search Session
 */
export interface SearchSession {
  id: string;
  query: SearchQuery;
  results: ImageSearchResult[];
  createdAt: Date;
  completedAt?: Date;
  status: 'pending' | 'completed' | 'failed';
}

/**
 * Download Record
 */
export interface DownloadRecord {
  id: string;
  imageUrl: ImageUrl;
  localPath: string;
  filename: string;
  searchQuery?: SearchQuery;
  downloadedAt: Date;
  fileSize: number;
  metadata: ImageMetadata;
}