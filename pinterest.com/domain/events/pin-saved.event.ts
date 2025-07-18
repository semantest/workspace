/*
                        Semantest - Pinterest Domain Events
                        Pin Saved Event

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { DomainEvent } from '@semantest/core';

export interface PinSaveOptions {
    boardId: string;
    boardName: string;
    note?: string;
    tags?: string[];
    isPrivate?: boolean;
}

/**
 * Domain Event: Pin Saved
 * 
 * Represents a pin being saved to a board.
 * This event is triggered when a user saves a pin to one of their boards.
 */
export class PinSaved extends DomainEvent {
    public readonly eventType = 'PinSaved';
    
    constructor(
        public readonly pinId: string,
        public readonly userId: string,
        public readonly saveOptions: PinSaveOptions,
        correlationId?: string
    ) {
        super(correlationId || `pin-save-${pinId}-${Date.now()}`);
    }

    /**
     * Get board ID
     */
    get boardId(): string {
        return this.saveOptions.boardId;
    }

    /**
     * Get board name
     */
    get boardName(): string {
        return this.saveOptions.boardName;
    }

    /**
     * Get save note
     */
    get note(): string | undefined {
        return this.saveOptions.note;
    }

    /**
     * Get tags
     */
    get tags(): string[] {
        return this.saveOptions.tags || [];
    }

    /**
     * Check if save is private
     */
    get isPrivate(): boolean {
        return this.saveOptions.isPrivate || false;
    }

    /**
     * Create a summary of the save event
     */
    toSummary(): string {
        const note = this.note ? ` with note: "${this.note}"` : '';
        const tags = this.tags.length > 0 ? ` (tags: ${this.tags.join(', ')})` : '';
        const privacy = this.isPrivate ? ' (private)' : '';
        
        return `Pin ${this.pinId} saved to ${this.boardName}${note}${tags}${privacy}`;
    }
}