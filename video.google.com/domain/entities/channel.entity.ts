/*
                        Semantest - YouTube Video Domain Entities
                        Channel Entity

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Entity } from '@semantest/core';

export interface ChannelMetadata {
    name: string;
    description: string;
    subscriberCount: number;
    videoCount: number;
    viewCount: number;
    joinDate: Date;
    country: string;
    language: string;
    avatarUrl: string;
    bannerUrl: string;
    isVerified: boolean;
    customUrl?: string;
}

export interface ChannelStatistics {
    totalViews: number;
    totalSubscribers: number;
    totalVideos: number;
    averageViewsPerVideo: number;
    lastVideoUpload: Date;
    uploadFrequency: 'daily' | 'weekly' | 'monthly' | 'irregular';
}

/**
 * Channel Entity
 * 
 * Represents a YouTube channel with metadata, statistics,
 * and subscription management.
 */
export class Channel extends Entity {
    private _metadata: ChannelMetadata;
    private _statistics: ChannelStatistics;
    private _isSubscribed: boolean = false;
    private _subscriptionDate: Date | null = null;
    private _lastUpdated: Date = new Date();

    constructor(
        id: string,
        public readonly channelId: string,
        public readonly handle: string,
        public readonly url: string,
        metadata: ChannelMetadata
    ) {
        super(id);
        this._metadata = { ...metadata };
        this._statistics = {
            totalViews: metadata.viewCount,
            totalSubscribers: metadata.subscriberCount,
            totalVideos: metadata.videoCount,
            averageViewsPerVideo: metadata.videoCount > 0 ? metadata.viewCount / metadata.videoCount : 0,
            lastVideoUpload: new Date(),
            uploadFrequency: 'irregular'
        };
    }

    /**
     * Get channel metadata
     */
    get metadata(): ChannelMetadata {
        return { ...this._metadata };
    }

    /**
     * Get channel name
     */
    get name(): string {
        return this._metadata.name;
    }

    /**
     * Get channel description
     */
    get description(): string {
        return this._metadata.description;
    }

    /**
     * Get subscriber count
     */
    get subscriberCount(): number {
        return this._metadata.subscriberCount;
    }

    /**
     * Get video count
     */
    get videoCount(): number {
        return this._metadata.videoCount;
    }

    /**
     * Get total view count
     */
    get viewCount(): number {
        return this._metadata.viewCount;
    }

    /**
     * Get join date
     */
    get joinDate(): Date {
        return this._metadata.joinDate;
    }

    /**
     * Get avatar URL
     */
    get avatarUrl(): string {
        return this._metadata.avatarUrl;
    }

    /**
     * Get banner URL
     */
    get bannerUrl(): string {
        return this._metadata.bannerUrl;
    }

    /**
     * Check if channel is verified
     */
    get isVerified(): boolean {
        return this._metadata.isVerified;
    }

    /**
     * Get custom URL
     */
    get customUrl(): string | undefined {
        return this._metadata.customUrl;
    }

    /**
     * Get channel statistics
     */
    get statistics(): ChannelStatistics {
        return { ...this._statistics };
    }

    /**
     * Check if subscribed to channel
     */
    get isSubscribed(): boolean {
        return this._isSubscribed;
    }

    /**
     * Get subscription date
     */
    get subscriptionDate(): Date | null {
        return this._subscriptionDate;
    }

    /**
     * Get last updated timestamp
     */
    get lastUpdated(): Date {
        return this._lastUpdated;
    }

    /**
     * Get formatted subscriber count
     */
    get formattedSubscriberCount(): string {
        const count = this.subscriberCount;
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    }

    /**
     * Get average views per video
     */
    get averageViewsPerVideo(): number {
        return this._statistics.averageViewsPerVideo;
    }

    /**
     * Get upload frequency
     */
    get uploadFrequency(): string {
        return this._statistics.uploadFrequency;
    }

    /**
     * Update channel metadata
     */
    updateMetadata(metadata: Partial<ChannelMetadata>): void {
        this._metadata = { ...this._metadata, ...metadata };
        this._lastUpdated = new Date();
        this.recalculateStatistics();
    }

    /**
     * Update channel statistics
     */
    updateStatistics(statistics: Partial<ChannelStatistics>): void {
        this._statistics = { ...this._statistics, ...statistics };
        this._lastUpdated = new Date();
    }

    /**
     * Subscribe to channel
     */
    subscribe(): void {
        if (!this._isSubscribed) {
            this._isSubscribed = true;
            this._subscriptionDate = new Date();
            this._lastUpdated = new Date();
        }
    }

    /**
     * Unsubscribe from channel
     */
    unsubscribe(): void {
        if (this._isSubscribed) {
            this._isSubscribed = false;
            this._subscriptionDate = null;
            this._lastUpdated = new Date();
        }
    }

    /**
     * Check if channel is active (uploaded recently)
     */
    isActive(daysThreshold: number = 30): boolean {
        const now = new Date();
        const threshold = new Date(now.getTime() - (daysThreshold * 24 * 60 * 60 * 1000));
        return this._statistics.lastVideoUpload > threshold;
    }

    /**
     * Get channel age in days
     */
    getChannelAge(): number {
        const now = new Date();
        const joinDate = this._metadata.joinDate;
        return Math.floor((now.getTime() - joinDate.getTime()) / (24 * 60 * 60 * 1000));
    }

    /**
     * Calculate engagement rate
     */
    getEngagementRate(): number {
        if (this._metadata.subscriberCount === 0) return 0;
        return this._statistics.averageViewsPerVideo / this._metadata.subscriberCount;
    }

    /**
     * Recalculate statistics
     */
    private recalculateStatistics(): void {
        this._statistics = {
            ...this._statistics,
            totalViews: this._metadata.viewCount,
            totalSubscribers: this._metadata.subscriberCount,
            totalVideos: this._metadata.videoCount,
            averageViewsPerVideo: this._metadata.videoCount > 0 ? 
                this._metadata.viewCount / this._metadata.videoCount : 0
        };
    }

    /**
     * Convert to summary string
     */
    toSummary(): string {
        return `${this.name} (${this.formattedSubscriberCount} subscribers) - ${this.videoCount} videos`;
    }
}