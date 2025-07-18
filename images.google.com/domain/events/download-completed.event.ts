/*
                        Semantest - Google Images Domain Events
                        Download Completed Event

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

export interface GoogleImageDownloadMetadata {
    fileSize: number;
    width: number;
    height: number;
    format: string;
    mimeType: string;
    searchQuery?: string;
    alt?: string;
    title?: string;
    downloadTime: number; // milliseconds
    quality: 'thumbnail' | 'medium' | 'high';
}

/**
 * Domain Event: Google Image Download Completed
 * 
 * Represents the successful completion of a Google Images download operation.
 * This event is emitted when an image has been successfully downloaded and
 * saved to the local filesystem.
 */
export class GoogleImageDownloadCompleted extends DomainEvent {
    public readonly eventType = 'GoogleImageDownloadCompleted';
    
    constructor(
        public readonly downloadId: number,
        public readonly originalUrl: string,
        public readonly highResUrl: string,
        public readonly filename: string,
        public readonly filepath: string,
        public readonly metadata: GoogleImageDownloadMetadata,
        correlationId: string
    ) {
        super(correlationId);
    }

    /**
     * Get the file size in bytes
     */
    get fileSize(): number {
        return this.metadata.fileSize;
    }

    /**
     * Get the image dimensions
     */
    get dimensions(): { width: number; height: number } {
        return {
            width: this.metadata.width,
            height: this.metadata.height
        };
    }

    /**
     * Get the download time in milliseconds
     */
    get downloadTime(): number {
        return this.metadata.downloadTime;
    }

    /**
     * Get the search query if available
     */
    get searchQuery(): string | undefined {
        return this.metadata.searchQuery;
    }

    /**
     * Get the image quality level
     */
    get quality(): 'thumbnail' | 'medium' | 'high' {
        return this.metadata.quality;
    }

    /**
     * Get a human-readable file size
     */
    get humanReadableSize(): string {
        const bytes = this.fileSize;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Check if this is a high-resolution download
     */
    get isHighResolution(): boolean {
        return this.metadata.width > 800 || this.metadata.height > 800;
    }

    /**
     * Create a summary of the download completion
     */
    toSummary(): string {
        return `Downloaded ${this.filename} (${this.humanReadableSize}, ${this.dimensions.width}x${this.dimensions.height})`;
    }
}