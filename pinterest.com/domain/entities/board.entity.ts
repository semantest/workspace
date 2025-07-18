/*
                        Semantest - Pinterest Domain Entities
                        Board Entity

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Entity } from '@semantest/core';

export type BoardPrivacy = 'public' | 'private' | 'secret';
export type BoardCategory = 'general' | 'fashion' | 'food' | 'travel' | 'home' | 'diy' | 'health' | 'business' | 'technology' | 'art' | 'photography' | 'other';

export interface BoardMetadata {
    name: string;
    description: string;
    category: BoardCategory;
    privacy: BoardPrivacy;
    createdAt: Date;
    updatedAt: Date;
    coverImageUrl: string;
    pinCount: number;
    followerCount: number;
    isCollaborative: boolean;
    tags: string[];
}

export interface BoardCollaborator {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    role: 'owner' | 'collaborator';
    joinedAt: Date;
    permissions: {
        canAddPins: boolean;
        canRemovePins: boolean;
        canInviteOthers: boolean;
        canEditBoard: boolean;
    };
}

export interface BoardStatistics {
    totalPins: number;
    totalImpressions: number;
    totalSaves: number;
    totalClicks: number;
    totalComments: number;
    averageEngagement: number;
    growthRate: number;
    topPins: string[];
    mostActiveCollaborators: string[];
}

/**
 * Board Entity
 * 
 * Represents a Pinterest board with metadata, collaborators,
 * and statistics tracking.
 */
export class Board extends Entity {
    private _metadata: BoardMetadata;
    private _collaborators: BoardCollaborator[] = [];
    private _statistics: BoardStatistics;
    private _pins: string[] = [];
    private _isFollowing: boolean = false;
    private _followedAt: Date | null = null;
    private _lastUpdated: Date = new Date();

    constructor(
        id: string,
        public readonly boardId: string,
        public readonly userId: string,
        public readonly url: string,
        metadata: BoardMetadata
    ) {
        super(id);
        this._metadata = { ...metadata };
        this._statistics = {
            totalPins: metadata.pinCount,
            totalImpressions: 0,
            totalSaves: 0,
            totalClicks: 0,
            totalComments: 0,
            averageEngagement: 0,
            growthRate: 0,
            topPins: [],
            mostActiveCollaborators: []
        };
    }

    /**
     * Get board metadata
     */
    get metadata(): BoardMetadata {
        return { ...this._metadata };
    }

    /**
     * Get board name
     */
    get name(): string {
        return this._metadata.name;
    }

    /**
     * Get board description
     */
    get description(): string {
        return this._metadata.description;
    }

    /**
     * Get board category
     */
    get category(): BoardCategory {
        return this._metadata.category;
    }

    /**
     * Get board privacy setting
     */
    get privacy(): BoardPrivacy {
        return this._metadata.privacy;
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
     * Get cover image URL
     */
    get coverImageUrl(): string {
        return this._metadata.coverImageUrl;
    }

    /**
     * Get pin count
     */
    get pinCount(): number {
        return this._metadata.pinCount;
    }

    /**
     * Get follower count
     */
    get followerCount(): number {
        return this._metadata.followerCount;
    }

    /**
     * Check if board is collaborative
     */
    get isCollaborative(): boolean {
        return this._metadata.isCollaborative;
    }

    /**
     * Get board tags
     */
    get tags(): string[] {
        return [...this._metadata.tags];
    }

    /**
     * Get collaborators
     */
    get collaborators(): BoardCollaborator[] {
        return [...this._collaborators];
    }

    /**
     * Get board statistics
     */
    get statistics(): BoardStatistics {
        return { ...this._statistics };
    }

    /**
     * Get pin IDs
     */
    get pins(): string[] {
        return [...this._pins];
    }

    /**
     * Check if following board
     */
    get isFollowing(): boolean {
        return this._isFollowing;
    }

    /**
     * Get followed date
     */
    get followedAt(): Date | null {
        return this._followedAt;
    }

    /**
     * Check if board is public
     */
    get isPublic(): boolean {
        return this._metadata.privacy === 'public';
    }

    /**
     * Check if board is private
     */
    get isPrivate(): boolean {
        return this._metadata.privacy === 'private';
    }

    /**
     * Check if board is secret
     */
    get isSecret(): boolean {
        return this._metadata.privacy === 'secret';
    }

    /**
     * Get board age in days
     */
    get ageInDays(): number {
        const now = new Date();
        const createdDate = this._metadata.createdAt;
        return Math.floor((now.getTime() - createdDate.getTime()) / (24 * 60 * 60 * 1000));
    }

    /**
     * Get average engagement rate
     */
    get averageEngagement(): number {
        return this._statistics.averageEngagement;
    }

    /**
     * Get growth rate
     */
    get growthRate(): number {
        return this._statistics.growthRate;
    }

    /**
     * Get owner collaborator
     */
    get owner(): BoardCollaborator | null {
        return this._collaborators.find(c => c.role === 'owner') || null;
    }

    /**
     * Get non-owner collaborators
     */
    get activeCollaborators(): BoardCollaborator[] {
        return this._collaborators.filter(c => c.role === 'collaborator');
    }

    /**
     * Update board metadata
     */
    updateMetadata(metadata: Partial<BoardMetadata>): void {
        this._metadata = { ...this._metadata, ...metadata };
        this._lastUpdated = new Date();
    }

    /**
     * Update board statistics
     */
    updateStatistics(statistics: Partial<BoardStatistics>): void {
        this._statistics = { ...this._statistics, ...statistics };
        this._lastUpdated = new Date();
    }

    /**
     * Add collaborator
     */
    addCollaborator(collaborator: BoardCollaborator): void {
        const existingIndex = this._collaborators.findIndex(c => c.userId === collaborator.userId);
        
        if (existingIndex >= 0) {
            this._collaborators[existingIndex] = collaborator;
        } else {
            this._collaborators.push(collaborator);
        }

        this._metadata.isCollaborative = this._collaborators.length > 1;
        this._lastUpdated = new Date();
    }

    /**
     * Remove collaborator
     */
    removeCollaborator(userId: string): boolean {
        const index = this._collaborators.findIndex(c => c.userId === userId);
        
        if (index >= 0 && this._collaborators[index].role !== 'owner') {
            this._collaborators.splice(index, 1);
            this._metadata.isCollaborative = this._collaborators.length > 1;
            this._lastUpdated = new Date();
            return true;
        }
        
        return false;
    }

    /**
     * Get collaborator by user ID
     */
    getCollaborator(userId: string): BoardCollaborator | null {
        return this._collaborators.find(c => c.userId === userId) || null;
    }

    /**
     * Check if user is collaborator
     */
    isCollaborator(userId: string): boolean {
        return this._collaborators.some(c => c.userId === userId);
    }

    /**
     * Check if user is owner
     */
    isOwner(userId: string): boolean {
        return this._collaborators.some(c => c.userId === userId && c.role === 'owner');
    }

    /**
     * Check if user can add pins
     */
    canUserAddPins(userId: string): boolean {
        const collaborator = this.getCollaborator(userId);
        return collaborator ? collaborator.permissions.canAddPins : false;
    }

    /**
     * Check if user can remove pins
     */
    canUserRemovePins(userId: string): boolean {
        const collaborator = this.getCollaborator(userId);
        return collaborator ? collaborator.permissions.canRemovePins : false;
    }

    /**
     * Check if user can edit board
     */
    canUserEditBoard(userId: string): boolean {
        const collaborator = this.getCollaborator(userId);
        return collaborator ? collaborator.permissions.canEditBoard : false;
    }

    /**
     * Add pin to board
     */
    addPin(pinId: string): void {
        if (!this._pins.includes(pinId)) {
            this._pins.push(pinId);
            this._metadata.pinCount = this._pins.length;
            this._statistics.totalPins = this._pins.length;
            this._lastUpdated = new Date();
        }
    }

    /**
     * Remove pin from board
     */
    removePin(pinId: string): boolean {
        const index = this._pins.indexOf(pinId);
        
        if (index >= 0) {
            this._pins.splice(index, 1);
            this._metadata.pinCount = this._pins.length;
            this._statistics.totalPins = this._pins.length;
            this._lastUpdated = new Date();
            return true;
        }
        
        return false;
    }

    /**
     * Check if board has pin
     */
    hasPin(pinId: string): boolean {
        return this._pins.includes(pinId);
    }

    /**
     * Follow board
     */
    follow(): void {
        if (!this._isFollowing) {
            this._isFollowing = true;
            this._followedAt = new Date();
            this._metadata.followerCount++;
            this._lastUpdated = new Date();
        }
    }

    /**
     * Unfollow board
     */
    unfollow(): void {
        if (this._isFollowing) {
            this._isFollowing = false;
            this._followedAt = null;
            this._metadata.followerCount = Math.max(0, this._metadata.followerCount - 1);
            this._lastUpdated = new Date();
        }
    }

    /**
     * Set privacy
     */
    setPrivacy(privacy: BoardPrivacy): void {
        this._metadata.privacy = privacy;
        this._lastUpdated = new Date();
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
     * Check if board has specific tag
     */
    hasTag(tag: string): boolean {
        return this._metadata.tags.some(t => t.toLowerCase() === tag.toLowerCase());
    }

    /**
     * Get pins by page
     */
    getPins(page: number = 1, pageSize: number = 20): string[] {
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return this._pins.slice(startIndex, endIndex);
    }

    /**
     * Get recent pins
     */
    getRecentPins(count: number = 10): string[] {
        return this._pins.slice(-count).reverse();
    }

    /**
     * Check if board is active
     */
    isActive(daysThreshold: number = 30): boolean {
        const now = new Date();
        const threshold = new Date(now.getTime() - (daysThreshold * 24 * 60 * 60 * 1000));
        return this._metadata.updatedAt > threshold;
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
     * Calculate engagement metrics
     */
    calculateEngagement(): void {
        const totalInteractions = this._statistics.totalSaves + this._statistics.totalClicks + this._statistics.totalComments;
        const totalImpressions = this._statistics.totalImpressions;
        
        if (totalImpressions > 0) {
            this._statistics.averageEngagement = totalInteractions / totalImpressions;
        } else {
            this._statistics.averageEngagement = 0;
        }
    }

    /**
     * Convert to summary string
     */
    toSummary(): string {
        const privacy = this._metadata.privacy;
        const pinCount = this._metadata.pinCount;
        const followerCount = this._metadata.followerCount;
        const snippet = this.getDescriptionSnippet(50);
        
        return `${this.name} (${privacy}) - ${pinCount} pins, ${followerCount} followers - ${snippet}`;
    }
}