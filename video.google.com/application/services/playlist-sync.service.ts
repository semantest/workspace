/*
                        Semantest - YouTube Video Application Services
                        Playlist Sync Service

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { YouTubeApiAdapter } from '../../infrastructure/adapters/youtube-api.adapter';
import { Playlist, PlaylistMetadata, PlaylistVideo } from '../../domain/entities/playlist.entity';
import { PlaylistSynced, PlaylistSyncResult } from '../../domain/events/playlist-synced.event';

export interface PlaylistSyncOptions {
    fullSync?: boolean;
    maxVideos?: number;
    includeUnavailable?: boolean;
    timeout?: number;
}

export interface PlaylistSyncServiceResult {
    success: boolean;
    playlist?: Playlist;
    syncResult?: PlaylistSyncResult;
    error?: string;
}

/**
 * Playlist Sync Service
 * 
 * Application service for synchronizing playlists with YouTube
 * and tracking changes in playlist content.
 */
export class PlaylistSyncService {
    constructor(
        private readonly youtubeApi: YouTubeApiAdapter
    ) {}

    /**
     * Sync playlist by URL
     */
    async syncPlaylist(
        playlistUrl: string,
        options: PlaylistSyncOptions = {}
    ): Promise<PlaylistSyncServiceResult> {
        const startTime = Date.now();

        try {
            // Extract playlist ID from URL
            const playlistId = this.extractPlaylistId(playlistUrl);
            if (!playlistId) {
                throw new Error('Invalid playlist URL');
            }

            // Get playlist metadata
            const playlistDetails = await this.youtubeApi.getPlaylistDetails(playlistId);
            const playlistMetadata = this.youtubeApi.convertToPlaylistMetadata(playlistDetails);

            // Create or update playlist entity
            const playlist = new Playlist(
                `playlist-${playlistId}`,
                playlistId,
                playlistUrl,
                playlistMetadata
            );

            // Start sync
            playlist.startSync();

            // Get playlist items
            const playlistItems = await this.youtubeApi.getAllPlaylistItems(playlistId);
            
            // Convert to playlist videos
            const playlistVideos: PlaylistVideo[] = [];
            const errors: string[] = [];
            const warnings: string[] = [];

            for (const item of playlistItems) {
                try {
                    // Check if we should include unavailable videos
                    const isAvailable = item.status.privacyStatus === 'public';
                    
                    if (!isAvailable && !options.includeUnavailable) {
                        warnings.push(`Video ${item.contentDetails.videoId} is unavailable`);
                        continue;
                    }

                    // Get video duration (would need additional API call in real implementation)
                    const duration = await this.getVideoDuration(item.contentDetails.videoId);

                    const playlistVideo: PlaylistVideo = {
                        videoId: item.contentDetails.videoId,
                        title: item.snippet.title,
                        channelId: item.snippet.channelId,
                        channelTitle: item.snippet.channelTitle,
                        position: item.snippet.position,
                        addedDate: new Date(item.snippet.publishedAt),
                        duration: duration,
                        thumbnailUrl: item.snippet.thumbnails.high?.url || 
                                     item.snippet.thumbnails.medium?.url || 
                                     item.snippet.thumbnails.default?.url,
                        isAvailable
                    };

                    playlistVideos.push(playlistVideo);

                    // Check max videos limit
                    if (options.maxVideos && playlistVideos.length >= options.maxVideos) {
                        break;
                    }

                } catch (error) {
                    errors.push(`Failed to process video ${item.contentDetails.videoId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            // Calculate sync results
            const existingVideos = playlist.videos;
            const existingVideoIds = new Set(existingVideos.map(v => v.videoId));
            const newVideoIds = new Set(playlistVideos.map(v => v.videoId));

            const videosAdded = playlistVideos.filter(v => !existingVideoIds.has(v.videoId)).length;
            const videosRemoved = existingVideos.filter(v => !newVideoIds.has(v.videoId)).length;
            const videosUpdated = playlistVideos.filter(v => {
                const existing = existingVideos.find(e => e.videoId === v.videoId);
                return existing && (
                    existing.title !== v.title ||
                    existing.position !== v.position ||
                    existing.isAvailable !== v.isAvailable
                );
            }).length;

            const endTime = Date.now();
            const syncDuration = endTime - startTime;

            const syncResult: PlaylistSyncResult = {
                playlistId,
                playlistTitle: playlist.title,
                videosAdded,
                videosRemoved,
                videosUpdated,
                totalVideos: playlistVideos.length,
                syncDuration,
                errors,
                warnings
            };

            // Complete sync
            playlist.completeSync(playlistVideos);

            return {
                success: true,
                playlist,
                syncResult
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Sync playlist by ID
     */
    async syncPlaylistById(
        playlistId: string,
        options: PlaylistSyncOptions = {}
    ): Promise<PlaylistSyncServiceResult> {
        const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
        return this.syncPlaylist(playlistUrl, options);
    }

    /**
     * Get playlist info without syncing
     */
    async getPlaylistInfo(playlistUrl: string): Promise<{
        success: boolean;
        playlist?: Playlist;
        error?: string;
    }> {
        try {
            // Extract playlist ID from URL
            const playlistId = this.extractPlaylistId(playlistUrl);
            if (!playlistId) {
                throw new Error('Invalid playlist URL');
            }

            // Get playlist metadata
            const playlistDetails = await this.youtubeApi.getPlaylistDetails(playlistId);
            const playlistMetadata = this.youtubeApi.convertToPlaylistMetadata(playlistDetails);

            // Create playlist entity
            const playlist = new Playlist(
                `playlist-${playlistId}`,
                playlistId,
                playlistUrl,
                playlistMetadata
            );

            return {
                success: true,
                playlist
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Check if playlist needs sync
     */
    async checkSyncStatus(playlist: Playlist, maxAge: number = 24 * 60 * 60 * 1000): Promise<{
        needsSync: boolean;
        reason?: string;
        lastSyncAge?: number;
    }> {
        // Check if playlist has never been synced
        if (!playlist.lastSyncDate) {
            return {
                needsSync: true,
                reason: 'Never synced'
            };
        }

        // Check sync age
        const now = new Date();
        const lastSyncAge = now.getTime() - playlist.lastSyncDate.getTime();
        
        if (lastSyncAge > maxAge) {
            return {
                needsSync: true,
                reason: 'Sync is outdated',
                lastSyncAge
            };
        }

        // Check sync status
        if (playlist.syncStatus === 'error') {
            return {
                needsSync: true,
                reason: 'Previous sync failed'
            };
        }

        if (playlist.syncStatus === 'outdated') {
            return {
                needsSync: true,
                reason: 'Marked as outdated'
            };
        }

        return {
            needsSync: false,
            lastSyncAge
        };
    }

    /**
     * Get sync recommendations
     */
    getSyncRecommendations(playlist: Playlist): {
        recommendedAction: 'full_sync' | 'incremental_sync' | 'no_sync';
        reason: string;
        options: PlaylistSyncOptions;
    } {
        const syncStatus = playlist.syncStatus;
        const videoCount = playlist.videoCount;
        const lastSyncDate = playlist.lastSyncDate;

        // Never synced - recommend full sync
        if (!lastSyncDate) {
            return {
                recommendedAction: 'full_sync',
                reason: 'Playlist has never been synced',
                options: {
                    fullSync: true,
                    includeUnavailable: true
                }
            };
        }

        // Error status - recommend full sync
        if (syncStatus === 'error') {
            return {
                recommendedAction: 'full_sync',
                reason: 'Previous sync failed',
                options: {
                    fullSync: true,
                    includeUnavailable: true
                }
            };
        }

        // Large playlist - recommend incremental sync
        if (videoCount > 200) {
            return {
                recommendedAction: 'incremental_sync',
                reason: 'Large playlist - incremental sync recommended',
                options: {
                    fullSync: false,
                    maxVideos: 50,
                    includeUnavailable: false
                }
            };
        }

        // Recent sync - no sync needed
        if (playlist.needsSync(6 * 60 * 60 * 1000)) { // 6 hours
            return {
                recommendedAction: 'no_sync',
                reason: 'Recently synced',
                options: {}
            };
        }

        // Default - incremental sync
        return {
            recommendedAction: 'incremental_sync',
            reason: 'Regular maintenance sync',
            options: {
                fullSync: false,
                includeUnavailable: false
            }
        };
    }

    /**
     * Extract playlist ID from URL
     */
    private extractPlaylistId(url: string): string | null {
        const match = url.match(/[?&]list=([^&]+)/);
        return match ? match[1] : null;
    }

    /**
     * Get video duration (would make API call in real implementation)
     */
    private async getVideoDuration(videoId: string): Promise<number> {
        try {
            const videoDetails = await this.youtubeApi.getVideoDetails(videoId);
            const metadata = this.youtubeApi.convertToVideoMetadata(videoDetails);
            return metadata.duration;
        } catch {
            return 0; // Default duration if API call fails
        }
    }
}