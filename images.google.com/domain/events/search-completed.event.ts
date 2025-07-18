/*
                        Semantest - Google Images Domain Events
                        Search Completed Event

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Semantest is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Semantest.  If not, see <https://www.gnu.org/licenses/>.
*/

import { DomainEvent } from '@semantest/core';
import { GoogleImageElement } from './download-requested.event';

export interface GoogleImageSearchResult {
    images: GoogleImageElement[];
    totalResults: number;
    searchTime: number; // milliseconds
    page: number;
    hasNextPage: boolean;
    searchUrl: string;
}

export interface GoogleImageSearchMetadata {
    userAgent: string;
    viewport: { width: number; height: number };
    location?: string;
    language?: string;
    safeSearch: 'strict' | 'moderate' | 'off';
    imageSize?: 'large' | 'medium' | 'icon';
    imageType?: 'photo' | 'clipart' | 'lineart' | 'gif';
    imageColor?: 'color' | 'grayscale' | 'transparent';
    usageRights?: 'labeled-for-reuse' | 'labeled-for-commercial-reuse' | 'labeled-for-noncommercial-reuse';
}

/**
 * Domain Event: Google Images Search Completed
 * 
 * Represents the completion of a Google Images search operation.
 * This event is emitted when a search query has been successfully executed
 * and results have been extracted from the Google Images page.
 */
export class GoogleImageSearchCompleted extends DomainEvent {
    public readonly eventType = 'GoogleImageSearchCompleted';
    
    constructor(
        public readonly searchQuery: string,
        public readonly results: GoogleImageSearchResult,
        public readonly metadata: GoogleImageSearchMetadata,
        correlationId: string
    ) {
        super(correlationId);
    }

    /**
     * Get the search query
     */
    get query(): string {
        return this.searchQuery;
    }

    /**
     * Get the found images
     */
    get images(): GoogleImageElement[] {
        return this.results.images;
    }

    /**
     * Get the number of images found
     */
    get imageCount(): number {
        return this.results.images.length;
    }

    /**
     * Get the total results count
     */
    get totalResults(): number {
        return this.results.totalResults;
    }

    /**
     * Get the search time in milliseconds
     */
    get searchTime(): number {
        return this.results.searchTime;
    }

    /**
     * Get the current page number
     */
    get page(): number {
        return this.results.page;
    }

    /**
     * Check if there are more pages available
     */
    get hasNextPage(): boolean {
        return this.results.hasNextPage;
    }

    /**
     * Get the search URL
     */
    get searchUrl(): string {
        return this.results.searchUrl;
    }

    /**
     * Get images that are likely suitable for download (good dimensions)
     */
    get downloadableImages(): GoogleImageElement[] {
        return this.images.filter(img => 
            img.width && img.height && 
            img.width >= 200 && img.height >= 200 &&
            img.src && !img.src.includes('data:')
        );
    }

    /**
     * Get high-resolution images
     */
    get highResImages(): GoogleImageElement[] {
        return this.images.filter(img => 
            img.width && img.height && 
            img.width >= 800 && img.height >= 600
        );
    }

    /**
     * Get images with specific minimum dimensions
     */
    getImagesWithMinDimensions(minWidth: number, minHeight: number): GoogleImageElement[] {
        return this.images.filter(img => 
            img.width && img.height && 
            img.width >= minWidth && img.height >= minHeight
        );
    }

    /**
     * Get images by aspect ratio preference
     */
    getImagesByAspectRatio(preferredRatio: 'landscape' | 'portrait' | 'square'): GoogleImageElement[] {
        return this.images.filter(img => {
            if (!img.width || !img.height) return false;
            
            const ratio = img.width / img.height;
            switch (preferredRatio) {
                case 'landscape': return ratio > 1.2;
                case 'portrait': return ratio < 0.8;
                case 'square': return ratio >= 0.8 && ratio <= 1.2;
                default: return true;
            }
        });
    }

    /**
     * Get search performance metrics
     */
    get performanceMetrics(): {
        searchTime: number;
        imagesPerSecond: number;
        avgImageSize: { width: number; height: number } | null;
    } {
        const searchTimeSeconds = this.searchTime / 1000;
        const imagesPerSecond = this.imageCount / searchTimeSeconds;
        
        const imagesWithDimensions = this.images.filter(img => img.width && img.height);
        let avgImageSize = null;
        
        if (imagesWithDimensions.length > 0) {
            const totalWidth = imagesWithDimensions.reduce((sum, img) => sum + (img.width || 0), 0);
            const totalHeight = imagesWithDimensions.reduce((sum, img) => sum + (img.height || 0), 0);
            avgImageSize = {
                width: Math.round(totalWidth / imagesWithDimensions.length),
                height: Math.round(totalHeight / imagesWithDimensions.length)
            };
        }
        
        return {
            searchTime: this.searchTime,
            imagesPerSecond: Math.round(imagesPerSecond * 100) / 100,
            avgImageSize
        };
    }

    /**
     * Create a summary of the search completion
     */
    toSummary(): string {
        const downloadable = this.downloadableImages.length;
        const highRes = this.highResImages.length;
        return `Found ${this.imageCount} images for "${this.searchQuery}" (${downloadable} downloadable, ${highRes} high-res)`;
    }
}