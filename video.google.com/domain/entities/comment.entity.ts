/*
                        Semantest - YouTube Video Domain Entities
                        Comment Entity

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Entity } from '@semantest/core';

export interface CommentAuthor {
    channelId: string;
    displayName: string;
    avatarUrl: string;
    isChannelOwner: boolean;
    isVerified: boolean;
}

export interface CommentMetadata {
    text: string;
    publishedAt: Date;
    updatedAt: Date;
    likeCount: number;
    replyCount: number;
    isEdited: boolean;
    isPinned: boolean;
    isHearted: boolean;
    parentId?: string;
}

export interface CommentEngagement {
    totalReplies: number;
    totalLikes: number;
    engagementRate: number;
    isPopular: boolean;
    replyThread: Comment[];
}

/**
 * Comment Entity
 * 
 * Represents a YouTube comment with metadata, engagement data,
 * and reply threading capabilities.
 */
export class Comment extends Entity {
    private _metadata: CommentMetadata;
    private _engagement: CommentEngagement;
    private _replies: Comment[] = [];
    private _lastUpdated: Date = new Date();

    constructor(
        id: string,
        public readonly commentId: string,
        public readonly videoId: string,
        public readonly author: CommentAuthor,
        metadata: CommentMetadata
    ) {
        super(id);
        this._metadata = { ...metadata };
        this._engagement = {
            totalReplies: metadata.replyCount,
            totalLikes: metadata.likeCount,
            engagementRate: 0,
            isPopular: false,
            replyThread: []
        };
    }

    /**
     * Get comment metadata
     */
    get metadata(): CommentMetadata {
        return { ...this._metadata };
    }

    /**
     * Get comment text
     */
    get text(): string {
        return this._metadata.text;
    }

    /**
     * Get comment author
     */
    get commentAuthor(): CommentAuthor {
        return { ...this.author };
    }

    /**
     * Get published date
     */
    get publishedAt(): Date {
        return this._metadata.publishedAt;
    }

    /**
     * Get updated date
     */
    get updatedAt(): Date {
        return this._metadata.updatedAt;
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
     * Check if comment is edited
     */
    get isEdited(): boolean {
        return this._metadata.isEdited;
    }

    /**
     * Check if comment is pinned
     */
    get isPinned(): boolean {
        return this._metadata.isPinned;
    }

    /**
     * Check if comment is hearted
     */
    get isHearted(): boolean {
        return this._metadata.isHearted;
    }

    /**
     * Get parent comment ID
     */
    get parentId(): string | undefined {
        return this._metadata.parentId;
    }

    /**
     * Check if comment is a reply
     */
    get isReply(): boolean {
        return this._metadata.parentId !== undefined;
    }

    /**
     * Check if comment is by channel owner
     */
    get isFromChannelOwner(): boolean {
        return this.author.isChannelOwner;
    }

    /**
     * Check if author is verified
     */
    get isFromVerifiedUser(): boolean {
        return this.author.isVerified;
    }

    /**
     * Get comment engagement data
     */
    get engagement(): CommentEngagement {
        return { ...this._engagement };
    }

    /**
     * Get replies
     */
    get replies(): Comment[] {
        return [...this._replies];
    }

    /**
     * Get engagement rate
     */
    get engagementRate(): number {
        return this._engagement.engagementRate;
    }

    /**
     * Check if comment is popular
     */
    get isPopular(): boolean {
        return this._engagement.isPopular;
    }

    /**
     * Get comment age in days
     */
    get ageInDays(): number {
        const now = new Date();
        const publishedDate = this._metadata.publishedAt;
        return Math.floor((now.getTime() - publishedDate.getTime()) / (24 * 60 * 60 * 1000));
    }

    /**
     * Get formatted publish date
     */
    get formattedPublishDate(): string {
        const now = new Date();
        const publishedDate = this._metadata.publishedAt;
        const diffInHours = (now.getTime() - publishedDate.getTime()) / (60 * 60 * 1000);

        if (diffInHours < 1) {
            return 'Just now';
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)} hours ago`;
        } else if (diffInHours < 24 * 7) {
            return `${Math.floor(diffInHours / 24)} days ago`;
        } else if (diffInHours < 24 * 30) {
            return `${Math.floor(diffInHours / (24 * 7))} weeks ago`;
        } else {
            return publishedDate.toLocaleDateString();
        }
    }

    /**
     * Update comment metadata
     */
    updateMetadata(metadata: Partial<CommentMetadata>): void {
        this._metadata = { ...this._metadata, ...metadata };
        this._lastUpdated = new Date();
        this.recalculateEngagement();
    }

    /**
     * Add reply to comment
     */
    addReply(reply: Comment): void {
        this._replies.push(reply);
        this._metadata.replyCount = this._replies.length;
        this._engagement.totalReplies = this._replies.length;
        this._engagement.replyThread = [...this._replies];
        this._lastUpdated = new Date();
        this.recalculateEngagement();
    }

    /**
     * Remove reply from comment
     */
    removeReply(replyId: string): boolean {
        const index = this._replies.findIndex(r => r.commentId === replyId);
        
        if (index >= 0) {
            this._replies.splice(index, 1);
            this._metadata.replyCount = this._replies.length;
            this._engagement.totalReplies = this._replies.length;
            this._engagement.replyThread = [...this._replies];
            this._lastUpdated = new Date();
            this.recalculateEngagement();
            return true;
        }
        
        return false;
    }

    /**
     * Update like count
     */
    updateLikeCount(likeCount: number): void {
        this._metadata.likeCount = likeCount;
        this._engagement.totalLikes = likeCount;
        this._lastUpdated = new Date();
        this.recalculateEngagement();
    }

    /**
     * Pin comment
     */
    pin(): void {
        this._metadata.isPinned = true;
        this._lastUpdated = new Date();
    }

    /**
     * Unpin comment
     */
    unpin(): void {
        this._metadata.isPinned = false;
        this._lastUpdated = new Date();
    }

    /**
     * Heart comment
     */
    heart(): void {
        this._metadata.isHearted = true;
        this._lastUpdated = new Date();
    }

    /**
     * Unheart comment
     */
    unheart(): void {
        this._metadata.isHearted = false;
        this._lastUpdated = new Date();
    }

    /**
     * Get comment snippet (first 100 characters)
     */
    getSnippet(maxLength: number = 100): string {
        if (this.text.length <= maxLength) {
            return this.text;
        }
        return this.text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Check if comment contains specific text
     */
    contains(searchText: string, caseSensitive: boolean = false): boolean {
        const text = caseSensitive ? this.text : this.text.toLowerCase();
        const search = caseSensitive ? searchText : searchText.toLowerCase();
        return text.includes(search);
    }

    /**
     * Get reply by ID
     */
    getReply(replyId: string): Comment | null {
        return this._replies.find(r => r.commentId === replyId) || null;
    }

    /**
     * Get top replies (by like count)
     */
    getTopReplies(limit: number = 5): Comment[] {
        return this._replies
            .sort((a, b) => b.likeCount - a.likeCount)
            .slice(0, limit);
    }

    /**
     * Recalculate engagement metrics
     */
    private recalculateEngagement(): void {
        const totalInteractions = this._metadata.likeCount + this._metadata.replyCount;
        
        // Simple engagement rate calculation
        this._engagement.engagementRate = totalInteractions;
        
        // Consider popular if high engagement
        this._engagement.isPopular = 
            this._metadata.likeCount > 50 || 
            this._metadata.replyCount > 10 || 
            this._metadata.isPinned ||
            this._metadata.isHearted;
    }

    /**
     * Convert to summary string
     */
    toSummary(): string {
        const snippet = this.getSnippet(50);
        const likes = this.likeCount > 0 ? ` (${this.likeCount} likes)` : '';
        const replies = this.replyCount > 0 ? ` (${this.replyCount} replies)` : '';
        return `${this.author.displayName}: ${snippet}${likes}${replies}`;
    }
}