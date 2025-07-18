/*
                        Semantest - YouTube Video Domain Entities
                        Video Entity

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Entity } from '@semantest/core';

export type VideoQuality = 'highest' | 'high' | 'medium' | 'low' | 'lowest';
export type VideoStatus = 'available' | 'processing' | 'unavailable' | 'deleted' | 'private';

export interface VideoMetadata {
    title: string;
    description: string;
    duration: number; // in seconds
    uploadDate: Date;
    viewCount: number;
    likeCount: number;
    dislikeCount: number;
    tags: string[];
    category: string;
    language: string;
    thumbnailUrl: string;
    isLive: boolean;
    isPrivate: boolean;
    ageRestricted: boolean;
}

export interface VideoQualityInfo {
    quality: VideoQuality;
    resolution: string;
    fps: number;
    bitrate: number;
    audioQuality: string;
    fileSize: number;
    downloadUrl: string;
}

/**
 * Video Entity
 * 
 * Represents a YouTube video with all its metadata, quality options,
 * and download information.
 */
export class Video extends Entity {
    private _metadata: VideoMetadata;
    private _qualityOptions: VideoQualityInfo[] = [];
    private _status: VideoStatus = 'available';
    private _lastUpdated: Date = new Date();

    constructor(
        id: string,
        public readonly videoId: string,
        public readonly channelId: string,
        public readonly url: string,
        metadata: VideoMetadata
    ) {
        super(id);
        this._metadata = { ...metadata };
    }

    /**
     * Get video metadata
     */
    get metadata(): VideoMetadata {
        return { ...this._metadata };
    }

    /**
     * Get video title
     */
    get title(): string {
        return this._metadata.title;
    }

    /**
     * Get video description
     */
    get description(): string {
        return this._metadata.description;
    }

    /**
     * Get video duration in seconds
     */
    get duration(): number {
        return this._metadata.duration;
    }

    /**
     * Get video upload date
     */
    get uploadDate(): Date {
        return this._metadata.uploadDate;
    }

    /**
     * Get view count
     */
    get viewCount(): number {
        return this._metadata.viewCount;
    }

    /**
     * Get like count
     */
    get likeCount(): number {
        return this._metadata.likeCount;
    }

    /**
     * Get video tags
     */
    get tags(): string[] {
        return [...this._metadata.tags];
    }

    /**
     * Get video category
     */
    get category(): string {
        return this._metadata.category;
    }

    /**
     * Get thumbnail URL
     */
    get thumbnailUrl(): string {
        return this._metadata.thumbnailUrl;
    }

    /**
     * Check if video is live
     */
    get isLive(): boolean {
        return this._metadata.isLive;
    }

    /**
     * Check if video is private
     */
    get isPrivate(): boolean {
        return this._metadata.isPrivate;
    }

    /**
     * Check if video is age restricted
     */
    get ageRestricted(): boolean {
        return this._metadata.ageRestricted;
    }

    /**
     * Get video status
     */
    get status(): VideoStatus {
        return this._status;
    }

    /**
     * Get available quality options
     */
    get qualityOptions(): VideoQualityInfo[] {
        return [...this._qualityOptions];
    }

    /**
     * Get last updated timestamp
     */
    get lastUpdated(): Date {
        return this._lastUpdated;
    }

    /**
     * Check if video is available for download
     */
    get isAvailable(): boolean {
        return this._status === 'available' && !this._metadata.isPrivate;
    }

    /**
     * Get duration formatted as HH:MM:SS
     */
    get formattedDuration(): string {
        const hours = Math.floor(this.duration / 3600);
        const minutes = Math.floor((this.duration % 3600) / 60);
        const seconds = this.duration % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Update video metadata
     */
    updateMetadata(metadata: Partial<VideoMetadata>): void {
        this._metadata = { ...this._metadata, ...metadata };
        this._lastUpdated = new Date();
    }

    /**
     * Set video status
     */
    setStatus(status: VideoStatus): void {
        this._status = status;
        this._lastUpdated = new Date();
    }

    /**
     * Add quality option
     */
    addQualityOption(qualityInfo: VideoQualityInfo): void {
        const existingIndex = this._qualityOptions.findIndex(
            q => q.quality === qualityInfo.quality
        );

        if (existingIndex >= 0) {
            this._qualityOptions[existingIndex] = qualityInfo;
        } else {
            this._qualityOptions.push(qualityInfo);
        }

        this._lastUpdated = new Date();
    }

    /**
     * Get best quality option
     */
    getBestQuality(): VideoQualityInfo | null {
        if (this._qualityOptions.length === 0) return null;

        const qualityOrder: VideoQuality[] = ['highest', 'high', 'medium', 'low', 'lowest'];
        
        for (const quality of qualityOrder) {
            const option = this._qualityOptions.find(q => q.quality === quality);
            if (option) return option;
        }

        return this._qualityOptions[0];
    }

    /**
     * Get quality option by preference
     */
    getQualityOption(preferredQuality: VideoQuality): VideoQualityInfo | null {
        return this._qualityOptions.find(q => q.quality === preferredQuality) || null;
    }

    /**
     * Check if video has quality option
     */
    hasQuality(quality: VideoQuality): boolean {
        return this._qualityOptions.some(q => q.quality === quality);
    }

    /**
     * Get file size for quality
     */
    getFileSize(quality: VideoQuality): number | null {
        const option = this.getQualityOption(quality);
        return option ? option.fileSize : null;
    }

    /**
     * Convert to summary string
     */
    toSummary(): string {
        return `${this.title} (${this.formattedDuration}) - ${this.viewCount} views`;
    }
}