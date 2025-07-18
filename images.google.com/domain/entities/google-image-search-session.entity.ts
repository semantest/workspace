/*
                        Semantest - Google Images Domain Entities
                        Google Image Search Session Entity

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Entity } from '@semantest/core';
import { GoogleImageElement } from '../events/download-requested.event';

export type SearchStatus = 
    | 'initialized'
    | 'searching'
    | 'completed'
    | 'failed'
    | 'cancelled';

export interface SearchMetrics {
    totalResults: number;
    imagesFound: number;
    searchTime: number; // milliseconds
    averageImageSize: { width: number; height: number } | null;
    highResolutionCount: number;
    downloadableCount: number;
    processingTime: number; // milliseconds
}

export interface SearchFilters {
    imageSize?: 'large' | 'medium' | 'icon' | 'larger-than' | 'exactly';
    imageSizeDimensions?: { width: number; height: number };
    imageType?: 'photo' | 'clipart' | 'lineart' | 'gif' | 'transparent';
    imageColor?: 'color' | 'grayscale' | 'transparent' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink' | 'white' | 'gray' | 'black' | 'brown';
    usageRights?: 'labeled-for-reuse' | 'labeled-for-commercial-reuse' | 'labeled-for-noncommercial-reuse' | 'labeled-for-reuse-with-modification' | 'labeled-for-commercial-reuse-with-modification' | 'labeled-for-noncommercial-reuse-with-modification';
    safeSearch?: 'strict' | 'moderate' | 'off';
    timeFilter?: 'past-24-hours' | 'past-week' | 'past-month' | 'past-year';
    aspectRatio?: 'square' | 'wide' | 'tall' | 'panoramic';
}

export interface SearchConfiguration {
    userAgent: string;
    viewport: { width: number; height: number };
    location?: string;
    language?: string;
    maxResults?: number;
    timeout?: number;
    retryOnFailure?: boolean;
    maxRetries?: number;
}

/**
 * Google Image Search Session Entity
 * 
 * Represents a complete search session on Google Images, including
 * query execution, result processing, and session management.
 * This entity encapsulates all business logic related to searching
 * for images and managing the search lifecycle.
 */
export class GoogleImageSearchSession extends Entity {
    private _status: SearchStatus = 'initialized';
    private _results: GoogleImageElement[] = [];
    private _metrics: SearchMetrics | null = null;
    private _startTime: Date | null = null;
    private _endTime: Date | null = null;
    private _error: string | null = null;
    private _searchUrl: string | null = null;
    private _currentPage: number = 1;
    private _hasNextPage: boolean = false;

    constructor(
        id: string,
        public readonly correlationId: string,
        public readonly searchQuery: string,
        public readonly filters: SearchFilters = {},
        public readonly configuration: SearchConfiguration
    ) {
        super(id);
    }

    /**
     * Get current search status
     */
    get status(): SearchStatus {
        return this._status;
    }

    /**
     * Get search results
     */
    get results(): ReadonlyArray<GoogleImageElement> {
        return [...this._results];
    }

    /**
     * Get search metrics
     */
    get metrics(): SearchMetrics | null {
        return this._metrics;
    }

    /**
     * Get start time
     */
    get startTime(): Date | null {
        return this._startTime;
    }

    /**
     * Get end time
     */
    get endTime(): Date | null {
        return this._endTime;
    }

    /**
     * Get error message
     */
    get error(): string | null {
        return this._error;
    }

    /**
     * Get search URL
     */
    get searchUrl(): string | null {
        return this._searchUrl;
    }

    /**
     * Get current page number
     */
    get currentPage(): number {
        return this._currentPage;
    }

    /**
     * Check if there are more pages
     */
    get hasNextPage(): boolean {
        return this._hasNextPage;
    }

    /**
     * Get search duration
     */
    get searchDuration(): number | null {
        if (!this._startTime) return null;
        const endTime = this._endTime || new Date();
        return endTime.getTime() - this._startTime.getTime();
    }

    /**
     * Check if search is in progress
     */
    get isSearching(): boolean {
        return this._status === 'searching';
    }

    /**
     * Check if search is completed
     */
    get isCompleted(): boolean {
        return this._status === 'completed';
    }

    /**
     * Check if search has failed
     */
    get hasFailed(): boolean {
        return this._status === 'failed';
    }

    /**
     * Get downloadable images (good quality and dimensions)
     */
    get downloadableImages(): GoogleImageElement[] {
        return this._results.filter(img => 
            img.width && img.height && 
            img.width >= 200 && img.height >= 200 &&
            img.src && !img.src.includes('data:') && !img.src.includes('blob:')
        );
    }

    /**
     * Get high-resolution images
     */
    get highResolutionImages(): GoogleImageElement[] {
        return this._results.filter(img => 
            img.width && img.height && 
            img.width >= 1024 && img.height >= 768
        );
    }

    /**
     * Get images matching aspect ratio
     */
    getImagesByAspectRatio(aspectRatio: 'landscape' | 'portrait' | 'square'): GoogleImageElement[] {
        return this._results.filter(img => {
            if (!img.width || !img.height) return false;
            
            const ratio = img.width / img.height;
            switch (aspectRatio) {
                case 'landscape': return ratio > 1.3;
                case 'portrait': return ratio < 0.75;
                case 'square': return ratio >= 0.75 && ratio <= 1.3;
                default: return true;
            }
        });
    }

    /**
     * Get images with minimum dimensions
     */
    getImagesByMinDimensions(minWidth: number, minHeight: number): GoogleImageElement[] {
        return this._results.filter(img => 
            img.width && img.height && 
            img.width >= minWidth && img.height >= minHeight
        );
    }

    /**
     * Start search operation
     */
    startSearch(): void {
        if (this._status !== 'initialized') {
            throw new Error(`Cannot start search in ${this._status} state`);
        }

        this._status = 'searching';
        this._startTime = new Date();
        this._error = null;
        this._results = [];
        this._metrics = null;
    }

    /**
     * Add search results
     */
    addResults(
        images: GoogleImageElement[], 
        searchUrl: string, 
        totalResults: number,
        hasNextPage: boolean = false
    ): void {
        if (this._status !== 'searching') {
            throw new Error(`Cannot add results in ${this._status} state`);
        }

        this._results = [...this._results, ...images];
        this._searchUrl = searchUrl;
        this._hasNextPage = hasNextPage;
        
        // Calculate metrics
        this._calculateMetrics(totalResults);
    }

    /**
     * Complete search operation
     */
    completeSearch(): void {
        if (this._status !== 'searching') {
            throw new Error(`Cannot complete search in ${this._status} state`);
        }

        this._status = 'completed';
        this._endTime = new Date();
        this._error = null;
    }

    /**
     * Fail search operation
     */
    failSearch(error: string): void {
        if (this._status !== 'searching') {
            throw new Error(`Cannot fail search in ${this._status} state`);
        }

        this._status = 'failed';
        this._endTime = new Date();
        this._error = error;
    }

    /**
     * Cancel search operation
     */
    cancelSearch(): void {
        if (this._status !== 'searching') {
            throw new Error(`Cannot cancel search in ${this._status} state`);
        }

        this._status = 'cancelled';
        this._endTime = new Date();
    }

    /**
     * Navigate to next page
     */
    nextPage(): void {
        if (!this._hasNextPage) {
            throw new Error('No next page available');
        }

        this._currentPage++;
        this._status = 'searching';
        this._hasNextPage = false;
    }

    /**
     * Reset session for new search
     */
    resetSession(): void {
        this._status = 'initialized';
        this._results = [];
        this._metrics = null;
        this._startTime = null;
        this._endTime = null;
        this._error = null;
        this._searchUrl = null;
        this._currentPage = 1;
        this._hasNextPage = false;
    }

    /**
     * Calculate search metrics
     */
    private _calculateMetrics(totalResults: number): void {
        const searchTime = this.searchDuration || 0;
        const imagesFound = this._results.length;
        
        // Calculate average image size
        const imagesWithDimensions = this._results.filter(img => img.width && img.height);
        let averageImageSize = null;
        
        if (imagesWithDimensions.length > 0) {
            const totalWidth = imagesWithDimensions.reduce((sum, img) => sum + (img.width || 0), 0);
            const totalHeight = imagesWithDimensions.reduce((sum, img) => sum + (img.height || 0), 0);
            averageImageSize = {
                width: Math.round(totalWidth / imagesWithDimensions.length),
                height: Math.round(totalHeight / imagesWithDimensions.length)
            };
        }

        // Count high-resolution and downloadable images
        const highResolutionCount = this.highResolutionImages.length;
        const downloadableCount = this.downloadableImages.length;
        
        this._metrics = {
            totalResults,
            imagesFound,
            searchTime,
            averageImageSize,
            highResolutionCount,
            downloadableCount,
            processingTime: searchTime // For now, same as search time
        };
    }

    /**
     * Get search quality score (0-100)
     */
    getQualityScore(): number {
        if (!this._metrics) return 0;
        
        const { imagesFound, downloadableCount, highResolutionCount } = this._metrics;
        
        if (imagesFound === 0) return 0;
        
        const downloadableRatio = downloadableCount / imagesFound;
        const highResRatio = highResolutionCount / imagesFound;
        
        // Quality score based on downloadable and high-res ratios
        const qualityScore = (downloadableRatio * 70) + (highResRatio * 30);
        
        return Math.min(100, Math.max(0, Math.round(qualityScore * 100)));
    }

    /**
     * Get search performance metrics
     */
    getPerformanceMetrics(): {
        imagesPerSecond: number;
        averageProcessingTime: number;
        successRate: number;
        qualityScore: number;
    } {
        const searchTime = this.searchDuration || 1;
        const searchTimeSeconds = searchTime / 1000;
        const imagesFound = this._results.length;
        
        return {
            imagesPerSecond: Math.round((imagesFound / searchTimeSeconds) * 100) / 100,
            averageProcessingTime: searchTime,
            successRate: this.isCompleted ? 100 : (this.hasFailed ? 0 : 50),
            qualityScore: this.getQualityScore()
        };
    }

    /**
     * Convert to summary string
     */
    toSummary(): string {
        const count = this._results.length;
        const downloadable = this.downloadableImages.length;
        const quality = this.getQualityScore();
        
        return `Search "${this.searchQuery}" - ${count} images found (${downloadable} downloadable, ${quality}% quality)`;
    }
}