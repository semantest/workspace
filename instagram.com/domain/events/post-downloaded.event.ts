/*
                        Semantest - Instagram Domain Events
                        Post Downloaded Event

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { DomainEvent } from '@semantest/core';

/**
 * Domain Event: Post Downloaded
 * 
 * Represents the successful download of an Instagram post.
 */
export class PostDownloaded extends DomainEvent {
    public readonly eventType = 'PostDownloaded';
    
    constructor(
        public readonly postId: string,
        public readonly username: string,
        public readonly downloadPath: string,
        public readonly fileSize: number,
        correlationId?: string
    ) {
        super(correlationId || `post-dl-${postId}-${Date.now()}`);
    }

    /**
     * Create a summary of the download event
     */
    toSummary(): string {
        return `Downloaded ${this.username} post ${this.postId} to ${this.downloadPath}`;
    }
}