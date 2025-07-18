/*
                        Semantest - Core Entities
                        Base entity classes and interfaces

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { DomainEvent } from './events';

/**
 * Base Entity class for all domain entities
 */
export abstract class Entity<T = any> {
    protected props: T;
    private _domainEvents: DomainEvent[] = [];

    constructor(props: T) {
        this.props = props;
    }

    /**
     * Check if two entities are equal
     */
    equals(other: Entity<T>): boolean {
        if (!(other instanceof Entity)) {
            return false;
        }
        return this.getId() === other.getId();
    }

    /**
     * Get entity ID
     */
    abstract getId(): string;

    /**
     * Get entity properties
     */
    getProps(): T {
        return { ...this.props };
    }

    /**
     * Update entity properties
     */
    protected updateProps(updates: Partial<T>): void {
        this.props = { ...this.props, ...updates };
    }

    /**
     * Add domain event
     */
    protected addDomainEvent(event: DomainEvent): void {
        this._domainEvents.push(event);
    }

    /**
     * Get domain events
     */
    getDomainEvents(): DomainEvent[] {
        return [...this._domainEvents];
    }

    /**
     * Clear domain events
     */
    clearDomainEvents(): void {
        this._domainEvents = [];
    }

    /**
     * Convert entity to JSON
     */
    toJSON(): any {
        return {
            id: this.getId(),
            ...this.props
        };
    }
}

/**
 * Base Aggregate Root class
 */
export abstract class AggregateRoot<T = any> extends Entity<T> {
    /**
     * Apply domain event and add to event list
     */
    protected applyEvent(event: DomainEvent): void {
        this.addDomainEvent(event);
        this.apply(event);
    }

    /**
     * Apply event to aggregate state
     */
    protected abstract apply(event: DomainEvent): void;
}

/**
 * Base properties interface for entities
 */
export interface BaseEntityProps {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Base timestamped entity
 */
export abstract class TimestampedEntity<T extends BaseEntityProps> extends Entity<T> {
    override getId(): string {
        return this.props.id;
    }

    getCreatedAt(): Date {
        return this.props.createdAt;
    }

    getUpdatedAt(): Date {
        return this.props.updatedAt;
    }

    protected updateProps(updates: Partial<T>): void {
        super.updateProps({
            ...updates,
            updatedAt: new Date()
        } as Partial<T>);
    }
}