/*
                        Semantest - YouTube Video Domain Events
                        Playlist Synced Event

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { DomainEvent } from '@semantest/core';
import { PlaylistVideo } from '../entities/playlist.entity';

export interface PlaylistSyncResult {
    playlistId: string;
    playlistTitle: string;
    videosAdded: number;
    videosRemoved: number;
    videosUpdated: number;
    totalVideos: number;
    syncDuration: number;
    errors: string[];
    warnings: string[];
}

/**
 * Domain Event: Playlist Synced
 * 
 * Represents the completion of a playlist synchronization operation.
 * This event is triggered when a playlist has been successfully synchronized
 * with the latest data from YouTube.
 */
export class PlaylistSynced extends DomainEvent {
    public readonly eventType = 'PlaylistSynced';
    
    constructor(
        public readonly playlistId: string,
        public readonly syncResult: PlaylistSyncResult,
        public readonly syncedVideos: PlaylistVideo[],
        correlationId?: string
    ) {
        super(correlationId || `playlist-sync-${playlistId}-${Date.now()}`);
    }

    /**
     * Get playlist title
     */
    get playlistTitle(): string {
        return this.syncResult.playlistTitle;
    }

    /**
     * Get number of videos added
     */
    get videosAdded(): number {
        return this.syncResult.videosAdded;
    }

    /**
     * Get number of videos removed
     */
    get videosRemoved(): number {
        return this.syncResult.videosRemoved;
    }

    /**
     * Get number of videos updated
     */
    get videosUpdated(): number {
        return this.syncResult.videosUpdated;
    }

    /**
     * Get total number of videos
     */
    get totalVideos(): number {
        return this.syncResult.totalVideos;
    }

    /**
     * Get sync duration in milliseconds
     */
    get syncDuration(): number {
        return this.syncResult.syncDuration;
    }

    /**
     * Get sync errors
     */
    get errors(): string[] {
        return [...this.syncResult.errors];
    }

    /**
     * Get sync warnings
     */
    get warnings(): string[] {
        return [...this.syncResult.warnings];
    }

    /**
     * Check if sync was successful
     */
    get isSuccessful(): boolean {
        return this.syncResult.errors.length === 0;
    }

    /**
     * Check if sync had warnings
     */
    get hasWarnings(): boolean {
        return this.syncResult.warnings.length > 0;
    }

    /**
     * Get total changes made
     */
    get totalChanges(): number {
        return this.videosAdded + this.videosRemoved + this.videosUpdated;
    }

    /**
     * Check if there were any changes
     */
    get hasChanges(): boolean {
        return this.totalChanges > 0;
    }

    /**
     * Get formatted sync duration
     */
    get formattedSyncDuration(): string {
        const seconds = Math.floor(this.syncDuration / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
    }

    /**
     * Get sync summary
     */
    getSyncSummary(): string {
        const changes = [];
        
        if (this.videosAdded > 0) {
            changes.push(`${this.videosAdded} added`);
        }
        if (this.videosRemoved > 0) {
            changes.push(`${this.videosRemoved} removed`);
        }
        if (this.videosUpdated > 0) {
            changes.push(`${this.videosUpdated} updated`);
        }

        if (changes.length === 0) {
            return 'No changes';
        }

        return changes.join(', ');
    }

    /**
     * Create a summary of the sync event
     */
    toSummary(): string {
        const status = this.isSuccessful ? 'successful' : 'failed';
        const changes = this.getSyncSummary();
        const duration = this.formattedSyncDuration;
        
        return `Playlist "${this.playlistTitle}" sync ${status} (${changes}) in ${duration}`;
    }
}