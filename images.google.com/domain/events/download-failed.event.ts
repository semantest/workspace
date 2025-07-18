/*
                        Semantest - Google Images Domain Events
                        Download Failed Event

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Semantest is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Semantest.  If not, see <https://www.gnu.org/licenses/>.
*/

import { DomainEvent } from '@semantest/core';

export type GoogleImageDownloadFailurePhase = 
    | 'url_extraction'
    | 'image_validation'
    | 'download_initiation'
    | 'download_progress'
    | 'download_completion'
    | 'file_save'
    | 'post_processing';

export interface GoogleImageDownloadFailureContext {
    phase: GoogleImageDownloadFailurePhase;
    retryCount: number;
    maxRetries: number;
    isRetryable: boolean;
    stackTrace?: string;
    httpStatusCode?: number;
    networkError?: boolean;
    diskSpaceError?: boolean;
    permissionError?: boolean;
    searchQuery?: string;
    filename?: string;
}

/**
 * Domain Event: Google Image Download Failed
 * 
 * Represents a failure during the Google Images download process.
 * This event is emitted when a download operation fails at any stage,
 * providing detailed context about the failure for debugging and retry logic.
 */
export class GoogleImageDownloadFailed extends DomainEvent {
    public readonly eventType = 'GoogleImageDownloadFailed';
    
    constructor(
        public readonly originalUrl: string,
        public readonly reason: string,
        public readonly context: GoogleImageDownloadFailureContext,
        correlationId: string
    ) {
        super(correlationId);
    }

    /**
     * Get the failure phase
     */
    get phase(): GoogleImageDownloadFailurePhase {
        return this.context.phase;
    }

    /**
     * Get the retry count
     */
    get retryCount(): number {
        return this.context.retryCount;
    }

    /**
     * Get the maximum retries allowed
     */
    get maxRetries(): number {
        return this.context.maxRetries;
    }

    /**
     * Check if this failure is retryable
     */
    get isRetryable(): boolean {
        return this.context.isRetryable && this.retryCount < this.maxRetries;
    }

    /**
     * Check if this is a network-related failure
     */
    get isNetworkError(): boolean {
        return this.context.networkError || false;
    }

    /**
     * Check if this is a disk space-related failure
     */
    get isDiskSpaceError(): boolean {
        return this.context.diskSpaceError || false;
    }

    /**
     * Check if this is a permission-related failure
     */
    get isPermissionError(): boolean {
        return this.context.permissionError || false;
    }

    /**
     * Get the HTTP status code if available
     */
    get httpStatusCode(): number | undefined {
        return this.context.httpStatusCode;
    }

    /**
     * Get the search query if available
     */
    get searchQuery(): string | undefined {
        return this.context.searchQuery;
    }

    /**
     * Get the filename if available
     */
    get filename(): string | undefined {
        return this.context.filename;
    }

    /**
     * Get a user-friendly error message
     */
    get userFriendlyMessage(): string {
        if (this.isNetworkError) {
            return 'Network connection failed. Please check your internet connection and try again.';
        }
        if (this.isDiskSpaceError) {
            return 'Insufficient disk space. Please free up space and try again.';
        }
        if (this.isPermissionError) {
            return 'Permission denied. Please check file permissions and try again.';
        }
        if (this.httpStatusCode === 404) {
            return 'Image not found. The image may have been removed or the URL is invalid.';
        }
        if (this.httpStatusCode === 403) {
            return 'Access denied. The image may be protected or require authentication.';
        }
        return this.reason;
    }

    /**
     * Get retry strategy recommendation
     */
    get retryStrategy(): 'immediate' | 'exponential_backoff' | 'none' {
        if (!this.isRetryable) return 'none';
        if (this.isNetworkError) return 'exponential_backoff';
        if (this.phase === 'download_initiation' || this.phase === 'download_progress') {
            return 'exponential_backoff';
        }
        return 'immediate';
    }

    /**
     * Create a summary of the download failure
     */
    toSummary(): string {
        const query = this.searchQuery ? ` from "${this.searchQuery}"` : '';
        const filename = this.filename ? ` (${this.filename})` : '';
        return `Download failed${query}${filename}: ${this.userFriendlyMessage}`;
    }

    /**
     * Create a detailed technical summary for logging
     */
    toTechnicalSummary(): string {
        return `${this.phase} failure: ${this.reason} (retry ${this.retryCount}/${this.maxRetries})`;
    }
}