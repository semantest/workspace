/*
                        Semantest - Core Module
                        Base classes and interfaces

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

/**
 * Base Entity class
 */
export abstract class Entity {
    constructor(
        public readonly id: string,
        public readonly timestamp: Date = new Date()
    ) {}

    /**
     * Check if two entities are equal
     */
    equals(other: Entity): boolean {
        return this.id === other.id;
    }

    /**
     * Convert entity to JSON
     */
    toJSON(): any {
        return {
            id: this.id,
            timestamp: this.timestamp
        };
    }
}

/**
 * Base Domain Event class
 */
export abstract class DomainEvent {
    public readonly timestamp: Date = new Date();
    public abstract readonly eventType: string;

    constructor(
        public readonly correlationId: string
    ) {}

    /**
     * Convert event to JSON
     */
    toJSON(): any {
        return {
            eventType: this.eventType,
            correlationId: this.correlationId,
            timestamp: this.timestamp
        };
    }
}