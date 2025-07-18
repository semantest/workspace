/*
                        Semantest - Unsplash Domain Entities
                        Photo Entity

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Entity } from '@semantest/core';

export interface PhotoMetadata {
    title: string;
    description: string;
    altText: string;
    width: number;
    height: number;
    color: string;
    blurHash: string;
    createdAt: Date;
    updatedAt: Date;
    downloadCount: number;
    likeCount: number;
    viewCount: number;
    tags: string[];
    categories: string[];
    location?: string;
    camera?: string;
    focalLength?: string;
    aperture?: string;
    iso?: number;
    shutterSpeed?: string;
}

export interface PhotoUrls {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
}

export interface PhotoLicense {
    type: 'unsplash' | 'unsplash+' | 'custom';
    attribution: string;
    commercialUse: boolean;
    modification: boolean;
    distribution: boolean;
}

/**
 * Unsplash Photo Entity
 * 
 * Represents an Unsplash photo with metadata, licensing,
 * and download capabilities.
 */
export class Photo extends Entity {
    private _metadata: PhotoMetadata;
    private _urls: PhotoUrls;
    private _license: PhotoLicense;
    private _isDownloaded: boolean = false;
    private _downloadPath: string | null = null;
    private _lastUpdated: Date = new Date();

    constructor(
        id: string,
        public readonly photoId: string,
        public readonly artistId: string,
        public readonly artistName: string,
        public readonly photoUrl: string,
        metadata: PhotoMetadata,
        urls: PhotoUrls,
        license: PhotoLicense
    ) {
        super(id);
        this._metadata = { ...metadata };
        this._urls = { ...urls };
        this._license = { ...license };
    }

    /**
     * Get photo metadata
     */
    get metadata(): PhotoMetadata {
        return { ...this._metadata };
    }

    /**
     * Get photo URLs
     */
    get urls(): PhotoUrls {
        return { ...this._urls };
    }

    /**
     * Get photo license
     */
    get license(): PhotoLicense {
        return { ...this._license };
    }

    /**
     * Get photo title
     */
    get title(): string {
        return this._metadata.title;
    }

    /**
     * Get photo description
     */
    get description(): string {
        return this._metadata.description;
    }

    /**
     * Get photo dimensions
     */
    get dimensions(): { width: number; height: number } {
        return {
            width: this._metadata.width,
            height: this._metadata.height
        };
    }

    /**
     * Get aspect ratio
     */
    get aspectRatio(): number {
        return this._metadata.width / this._metadata.height;
    }

    /**
     * Get dominant color
     */
    get color(): string {
        return this._metadata.color;
    }

    /**
     * Get blur hash
     */
    get blurHash(): string {
        return this._metadata.blurHash;
    }

    /**
     * Get tags
     */
    get tags(): string[] {
        return [...this._metadata.tags];
    }

    /**
     * Get download count
     */
    get downloadCount(): number {
        return this._metadata.downloadCount;
    }

    /**
     * Get like count
     */
    get likeCount(): number {
        return this._metadata.likeCount;
    }

    /**
     * Check if photo is downloaded
     */
    get isDownloaded(): boolean {
        return this._isDownloaded;
    }

    /**
     * Get download path
     */
    get downloadPath(): string | null {
        return this._downloadPath;
    }

    /**
     * Check if commercial use is allowed
     */
    get allowsCommercialUse(): boolean {
        return this._license.commercialUse;
    }

    /**
     * Mark as downloaded
     */
    markAsDownloaded(downloadPath: string): void {
        this._isDownloaded = true;
        this._downloadPath = downloadPath;
        this._lastUpdated = new Date();
    }

    /**
     * Update metadata
     */
    updateMetadata(metadata: Partial<PhotoMetadata>): void {
        this._metadata = { ...this._metadata, ...metadata };
        this._lastUpdated = new Date();
    }

    /**
     * Get attribution text
     */
    getAttributionText(): string {
        return `Photo by ${this.artistName} on Unsplash`;
    }

    /**
     * Convert to summary string
     */
    toSummary(): string {
        const dimensions = `${this._metadata.width}x${this._metadata.height}`;
        const downloads = this._metadata.downloadCount;
        
        return `${this.title} by ${this.artistName} (${dimensions}) - ${downloads} downloads`;
    }
}