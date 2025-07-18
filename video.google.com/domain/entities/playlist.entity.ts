/*
                        Semantest - YouTube Video Domain Entities
                        Playlist Entity

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Entity } from '@semantest/core';

export type PlaylistVisibility = 'public' | 'unlisted' | 'private';

export interface PlaylistMetadata {
    title: string;
    description: string;
    visibility: PlaylistVisibility;
    createdDate: Date;
    updatedDate: Date;
    thumbnailUrl: string;
    channelId: string;
    channelTitle: string;
    videoCount: number;
    viewCount: number;
    tags: string[];
}

export interface PlaylistVideo {
    videoId: string;
    title: string;
    channelId: string;
    channelTitle: string;
    position: number;
    addedDate: Date;
    duration: number;
    thumbnailUrl: string;
    isAvailable: boolean;
}

export interface PlaylistStatistics {
    totalDuration: number;
    totalViews: number;
    averageVideoLength: number;
    lastUpdated: Date;
    syncStatus: 'synced' | 'outdated' | 'syncing' | 'error';
}

/**
 * Playlist Entity
 * 
 * Represents a YouTube playlist with metadata, videos,
 * and synchronization capabilities.
 */
export class Playlist extends Entity {
    private _metadata: PlaylistMetadata;
    private _videos: PlaylistVideo[] = [];
    private _statistics: PlaylistStatistics;
    private _isSynced: boolean = false;
    private _lastSyncDate: Date | null = null;
    private _lastUpdated: Date = new Date();

    constructor(
        id: string,
        public readonly playlistId: string,
        public readonly url: string,
        metadata: PlaylistMetadata
    ) {
        super(id);
        this._metadata = { ...metadata };
        this._statistics = {
            totalDuration: 0,
            totalViews: metadata.viewCount,
            averageVideoLength: 0,
            lastUpdated: new Date(),
            syncStatus: 'outdated'
        };
    }

    /**
     * Get playlist metadata
     */
    get metadata(): PlaylistMetadata {
        return { ...this._metadata };
    }

    /**
     * Get playlist title
     */
    get title(): string {
        return this._metadata.title;
    }

    /**
     * Get playlist description
     */
    get description(): string {
        return this._metadata.description;
    }

    /**
     * Get playlist visibility
     */
    get visibility(): PlaylistVisibility {
        return this._metadata.visibility;
    }

    /**
     * Get creation date
     */
    get createdDate(): Date {
        return this._metadata.createdDate;
    }

    /**
     * Get last updated date
     */
    get updatedDate(): Date {
        return this._metadata.updatedDate;
    }

    /**
     * Get thumbnail URL
     */
    get thumbnailUrl(): string {
        return this._metadata.thumbnailUrl;
    }

    /**
     * Get channel ID
     */
    get channelId(): string {
        return this._metadata.channelId;
    }

    /**
     * Get channel title
     */
    get channelTitle(): string {
        return this._metadata.channelTitle;
    }

    /**
     * Get video count
     */
    get videoCount(): number {
        return this._videos.length;
    }

    /**
     * Get view count
     */
    get viewCount(): number {
        return this._metadata.viewCount;
    }

    /**
     * Get playlist tags
     */
    get tags(): string[] {
        return [...this._metadata.tags];
    }

    /**
     * Get playlist videos
     */
    get videos(): PlaylistVideo[] {
        return [...this._videos];
    }

    /**
     * Get playlist statistics
     */
    get statistics(): PlaylistStatistics {
        return { ...this._statistics };
    }

    /**
     * Check if playlist is synced
     */
    get isSynced(): boolean {
        return this._isSynced;
    }

    /**
     * Get last sync date
     */
    get lastSyncDate(): Date | null {
        return this._lastSyncDate;
    }

    /**
     * Get sync status
     */
    get syncStatus(): PlaylistStatistics['syncStatus'] {
        return this._statistics.syncStatus;
    }

    /**
     * Get total duration in seconds
     */
    get totalDuration(): number {
        return this._statistics.totalDuration;
    }

    /**
     * Get formatted total duration
     */
    get formattedTotalDuration(): string {
        const seconds = this.totalDuration;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${remainingSeconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
    }

    /**
     * Get average video length
     */
    get averageVideoLength(): number {
        return this._statistics.averageVideoLength;
    }

    /**
     * Check if playlist is public
     */
    get isPublic(): boolean {
        return this._metadata.visibility === 'public';
    }

    /**
     * Update playlist metadata
     */
    updateMetadata(metadata: Partial<PlaylistMetadata>): void {
        this._metadata = { ...this._metadata, ...metadata };
        this._lastUpdated = new Date();
    }

    /**
     * Add video to playlist
     */
    addVideo(video: PlaylistVideo): void {
        const existingIndex = this._videos.findIndex(v => v.videoId === video.videoId);
        
        if (existingIndex >= 0) {
            this._videos[existingIndex] = video;
        } else {
            this._videos.push(video);
        }

        this.recalculateStatistics();
        this._lastUpdated = new Date();
    }

    /**
     * Remove video from playlist
     */
    removeVideo(videoId: string): boolean {
        const index = this._videos.findIndex(v => v.videoId === videoId);
        
        if (index >= 0) {
            this._videos.splice(index, 1);
            this.recalculateStatistics();
            this._lastUpdated = new Date();
            return true;
        }
        
        return false;
    }

    /**
     * Get video by ID
     */
    getVideo(videoId: string): PlaylistVideo | null {
        return this._videos.find(v => v.videoId === videoId) || null;
    }

    /**
     * Get videos by page
     */
    getVideos(page: number = 1, pageSize: number = 50): PlaylistVideo[] {
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return this._videos.slice(startIndex, endIndex);
    }

    /**
     * Sync playlist with YouTube
     */
    startSync(): void {
        this._statistics.syncStatus = 'syncing';
        this._lastUpdated = new Date();
    }

    /**
     * Complete sync
     */
    completeSync(videos: PlaylistVideo[]): void {
        this._videos = [...videos];
        this._isSynced = true;
        this._lastSyncDate = new Date();
        this._statistics.syncStatus = 'synced';
        this.recalculateStatistics();
        this._lastUpdated = new Date();
    }

    /**
     * Fail sync
     */
    failSync(): void {
        this._statistics.syncStatus = 'error';
        this._lastUpdated = new Date();
    }

    /**
     * Mark as outdated
     */
    markOutdated(): void {
        this._statistics.syncStatus = 'outdated';
        this._isSynced = false;
        this._lastUpdated = new Date();
    }

    /**
     * Get available videos (not deleted/private)
     */
    getAvailableVideos(): PlaylistVideo[] {
        return this._videos.filter(v => v.isAvailable);
    }

    /**
     * Get unavailable videos count
     */
    getUnavailableCount(): number {
        return this._videos.filter(v => !v.isAvailable).length;
    }

    /**
     * Check if playlist needs sync
     */
    needsSync(maxAge: number = 24 * 60 * 60 * 1000): boolean {
        if (!this._lastSyncDate) return true;
        const now = new Date();
        return (now.getTime() - this._lastSyncDate.getTime()) > maxAge;
    }

    /**
     * Recalculate statistics
     */
    private recalculateStatistics(): void {
        const availableVideos = this.getAvailableVideos();
        const totalDuration = availableVideos.reduce((sum, video) => sum + video.duration, 0);
        const averageLength = availableVideos.length > 0 ? totalDuration / availableVideos.length : 0;

        this._statistics = {
            ...this._statistics,
            totalDuration,
            averageVideoLength: averageLength,
            lastUpdated: new Date()
        };
    }

    /**
     * Convert to summary string
     */
    toSummary(): string {
        return `${this.title} (${this.videoCount} videos) - ${this.formattedTotalDuration}`;
    }
}