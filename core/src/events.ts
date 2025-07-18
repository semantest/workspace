/*
                        Semantest - Core Events
                        Base event classes and interfaces

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

/**
 * Base Domain Event class
 */
export abstract class DomainEvent {
    public readonly timestamp: Date = new Date();
    public abstract readonly eventType: string;

    constructor(
        public readonly correlationId: string,
        public readonly aggregateId?: string
    ) {}

    /**
     * Convert event to JSON
     */
    toJSON(): any {
        return {
            eventType: this.eventType,
            correlationId: this.correlationId,
            aggregateId: this.aggregateId,
            timestamp: this.timestamp
        };
    }
}

/**
 * Base Integration Event class
 */
export abstract class IntegrationEvent extends DomainEvent {
    abstract readonly version: string;
    abstract readonly source: string;
}

/**
 * Event Handler interface
 */
export interface EventHandler<T extends DomainEvent> {
    handle(event: T): Promise<void>;
}

/**
 * Event Bus interface
 */
export interface EventBus {
    publish(event: DomainEvent): Promise<void>;
    subscribe<T extends DomainEvent>(
        eventType: string,
        handler: EventHandler<T>
    ): void;
}

/**
 * Common event types used across modules
 */
export class EntityCreated extends DomainEvent {
    public readonly eventType = 'EntityCreated';
    
    constructor(
        correlationId: string,
        aggregateId: string,
        public readonly entityType: string,
        public readonly entityData: any
    ) {
        super(correlationId, aggregateId);
    }
}

export class EntityUpdated extends DomainEvent {
    public readonly eventType = 'EntityUpdated';
    
    constructor(
        correlationId: string,
        aggregateId: string,
        public readonly entityType: string,
        public readonly changes: any
    ) {
        super(correlationId, aggregateId);
    }
}

export class EntityDeleted extends DomainEvent {
    public readonly eventType = 'EntityDeleted';
    
    constructor(
        correlationId: string,
        aggregateId: string,
        public readonly entityType: string
    ) {
        super(correlationId, aggregateId);
    }
}

export class OperationStarted extends DomainEvent {
    public readonly eventType = 'OperationStarted';
    
    constructor(
        correlationId: string,
        public readonly operation: string,
        public readonly parameters?: any
    ) {
        super(correlationId);
    }
}

export class OperationCompleted extends DomainEvent {
    public readonly eventType = 'OperationCompleted';
    
    constructor(
        correlationId: string,
        public readonly operation: string,
        public readonly result?: any
    ) {
        super(correlationId);
    }
}

export class OperationFailed extends DomainEvent {
    public readonly eventType = 'OperationFailed';
    
    constructor(
        correlationId: string,
        public readonly operation: string,
        public readonly error: string,
        public readonly details?: any
    ) {
        super(correlationId);
    }
}