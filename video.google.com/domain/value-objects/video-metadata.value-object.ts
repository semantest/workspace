/*
                        Semantest - YouTube Video Domain Value Objects
                        Video Metadata Value Object

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

export class VideoMetadata {
    private constructor(
        private readonly _title: string,
        private readonly _description: string,
        private readonly _duration: number,
        private readonly _uploadDate: Date,
        private readonly _viewCount: number,
        private readonly _likeCount: number,
        private readonly _dislikeCount: number,
        private readonly _tags: string[],
        private readonly _category: string,
        private readonly _language: string,
        private readonly _thumbnailUrl: string,
        private readonly _isLive: boolean,
        private readonly _isPrivate: boolean,
        private readonly _ageRestricted: boolean
    ) {}

    /**
     * Create VideoMetadata from object
     */
    static create(data: {
        title: string;
        description: string;
        duration: number;
        uploadDate: Date;
        viewCount: number;
        likeCount: number;
        dislikeCount: number;
        tags: string[];
        category: string;
        language: string;
        thumbnailUrl: string;
        isLive: boolean;
        isPrivate: boolean;
        ageRestricted: boolean;
    }): VideoMetadata {
        this.validateTitle(data.title);
        this.validateDescription(data.description);
        this.validateDuration(data.duration);
        this.validateUploadDate(data.uploadDate);
        this.validateCounts(data.viewCount, data.likeCount, data.dislikeCount);
        this.validateTags(data.tags);
        this.validateCategory(data.category);
        this.validateLanguage(data.language);
        this.validateThumbnailUrl(data.thumbnailUrl);

        return new VideoMetadata(
            data.title.trim(),
            data.description.trim(),
            data.duration,
            data.uploadDate,
            data.viewCount,
            data.likeCount,
            data.dislikeCount,
            data.tags.map(tag => tag.trim()).filter(tag => tag.length > 0),
            data.category.trim(),
            data.language.trim(),
            data.thumbnailUrl.trim(),
            data.isLive,
            data.isPrivate,
            data.ageRestricted
        );
    }

    /**
     * Get video title
     */
    get title(): string {
        return this._title;
    }

    /**
     * Get video description
     */
    get description(): string {
        return this._description;
    }

    /**
     * Get video duration in seconds
     */
    get duration(): number {
        return this._duration;
    }

    /**
     * Get upload date
     */
    get uploadDate(): Date {
        return this._uploadDate;
    }

    /**
     * Get view count
     */
    get viewCount(): number {
        return this._viewCount;
    }

    /**
     * Get like count
     */
    get likeCount(): number {
        return this._likeCount;
    }

    /**
     * Get dislike count
     */
    get dislikeCount(): number {
        return this._dislikeCount;
    }

    /**
     * Get tags
     */
    get tags(): string[] {
        return [...this._tags];
    }

    /**
     * Get category
     */
    get category(): string {
        return this._category;
    }

    /**
     * Get language
     */
    get language(): string {
        return this._language;
    }

    /**
     * Get thumbnail URL
     */
    get thumbnailUrl(): string {
        return this._thumbnailUrl;
    }

    /**
     * Check if video is live
     */
    get isLive(): boolean {
        return this._isLive;
    }

    /**
     * Check if video is private
     */
    get isPrivate(): boolean {
        return this._isPrivate;
    }

    /**
     * Check if video is age restricted
     */
    get ageRestricted(): boolean {
        return this._ageRestricted;
    }

    /**
     * Get formatted duration
     */
    get formattedDuration(): string {
        const hours = Math.floor(this._duration / 3600);
        const minutes = Math.floor((this._duration % 3600) / 60);
        const seconds = this._duration % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Get formatted view count
     */
    get formattedViewCount(): string {
        if (this._viewCount >= 1000000) {
            return `${(this._viewCount / 1000000).toFixed(1)}M`;
        } else if (this._viewCount >= 1000) {
            return `${(this._viewCount / 1000).toFixed(1)}K`;
        }
        return this._viewCount.toString();
    }

    /**
     * Get formatted like count
     */
    get formattedLikeCount(): string {
        if (this._likeCount >= 1000000) {
            return `${(this._likeCount / 1000000).toFixed(1)}M`;
        } else if (this._likeCount >= 1000) {
            return `${(this._likeCount / 1000).toFixed(1)}K`;
        }
        return this._likeCount.toString();
    }

    /**
     * Get engagement ratio (likes + dislikes / views)
     */
    get engagementRatio(): number {
        if (this._viewCount === 0) return 0;
        return (this._likeCount + this._dislikeCount) / this._viewCount;
    }

    /**
     * Get like ratio (likes / (likes + dislikes))
     */
    get likeRatio(): number {
        const totalRatings = this._likeCount + this._dislikeCount;
        if (totalRatings === 0) return 0;
        return this._likeCount / totalRatings;
    }

    /**
     * Get video age in days
     */
    get ageInDays(): number {
        const now = new Date();
        const diffInMs = now.getTime() - this._uploadDate.getTime();
        return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    }

    /**
     * Get description snippet
     */
    getDescriptionSnippet(maxLength: number = 150): string {
        if (this._description.length <= maxLength) {
            return this._description;
        }
        return this._description.substring(0, maxLength - 3) + '...';
    }

    /**
     * Check if video has specific tag
     */
    hasTag(tag: string): boolean {
        return this._tags.some(t => t.toLowerCase() === tag.toLowerCase());
    }

    /**
     * Get tags matching pattern
     */
    getTagsMatching(pattern: RegExp): string[] {
        return this._tags.filter(tag => pattern.test(tag));
    }

    /**
     * Check if video is recent (uploaded within days)
     */
    isRecent(days: number = 7): boolean {
        const now = new Date();
        const threshold = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        return this._uploadDate > threshold;
    }

    /**
     * Check if video is popular (high view count)
     */
    isPopular(threshold: number = 100000): boolean {
        return this._viewCount >= threshold;
    }

    /**
     * Check if video is highly rated (good like ratio)
     */
    isHighlyRated(threshold: number = 0.8): boolean {
        return this.likeRatio >= threshold;
    }

    /**
     * Update with new data
     */
    update(updates: Partial<{
        title: string;
        description: string;
        viewCount: number;
        likeCount: number;
        dislikeCount: number;
        tags: string[];
        category: string;
        language: string;
        thumbnailUrl: string;
        isLive: boolean;
        isPrivate: boolean;
        ageRestricted: boolean;
    }>): VideoMetadata {
        return VideoMetadata.create({
            title: updates.title ?? this._title,
            description: updates.description ?? this._description,
            duration: this._duration,
            uploadDate: this._uploadDate,
            viewCount: updates.viewCount ?? this._viewCount,
            likeCount: updates.likeCount ?? this._likeCount,
            dislikeCount: updates.dislikeCount ?? this._dislikeCount,
            tags: updates.tags ?? this._tags,
            category: updates.category ?? this._category,
            language: updates.language ?? this._language,
            thumbnailUrl: updates.thumbnailUrl ?? this._thumbnailUrl,
            isLive: updates.isLive ?? this._isLive,
            isPrivate: updates.isPrivate ?? this._isPrivate,
            ageRestricted: updates.ageRestricted ?? this._ageRestricted
        });
    }

    /**
     * Validate title
     */
    private static validateTitle(title: string): void {
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            throw new Error('Video title must be a non-empty string');
        }
        if (title.length > 100) {
            throw new Error('Video title cannot exceed 100 characters');
        }
    }

    /**
     * Validate description
     */
    private static validateDescription(description: string): void {
        if (typeof description !== 'string') {
            throw new Error('Video description must be a string');
        }
        if (description.length > 5000) {
            throw new Error('Video description cannot exceed 5000 characters');
        }
    }

    /**
     * Validate duration
     */
    private static validateDuration(duration: number): void {
        if (typeof duration !== 'number' || duration < 0) {
            throw new Error('Video duration must be a non-negative number');
        }
        if (duration > 86400) { // 24 hours
            throw new Error('Video duration cannot exceed 24 hours');
        }
    }

    /**
     * Validate upload date
     */
    private static validateUploadDate(uploadDate: Date): void {
        if (!(uploadDate instanceof Date) || isNaN(uploadDate.getTime())) {
            throw new Error('Upload date must be a valid Date object');
        }
        if (uploadDate > new Date()) {
            throw new Error('Upload date cannot be in the future');
        }
    }

    /**
     * Validate counts
     */
    private static validateCounts(viewCount: number, likeCount: number, dislikeCount: number): void {
        if (typeof viewCount !== 'number' || viewCount < 0) {
            throw new Error('View count must be a non-negative number');
        }
        if (typeof likeCount !== 'number' || likeCount < 0) {
            throw new Error('Like count must be a non-negative number');
        }
        if (typeof dislikeCount !== 'number' || dislikeCount < 0) {
            throw new Error('Dislike count must be a non-negative number');
        }
    }

    /**
     * Validate tags
     */
    private static validateTags(tags: string[]): void {
        if (!Array.isArray(tags)) {
            throw new Error('Tags must be an array');
        }
        if (tags.length > 50) {
            throw new Error('Cannot have more than 50 tags');
        }
        tags.forEach(tag => {
            if (typeof tag !== 'string' || tag.trim().length === 0) {
                throw new Error('All tags must be non-empty strings');
            }
            if (tag.length > 100) {
                throw new Error('Tag cannot exceed 100 characters');
            }
        });
    }

    /**
     * Validate category
     */
    private static validateCategory(category: string): void {
        if (!category || typeof category !== 'string' || category.trim().length === 0) {
            throw new Error('Category must be a non-empty string');
        }
    }

    /**
     * Validate language
     */
    private static validateLanguage(language: string): void {
        if (!language || typeof language !== 'string' || language.trim().length === 0) {
            throw new Error('Language must be a non-empty string');
        }
    }

    /**
     * Validate thumbnail URL
     */
    private static validateThumbnailUrl(thumbnailUrl: string): void {
        if (!thumbnailUrl || typeof thumbnailUrl !== 'string' || thumbnailUrl.trim().length === 0) {
            throw new Error('Thumbnail URL must be a non-empty string');
        }
        try {
            new URL(thumbnailUrl);
        } catch {
            throw new Error('Thumbnail URL must be a valid URL');
        }
    }

    /**
     * Check equality
     */
    equals(other: VideoMetadata): boolean {
        return this._title === other._title &&
               this._description === other._description &&
               this._duration === other._duration &&
               this._uploadDate.getTime() === other._uploadDate.getTime() &&
               this._viewCount === other._viewCount &&
               this._likeCount === other._likeCount &&
               this._dislikeCount === other._dislikeCount &&
               JSON.stringify(this._tags) === JSON.stringify(other._tags) &&
               this._category === other._category &&
               this._language === other._language &&
               this._thumbnailUrl === other._thumbnailUrl &&
               this._isLive === other._isLive &&
               this._isPrivate === other._isPrivate &&
               this._ageRestricted === other._ageRestricted;
    }

    /**
     * Convert to plain object
     */
    toObject(): {
        title: string;
        description: string;
        duration: number;
        uploadDate: Date;
        viewCount: number;
        likeCount: number;
        dislikeCount: number;
        tags: string[];
        category: string;
        language: string;
        thumbnailUrl: string;
        isLive: boolean;
        isPrivate: boolean;
        ageRestricted: boolean;
    } {
        return {
            title: this._title,
            description: this._description,
            duration: this._duration,
            uploadDate: this._uploadDate,
            viewCount: this._viewCount,
            likeCount: this._likeCount,
            dislikeCount: this._dislikeCount,
            tags: [...this._tags],
            category: this._category,
            language: this._language,
            thumbnailUrl: this._thumbnailUrl,
            isLive: this._isLive,
            isPrivate: this._isPrivate,
            ageRestricted: this._ageRestricted
        };
    }
}