/*
                        Semantest - Unsplash Domain Events
                        Photo Downloaded Event

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { DomainEvent } from '@semantest/core';

/**
 * Domain Event: Photo Downloaded
 * 
 * Represents the successful download of an Unsplash photo.
 */
export class PhotoDownloaded extends DomainEvent {
    public readonly eventType = 'PhotoDownloaded';
    
    constructor(
        public readonly photoId: string,
        public readonly artistName: string,
        public readonly downloadPath: string,
        public readonly quality: string,
        correlationId?: string
    ) {
        super(correlationId || `photo-dl-${photoId}-${Date.now()}`);
    }

    /**
     * Create a summary of the download event
     */
    toSummary(): string {
        return `Downloaded ${this.artistName} photo ${this.photoId} (${this.quality}) to ${this.downloadPath}`;
    }
}