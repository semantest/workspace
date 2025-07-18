/*
                        Semantest - Core Adapters
                        Base adapter classes and interfaces

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

/**
 * Base Adapter class
 */
export abstract class Adapter {
    protected readonly name: string;

    constructor(name: string) {
        this.name = name;
    }

    getName(): string {
        return this.name;
    }

    /**
     * Initialize adapter
     */
    abstract initialize(): Promise<void>;

    /**
     * Cleanup adapter resources
     */
    abstract cleanup(): Promise<void>;

    /**
     * Check if adapter is healthy
     */
    abstract isHealthy(): Promise<boolean>;
}

/**
 * HTTP Adapter interface
 */
export interface HttpAdapter {
    get(url: string, options?: any): Promise<any>;
    post(url: string, data: any, options?: any): Promise<any>;
    put(url: string, data: any, options?: any): Promise<any>;
    delete(url: string, options?: any): Promise<any>;
}

/**
 * Storage Adapter interface
 */
export interface StorageAdapter {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    clear(): Promise<void>;
}

/**
 * Cache Adapter interface
 */
export interface CacheAdapter {
    get(key: string): Promise<any>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    has(key: string): Promise<boolean>;
}

/**
 * Communication Adapter interface
 */
export interface CommunicationAdapter {
    send(message: any, target?: string): Promise<void>;
    receive(): Promise<any>;
    subscribe(channel: string, handler: (message: any) => void): void;
    unsubscribe(channel: string): void;
}

/**
 * DOM Adapter interface
 */
export interface DomAdapter {
    querySelector(selector: string): Promise<any>;
    querySelectorAll(selector: string): Promise<any[]>;
    click(selector: string): Promise<void>;
    type(selector: string, text: string): Promise<void>;
    waitFor(selector: string, timeout?: number): Promise<any>;
    getElement(selector: string): Promise<any>;
    getElements(selector: string): Promise<any[]>;
}

/**
 * Browser Adapter interface
 */
export interface BrowserAdapter {
    navigate(url: string): Promise<void>;
    getCurrentUrl(): Promise<string>;
    getTitle(): Promise<string>;
    screenshot(options?: any): Promise<Buffer>;
    evaluate(script: string): Promise<any>;
    waitForSelector(selector: string, timeout?: number): Promise<any>;
    close(): Promise<void>;
}

/**
 * File System Adapter interface
 */
export interface FileSystemAdapter {
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    deleteFile(path: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    mkdir(path: string): Promise<void>;
    readdir(path: string): Promise<string[]>;
}

/**
 * Database Adapter interface
 */
export interface DatabaseAdapter {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    query(sql: string, params?: any[]): Promise<any>;
    transaction(callback: (tx: any) => Promise<void>): Promise<void>;
}

/**
 * Logging Adapter interface
 */
export interface LoggingAdapter {
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: Error): void;
}

/**
 * Metrics Adapter interface
 */
export interface MetricsAdapter {
    increment(metric: string, value?: number): void;
    decrement(metric: string, value?: number): void;
    gauge(metric: string, value: number): void;
    timing(metric: string, duration: number): void;
}

/**
 * Base Repository interface
 */
export interface Repository<T> {
    findById(id: string): Promise<T | null>;
    findAll(): Promise<T[]>;
    save(entity: T): Promise<void>;
    delete(id: string): Promise<void>;
    exists(id: string): Promise<boolean>;
}

/**
 * Base Query Handler interface
 */
export interface QueryHandler<TQuery, TResult> {
    handle(query: TQuery): Promise<TResult>;
}

/**
 * Base Command Handler interface
 */
export interface CommandHandler<TCommand> {
    handle(command: TCommand): Promise<void>;
}