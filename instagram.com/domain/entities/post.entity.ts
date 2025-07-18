/*
                        Semantest - Instagram Domain Entities
                        Post Entity

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Entity } from '@semantest/core';

export type PostType = 'photo' | 'video' | 'carousel' | 'reel' | 'story';

export interface PostMetadata {
    caption: string;
    mediaUrls: string[];
    thumbnailUrl: string;
    timestamp: Date;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    viewCount: number;
    isVideo: boolean;
    duration?: number;
    hashtags: string[];
    mentions: string[];
    location?: string;
    isArchived: boolean;
    isPrivate: boolean;
}

/**
 * Instagram Post Entity
 * 
 * Represents an Instagram post with comprehensive metadata,
 * engagement tracking, and download capabilities.
 */
export class Post extends Entity {
    private _metadata: PostMetadata;
    private _type: PostType;
    private _isDownloaded: boolean = false;
    private _downloadPath: string | null = null;
    private _lastUpdated: Date = new Date();

    constructor(
        id: string,
        public readonly postId: string,
        public readonly userId: string,
        public readonly username: string,
        public readonly postUrl: string,
        type: PostType,
        metadata: PostMetadata
    ) {
        super(id);
        this._type = type;
        this._metadata = { ...metadata };
    }

    /**
     * Get post metadata
     */
    get metadata(): PostMetadata {
        return { ...this._metadata };
    }

    /**
     * Get post type
     */
    get type(): PostType {
        return this._type;
    }

    /**
     * Get caption
     */
    get caption(): string {
        return this._metadata.caption;
    }

    /**
     * Get media URLs
     */
    get mediaUrls(): string[] {
        return [...this._metadata.mediaUrls];
    }

    /**
     * Get thumbnail URL
     */
    get thumbnailUrl(): string {
        return this._metadata.thumbnailUrl;
    }

    /**
     * Get timestamp
     */
    get timestamp(): Date {
        return this._metadata.timestamp;
    }

    /**
     * Get like count
     */
    get likeCount(): number {
        return this._metadata.likeCount;
    }

    /**
     * Get comment count
     */
    get commentCount(): number {
        return this._metadata.commentCount;
    }

    /**
     * Get hashtags
     */
    get hashtags(): string[] {
        return [...this._metadata.hashtags];
    }

    /**
     * Get mentions
     */
    get mentions(): string[] {
        return [...this._metadata.mentions];
    }

    /**
     * Check if post is video
     */
    get isVideo(): boolean {
        return this._metadata.isVideo;
    }

    /**
     * Check if post is downloaded
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
    updateMetadata(metadata: Partial<PostMetadata>): void {
        this._metadata = { ...this._metadata, ...metadata };
        this._lastUpdated = new Date();
    }

    /**
     * Convert to summary string
     */
    toSummary(): string {
        const type = this._type;
        const likes = this._metadata.likeCount;
        const caption = this._metadata.caption.substring(0, 50) + '...';
        
        return `${this.username} ${type} (${likes} likes) - ${caption}`;
    }
}