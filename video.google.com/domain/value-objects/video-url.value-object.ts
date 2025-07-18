/*
                        Semantest - YouTube Video Domain Value Objects
                        Video URL Value Object

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

export class VideoUrl {
    private static readonly YOUTUBE_DOMAIN_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/;
    private static readonly VIDEO_ID_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    private static readonly PLAYLIST_ID_REGEX = /[?&]list=([^&]+)/;
    private static readonly TIMESTAMP_REGEX = /[?&]t=([^&]+)/;

    private constructor(
        private readonly _url: string,
        private readonly _videoId: string,
        private readonly _playlistId?: string,
        private readonly _timestamp?: number
    ) {}

    /**
     * Create VideoUrl from string
     */
    static fromString(url: string): VideoUrl {
        if (!url || typeof url !== 'string') {
            throw new Error('Video URL must be a non-empty string');
        }

        const trimmedUrl = url.trim();
        
        if (!this.isValidYouTubeUrl(trimmedUrl)) {
            throw new Error('Invalid YouTube URL format');
        }

        const videoId = this.extractVideoId(trimmedUrl);
        if (!videoId) {
            throw new Error('Could not extract video ID from URL');
        }

        const playlistId = this.extractPlaylistId(trimmedUrl);
        const timestamp = this.extractTimestamp(trimmedUrl);

        return new VideoUrl(trimmedUrl, videoId, playlistId, timestamp);
    }

    /**
     * Create VideoUrl from video ID
     */
    static fromVideoId(videoId: string): VideoUrl {
        if (!videoId || typeof videoId !== 'string') {
            throw new Error('Video ID must be a non-empty string');
        }

        if (videoId.length !== 11) {
            throw new Error('Video ID must be 11 characters long');
        }

        const url = `https://www.youtube.com/watch?v=${videoId}`;
        return new VideoUrl(url, videoId);
    }

    /**
     * Get full URL
     */
    get url(): string {
        return this._url;
    }

    /**
     * Get video ID
     */
    get videoId(): string {
        return this._videoId;
    }

    /**
     * Get playlist ID if present
     */
    get playlistId(): string | undefined {
        return this._playlistId;
    }

    /**
     * Get timestamp if present
     */
    get timestamp(): number | undefined {
        return this._timestamp;
    }

    /**
     * Check if URL has playlist
     */
    get hasPlaylist(): boolean {
        return this._playlistId !== undefined;
    }

    /**
     * Check if URL has timestamp
     */
    get hasTimestamp(): boolean {
        return this._timestamp !== undefined;
    }

    /**
     * Get clean video URL (without playlist or timestamp)
     */
    get cleanUrl(): string {
        return `https://www.youtube.com/watch?v=${this._videoId}`;
    }

    /**
     * Get embed URL
     */
    get embedUrl(): string {
        const baseUrl = `https://www.youtube.com/embed/${this._videoId}`;
        const params = new URLSearchParams();

        if (this._timestamp) {
            params.append('start', this._timestamp.toString());
        }

        return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
    }

    /**
     * Get thumbnail URL
     */
    getThumbnailUrl(quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'medium'): string {
        const qualityMap = {
            'default': 'default',
            'medium': 'mqdefault',
            'high': 'hqdefault',
            'standard': 'sddefault',
            'maxres': 'maxresdefault'
        };

        return `https://img.youtube.com/vi/${this._videoId}/${qualityMap[quality]}.jpg`;
    }

    /**
     * Get watch URL with playlist
     */
    getPlaylistUrl(): string {
        if (!this._playlistId) {
            return this.cleanUrl;
        }

        return `https://www.youtube.com/watch?v=${this._videoId}&list=${this._playlistId}`;
    }

    /**
     * Get watch URL with timestamp
     */
    getTimestampUrl(): string {
        if (!this._timestamp) {
            return this.cleanUrl;
        }

        return `https://www.youtube.com/watch?v=${this._videoId}&t=${this._timestamp}`;
    }

    /**
     * Format timestamp as human-readable string
     */
    getFormattedTimestamp(): string | undefined {
        if (!this._timestamp) {
            return undefined;
        }

        const minutes = Math.floor(this._timestamp / 60);
        const seconds = this._timestamp % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Create new VideoUrl with timestamp
     */
    withTimestamp(timestamp: number): VideoUrl {
        if (timestamp < 0) {
            throw new Error('Timestamp cannot be negative');
        }

        const url = `https://www.youtube.com/watch?v=${this._videoId}&t=${timestamp}`;
        return new VideoUrl(url, this._videoId, this._playlistId, timestamp);
    }

    /**
     * Create new VideoUrl with playlist
     */
    withPlaylist(playlistId: string): VideoUrl {
        if (!playlistId || typeof playlistId !== 'string') {
            throw new Error('Playlist ID must be a non-empty string');
        }

        const url = `https://www.youtube.com/watch?v=${this._videoId}&list=${playlistId}`;
        return new VideoUrl(url, this._videoId, playlistId, this._timestamp);
    }

    /**
     * Check if URL is valid YouTube URL
     */
    private static isValidYouTubeUrl(url: string): boolean {
        return this.YOUTUBE_DOMAIN_REGEX.test(url);
    }

    /**
     * Extract video ID from URL
     */
    private static extractVideoId(url: string): string | null {
        const match = url.match(this.VIDEO_ID_REGEX);
        return match ? match[1] : null;
    }

    /**
     * Extract playlist ID from URL
     */
    private static extractPlaylistId(url: string): string | undefined {
        const match = url.match(this.PLAYLIST_ID_REGEX);
        return match ? match[1] : undefined;
    }

    /**
     * Extract timestamp from URL
     */
    private static extractTimestamp(url: string): number | undefined {
        const match = url.match(this.TIMESTAMP_REGEX);
        if (!match) return undefined;

        const timestampStr = match[1];
        
        // Handle different timestamp formats
        if (timestampStr.includes('m') || timestampStr.includes('s')) {
            // Format: 1m30s
            const minutes = timestampStr.match(/(\d+)m/);
            const seconds = timestampStr.match(/(\d+)s/);
            
            const m = minutes ? parseInt(minutes[1]) : 0;
            const s = seconds ? parseInt(seconds[1]) : 0;
            
            return m * 60 + s;
        } else {
            // Format: 90 (seconds)
            return parseInt(timestampStr);
        }
    }

    /**
     * Check equality
     */
    equals(other: VideoUrl): boolean {
        return this._videoId === other._videoId &&
               this._playlistId === other._playlistId &&
               this._timestamp === other._timestamp;
    }

    /**
     * Convert to string
     */
    toString(): string {
        return this._url;
    }
}