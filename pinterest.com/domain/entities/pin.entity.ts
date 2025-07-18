/*
                        Semantest - Pinterest Domain Entities
                        Pin Entity

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Entity } from '@semantest/core';

export interface PinMetadata {
    title: string;
    description: string;
    imageUrl: string;
    sourceUrl: string;
    dominantColor: string;
    width: number;
    height: number;
    altText: string;
    createdAt: Date;
    updatedAt: Date;
    repinCount: number;
    commentCount: number;
    likeCount: number;
    viewCount: number;
    isVideo: boolean;
    isPromoted: boolean;
    isOriginal: boolean;
    tags: string[];
}

export interface PinEngagement {
    saves: number;
    comments: number;
    likes: number;
    views: number;
    clicks: number;
    shares: number;
    engagementRate: number;
    isViral: boolean;
    isTrending: boolean;
}

export interface PinAnalytics {
    impressions: number;
    outboundClicks: number;
    saves: number;
    pinClicks: number;
    profileVisits: number;
    averageTimeSpent: number;
    bounceRate: number;
    conversionRate: number;
}

/**
 * Pin Entity
 * 
 * Represents a Pinterest pin with metadata, engagement data,
 * and analytics information.
 */
export class Pin extends Entity {
    private _metadata: PinMetadata;
    private _engagement: PinEngagement;
    private _analytics: PinAnalytics;
    private _isSaved: boolean = false;
    private _savedAt: Date | null = null;
    private _boards: string[] = [];
    private _lastUpdated: Date = new Date();

    constructor(
        id: string,
        public readonly pinId: string,
        public readonly boardId: string,
        public readonly userId: string,
        public readonly url: string,
        metadata: PinMetadata
    ) {
        super(id);
        this._metadata = { ...metadata };
        this._engagement = {
            saves: metadata.repinCount,
            comments: metadata.commentCount,
            likes: metadata.likeCount,
            views: metadata.viewCount,
            clicks: 0,
            shares: 0,
            engagementRate: 0,
            isViral: false,
            isTrending: false
        };
        this._analytics = {
            impressions: 0,
            outboundClicks: 0,
            saves: 0,
            pinClicks: 0,
            profileVisits: 0,
            averageTimeSpent: 0,
            bounceRate: 0,
            conversionRate: 0
        };
        this.calculateEngagement();
    }

    /**
     * Get pin metadata
     */
    get metadata(): PinMetadata {
        return { ...this._metadata };
    }

    /**
     * Get pin title
     */
    get title(): string {
        return this._metadata.title;
    }

    /**
     * Get pin description
     */
    get description(): string {
        return this._metadata.description;
    }

    /**
     * Get image URL
     */
    get imageUrl(): string {
        return this._metadata.imageUrl;
    }

    /**
     * Get source URL
     */
    get sourceUrl(): string {
        return this._metadata.sourceUrl;
    }

    /**
     * Get dominant color
     */
    get dominantColor(): string {
        return this._metadata.dominantColor;
    }

    /**
     * Get image dimensions
     */
    get dimensions(): { width: number; height: number } {
        return {
            width: this._metadata.width,
            height: this._metadata.height
        };
    }

    /**
     * Get aspect ratio
     */
    get aspectRatio(): number {
        return this._metadata.width / this._metadata.height;
    }

    /**
     * Get alt text
     */
    get altText(): string {
        return this._metadata.altText;
    }

    /**
     * Get creation date
     */
    get createdAt(): Date {
        return this._metadata.createdAt;
    }

    /**
     * Get last updated date
     */
    get updatedAt(): Date {
        return this._metadata.updatedAt;
    }

    /**
     * Get pin tags
     */
    get tags(): string[] {
        return [...this._metadata.tags];
    }

    /**
     * Check if pin is a video
     */
    get isVideo(): boolean {
        return this._metadata.isVideo;
    }

    /**
     * Check if pin is promoted
     */
    get isPromoted(): boolean {
        return this._metadata.isPromoted;
    }

    /**
     * Check if pin is original content
     */
    get isOriginal(): boolean {
        return this._metadata.isOriginal;
    }

    /**
     * Get engagement data
     */
    get engagement(): PinEngagement {
        return { ...this._engagement };
    }

    /**
     * Get analytics data
     */
    get analytics(): PinAnalytics {
        return { ...this._analytics };
    }

    /**
     * Check if pin is saved
     */
    get isSaved(): boolean {
        return this._isSaved;
    }

    /**
     * Get saved date
     */
    get savedAt(): Date | null {
        return this._savedAt;
    }

    /**
     * Get boards this pin is saved to
     */
    get boards(): string[] {
        return [...this._boards];
    }

    /**
     * Get save count
     */
    get saveCount(): number {
        return this._engagement.saves;
    }

    /**
     * Get comment count
     */
    get commentCount(): number {
        return this._engagement.comments;
    }

    /**
     * Get like count
     */
    get likeCount(): number {
        return this._engagement.likes;
    }

    /**
     * Get view count
     */
    get viewCount(): number {
        return this._engagement.views;
    }

    /**
     * Get engagement rate
     */
    get engagementRate(): number {
        return this._engagement.engagementRate;
    }

    /**
     * Check if pin is viral
     */
    get isViral(): boolean {
        return this._engagement.isViral;
    }

    /**
     * Check if pin is trending
     */
    get isTrending(): boolean {
        return this._engagement.isTrending;
    }

    /**
     * Check if pin is portrait orientation
     */
    get isPortrait(): boolean {
        return this.aspectRatio < 1;
    }

    /**
     * Check if pin is landscape orientation
     */
    get isLandscape(): boolean {
        return this.aspectRatio > 1;
    }

    /**
     * Check if pin is square
     */
    get isSquare(): boolean {
        return Math.abs(this.aspectRatio - 1) < 0.1;
    }

    /**
     * Get pin age in days
     */
    get ageInDays(): number {
        const now = new Date();
        const createdDate = this._metadata.createdAt;
        return Math.floor((now.getTime() - createdDate.getTime()) / (24 * 60 * 60 * 1000));
    }

    /**
     * Update pin metadata
     */
    updateMetadata(metadata: Partial<PinMetadata>): void {
        this._metadata = { ...this._metadata, ...metadata };
        this._lastUpdated = new Date();
        this.calculateEngagement();
    }

    /**
     * Update engagement data
     */
    updateEngagement(engagement: Partial<PinEngagement>): void {
        this._engagement = { ...this._engagement, ...engagement };
        this._lastUpdated = new Date();
        this.calculateEngagement();
    }

    /**
     * Update analytics data
     */
    updateAnalytics(analytics: Partial<PinAnalytics>): void {
        this._analytics = { ...this._analytics, ...analytics };
        this._lastUpdated = new Date();
    }

    /**
     * Save pin
     */
    save(): void {
        if (!this._isSaved) {
            this._isSaved = true;
            this._savedAt = new Date();
            this._engagement.saves++;
            this._lastUpdated = new Date();
            this.calculateEngagement();
        }
    }

    /**
     * Unsave pin
     */
    unsave(): void {
        if (this._isSaved) {
            this._isSaved = false;
            this._savedAt = null;
            this._engagement.saves = Math.max(0, this._engagement.saves - 1);
            this._lastUpdated = new Date();
            this.calculateEngagement();
        }
    }

    /**
     * Add to board
     */
    addToBoard(boardId: string): void {
        if (!this._boards.includes(boardId)) {
            this._boards.push(boardId);
            this._lastUpdated = new Date();
        }
    }

    /**
     * Remove from board
     */
    removeFromBoard(boardId: string): void {
        const index = this._boards.indexOf(boardId);
        if (index > -1) {
            this._boards.splice(index, 1);
            this._lastUpdated = new Date();
        }
    }

    /**
     * Add tag
     */
    addTag(tag: string): void {
        if (!this._metadata.tags.includes(tag)) {
            this._metadata.tags.push(tag);
            this._lastUpdated = new Date();
        }
    }

    /**
     * Remove tag
     */
    removeTag(tag: string): void {
        const index = this._metadata.tags.indexOf(tag);
        if (index > -1) {
            this._metadata.tags.splice(index, 1);
            this._lastUpdated = new Date();
        }
    }

    /**
     * Check if pin has specific tag
     */
    hasTag(tag: string): boolean {
        return this._metadata.tags.some(t => t.toLowerCase() === tag.toLowerCase());
    }

    /**
     * Get tags matching pattern
     */
    getTagsMatching(pattern: RegExp): string[] {
        return this._metadata.tags.filter(tag => pattern.test(tag));
    }

    /**
     * Check if pin is recent
     */
    isRecent(days: number = 7): boolean {
        return this.ageInDays <= days;
    }

    /**
     * Check if pin is popular
     */
    isPopular(threshold: number = 1000): boolean {
        return this._engagement.saves >= threshold;
    }

    /**
     * Check if pin has high engagement
     */
    hasHighEngagement(threshold: number = 0.05): boolean {
        return this._engagement.engagementRate >= threshold;
    }

    /**
     * Get description snippet
     */
    getDescriptionSnippet(maxLength: number = 100): string {
        if (this._metadata.description.length <= maxLength) {
            return this._metadata.description;
        }
        return this._metadata.description.substring(0, maxLength - 3) + '...';
    }

    /**
     * Get similar pins score
     */
    getSimilarityScore(otherPin: Pin): number {
        let score = 0;
        
        // Compare tags
        const commonTags = this._metadata.tags.filter(tag => 
            otherPin.tags.some(otherTag => otherTag.toLowerCase() === tag.toLowerCase())
        );
        score += commonTags.length / Math.max(this._metadata.tags.length, otherPin.tags.length);

        // Compare aspect ratio
        const aspectRatioDiff = Math.abs(this.aspectRatio - otherPin.aspectRatio);
        score += Math.max(0, 1 - aspectRatioDiff);

        // Compare dominant color (simplified)
        if (this._metadata.dominantColor === otherPin.dominantColor) {
            score += 0.5;
        }

        // Compare content type
        if (this._metadata.isVideo === otherPin.isVideo) {
            score += 0.3;
        }

        return score / 3; // Normalize to 0-1 range
    }

    /**
     * Calculate engagement metrics
     */
    private calculateEngagement(): void {
        const totalInteractions = this._engagement.saves + this._engagement.comments + this._engagement.likes;
        const totalViews = this._engagement.views;
        
        // Calculate engagement rate
        if (totalViews > 0) {
            this._engagement.engagementRate = totalInteractions / totalViews;
        } else {
            this._engagement.engagementRate = 0;
        }

        // Determine if viral (high engagement in short time)
        const isRecent = this.ageInDays <= 7;
        const hasHighEngagement = this._engagement.engagementRate > 0.1;
        const hasHighSaves = this._engagement.saves > 10000;
        
        this._engagement.isViral = isRecent && (hasHighEngagement || hasHighSaves);

        // Determine if trending (consistent engagement over time)
        const hasGoodEngagement = this._engagement.engagementRate > 0.05;
        const hasGoodSaves = this._engagement.saves > 1000;
        
        this._engagement.isTrending = hasGoodEngagement && hasGoodSaves;
    }

    /**
     * Convert to summary string
     */
    toSummary(): string {
        const snippet = this.getDescriptionSnippet(50);
        const saves = this._engagement.saves;
        const type = this._metadata.isVideo ? 'video' : 'image';
        
        return `${this.title} (${type}) - ${saves} saves - ${snippet}`;
    }
}