/*
                        Semantest - Twitter Domain Events
                        Tweet Saved Event

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { DomainEvent } from '@semantest/core';

/**
 * Domain Event: Tweet Saved
 * 
 * Represents a tweet being saved for later reference.
 */
export class TweetSaved extends DomainEvent {
    public readonly eventType = 'TweetSaved';
    
    constructor(
        public readonly tweetId: string,
        public readonly username: string,
        public readonly tweetText: string,
        correlationId?: string
    ) {
        super(correlationId || `tweet-save-${tweetId}-${Date.now()}`);
    }

    /**
     * Create a summary of the save event
     */
    toSummary(): string {
        const snippet = this.tweetText.substring(0, 50) + '...';
        return `Saved tweet from @${this.username}: ${snippet}`;
    }
}