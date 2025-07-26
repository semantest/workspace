/*
                        Semantest - Core Types
                        Common types and interfaces

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

// Import types from other modules
// TODO: Re-enable when these types are used in this file
// import { Entity, AggregateRoot, TimestampedEntity, BaseEntityProps } from './entities';
// import { DomainEvent, IntegrationEvent, EventHandler, EventBus } from './events';
// import { ValueObject, Id, Email, Url, Timestamp, Name, Version } from './value-objects';
// import { 
//     Adapter, 
//     HttpAdapter, 
//     StorageAdapter, 
//     CacheAdapter, 
//     CommunicationAdapter,
//     DomAdapter,
//     BrowserAdapter,
//     FileSystemAdapter,
//     DatabaseAdapter,
//     LoggingAdapter,
//     MetricsAdapter,
//     Repository,
//     QueryHandler,
//     CommandHandler
// } from './adapters';

/**
 * Generic Result type for operations
 */
export type Result<T, E = Error> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};

/**
 * Generic Option type
 */
export type Option<T> = T | null | undefined;

/**
 * Generic Maybe type
 */
export type Maybe<T> = T | null;

/**
 * Generic Either type
 */
export type Either<L, R> = {
    kind: 'left';
    value: L;
} | {
    kind: 'right';
    value: R;
};

/**
 * Application Service interface
 */
export interface ApplicationService {
    getName(): string;
    initialize(): Promise<void>;
    cleanup(): Promise<void>;
}

/**
 * Domain Service interface
 */
export interface DomainService {
    getName(): string;
}

/**
 * Validation Result interface
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Business Rule interface
 */
export interface BusinessRule<T> {
    isSatisfied(entity: T): boolean;
    getMessage(): string;
}

/**
 * Configuration interface
 */
export interface Configuration {
    get<T>(key: string): T;
    set<T>(key: string, value: T): void;
    has(key: string): boolean;
    remove(key: string): void;
}

/**
 * Health check interface
 */
export interface HealthCheck {
    getName(): string;
    check(): Promise<HealthStatus>;
}

/**
 * Health status
 */
export interface HealthStatus {
    healthy: boolean;
    message?: string;
    details?: any;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
    id: string;
    timestamp: Date;
    userId?: string;
    action: string;
    resource: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

/**
 * Search criteria
 */
export interface SearchCriteria {
    query?: string;
    filters?: Record<string, any>;
    pagination?: PaginationOptions;
}

/**
 * Common error types
 */
export enum ErrorType {
    VALIDATION = 'VALIDATION',
    BUSINESS_RULE = 'BUSINESS_RULE',
    NOT_FOUND = 'NOT_FOUND',
    CONFLICT = 'CONFLICT',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    INTERNAL = 'INTERNAL',
    EXTERNAL = 'EXTERNAL'
}

/**
 * Base error interface
 */
export interface BaseError {
    type: ErrorType;
    message: string;
    code?: string;
    details?: any;
    timestamp: Date;
}

/**
 * Event metadata
 */
export interface EventMetadata {
    correlationId: string;
    userId?: string;
    sessionId?: string;
    source: string;
    version: string;
    timestamp: Date;
}

/**
 * Command interface
 */
export interface Command {
    readonly type: string;
    readonly metadata: EventMetadata;
}

/**
 * Query interface
 */
export interface Query {
    readonly type: string;
    readonly metadata: EventMetadata;
}

/**
 * Message interface
 */
export interface Message {
    readonly id: string;
    readonly type: string;
    readonly timestamp: Date;
    readonly payload: any;
}

/**
 * Subscription interface
 */
export interface Subscription {
    readonly id: string;
    readonly topic: string;
    readonly handler: (message: Message) => Promise<void>;
    unsubscribe(): Promise<void>;
}

/**
 * Publisher interface
 */
export interface Publisher {
    publish(topic: string, message: Message): Promise<void>;
    subscribe(topic: string, handler: (message: Message) => Promise<void>): Promise<Subscription>;
}

/**
 * Factory interface
 */
export interface Factory<T> {
    create(...args: any[]): T;
}

/**
 * Specification interface
 */
export interface Specification<T> {
    isSatisfiedBy(entity: T): boolean;
    and(other: Specification<T>): Specification<T>;
    or(other: Specification<T>): Specification<T>;
    not(): Specification<T>;
}

/**
 * Strategy interface
 */
export interface Strategy<T, R> {
    execute(context: T): R;
}

/**
 * Observer interface
 */
export interface Observer<T> {
    update(data: T): void;
}

/**
 * Observable interface
 */
export interface Observable<T> {
    subscribe(observer: Observer<T>): void;
    unsubscribe(observer: Observer<T>): void;
    notify(data: T): void;
}