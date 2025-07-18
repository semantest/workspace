/*
                        Semantest - Google Images Domain Events
                        Download Requested Event

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

export interface GoogleImageElement {
    src: string;
    alt?: string;
    title?: string;
    width?: number;
    height?: number;
}

export interface GoogleImageDownloadOptions {
    searchQuery?: string;
    filename?: string;
    quality?: 'thumbnail' | 'medium' | 'high';
    conflictAction?: 'uniquify' | 'overwrite' | 'prompt';
}

/**
 * Domain Event: Google Image Download Requested
 * 
 * Represents a request to download an image from Google Images search results.
 * This event is triggered when a user or automated system requests to download
 * a specific image from Google Images.
 */
export class GoogleImageDownloadRequested extends DomainEvent {
    public readonly eventType = 'GoogleImageDownloadRequested';
    
    constructor(
        public readonly imageElement: GoogleImageElement,
        public readonly options: GoogleImageDownloadOptions = {},
        correlationId?: string
    ) {
        super(correlationId || `google-img-${Date.now()}`);
    }

    /**
     * Get the search query if available
     */
    get searchQuery(): string | undefined {
        return this.options.searchQuery;
    }

    /**
     * Get the desired filename if specified
     */
    get filename(): string | undefined {
        return this.options.filename;
    }

    /**
     * Get the image source URL
     */
    get imageUrl(): string {
        return this.imageElement.src;
    }

    /**
     * Get image dimensions if available
     */
    get dimensions(): { width?: number; height?: number } {
        return {
            width: this.imageElement.width,
            height: this.imageElement.height
        };
    }

    /**
     * Create a summary of the download request
     */
    toSummary(): string {
        const query = this.searchQuery ? ` from "${this.searchQuery}"` : '';
        const filename = this.filename ? ` as "${this.filename}"` : '';
        return `Download image${query}${filename}`;
    }
}