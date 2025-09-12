/*
                        Semantest - Google Images Download Service
                        Application Layer Service
    
    This file is part of Semantest.
    
    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { GoogleImageDownload } from '../../domain/entities/google-image-download.entity';
import { GoogleImageDownloadAdapter } from '../../infrastructure/adapters/google-images-downloader.adapter';
import { 
    GoogleImageDownloadRequested,
    GoogleImageDownloadCompleted,
    GoogleImageDownloadFailed,
    GoogleImageElement
} from '../../domain/events';

/**
 * Google Images Download Service
 * 
 * Orchestrates the download process by coordinating between
 * the domain entities and infrastructure adapters.
 */
export class GoogleImagesDownloadService {
    private adapter: GoogleImageDownloadAdapter;
    private activeDownloads: Map<string, GoogleImageDownload>;
    
    constructor() {
        this.adapter = new GoogleImageDownloadAdapter();
        this.activeDownloads = new Map();
    }
    
    /**
     * Configure the download adapter
     */
    configure(config: Partial<any>): void {
        this.adapter.configure(config);
    }
    
    /**
     * Handle download request event
     */
    async handleDownloadRequest(event: GoogleImageDownloadRequested): Promise<void> {
        const download = new GoogleImageDownload(
            event.correlationId,
            event.correlationId,
            event.imageElement,
            event.searchQuery,
            event.filename,
            event.quality || 'medium',
            3 // max retries
        );
        
        this.activeDownloads.set(event.correlationId, download);
        
        try {
            // Start the download
            download.startDownload(Date.now());
            
            // Generate filename if not provided
            const filename = this.generateFilename(event);
            
            // Perform the actual download
            const filepath = await this.adapter.downloadImage(
                event.imageElement.src,
                filename
            );
            
            // Mark download as complete
            download.completeDownload(filepath);
            
            // Emit completion event
            const completedEvent: GoogleImageDownloadCompleted = {
                correlationId: event.correlationId,
                downloadId: download.downloadId!,
                imageUrl: event.imageElement.src,
                filename: filename,
                filepath: filepath,
                metadata: {
                    searchQuery: event.searchQuery,
                    quality: event.quality,
                    dimensions: download.dimensions,
                    downloadTime: download.totalDownloadTime
                }
            };
            
            this.emitEvent(completedEvent);
            
        } catch (error) {
            // Mark download as failed
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            download.failDownload(errorMessage);
            
            // Emit failure event
            const failedEvent: GoogleImageDownloadFailed = {
                correlationId: event.correlationId,
                imageUrl: event.imageElement.src,
                error: errorMessage,
                attemptNumber: download.currentAttempt,
                canRetry: download.canRetry
            };
            
            this.emitEvent(failedEvent);
            
            // Retry if possible
            if (download.canRetry) {
                download.resetForRetry();
                await this.handleDownloadRequest(event);
            }
        } finally {
            // Clean up after a delay
            setTimeout(() => {
                this.activeDownloads.delete(event.correlationId);
            }, 60000); // Keep for 1 minute for status queries
        }
    }
    
    /**
     * Generate filename for download
     */
    private generateFilename(event: GoogleImageDownloadRequested): string {
        if (event.filename) {
            return this.ensureImageExtension(event.filename, event.imageElement.src);
        }
        
        // Generate from search query or metadata
        let baseName = '';
        
        if (event.searchQuery) {
            baseName = event.searchQuery.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
        } else if (event.imageElement.alt) {
            baseName = event.imageElement.alt.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
        } else {
            baseName = 'google_image';
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const extension = this.extractImageExtension(event.imageElement.src) || 'jpg';
        
        return `${baseName}_${timestamp}.${extension}`;
    }
    
    /**
     * Ensure filename has image extension
     */
    private ensureImageExtension(filename: string, url: string): string {
        const hasExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filename);
        
        if (hasExtension) {
            return filename;
        }
        
        const extension = this.extractImageExtension(url) || 'jpg';
        return `${filename}.${extension}`;
    }
    
    /**
     * Extract image extension from URL
     */
    private extractImageExtension(url: string): string | null {
        const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
        return match ? match[1] : null;
    }
    
    /**
     * Emit event (would be connected to event bus in production)
     */
    private emitEvent(event: any): void {
        // In production, this would emit to the event bus
        console.log('Event emitted:', event);
    }
    
    /**
     * Get download status
     */
    getDownloadStatus(correlationId: string): GoogleImageDownload | undefined {
        return this.activeDownloads.get(correlationId);
    }
    
    /**
     * Get all active downloads
     */
    getActiveDownloads(): GoogleImageDownload[] {
        return Array.from(this.activeDownloads.values());
    }
    
    /**
     * Cancel download
     */
    cancelDownload(correlationId: string): boolean {
        const download = this.activeDownloads.get(correlationId);
        if (download && (download.isInProgress || download.status === 'pending')) {
            download.cancelDownload();
            return true;
        }
        return false;
    }
    
    /**
     * Get download statistics
     */
    getStatistics(): {
        activeDownloads: number;
        completedDownloads: number;
        failedDownloads: number;
        totalDownloads: number;
    } {
        const downloads = Array.from(this.activeDownloads.values());
        
        return {
            activeDownloads: downloads.filter(d => d.isInProgress).length,
            completedDownloads: downloads.filter(d => d.isCompleted).length,
            failedDownloads: downloads.filter(d => d.hasFailed).length,
            totalDownloads: downloads.length
        };
    }
}

// Type definitions for events
interface GoogleImageDownloadCompleted {
    correlationId: string;
    downloadId: number;
    imageUrl: string;
    filename: string;
    filepath: string;
    metadata: any;
}

interface GoogleImageDownloadFailed {
    correlationId: string;
    imageUrl: string;
    error: string;
    attemptNumber: number;
    canRetry: boolean;
}