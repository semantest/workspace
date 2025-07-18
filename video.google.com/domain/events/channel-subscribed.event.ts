/*
                        Semantest - YouTube Video Domain Events
                        Channel Subscribed Event

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { DomainEvent } from '@semantest/core';
import { ChannelMetadata } from '../entities/channel.entity';

export interface SubscriptionOptions {
    enableNotifications?: boolean;
    autoDownloadNewVideos?: boolean;
    downloadQuality?: 'highest' | 'high' | 'medium' | 'low';
    downloadFormat?: 'mp4' | 'webm' | 'mkv';
    tags?: string[];
    notes?: string;
}

/**
 * Domain Event: Channel Subscribed
 * 
 * Represents a subscription to a YouTube channel.
 * This event is triggered when a user or automated system subscribes
 * to a channel with optional automation settings.
 */
export class ChannelSubscribed extends DomainEvent {
    public readonly eventType = 'ChannelSubscribed';
    
    constructor(
        public readonly channelId: string,
        public readonly channelMetadata: ChannelMetadata,
        public readonly options: SubscriptionOptions = {},
        correlationId?: string
    ) {
        super(correlationId || `channel-sub-${channelId}-${Date.now()}`);
    }

    /**
     * Get channel name
     */
    get channelName(): string {
        return this.channelMetadata.name;
    }

    /**
     * Get channel custom URL
     */
    get channelUrl(): string {
        return this.channelMetadata.customUrl || `https://www.youtube.com/channel/${this.channelId}`;
    }

    /**
     * Get channel subscriber count
     */
    get subscriberCount(): number {
        return this.channelMetadata.subscriberCount;
    }

    /**
     * Get channel video count
     */
    get videoCount(): number {
        return this.channelMetadata.videoCount;
    }

    /**
     * Check if channel is verified
     */
    get isVerified(): boolean {
        return this.channelMetadata.isVerified;
    }

    /**
     * Check if notifications are enabled
     */
    get notificationsEnabled(): boolean {
        return this.options.enableNotifications || false;
    }

    /**
     * Check if auto-download is enabled
     */
    get autoDownloadEnabled(): boolean {
        return this.options.autoDownloadNewVideos || false;
    }

    /**
     * Get download quality preference
     */
    get downloadQuality(): string {
        return this.options.downloadQuality || 'medium';
    }

    /**
     * Get download format preference
     */
    get downloadFormat(): string {
        return this.options.downloadFormat || 'mp4';
    }

    /**
     * Get subscription tags
     */
    get tags(): string[] {
        return this.options.tags || [];
    }

    /**
     * Get subscription notes
     */
    get notes(): string | undefined {
        return this.options.notes;
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
     * Check if this is a high-value subscription
     */
    get isHighValueSubscription(): boolean {
        return this.subscriberCount > 100000 || this.isVerified;
    }

    /**
     * Get subscription features summary
     */
    getFeaturesSummary(): string[] {
        const features = [];
        
        if (this.notificationsEnabled) {
            features.push('Notifications enabled');
        }
        if (this.autoDownloadEnabled) {
            features.push(`Auto-download in ${this.downloadQuality} ${this.downloadFormat}`);
        }
        if (this.tags.length > 0) {
            features.push(`Tagged as: ${this.tags.join(', ')}`);
        }
        if (this.notes) {
            features.push(`Notes: ${this.notes}`);
        }

        return features;
    }

    /**
     * Create a summary of the subscription event
     */
    toSummary(): string {
        const verified = this.isVerified ? ' (verified)' : '';
        const subscribers = this.formattedSubscriberCount;
        const features = this.getFeaturesSummary();
        const featuresText = features.length > 0 ? ` with ${features.length} features` : '';
        
        return `Subscribed to ${this.channelName}${verified} (${subscribers} subscribers)${featuresText}`;
    }
}