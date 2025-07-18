/*
                        Semantest - Core Storage
                        Storage utilities and patterns

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

/**
 * Storage interface
 */
export interface Storage {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
    has(key: string): Promise<boolean>;
    size(): Promise<number>;
}

/**
 * Memory storage implementation
 */
export class MemoryStorage implements Storage {
    private data = new Map<string, any>();

    async get(key: string): Promise<any> {
        return this.data.get(key);
    }

    async set(key: string, value: any): Promise<void> {
        this.data.set(key, value);
    }

    async remove(key: string): Promise<void> {
        this.data.delete(key);
    }

    async clear(): Promise<void> {
        this.data.clear();
    }

    async keys(): Promise<string[]> {
        return Array.from(this.data.keys());
    }

    async has(key: string): Promise<boolean> {
        return this.data.has(key);
    }

    async size(): Promise<number> {
        return this.data.size;
    }
}

/**
 * Local storage implementation
 */
export class LocalStorage implements Storage {
    async get(key: string): Promise<any> {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : undefined;
    }

    async set(key: string, value: any): Promise<void> {
        localStorage.setItem(key, JSON.stringify(value));
    }

    async remove(key: string): Promise<void> {
        localStorage.removeItem(key);
    }

    async clear(): Promise<void> {
        localStorage.clear();
    }

    async keys(): Promise<string[]> {
        return Object.keys(localStorage);
    }

    async has(key: string): Promise<boolean> {
        return localStorage.getItem(key) !== null;
    }

    async size(): Promise<number> {
        return localStorage.length;
    }
}

/**
 * Session storage implementation
 */
export class SessionStorage implements Storage {
    async get(key: string): Promise<any> {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : undefined;
    }

    async set(key: string, value: any): Promise<void> {
        sessionStorage.setItem(key, JSON.stringify(value));
    }

    async remove(key: string): Promise<void> {
        sessionStorage.removeItem(key);
    }

    async clear(): Promise<void> {
        sessionStorage.clear();
    }

    async keys(): Promise<string[]> {
        return Object.keys(sessionStorage);
    }

    async has(key: string): Promise<boolean> {
        return sessionStorage.getItem(key) !== null;
    }

    async size(): Promise<number> {
        return sessionStorage.length;
    }
}

/**
 * Chrome storage implementation
 */
export class ChromeStorage implements Storage {
    private area: any;

    constructor(area: 'local' | 'sync' | 'managed' = 'local') {
        this.area = (globalThis as any).chrome?.storage[area];
    }

    async get(key: string): Promise<any> {
        return new Promise((resolve) => {
            this.area.get(key, (result: any) => {
                resolve(result[key]);
            });
        });
    }

    async set(key: string, value: any): Promise<void> {
        return new Promise((resolve) => {
            this.area.set({ [key]: value }, () => {
                resolve();
            });
        });
    }

    async remove(key: string): Promise<void> {
        return new Promise((resolve) => {
            this.area.remove(key, () => {
                resolve();
            });
        });
    }

    async clear(): Promise<void> {
        return new Promise((resolve) => {
            this.area.clear(() => {
                resolve();
            });
        });
    }

    async keys(): Promise<string[]> {
        return new Promise((resolve) => {
            this.area.get(null, (result) => {
                resolve(Object.keys(result));
            });
        });
    }

    async has(key: string): Promise<boolean> {
        return new Promise((resolve) => {
            this.area.get(key, (result) => {
                resolve(key in result);
            });
        });
    }

    async size(): Promise<number> {
        return new Promise((resolve) => {
            this.area.get(null, (result) => {
                resolve(Object.keys(result).length);
            });
        });
    }
}

/**
 * Prefixed storage wrapper
 */
export class PrefixedStorage implements Storage {
    constructor(
        private storage: Storage,
        private prefix: string
    ) {}

    private getKey(key: string): string {
        return `${this.prefix}:${key}`;
    }

    async get(key: string): Promise<any> {
        return this.storage.get(this.getKey(key));
    }

    async set(key: string, value: any): Promise<void> {
        return this.storage.set(this.getKey(key), value);
    }

    async remove(key: string): Promise<void> {
        return this.storage.remove(this.getKey(key));
    }

    async clear(): Promise<void> {
        const keys = await this.keys();
        await Promise.all(keys.map(key => this.remove(key)));
    }

    async keys(): Promise<string[]> {
        const allKeys = await this.storage.keys();
        return allKeys
            .filter(key => key.startsWith(`${this.prefix}:`))
            .map(key => key.substring(this.prefix.length + 1));
    }

    async has(key: string): Promise<boolean> {
        return this.storage.has(this.getKey(key));
    }

    async size(): Promise<number> {
        const keys = await this.keys();
        return keys.length;
    }
}

/**
 * Encrypted storage wrapper
 */
export class EncryptedStorage implements Storage {
    constructor(
        private storage: Storage,
        private encryptionKey: string
    ) {}

    private encrypt(value: any): string {
        // Simple encryption - in production use proper encryption
        const jsonString = JSON.stringify(value);
        return Buffer.from(jsonString).toString('base64');
    }

    private decrypt(encryptedValue: string): any {
        try {
            const jsonString = Buffer.from(encryptedValue, 'base64').toString();
            return JSON.parse(jsonString);
        } catch {
            return undefined;
        }
    }

    async get(key: string): Promise<any> {
        const encryptedValue = await this.storage.get(key);
        return encryptedValue ? this.decrypt(encryptedValue) : undefined;
    }

    async set(key: string, value: any): Promise<void> {
        const encryptedValue = this.encrypt(value);
        return this.storage.set(key, encryptedValue);
    }

    async remove(key: string): Promise<void> {
        return this.storage.remove(key);
    }

    async clear(): Promise<void> {
        return this.storage.clear();
    }

    async keys(): Promise<string[]> {
        return this.storage.keys();
    }

    async has(key: string): Promise<boolean> {
        return this.storage.has(key);
    }

    async size(): Promise<number> {
        return this.storage.size();
    }
}

/**
 * TTL storage wrapper
 */
export class TTLStorage implements Storage {
    constructor(
        private storage: Storage,
        private defaultTtl: number = 60000 // 1 minute
    ) {}

    private getTtlKey(key: string): string {
        return `${key}:ttl`;
    }

    async get(key: string): Promise<any> {
        const ttlKey = this.getTtlKey(key);
        const expiresAt = await this.storage.get(ttlKey);
        
        if (expiresAt && Date.now() > expiresAt) {
            await this.remove(key);
            return undefined;
        }
        
        return this.storage.get(key);
    }

    async set(key: string, value: any, ttl?: number): Promise<void> {
        const ttlKey = this.getTtlKey(key);
        const expiresAt = Date.now() + (ttl || this.defaultTtl);
        
        await Promise.all([
            this.storage.set(key, value),
            this.storage.set(ttlKey, expiresAt)
        ]);
    }

    async remove(key: string): Promise<void> {
        const ttlKey = this.getTtlKey(key);
        await Promise.all([
            this.storage.remove(key),
            this.storage.remove(ttlKey)
        ]);
    }

    async clear(): Promise<void> {
        return this.storage.clear();
    }

    async keys(): Promise<string[]> {
        const allKeys = await this.storage.keys();
        return allKeys.filter(key => !key.endsWith(':ttl'));
    }

    async has(key: string): Promise<boolean> {
        const value = await this.get(key);
        return value !== undefined;
    }

    async size(): Promise<number> {
        const keys = await this.keys();
        return keys.length;
    }
}

/**
 * Storage factory
 */
export class StorageFactory {
    static createMemoryStorage(): Storage {
        return new MemoryStorage();
    }

    static createLocalStorage(): Storage {
        return new LocalStorage();
    }

    static createSessionStorage(): Storage {
        return new SessionStorage();
    }

    static createChromeStorage(area: 'local' | 'sync' | 'managed' = 'local'): Storage {
        return new ChromeStorage(area);
    }

    static createPrefixedStorage(storage: Storage, prefix: string): Storage {
        return new PrefixedStorage(storage, prefix);
    }

    static createEncryptedStorage(storage: Storage, encryptionKey: string): Storage {
        return new EncryptedStorage(storage, encryptionKey);
    }

    static createTTLStorage(storage: Storage, defaultTtl?: number): Storage {
        return new TTLStorage(storage, defaultTtl);
    }
}