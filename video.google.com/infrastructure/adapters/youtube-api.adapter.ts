/*
                        Semantest - YouTube Video Infrastructure Adapters
                        YouTube API Adapter

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import axios, { AxiosResponse } from 'axios';
import { VideoMetadata, VideoQuality } from '../../domain/entities/video.entity';
import { ChannelMetadata } from '../../domain/entities/channel.entity';
import { PlaylistMetadata, PlaylistVideo } from '../../domain/entities/playlist.entity';

export interface YouTubeApiConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
}

export interface VideoDetailsResponse {
    id: string;
    snippet: {
        title: string;
        description: string;
        channelId: string;
        channelTitle: string;
        publishedAt: string;
        categoryId: string;
        defaultLanguage: string;
        tags: string[];
        thumbnails: {
            default: { url: string };
            medium: { url: string };
            high: { url: string };
            standard: { url: string };
            maxres: { url: string };
        };
        liveBroadcastContent: string;
        isPrivate: boolean;
    };
    contentDetails: {
        duration: string;
        contentRating: {
            ytRating?: string;
        };
    };
    statistics: {
        viewCount: string;
        likeCount: string;
        dislikeCount: string;
        commentCount: string;
    };
    status: {
        privacyStatus: string;
        uploadStatus: string;
        madeForKids: boolean;
    };
}

export interface ChannelDetailsResponse {
    id: string;
    snippet: {
        title: string;
        description: string;
        country: string;
        defaultLanguage: string;
        publishedAt: string;
        customUrl: string;
        thumbnails: {
            default: { url: string };
            medium: { url: string };
            high: { url: string };
        };
    };
    statistics: {
        viewCount: string;
        subscriberCount: string;
        videoCount: string;
        hiddenSubscriberCount: boolean;
    };
    brandingSettings: {
        channel: {
            title: string;
            description: string;
            keywords: string;
            moderateComments: boolean;
            unsubscribedTrailer: string;
            profileColor: string;
        };
        image: {
            bannerImageUrl: string;
            bannerTvImageUrl: string;
            bannerTabletImageUrl: string;
            bannerMobileImageUrl: string;
        };
    };
    status: {
        privacyStatus: string;
        isLinked: boolean;
        longUploadsStatus: string;
        madeForKids: boolean;
    };
}

export interface PlaylistDetailsResponse {
    id: string;
    snippet: {
        title: string;
        description: string;
        channelId: string;
        channelTitle: string;
        publishedAt: string;
        tags: string[];
        defaultLanguage: string;
        thumbnails: {
            default: { url: string };
            medium: { url: string };
            high: { url: string };
            standard: { url: string };
            maxres: { url: string };
        };
    };
    contentDetails: {
        itemCount: number;
    };
    status: {
        privacyStatus: string;
    };
}

export interface PlaylistItemsResponse {
    items: {
        id: string;
        snippet: {
            title: string;
            description: string;
            channelId: string;
            channelTitle: string;
            publishedAt: string;
            position: number;
            resourceId: {
                kind: string;
                videoId: string;
            };
            thumbnails: {
                default: { url: string };
                medium: { url: string };
                high: { url: string };
                standard: { url: string };
                maxres: { url: string };
            };
        };
        contentDetails: {
            videoId: string;
            startAt: string;
            endAt: string;
            note: string;
            videoPublishedAt: string;
        };
        status: {
            privacyStatus: string;
        };
    }[];
    nextPageToken?: string;
    prevPageToken?: string;
    pageInfo: {
        totalResults: number;
        resultsPerPage: number;
    };
}

/**
 * YouTube API Adapter
 * 
 * Handles communication with YouTube Data API v3 for retrieving
 * video, channel, and playlist information.
 */
export class YouTubeApiAdapter {
    private readonly config: Required<YouTubeApiConfig>;

    constructor(config: YouTubeApiConfig) {
        this.config = {
            baseUrl: 'https://www.googleapis.com/youtube/v3',
            timeout: 30000,
            maxRetries: 3,
            retryDelay: 1000,
            ...config
        };
    }

    /**
     * Get video details by ID
     */
    async getVideoDetails(videoId: string): Promise<VideoDetailsResponse> {
        const url = `${this.config.baseUrl}/videos`;
        const params = {
            part: 'snippet,contentDetails,statistics,status',
            id: videoId,
            key: this.config.apiKey
        };

        const response = await this.makeRequest<{ items: VideoDetailsResponse[] }>(url, params);
        
        if (!response.data.items || response.data.items.length === 0) {
            throw new Error(`Video not found: ${videoId}`);
        }

        return response.data.items[0];
    }

    /**
     * Get channel details by ID
     */
    async getChannelDetails(channelId: string): Promise<ChannelDetailsResponse> {
        const url = `${this.config.baseUrl}/channels`;
        const params = {
            part: 'snippet,statistics,brandingSettings,status',
            id: channelId,
            key: this.config.apiKey
        };

        const response = await this.makeRequest<{ items: ChannelDetailsResponse[] }>(url, params);
        
        if (!response.data.items || response.data.items.length === 0) {
            throw new Error(`Channel not found: ${channelId}`);
        }

        return response.data.items[0];
    }

    /**
     * Get playlist details by ID
     */
    async getPlaylistDetails(playlistId: string): Promise<PlaylistDetailsResponse> {
        const url = `${this.config.baseUrl}/playlists`;
        const params = {
            part: 'snippet,contentDetails,status',
            id: playlistId,
            key: this.config.apiKey
        };

        const response = await this.makeRequest<{ items: PlaylistDetailsResponse[] }>(url, params);
        
        if (!response.data.items || response.data.items.length === 0) {
            throw new Error(`Playlist not found: ${playlistId}`);
        }

        return response.data.items[0];
    }

    /**
     * Get playlist items
     */
    async getPlaylistItems(playlistId: string, pageToken?: string): Promise<PlaylistItemsResponse> {
        const url = `${this.config.baseUrl}/playlistItems`;
        const params: any = {
            part: 'snippet,contentDetails,status',
            playlistId,
            maxResults: 50,
            key: this.config.apiKey
        };

        if (pageToken) {
            params.pageToken = pageToken;
        }

        const response = await this.makeRequest<PlaylistItemsResponse>(url, params);
        return response.data;
    }

    /**
     * Get all playlist items
     */
    async getAllPlaylistItems(playlistId: string): Promise<PlaylistItemsResponse['items']> {
        const allItems: PlaylistItemsResponse['items'] = [];
        let nextPageToken: string | undefined;

        do {
            const response = await this.getPlaylistItems(playlistId, nextPageToken);
            allItems.push(...response.items);
            nextPageToken = response.nextPageToken;
        } while (nextPageToken);

        return allItems;
    }

    /**
     * Search videos
     */
    async searchVideos(query: string, maxResults: number = 25): Promise<{
        items: {
            id: { videoId: string };
            snippet: {
                title: string;
                description: string;
                channelId: string;
                channelTitle: string;
                publishedAt: string;
                thumbnails: {
                    default: { url: string };
                    medium: { url: string };
                    high: { url: string };
                };
            };
        }[];
        nextPageToken?: string;
        prevPageToken?: string;
        pageInfo: {
            totalResults: number;
            resultsPerPage: number;
        };
    }> {
        const url = `${this.config.baseUrl}/search`;
        const params = {
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults,
            key: this.config.apiKey
        };

        const response = await this.makeRequest(url, params);
        return response.data;
    }

    /**
     * Convert YouTube API response to VideoMetadata
     */
    convertToVideoMetadata(apiResponse: VideoDetailsResponse): VideoMetadata {
        const snippet = apiResponse.snippet;
        const statistics = apiResponse.statistics;
        const contentDetails = apiResponse.contentDetails;
        const status = apiResponse.status;

        return {
            title: snippet.title,
            description: snippet.description,
            duration: this.parseDuration(contentDetails.duration),
            uploadDate: new Date(snippet.publishedAt),
            viewCount: parseInt(statistics.viewCount) || 0,
            likeCount: parseInt(statistics.likeCount) || 0,
            dislikeCount: parseInt(statistics.dislikeCount) || 0,
            tags: snippet.tags || [],
            category: snippet.categoryId,
            language: snippet.defaultLanguage || 'en',
            thumbnailUrl: snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url,
            isLive: snippet.liveBroadcastContent === 'live',
            isPrivate: status.privacyStatus === 'private',
            ageRestricted: contentDetails.contentRating?.ytRating === 'ytAgeRestricted'
        };
    }

    /**
     * Convert YouTube API response to ChannelMetadata
     */
    convertToChannelMetadata(apiResponse: ChannelDetailsResponse): ChannelMetadata {
        const snippet = apiResponse.snippet;
        const statistics = apiResponse.statistics;
        const branding = apiResponse.brandingSettings;

        return {
            name: snippet.title,
            description: snippet.description,
            subscriberCount: parseInt(statistics.subscriberCount) || 0,
            videoCount: parseInt(statistics.videoCount) || 0,
            viewCount: parseInt(statistics.viewCount) || 0,
            joinDate: new Date(snippet.publishedAt),
            country: snippet.country || 'Unknown',
            language: snippet.defaultLanguage || 'en',
            avatarUrl: snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url,
            bannerUrl: branding?.image?.bannerImageUrl || '',
            isVerified: false, // This would need to be checked separately
            customUrl: snippet.customUrl
        };
    }

    /**
     * Convert YouTube API response to PlaylistMetadata
     */
    convertToPlaylistMetadata(apiResponse: PlaylistDetailsResponse): PlaylistMetadata {
        const snippet = apiResponse.snippet;
        const contentDetails = apiResponse.contentDetails;
        const status = apiResponse.status;

        return {
            title: snippet.title,
            description: snippet.description,
            visibility: status.privacyStatus as 'public' | 'unlisted' | 'private',
            createdDate: new Date(snippet.publishedAt),
            updatedDate: new Date(snippet.publishedAt),
            thumbnailUrl: snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url,
            channelId: snippet.channelId,
            channelTitle: snippet.channelTitle,
            videoCount: contentDetails.itemCount,
            viewCount: 0, // Not available in API response
            tags: snippet.tags || []
        };
    }

    /**
     * Parse ISO 8601 duration to seconds
     */
    private parseDuration(duration: string): number {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;

        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');

        return hours * 3600 + minutes * 60 + seconds;
    }

    /**
     * Make HTTP request with retry logic
     */
    private async makeRequest<T>(url: string, params: any, retryCount = 0): Promise<AxiosResponse<T>> {
        try {
            const response = await axios.get<T>(url, {
                params,
                timeout: this.config.timeout,
                headers: {
                    'User-Agent': 'Semantest YouTube API Client/1.0.0',
                    'Accept': 'application/json'
                }
            });

            return response;
        } catch (error) {
            if (retryCount < this.config.maxRetries) {
                await this.delay(this.config.retryDelay * Math.pow(2, retryCount));
                return this.makeRequest(url, params, retryCount + 1);
            }

            if (axios.isAxiosError(error)) {
                if (error.response?.status === 403) {
                    throw new Error('YouTube API quota exceeded or invalid API key');
                }
                if (error.response?.status === 404) {
                    throw new Error('Resource not found');
                }
                throw new Error(`YouTube API error: ${error.response?.statusText || error.message}`);
            }

            throw error;
        }
    }

    /**
     * Delay execution
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}