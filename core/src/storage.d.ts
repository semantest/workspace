export interface Storage {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
    has(key: string): Promise<boolean>;
    size(): Promise<number>;
}
export declare class MemoryStorage implements Storage {
    private data;
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
    has(key: string): Promise<boolean>;
    size(): Promise<number>;
}
export declare class LocalStorage implements Storage {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
    has(key: string): Promise<boolean>;
    size(): Promise<number>;
}
export declare class SessionStorage implements Storage {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
    has(key: string): Promise<boolean>;
    size(): Promise<number>;
}
export declare class ChromeStorage implements Storage {
    private area;
    constructor(area?: 'local' | 'sync' | 'managed');
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
    has(key: string): Promise<boolean>;
    size(): Promise<number>;
}
export declare class PrefixedStorage implements Storage {
    private storage;
    private prefix;
    constructor(storage: Storage, prefix: string);
    private getKey;
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
    has(key: string): Promise<boolean>;
    size(): Promise<number>;
}
export declare class EncryptedStorage implements Storage {
    private storage;
    private encryptionKey;
    constructor(storage: Storage, encryptionKey: string);
    private encrypt;
    private decrypt;
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
    has(key: string): Promise<boolean>;
    size(): Promise<number>;
}
export declare class TTLStorage implements Storage {
    private storage;
    private defaultTtl;
    constructor(storage: Storage, defaultTtl?: number);
    private getTtlKey;
    get(key: string): Promise<any>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
    has(key: string): Promise<boolean>;
    size(): Promise<number>;
}
export declare class StorageFactory {
    static createMemoryStorage(): Storage;
    static createLocalStorage(): Storage;
    static createSessionStorage(): Storage;
    static createChromeStorage(area?: 'local' | 'sync' | 'managed'): Storage;
    static createPrefixedStorage(storage: Storage, prefix: string): Storage;
    static createEncryptedStorage(storage: Storage, encryptionKey: string): Storage;
    static createTTLStorage(storage: Storage, defaultTtl?: number): Storage;
}
//# sourceMappingURL=storage.d.ts.map