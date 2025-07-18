/*
                        Semantest - YouTube Video Application Services
                        Video Download Service

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { VideoDownloaderAdapter, DownloadConfig, DownloadProgress, DownloadResult } from '../../infrastructure/adapters/video-downloader.adapter';
import { YouTubeApiAdapter } from '../../infrastructure/adapters/youtube-api.adapter';
import { VideoUrl } from '../../domain/value-objects/video-url.value-object';
import { Video, VideoMetadata } from '../../domain/entities/video.entity';
import { VideoDownloadRequested } from '../../domain/events/video-download-requested.event';

export interface VideoDownloadOptions {
    quality?: 'highest' | 'high' | 'medium' | 'low' | 'lowest';
    format?: 'mp4' | 'webm' | 'mkv' | 'avi';
    includeAudio?: boolean;
    includeSubtitles?: boolean;
    subtitleLanguage?: string;
    filename?: string;
    outputPath?: string;
    maxFileSize?: number;
    timeout?: number;
}

export interface VideoDownloadServiceResult {
    success: boolean;
    video?: Video;
    downloadResult?: DownloadResult;
    error?: string;
    downloadTime?: number;
}

/**
 * Video Download Service
 * 
 * Application service for handling video download operations
 * with metadata retrieval and progress tracking.
 */
export class VideoDownloadService {
    constructor(
        private readonly videoDownloader: VideoDownloaderAdapter,
        private readonly youtubeApi: YouTubeApiAdapter
    ) {}

    /**
     * Download video by URL
     */
    async downloadVideo(
        videoUrl: string,
        options: VideoDownloadOptions = {},
        onProgress?: (progress: DownloadProgress) => void
    ): Promise<VideoDownloadServiceResult> {
        const startTime = Date.now();

        try {
            // Create and validate video URL
            const videoUrlObj = VideoUrl.fromString(videoUrl);
            const videoId = videoUrlObj.videoId;

            // Get video metadata from YouTube API
            const videoDetails = await this.youtubeApi.getVideoDetails(videoId);
            const videoMetadata = this.youtubeApi.convertToVideoMetadata(videoDetails);

            // Create video entity
            const video = new Video(
                `video-${videoId}`,
                videoId,
                videoDetails.snippet.channelId,
                videoUrl,
                videoMetadata
            );

            // Check if video is available for download
            if (!video.isAvailable) {
                throw new Error('Video is not available for download (private or deleted)');
            }

            // Convert options to download config
            const downloadConfig: Partial<DownloadConfig> = {
                quality: options.quality || 'medium',
                format: options.format || 'mp4',
                includeAudio: options.includeAudio !== false,
                includeSubtitles: options.includeSubtitles || false,
                subtitleLanguage: options.subtitleLanguage || 'en',
                outputPath: options.outputPath || './downloads',
                maxFileSize: options.maxFileSize || 1024 * 1024 * 1024, // 1GB
                timeout: options.timeout || 300000 // 5 minutes
            };

            // Download video
            const downloadResult = await this.videoDownloader.downloadVideo(
                videoUrl,
                downloadConfig,
                onProgress
            );

            const endTime = Date.now();
            const downloadTime = endTime - startTime;

            if (downloadResult.success) {
                // Update video with download information
                if (downloadResult.quality) {
                    video.addQualityOption({
                        quality: this.mapQualityLabel(downloadResult.quality),
                        resolution: downloadResult.quality,
                        fps: 30, // Default, would be extracted from format info
                        bitrate: 0, // Would be extracted from format info
                        audioQuality: 'medium',
                        fileSize: downloadResult.fileSize || 0,
                        downloadUrl: videoUrl
                    });
                }

                return {
                    success: true,
                    video,
                    downloadResult,
                    downloadTime
                };
            } else {
                return {
                    success: false,
                    video,
                    error: downloadResult.error,
                    downloadTime
                };
            }

        } catch (error) {
            const endTime = Date.now();
            const downloadTime = endTime - startTime;

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                downloadTime
            };
        }
    }

    /**
     * Download video from download request event
     */
    async downloadFromEvent(
        event: VideoDownloadRequested,
        onProgress?: (progress: DownloadProgress) => void
    ): Promise<VideoDownloadServiceResult> {
        const options: VideoDownloadOptions = {
            quality: event.quality,
            format: event.format as any,
            includeAudio: event.includeAudio,
            includeSubtitles: event.includeSubtitles,
            subtitleLanguage: event.subtitleLanguage,
            filename: event.filename,
            outputPath: event.downloadPath,
            maxFileSize: event.maxFileSize,
            timeout: 300000
        };

        return this.downloadVideo(event.videoUrl, options, onProgress);
    }

    /**
     * Get video information without downloading
     */
    async getVideoInfo(videoUrl: string): Promise<{
        success: boolean;
        video?: Video;
        error?: string;
    }> {
        try {
            // Create and validate video URL
            const videoUrlObj = VideoUrl.fromString(videoUrl);
            const videoId = videoUrlObj.videoId;

            // Get video metadata from YouTube API
            const videoDetails = await this.youtubeApi.getVideoDetails(videoId);
            const videoMetadata = this.youtubeApi.convertToVideoMetadata(videoDetails);

            // Create video entity
            const video = new Video(
                `video-${videoId}`,
                videoId,
                videoDetails.snippet.channelId,
                videoUrl,
                videoMetadata
            );

            // Get available formats
            const formats = await this.videoDownloader.getAvailableFormats(videoUrl);
            
            // Add quality options
            formats.forEach(format => {
                if (format.hasVideo && format.hasAudio) {
                    video.addQualityOption({
                        quality: this.mapQualityFromHeight(format.height),
                        resolution: `${format.width}x${format.height}`,
                        fps: format.fps,
                        bitrate: format.bitrate,
                        audioQuality: format.audioQuality || 'medium',
                        fileSize: format.contentLength,
                        downloadUrl: format.url
                    });
                }
            });

            return {
                success: true,
                video
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Check if video is downloadable
     */
    async isVideoDownloadable(videoUrl: string): Promise<{
        downloadable: boolean;
        reason?: string;
    }> {
        try {
            // Validate URL
            if (!this.videoDownloader.isValidVideoUrl(videoUrl)) {
                return {
                    downloadable: false,
                    reason: 'Invalid YouTube video URL'
                };
            }

            // Get video info
            const videoInfo = await this.getVideoInfo(videoUrl);
            
            if (!videoInfo.success || !videoInfo.video) {
                return {
                    downloadable: false,
                    reason: videoInfo.error || 'Could not retrieve video information'
                };
            }

            // Check availability
            if (!videoInfo.video.isAvailable) {
                return {
                    downloadable: false,
                    reason: 'Video is private, deleted, or unavailable'
                };
            }

            // Check for available formats
            if (videoInfo.video.qualityOptions.length === 0) {
                return {
                    downloadable: false,
                    reason: 'No downloadable formats available'
                };
            }

            return {
                downloadable: true
            };

        } catch (error) {
            return {
                downloadable: false,
                reason: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Map quality label to video quality enum
     */
    private mapQualityLabel(qualityLabel: string): 'highest' | 'high' | 'medium' | 'low' | 'lowest' {
        const height = parseInt(qualityLabel.replace('p', ''));
        
        if (height >= 1080) return 'highest';
        if (height >= 720) return 'high';
        if (height >= 480) return 'medium';
        if (height >= 360) return 'low';
        return 'lowest';
    }

    /**
     * Map video height to quality enum
     */
    private mapQualityFromHeight(height: number): 'highest' | 'high' | 'medium' | 'low' | 'lowest' {
        if (height >= 1080) return 'highest';
        if (height >= 720) return 'high';
        if (height >= 480) return 'medium';
        if (height >= 360) return 'low';
        return 'lowest';
    }
}