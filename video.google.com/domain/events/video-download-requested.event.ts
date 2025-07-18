/*
                        Semantest - YouTube Video Domain Events
                        Video Download Requested Event

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { DomainEvent } from '@semantest/core';
import { VideoQuality } from '../entities/video.entity';

export interface VideoDownloadOptions {
    quality?: VideoQuality;
    format?: 'mp4' | 'webm' | 'mkv' | 'avi';
    includeAudio?: boolean;
    includeSubtitles?: boolean;
    subtitleLanguage?: string;
    filename?: string;
    conflictAction?: 'uniquify' | 'overwrite' | 'prompt';
    downloadPath?: string;
    maxFileSize?: number;
    startTime?: number;
    endTime?: number;
}

/**
 * Domain Event: Video Download Requested
 * 
 * Represents a request to download a video from YouTube.
 * This event is triggered when a user or automated system requests to download
 * a specific video with specified quality and format options.
 */
export class VideoDownloadRequested extends DomainEvent {
    public readonly eventType = 'VideoDownloadRequested';
    
    constructor(
        public readonly videoId: string,
        public readonly videoUrl: string,
        public readonly options: VideoDownloadOptions = {},
        correlationId?: string
    ) {
        super(correlationId || `video-dl-${videoId}-${Date.now()}`);
    }

    /**
     * Get the desired video quality
     */
    get quality(): VideoQuality {
        return this.options.quality || 'medium';
    }

    /**
     * Get the desired video format
     */
    get format(): string {
        return this.options.format || 'mp4';
    }

    /**
     * Check if audio should be included
     */
    get includeAudio(): boolean {
        return this.options.includeAudio !== false;
    }

    /**
     * Check if subtitles should be included
     */
    get includeSubtitles(): boolean {
        return this.options.includeSubtitles || false;
    }

    /**
     * Get subtitle language
     */
    get subtitleLanguage(): string {
        return this.options.subtitleLanguage || 'en';
    }

    /**
     * Get the desired filename
     */
    get filename(): string | undefined {
        return this.options.filename;
    }

    /**
     * Get the download path
     */
    get downloadPath(): string {
        return this.options.downloadPath || './downloads';
    }

    /**
     * Get max file size limit
     */
    get maxFileSize(): number | undefined {
        return this.options.maxFileSize;
    }

    /**
     * Get start time for clipping
     */
    get startTime(): number | undefined {
        return this.options.startTime;
    }

    /**
     * Get end time for clipping
     */
    get endTime(): number | undefined {
        return this.options.endTime;
    }

    /**
     * Check if this is a clip request
     */
    get isClip(): boolean {
        return this.options.startTime !== undefined || this.options.endTime !== undefined;
    }

    /**
     * Create a summary of the download request
     */
    toSummary(): string {
        const quality = this.quality;
        const format = this.format;
        const filename = this.filename ? ` as "${this.filename}"` : '';
        const clip = this.isClip ? ' (clip)' : '';
        
        return `Download video ${this.videoId} in ${quality} ${format}${filename}${clip}`;
    }
}