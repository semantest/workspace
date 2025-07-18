/*
                        Semantest - Core Interfaces
                        Common interfaces used across modules

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

// Specific re-exports to avoid conflicts
export type { StorageAdapter, CacheAdapter, HttpAdapter, DatabaseAdapter } from './adapters';
export type { ValidationResult, BusinessRule } from './types';
export type { Storage } from './storage';
export type { SecurityPolicy, SecurityRule, SecurityContext } from './security';
export type { BrowserAutomation, BrowserElement, SelectorConfig } from './browser';

/**
 * Module interface
 */
export interface Module {
    name: string;
    version: string;
    initialize(): Promise<void>;
    cleanup(): Promise<void>;
    getStatus(): ModuleStatus;
}

/**
 * Module status
 */
export interface ModuleStatus {
    name: string;
    version: string;
    initialized: boolean;
    healthy: boolean;
    lastCheck: Date;
    details?: any;
}

/**
 * Plugin interface
 */
export interface Plugin {
    name: string;
    version: string;
    dependencies: string[];
    load(): Promise<void>;
    unload(): Promise<void>;
    isLoaded(): boolean;
}

/**
 * Extension interface
 */
export interface Extension {
    name: string;
    version: string;
    activate(): Promise<void>;
    deactivate(): Promise<void>;
    isActive(): boolean;
}

/**
 * Context interface
 */
export interface Context {
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T): void;
    has(key: string): boolean;
    remove(key: string): void;
    clear(): void;
}

/**
 * Session interface
 */
export interface Session {
    id: string;
    userId?: string;
    createdAt: Date;
    lastAccessedAt: Date;
    data: Record<string, any>;
    isValid(): boolean;
    refresh(): void;
    destroy(): void;
}

/**
 * User interface
 */
export interface User {
    id: string;
    username: string;
    email: string;
    roles: string[];
    permissions: string[];
    isActive: boolean;
    lastLogin?: Date;
}

/**
 * Token interface
 */
export interface Token {
    value: string;
    type: string;
    expiresAt: Date;
    issuedAt: Date;
    userId?: string;
    scopes: string[];
}

/**
 * Serializer interface
 */
export interface Serializer<T> {
    serialize(data: T): string;
    deserialize(data: string): T;
}

/**
 * Encoder interface
 */
export interface Encoder<T, U> {
    encode(data: T): U;
    decode(data: U): T;
}

/**
 * Mapper interface
 */
export interface Mapper<T, U> {
    map(source: T): U;
    mapReverse(source: U): T;
}

/**
 * Transformer interface
 */
export interface Transformer<T, U> {
    transform(input: T): U;
}

/**
 * Filter interface
 */
export interface Filter<T> {
    filter(items: T[]): T[];
}

/**
 * Sorter interface
 */
export interface Sorter<T> {
    sort(items: T[]): T[];
}

/**
 * Comparator interface
 */
export interface Comparator<T> {
    compare(a: T, b: T): number;
}

/**
 * Matcher interface
 */
export interface Matcher<T> {
    matches(item: T): boolean;
}

/**
 * Predicate interface
 */
export interface Predicate<T> {
    test(item: T): boolean;
}

/**
 * Consumer interface
 */
export interface Consumer<T> {
    accept(item: T): void;
}

/**
 * Supplier interface
 */
export interface Supplier<T> {
    get(): T;
}

/**
 * Function interface
 */
export interface Function<T, R> {
    apply(arg: T): R;
}

/**
 * Processor interface
 */
export interface Processor<T> {
    process(item: T): T;
}

/**
 * Handler interface
 */
export interface Handler<T> {
    handle(item: T): void;
}

/**
 * Listener interface
 */
export interface Listener<T> {
    onEvent(event: T): void;
}

/**
 * Callback interface
 */
export interface Callback<T> {
    (item: T): void;
}

/**
 * AsyncCallback interface
 */
export interface AsyncCallback<T> {
    (item: T): Promise<void>;
}

/**
 * Disposable interface
 */
export interface Disposable {
    dispose(): void;
}

/**
 * AsyncDisposable interface
 */
export interface AsyncDisposable {
    dispose(): Promise<void>;
}

/**
 * Cloneable interface
 */
export interface Cloneable<T> {
    clone(): T;
}

/**
 * Comparable interface
 */
export interface Comparable<T> {
    compareTo(other: T): number;
}

/**
 * Equatable interface
 */
export interface Equatable<T> {
    equals(other: T): boolean;
}

/**
 * Hashable interface
 */
export interface Hashable {
    hashCode(): number;
}

/**
 * Serializable interface
 */
export interface Serializable {
    serialize(): string;
}

/**
 * Configurable interface
 */
export interface Configurable {
    configure(config: any): void;
    getConfig(): any;
}

/**
 * Initializable interface
 */
export interface Initializable {
    initialize(): Promise<void>;
    isInitialized(): boolean;
}

/**
 * Startable interface
 */
export interface Startable {
    start(): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
}

/**
 * Pausable interface
 */
export interface Pausable {
    pause(): void;
    resume(): void;
    isPaused(): boolean;
}

/**
 * Resettable interface
 */
export interface Resettable {
    reset(): void;
}

/**
 * Refreshable interface
 */
export interface Refreshable {
    refresh(): Promise<void>;
}

/**
 * Cacheable interface
 */
export interface Cacheable {
    getCacheKey(): string;
    getCacheTtl(): number;
}

/**
 * Identifiable interface
 */
export interface Identifiable {
    getId(): string;
}

/**
 * Nameable interface
 */
export interface Nameable {
    getName(): string;
}

/**
 * Versionable interface
 */
export interface Versionable {
    getVersion(): string;
}

/**
 * Timestampable interface
 */
export interface Timestampable {
    getTimestamp(): Date;
}

/**
 * Taggable interface
 */
export interface Taggable {
    getTags(): string[];
    addTag(tag: string): void;
    removeTag(tag: string): void;
    hasTag(tag: string): boolean;
}

/**
 * Metadata interface
 */
export interface Metadata {
    getMetadata(): Record<string, any>;
    setMetadata(key: string, value: any): void;
    removeMetadata(key: string): void;
    hasMetadata(key: string): boolean;
}