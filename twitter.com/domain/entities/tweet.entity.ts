/*
                        Semantest - Twitter Domain Entities
                        Tweet Entity

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Entity } from '@semantest/core';

export type TweetType = 'tweet' | 'retweet' | 'reply' | 'quote';

export interface TweetMetadata {
    text: string;
    createdAt: Date;
    retweetCount: number;
    likeCount: number;
    replyCount: number;
    quoteCount: number;
    viewCount: number;
    bookmarkCount: number;
    hashtags: string[];
    mentions: string[];
    urls: string[];
    mediaUrls: string[];
    isRetweet: boolean;
    isReply: boolean;
    isQuote: boolean;
    isThread: boolean;
    threadPosition?: number;
    language: string;
    source: string;
}

export interface TweetEngagement {
    totalInteractions: number;
    engagementRate: number;
    isViral: boolean;
    isTrending: boolean;
    sentimentScore: number;
    influenceScore: number;
}

/**
 * Twitter Tweet Entity
 * 
 * Represents a Twitter tweet with metadata, engagement tracking,
 * and thread management capabilities.
 */
export class Tweet extends Entity {
    private _metadata: TweetMetadata;
    private _engagement: TweetEngagement;
    private _type: TweetType;
    private _isSaved: boolean = false;
    private _savedAt: Date | null = null;
    private _lastUpdated: Date = new Date();

    constructor(
        id: string,
        public readonly tweetId: string,
        public readonly userId: string,
        public readonly username: string,
        public readonly tweetUrl: string,
        type: TweetType,
        metadata: TweetMetadata
    ) {
        super(id);
        this._type = type;
        this._metadata = { ...metadata };
        this._engagement = {
            totalInteractions: 0,
            engagementRate: 0,
            isViral: false,
            isTrending: false,
            sentimentScore: 0,
            influenceScore: 0
        };
        this.calculateEngagement();
    }

    /**
     * Get tweet metadata
     */
    get metadata(): TweetMetadata {
        return { ...this._metadata };
    }

    /**
     * Get tweet type
     */
    get type(): TweetType {
        return this._type;
    }

    /**
     * Get tweet text
     */
    get text(): string {
        return this._metadata.text;
    }

    /**
     * Get creation timestamp
     */
    get createdAt(): Date {
        return this._metadata.createdAt;
    }

    /**
     * Get retweet count
     */
    get retweetCount(): number {
        return this._metadata.retweetCount;
    }

    /**
     * Get like count
     */
    get likeCount(): number {
        return this._metadata.likeCount;
    }

    /**
     * Get reply count
     */
    get replyCount(): number {
        return this._metadata.replyCount;
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
     * Get media URLs
     */
    get mediaUrls(): string[] {
        return [...this._metadata.mediaUrls];
    }

    /**
     * Check if tweet is part of a thread
     */
    get isThread(): boolean {
        return this._metadata.isThread;
    }

    /**
     * Get thread position
     */
    get threadPosition(): number | undefined {
        return this._metadata.threadPosition;
    }

    /**
     * Get engagement data
     */
    get engagement(): TweetEngagement {
        return { ...this._engagement };
    }

    /**
     * Check if tweet is saved
     */
    get isSaved(): boolean {
        return this._isSaved;
    }

    /**
     * Check if tweet is viral
     */
    get isViral(): boolean {
        return this._engagement.isViral;
    }

    /**
     * Get engagement rate
     */
    get engagementRate(): number {
        return this._engagement.engagementRate;
    }

    /**
     * Save tweet
     */
    save(): void {
        if (!this._isSaved) {
            this._isSaved = true;
            this._savedAt = new Date();
            this._lastUpdated = new Date();
        }
    }

    /**
     * Unsave tweet
     */
    unsave(): void {
        if (this._isSaved) {
            this._isSaved = false;
            this._savedAt = null;
            this._lastUpdated = new Date();
        }
    }

    /**
     * Update metadata
     */
    updateMetadata(metadata: Partial<TweetMetadata>): void {
        this._metadata = { ...this._metadata, ...metadata };
        this._lastUpdated = new Date();
        this.calculateEngagement();
    }

    /**
     * Calculate engagement metrics
     */
    private calculateEngagement(): void {
        const totalInteractions = this._metadata.retweetCount + this._metadata.likeCount + 
                                 this._metadata.replyCount + this._metadata.quoteCount;
        const totalViews = this._metadata.viewCount;
        
        this._engagement.totalInteractions = totalInteractions;
        
        if (totalViews > 0) {
            this._engagement.engagementRate = totalInteractions / totalViews;
        }

        // Simple viral detection
        this._engagement.isViral = totalInteractions > 10000 || this._engagement.engagementRate > 0.1;
        this._engagement.isTrending = totalInteractions > 1000 && this._engagement.engagementRate > 0.05;
    }

    /**
     * Get text snippet
     */
    getTextSnippet(maxLength: number = 100): string {
        if (this._metadata.text.length <= maxLength) {
            return this._metadata.text;
        }
        return this._metadata.text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Convert to summary string
     */
    toSummary(): string {
        const snippet = this.getTextSnippet(50);
        const likes = this._metadata.likeCount;
        const retweets = this._metadata.retweetCount;
        
        return `@${this.username}: ${snippet} (${likes} likes, ${retweets} retweets)`;
    }
}