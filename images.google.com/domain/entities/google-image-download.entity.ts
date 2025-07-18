/*
                        Semantest - Google Images Domain Entities
                        Google Image Download Entity

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Entity } from '@semantest/core';
import { GoogleImageElement } from '../events/download-requested.event';

export type DownloadStatus = 
    | 'pending'
    | 'in_progress'
    | 'completed'
    | 'failed'
    | 'cancelled';

export interface DownloadProgress {
    bytesDownloaded: number;
    totalBytes: number;
    percentage: number;
    speed: number; // bytes per second
    estimatedTimeRemaining: number; // seconds
}

export interface DownloadAttempt {
    attemptNumber: number;
    startTime: Date;
    endTime?: Date;
    status: DownloadStatus;
    error?: string;
    bytesDownloaded: number;
}

/**
 * Google Image Download Entity
 * 
 * Represents a single image download operation with full lifecycle management.
 * This entity encapsulates all the business logic related to downloading
 * images from Google Images, including retry logic, progress tracking,
 * and state management.
 */
export class GoogleImageDownload extends Entity {
    private _status: DownloadStatus = 'pending';
    private _attempts: DownloadAttempt[] = [];
    private _progress: DownloadProgress | null = null;
    private _startTime: Date | null = null;
    private _endTime: Date | null = null;
    private _downloadId: number | null = null;
    private _filepath: string | null = null;
    private _error: string | null = null;

    constructor(
        id: string,
        public readonly correlationId: string,
        public readonly imageElement: GoogleImageElement,
        public readonly searchQuery: string | undefined,
        public readonly requestedFilename: string | undefined,
        public readonly quality: 'thumbnail' | 'medium' | 'high' = 'medium',
        public readonly maxRetries: number = 3
    ) {
        super(id);
    }

    /**
     * Get current download status
     */
    get status(): DownloadStatus {
        return this._status;
    }

    /**
     * Get download attempts
     */
    get attempts(): ReadonlyArray<DownloadAttempt> {
        return [...this._attempts];
    }

    /**
     * Get current attempt number
     */
    get currentAttempt(): number {
        return this._attempts.length;
    }

    /**
     * Get download progress
     */
    get progress(): DownloadProgress | null {
        return this._progress;
    }

    /**
     * Get start time
     */
    get startTime(): Date | null {
        return this._startTime;
    }

    /**
     * Get end time
     */
    get endTime(): Date | null {
        return this._endTime;
    }

    /**
     * Get download ID (from browser/system)
     */
    get downloadId(): number | null {
        return this._downloadId;
    }

    /**
     * Get file path
     */
    get filepath(): string | null {
        return this._filepath;
    }

    /**
     * Get error message
     */
    get error(): string | null {
        return this._error;
    }

    /**
     * Get image URL
     */
    get imageUrl(): string {
        return this.imageElement.src;
    }

    /**
     * Get image dimensions
     */
    get dimensions(): { width?: number; height?: number } {
        return {
            width: this.imageElement.width,
            height: this.imageElement.height
        };
    }

    /**
     * Get total download time
     */
    get totalDownloadTime(): number | null {
        if (!this._startTime) return null;
        const endTime = this._endTime || new Date();
        return endTime.getTime() - this._startTime.getTime();
    }

    /**
     * Check if download is in progress
     */
    get isInProgress(): boolean {
        return this._status === 'in_progress';
    }

    /**
     * Check if download is completed
     */
    get isCompleted(): boolean {
        return this._status === 'completed';
    }

    /**
     * Check if download has failed
     */
    get hasFailed(): boolean {
        return this._status === 'failed';
    }

    /**
     * Check if download can be retried
     */
    get canRetry(): boolean {
        return this._status === 'failed' && this.currentAttempt < this.maxRetries;
    }

    /**
     * Start download operation
     */
    startDownload(downloadId: number): void {
        if (this._status !== 'pending') {
            throw new Error(`Cannot start download in ${this._status} state`);
        }

        this._status = 'in_progress';
        this._downloadId = downloadId;
        this._startTime = new Date();
        this._error = null;

        const attempt: DownloadAttempt = {
            attemptNumber: this.currentAttempt + 1,
            startTime: this._startTime,
            status: 'in_progress',
            bytesDownloaded: 0
        };

        this._attempts.push(attempt);
    }

    /**
     * Update download progress
     */
    updateProgress(progress: DownloadProgress): void {
        if (this._status !== 'in_progress') {
            throw new Error(`Cannot update progress in ${this._status} state`);
        }

        this._progress = progress;
        
        // Update current attempt
        const currentAttempt = this._attempts[this._attempts.length - 1];
        if (currentAttempt) {
            currentAttempt.bytesDownloaded = progress.bytesDownloaded;
        }
    }

    /**
     * Complete download operation
     */
    completeDownload(filepath: string): void {
        if (this._status !== 'in_progress') {
            throw new Error(`Cannot complete download in ${this._status} state`);
        }

        this._status = 'completed';
        this._endTime = new Date();
        this._filepath = filepath;
        this._error = null;

        // Update current attempt
        const currentAttempt = this._attempts[this._attempts.length - 1];
        if (currentAttempt) {
            currentAttempt.endTime = this._endTime;
            currentAttempt.status = 'completed';
        }
    }

    /**
     * Fail download operation
     */
    failDownload(error: string): void {
        if (this._status !== 'in_progress') {
            throw new Error(`Cannot fail download in ${this._status} state`);
        }

        this._error = error;
        this._endTime = new Date();

        // Update current attempt
        const currentAttempt = this._attempts[this._attempts.length - 1];
        if (currentAttempt) {
            currentAttempt.endTime = this._endTime;
            currentAttempt.status = 'failed';
            currentAttempt.error = error;
        }

        // Determine final status
        if (this.canRetry) {
            this._status = 'pending'; // Ready for retry
        } else {
            this._status = 'failed'; // Max retries reached
        }
    }

    /**
     * Cancel download operation
     */
    cancelDownload(): void {
        if (this._status !== 'in_progress' && this._status !== 'pending') {
            throw new Error(`Cannot cancel download in ${this._status} state`);
        }

        this._status = 'cancelled';
        this._endTime = new Date();

        // Update current attempt if exists
        const currentAttempt = this._attempts[this._attempts.length - 1];
        if (currentAttempt && currentAttempt.status === 'in_progress') {
            currentAttempt.endTime = this._endTime;
            currentAttempt.status = 'cancelled';
        }
    }

    /**
     * Reset for retry
     */
    resetForRetry(): void {
        if (!this.canRetry) {
            throw new Error('Cannot retry download - max retries reached or not in failed state');
        }

        this._status = 'pending';
        this._progress = null;
        this._startTime = null;
        this._endTime = null;
        this._downloadId = null;
        this._error = null;
    }

    /**
     * Get download statistics
     */
    getStatistics(): {
        totalAttempts: number;
        totalDownloadTime: number | null;
        averageSpeed: number | null;
        successRate: number;
        finalFileSize: number | null;
    } {
        const totalDownloadTime = this.totalDownloadTime;
        const finalFileSize = this._progress?.totalBytes || null;
        
        let averageSpeed = null;
        if (totalDownloadTime && finalFileSize) {
            averageSpeed = (finalFileSize * 1000) / totalDownloadTime; // bytes per second
        }

        const successfulAttempts = this._attempts.filter(a => a.status === 'completed').length;
        const successRate = this._attempts.length > 0 ? successfulAttempts / this._attempts.length : 0;

        return {
            totalAttempts: this._attempts.length,
            totalDownloadTime,
            averageSpeed,
            successRate,
            finalFileSize
        };
    }

    /**
     * Convert to summary string
     */
    toSummary(): string {
        const query = this.searchQuery ? ` from "${this.searchQuery}"` : '';
        const filename = this.requestedFilename || 'image';
        return `Download ${filename}${query} - ${this._status}`;
    }
}