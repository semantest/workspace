"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageFactory = exports.TTLStorage = exports.EncryptedStorage = exports.PrefixedStorage = exports.ChromeStorage = exports.SessionStorage = exports.LocalStorage = exports.MemoryStorage = void 0;
class MemoryStorage {
    constructor() {
        this.data = new Map();
    }
    async get(key) {
        return this.data.get(key);
    }
    async set(key, value) {
        this.data.set(key, value);
    }
    async remove(key) {
        this.data.delete(key);
    }
    async clear() {
        this.data.clear();
    }
    async keys() {
        return Array.from(this.data.keys());
    }
    async has(key) {
        return this.data.has(key);
    }
    async size() {
        return this.data.size;
    }
}
exports.MemoryStorage = MemoryStorage;
class LocalStorage {
    async get(key) {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : undefined;
    }
    async set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }
    async remove(key) {
        localStorage.removeItem(key);
    }
    async clear() {
        localStorage.clear();
    }
    async keys() {
        return Object.keys(localStorage);
    }
    async has(key) {
        return localStorage.getItem(key) !== null;
    }
    async size() {
        return localStorage.length;
    }
}
exports.LocalStorage = LocalStorage;
class SessionStorage {
    async get(key) {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : undefined;
    }
    async set(key, value) {
        sessionStorage.setItem(key, JSON.stringify(value));
    }
    async remove(key) {
        sessionStorage.removeItem(key);
    }
    async clear() {
        sessionStorage.clear();
    }
    async keys() {
        return Object.keys(sessionStorage);
    }
    async has(key) {
        return sessionStorage.getItem(key) !== null;
    }
    async size() {
        return sessionStorage.length;
    }
}
exports.SessionStorage = SessionStorage;
class ChromeStorage {
    constructor(area = 'local') {
        this.area = chrome.storage[area];
    }
    async get(key) {
        return new Promise((resolve) => {
            this.area.get(key, (result) => {
                resolve(result[key]);
            });
        });
    }
    async set(key, value) {
        return new Promise((resolve) => {
            this.area.set({ [key]: value }, () => {
                resolve();
            });
        });
    }
    async remove(key) {
        return new Promise((resolve) => {
            this.area.remove(key, () => {
                resolve();
            });
        });
    }
    async clear() {
        return new Promise((resolve) => {
            this.area.clear(() => {
                resolve();
            });
        });
    }
    async keys() {
        return new Promise((resolve) => {
            this.area.get(null, (result) => {
                resolve(Object.keys(result));
            });
        });
    }
    async has(key) {
        return new Promise((resolve) => {
            this.area.get(key, (result) => {
                resolve(key in result);
            });
        });
    }
    async size() {
        return new Promise((resolve) => {
            this.area.get(null, (result) => {
                resolve(Object.keys(result).length);
            });
        });
    }
}
exports.ChromeStorage = ChromeStorage;
class PrefixedStorage {
    constructor(storage, prefix) {
        this.storage = storage;
        this.prefix = prefix;
    }
    getKey(key) {
        return `${this.prefix}:${key}`;
    }
    async get(key) {
        return this.storage.get(this.getKey(key));
    }
    async set(key, value) {
        return this.storage.set(this.getKey(key), value);
    }
    async remove(key) {
        return this.storage.remove(this.getKey(key));
    }
    async clear() {
        const keys = await this.keys();
        await Promise.all(keys.map(key => this.remove(key)));
    }
    async keys() {
        const allKeys = await this.storage.keys();
        return allKeys
            .filter(key => key.startsWith(`${this.prefix}:`))
            .map(key => key.substring(this.prefix.length + 1));
    }
    async has(key) {
        return this.storage.has(this.getKey(key));
    }
    async size() {
        const keys = await this.keys();
        return keys.length;
    }
}
exports.PrefixedStorage = PrefixedStorage;
class EncryptedStorage {
    constructor(storage, encryptionKey) {
        this.storage = storage;
        this.encryptionKey = encryptionKey;
    }
    encrypt(value) {
        const jsonString = JSON.stringify(value);
        return Buffer.from(jsonString).toString('base64');
    }
    decrypt(encryptedValue) {
        try {
            const jsonString = Buffer.from(encryptedValue, 'base64').toString();
            return JSON.parse(jsonString);
        }
        catch {
            return undefined;
        }
    }
    async get(key) {
        const encryptedValue = await this.storage.get(key);
        return encryptedValue ? this.decrypt(encryptedValue) : undefined;
    }
    async set(key, value) {
        const encryptedValue = this.encrypt(value);
        return this.storage.set(key, encryptedValue);
    }
    async remove(key) {
        return this.storage.remove(key);
    }
    async clear() {
        return this.storage.clear();
    }
    async keys() {
        return this.storage.keys();
    }
    async has(key) {
        return this.storage.has(key);
    }
    async size() {
        return this.storage.size();
    }
}
exports.EncryptedStorage = EncryptedStorage;
class TTLStorage {
    constructor(storage, defaultTtl = 60000) {
        this.storage = storage;
        this.defaultTtl = defaultTtl;
    }
    getTtlKey(key) {
        return `${key}:ttl`;
    }
    async get(key) {
        const ttlKey = this.getTtlKey(key);
        const expiresAt = await this.storage.get(ttlKey);
        if (expiresAt && Date.now() > expiresAt) {
            await this.remove(key);
            return undefined;
        }
        return this.storage.get(key);
    }
    async set(key, value, ttl) {
        const ttlKey = this.getTtlKey(key);
        const expiresAt = Date.now() + (ttl || this.defaultTtl);
        await Promise.all([
            this.storage.set(key, value),
            this.storage.set(ttlKey, expiresAt)
        ]);
    }
    async remove(key) {
        const ttlKey = this.getTtlKey(key);
        await Promise.all([
            this.storage.remove(key),
            this.storage.remove(ttlKey)
        ]);
    }
    async clear() {
        return this.storage.clear();
    }
    async keys() {
        const allKeys = await this.storage.keys();
        return allKeys.filter(key => !key.endsWith(':ttl'));
    }
    async has(key) {
        const value = await this.get(key);
        return value !== undefined;
    }
    async size() {
        const keys = await this.keys();
        return keys.length;
    }
}
exports.TTLStorage = TTLStorage;
class StorageFactory {
    static createMemoryStorage() {
        return new MemoryStorage();
    }
    static createLocalStorage() {
        return new LocalStorage();
    }
    static createSessionStorage() {
        return new SessionStorage();
    }
    static createChromeStorage(area = 'local') {
        return new ChromeStorage(area);
    }
    static createPrefixedStorage(storage, prefix) {
        return new PrefixedStorage(storage, prefix);
    }
    static createEncryptedStorage(storage, encryptionKey) {
        return new EncryptedStorage(storage, encryptionKey);
    }
    static createTTLStorage(storage, defaultTtl) {
        return new TTLStorage(storage, defaultTtl);
    }
}
exports.StorageFactory = StorageFactory;
//# sourceMappingURL=storage.js.map