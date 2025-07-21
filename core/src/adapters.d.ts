export declare abstract class Adapter {
    protected readonly name: string;
    constructor(name: string);
    getName(): string;
    abstract initialize(): Promise<void>;
    abstract cleanup(): Promise<void>;
    abstract isHealthy(): Promise<boolean>;
}
export interface HttpAdapter {
    get(url: string, options?: any): Promise<any>;
    post(url: string, data: any, options?: any): Promise<any>;
    put(url: string, data: any, options?: any): Promise<any>;
    delete(url: string, options?: any): Promise<any>;
}
export interface StorageAdapter {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    clear(): Promise<void>;
}
export interface CacheAdapter {
    get(key: string): Promise<any>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    has(key: string): Promise<boolean>;
}
export interface CommunicationAdapter {
    send(message: any, target?: string): Promise<void>;
    receive(): Promise<any>;
    subscribe(channel: string, handler: (message: any) => void): void;
    unsubscribe(channel: string): void;
}
export interface DomAdapter {
    querySelector(selector: string): Promise<any>;
    querySelectorAll(selector: string): Promise<any[]>;
    click(selector: string): Promise<void>;
    type(selector: string, text: string): Promise<void>;
    waitFor(selector: string, timeout?: number): Promise<any>;
    getElement(selector: string): Promise<any>;
    getElements(selector: string): Promise<any[]>;
}
export interface BrowserAdapter {
    navigate(url: string): Promise<void>;
    getCurrentUrl(): Promise<string>;
    getTitle(): Promise<string>;
    screenshot(options?: any): Promise<Buffer>;
    evaluate(script: string): Promise<any>;
    waitForSelector(selector: string, timeout?: number): Promise<any>;
    close(): Promise<void>;
}
export interface FileSystemAdapter {
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    deleteFile(path: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    mkdir(path: string): Promise<void>;
    readdir(path: string): Promise<string[]>;
}
export interface DatabaseAdapter {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    query(sql: string, params?: any[]): Promise<any>;
    transaction(callback: (tx: any) => Promise<void>): Promise<void>;
}
export interface LoggingAdapter {
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: Error): void;
}
export interface MetricsAdapter {
    increment(metric: string, value?: number): void;
    decrement(metric: string, value?: number): void;
    gauge(metric: string, value: number): void;
    timing(metric: string, duration: number): void;
}
export interface Repository<T> {
    findById(id: string): Promise<T | null>;
    findAll(): Promise<T[]>;
    save(entity: T): Promise<void>;
    delete(id: string): Promise<void>;
    exists(id: string): Promise<boolean>;
}
export interface QueryHandler<TQuery, TResult> {
    handle(query: TQuery): Promise<TResult>;
}
export interface CommandHandler<TCommand> {
    handle(command: TCommand): Promise<void>;
}
//# sourceMappingURL=adapters.d.ts.map