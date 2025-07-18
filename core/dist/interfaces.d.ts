export type { StorageAdapter, CacheAdapter, HttpAdapter, DatabaseAdapter } from './adapters';
export type { ValidationResult, BusinessRule } from './types';
export type { Storage } from './storage';
export type { SecurityPolicy, SecurityRule, SecurityContext } from './security';
export type { BrowserAutomation, BrowserElement, SelectorConfig } from './browser';
export interface Module {
    name: string;
    version: string;
    initialize(): Promise<void>;
    cleanup(): Promise<void>;
    getStatus(): ModuleStatus;
}
export interface ModuleStatus {
    name: string;
    version: string;
    initialized: boolean;
    healthy: boolean;
    lastCheck: Date;
    details?: any;
}
export interface Plugin {
    name: string;
    version: string;
    dependencies: string[];
    load(): Promise<void>;
    unload(): Promise<void>;
    isLoaded(): boolean;
}
export interface Extension {
    name: string;
    version: string;
    activate(): Promise<void>;
    deactivate(): Promise<void>;
    isActive(): boolean;
}
export interface Context {
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T): void;
    has(key: string): boolean;
    remove(key: string): void;
    clear(): void;
}
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
export interface User {
    id: string;
    username: string;
    email: string;
    roles: string[];
    permissions: string[];
    isActive: boolean;
    lastLogin?: Date;
}
export interface Token {
    value: string;
    type: string;
    expiresAt: Date;
    issuedAt: Date;
    userId?: string;
    scopes: string[];
}
export interface Serializer<T> {
    serialize(data: T): string;
    deserialize(data: string): T;
}
export interface Encoder<T, U> {
    encode(data: T): U;
    decode(data: U): T;
}
export interface Mapper<T, U> {
    map(source: T): U;
    mapReverse(source: U): T;
}
export interface Transformer<T, U> {
    transform(input: T): U;
}
export interface Filter<T> {
    filter(items: T[]): T[];
}
export interface Sorter<T> {
    sort(items: T[]): T[];
}
export interface Comparator<T> {
    compare(a: T, b: T): number;
}
export interface Matcher<T> {
    matches(item: T): boolean;
}
export interface Predicate<T> {
    test(item: T): boolean;
}
export interface Consumer<T> {
    accept(item: T): void;
}
export interface Supplier<T> {
    get(): T;
}
export interface Function<T, R> {
    apply(arg: T): R;
}
export interface Processor<T> {
    process(item: T): T;
}
export interface Handler<T> {
    handle(item: T): void;
}
export interface Listener<T> {
    onEvent(event: T): void;
}
export interface Callback<T> {
    (item: T): void;
}
export interface AsyncCallback<T> {
    (item: T): Promise<void>;
}
export interface Disposable {
    dispose(): void;
}
export interface AsyncDisposable {
    dispose(): Promise<void>;
}
export interface Cloneable<T> {
    clone(): T;
}
export interface Comparable<T> {
    compareTo(other: T): number;
}
export interface Equatable<T> {
    equals(other: T): boolean;
}
export interface Hashable {
    hashCode(): number;
}
export interface Serializable {
    serialize(): string;
}
export interface Configurable {
    configure(config: any): void;
    getConfig(): any;
}
export interface Initializable {
    initialize(): Promise<void>;
    isInitialized(): boolean;
}
export interface Startable {
    start(): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
}
export interface Pausable {
    pause(): void;
    resume(): void;
    isPaused(): boolean;
}
export interface Resettable {
    reset(): void;
}
export interface Refreshable {
    refresh(): Promise<void>;
}
export interface Cacheable {
    getCacheKey(): string;
    getCacheTtl(): number;
}
export interface Identifiable {
    getId(): string;
}
export interface Nameable {
    getName(): string;
}
export interface Versionable {
    getVersion(): string;
}
export interface Timestampable {
    getTimestamp(): Date;
}
export interface Taggable {
    getTags(): string[];
    addTag(tag: string): void;
    removeTag(tag: string): void;
    hasTag(tag: string): boolean;
}
export interface Metadata {
    getMetadata(): Record<string, any>;
    setMetadata(key: string, value: any): void;
    removeMetadata(key: string): void;
    hasMetadata(key: string): boolean;
}
