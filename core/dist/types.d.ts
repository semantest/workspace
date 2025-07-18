export { Entity, AggregateRoot, TimestampedEntity, BaseEntityProps } from './entities';
export { DomainEvent, IntegrationEvent, EventHandler, EventBus } from './events';
export { ValueObject, Id, Email, Url, Timestamp, Name, Version } from './value-objects';
export { Adapter, HttpAdapter, StorageAdapter, CacheAdapter, CommunicationAdapter, DomAdapter, BrowserAdapter, FileSystemAdapter, DatabaseAdapter, LoggingAdapter, MetricsAdapter, Repository, QueryHandler, CommandHandler } from './adapters';
export type Result<T, E = Error> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};
export type Option<T> = T | null | undefined;
export type Maybe<T> = T | null;
export type Either<L, R> = {
    kind: 'left';
    value: L;
} | {
    kind: 'right';
    value: R;
};
export interface ApplicationService {
    getName(): string;
    initialize(): Promise<void>;
    cleanup(): Promise<void>;
}
export interface DomainService {
    getName(): string;
}
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
export interface BusinessRule<T> {
    isSatisfied(entity: T): boolean;
    getMessage(): string;
}
export interface Configuration {
    get<T>(key: string): T;
    set<T>(key: string, value: T): void;
    has(key: string): boolean;
    remove(key: string): void;
}
export interface HealthCheck {
    getName(): string;
    check(): Promise<HealthStatus>;
}
export interface HealthStatus {
    healthy: boolean;
    message?: string;
    details?: any;
}
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
export interface PaginatedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}
export interface PaginationOptions {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface SearchCriteria {
    query?: string;
    filters?: Record<string, any>;
    pagination?: PaginationOptions;
}
export declare enum ErrorType {
    VALIDATION = "VALIDATION",
    BUSINESS_RULE = "BUSINESS_RULE",
    NOT_FOUND = "NOT_FOUND",
    CONFLICT = "CONFLICT",
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    INTERNAL = "INTERNAL",
    EXTERNAL = "EXTERNAL"
}
export interface BaseError {
    type: ErrorType;
    message: string;
    code?: string;
    details?: any;
    timestamp: Date;
}
export interface EventMetadata {
    correlationId: string;
    userId?: string;
    sessionId?: string;
    source: string;
    version: string;
    timestamp: Date;
}
export interface Command {
    readonly type: string;
    readonly metadata: EventMetadata;
}
export interface Query {
    readonly type: string;
    readonly metadata: EventMetadata;
}
export interface Message {
    readonly id: string;
    readonly type: string;
    readonly timestamp: Date;
    readonly payload: any;
}
export interface Subscription {
    readonly id: string;
    readonly topic: string;
    readonly handler: (message: Message) => Promise<void>;
    unsubscribe(): Promise<void>;
}
export interface Publisher {
    publish(topic: string, message: Message): Promise<void>;
    subscribe(topic: string, handler: (message: Message) => Promise<void>): Promise<Subscription>;
}
export interface Factory<T> {
    create(...args: any[]): T;
}
export interface Specification<T> {
    isSatisfiedBy(entity: T): boolean;
    and(other: Specification<T>): Specification<T>;
    or(other: Specification<T>): Specification<T>;
    not(): Specification<T>;
}
export interface Strategy<T, R> {
    execute(context: T): R;
}
export interface Observer<T> {
    update(data: T): void;
}
export interface Observable<T> {
    subscribe(observer: Observer<T>): void;
    unsubscribe(observer: Observer<T>): void;
    notify(data: T): void;
}
