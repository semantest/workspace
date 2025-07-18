import { openDB, IDBPDatabase, DBSchema } from 'idb';
import { Platform } from 'react-native';

// Cross-platform storage abstraction
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

// Web storage adapter using IndexedDB
export class WebStorageAdapter implements StorageAdapter {
  private dbPromise: Promise<IDBPDatabase<StorageDB>>;

  constructor() {
    this.dbPromise = openDB<StorageDB>('semantest-storage', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('keyvalue')) {
          db.createObjectStore('keyvalue');
        }
      },
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const db = await this.dbPromise;
    const value = await db.get('keyvalue', key);
    return value || null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const db = await this.dbPromise;
    await db.put('keyvalue', value, key);
  }

  async remove(key: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('keyvalue', key);
  }

  async clear(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear('keyvalue');
  }

  async getAllKeys(): Promise<string[]> {
    const db = await this.dbPromise;
    return db.getAllKeys('keyvalue') as Promise<string[]>;
  }
}

// Mobile storage adapter using SQLite
export class MobileStorageAdapter implements StorageAdapter {
  private db: any; // SQLite instance

  constructor() {
    // Initialize SQLite for React Native
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    // Platform-specific SQLite initialization
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // Use react-native-sqlite-storage or similar
      // this.db = await SQLite.openDatabase({ name: 'semantest.db' });
      // await this.createTables();
    }
  }

  private async createTables(): Promise<void> {
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS storage (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        type TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }

  async get<T>(key: string): Promise<T | null> {
    const [results] = await this.db.executeSql(
      'SELECT value, type FROM storage WHERE key = ?',
      [key]
    );

    if (results.rows.length === 0) return null;

    const { value, type } = results.rows.item(0);
    return this.deserialize(value, type);
  }

  async set<T>(key: string, value: T): Promise<void> {
    const { serialized, type } = this.serialize(value);
    await this.db.executeSql(
      `INSERT OR REPLACE INTO storage (key, value, type, updated_at) 
       VALUES (?, ?, ?, ?)`,
      [key, serialized, type, Date.now()]
    );
  }

  async remove(key: string): Promise<void> {
    await this.db.executeSql('DELETE FROM storage WHERE key = ?', [key]);
  }

  async clear(): Promise<void> {
    await this.db.executeSql('DELETE FROM storage');
  }

  async getAllKeys(): Promise<string[]> {
    const [results] = await this.db.executeSql('SELECT key FROM storage');
    const keys: string[] = [];
    
    for (let i = 0; i < results.rows.length; i++) {
      keys.push(results.rows.item(i).key);
    }
    
    return keys;
  }

  private serialize(value: any): { serialized: string; type: string } {
    const type = typeof value;
    
    if (type === 'object' || type === 'array') {
      return { serialized: JSON.stringify(value), type: 'json' };
    }
    
    return { serialized: String(value), type };
  }

  private deserialize(value: string, type: string): any {
    switch (type) {
      case 'json':
        return JSON.parse(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true';
      default:
        return value;
    }
  }
}

// Unified data persistence layer
export class DataPersistence {
  private storage: StorageAdapter;
  private memoryCache: Map<string, { value: any; expires: number }> = new Map();
  private compressionThreshold = 1024; // 1KB

  constructor() {
    // Select appropriate storage adapter
    this.storage = this.createStorageAdapter();
  }

  private createStorageAdapter(): StorageAdapter {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      return new WebStorageAdapter();
    } else if (typeof Platform !== 'undefined') {
      return new MobileStorageAdapter();
    } else {
      // Fallback to memory storage
      return new MemoryStorageAdapter();
    }
  }

  // Core persistence methods
  async save<T>(
    key: string,
    data: T,
    options?: PersistenceOptions
  ): Promise<void> {
    // Apply compression if needed
    const compressed = await this.maybeCompress(data, options);
    
    // Save to persistent storage
    await this.storage.set(key, {
      data: compressed.data,
      compressed: compressed.compressed,
      metadata: {
        created: Date.now(),
        ttl: options?.ttl,
        version: options?.version || 1,
        encrypted: options?.encrypt || false,
      },
    });

    // Update memory cache
    if (options?.cache !== false) {
      const expires = options?.ttl 
        ? Date.now() + options.ttl 
        : Number.MAX_SAFE_INTEGER;
      
      this.memoryCache.set(key, { value: data, expires });
    }
  }

  async load<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const cached = this.memoryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    // Load from persistent storage
    const stored = await this.storage.get<StoredData>(key);
    if (!stored) return null;

    // Check TTL
    if (stored.metadata.ttl) {
      const expires = stored.metadata.created + stored.metadata.ttl;
      if (expires < Date.now()) {
        await this.remove(key);
        return null;
      }
    }

    // Decompress if needed
    const data = stored.compressed 
      ? await this.decompress(stored.data)
      : stored.data;

    // Update cache
    this.memoryCache.set(key, {
      value: data,
      expires: stored.metadata.ttl 
        ? stored.metadata.created + stored.metadata.ttl
        : Number.MAX_SAFE_INTEGER,
    });

    return data;
  }

  async remove(key: string): Promise<void> {
    await this.storage.remove(key);
    this.memoryCache.delete(key);
  }

  async clear(): Promise<void> {
    await this.storage.clear();
    this.memoryCache.clear();
  }

  // Batch operations
  async saveBatch(items: Array<{ key: string; data: any; options?: PersistenceOptions }>): Promise<void> {
    await Promise.all(
      items.map(item => this.save(item.key, item.data, item.options))
    );
  }

  async loadBatch<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    
    await Promise.all(
      keys.map(async key => {
        const data = await this.load<T>(key);
        if (data !== null) {
          results.set(key, data);
        }
      })
    );
    
    return results;
  }

  // Query operations
  async query<T>(predicate: (key: string, metadata: any) => boolean): Promise<T[]> {
    const keys = await this.storage.getAllKeys();
    const results: T[] = [];

    for (const key of keys) {
      const stored = await this.storage.get<StoredData>(key);
      if (stored && predicate(key, stored.metadata)) {
        const data = await this.load<T>(key);
        if (data !== null) {
          results.push(data);
        }
      }
    }

    return results;
  }

  // Compression helpers
  private async maybeCompress(
    data: any,
    options?: PersistenceOptions
  ): Promise<{ data: any; compressed: boolean }> {
    if (options?.compress === false) {
      return { data, compressed: false };
    }

    const serialized = JSON.stringify(data);
    if (serialized.length < this.compressionThreshold) {
      return { data, compressed: false };
    }

    // Use compression API if available
    if ('CompressionStream' in window) {
      const compressed = await this.compressData(serialized);
      return { data: compressed, compressed: true };
    }

    return { data, compressed: false };
  }

  private async compressData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const stream = new Response(encoder.encode(data)).body!
      .pipeThrough(new (window as any).CompressionStream('gzip'));
    
    const compressed = await new Response(stream).arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(compressed)));
  }

  private async decompress(data: string): Promise<any> {
    const compressed = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const stream = new Response(compressed).body!
      .pipeThrough(new (window as any).DecompressionStream('gzip'));
    
    const decompressed = await new Response(stream).text();
    return JSON.parse(decompressed);
  }

  // Export/Import functionality
  async exportData(): Promise<string> {
    const keys = await this.storage.getAllKeys();
    const data: Record<string, any> = {};

    for (const key of keys) {
      const value = await this.storage.get(key);
      if (value !== null) {
        data[key] = value;
      }
    }

    return JSON.stringify(data);
  }

  async importData(exportedData: string): Promise<void> {
    const data = JSON.parse(exportedData);
    
    for (const [key, value] of Object.entries(data)) {
      await this.storage.set(key, value);
    }
  }

  // Maintenance
  async cleanup(): Promise<number> {
    const keys = await this.storage.getAllKeys();
    let cleaned = 0;

    for (const key of keys) {
      const stored = await this.storage.get<StoredData>(key);
      
      if (stored?.metadata.ttl) {
        const expires = stored.metadata.created + stored.metadata.ttl;
        if (expires < Date.now()) {
          await this.remove(key);
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  // Storage info
  async getStorageInfo(): Promise<StorageInfo> {
    const keys = await this.storage.getAllKeys();
    let totalSize = 0;

    if ('estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      totalSize = estimate.usage || 0;
    }

    return {
      keyCount: keys.length,
      estimatedSize: totalSize,
      cacheSize: this.memoryCache.size,
    };
  }
}

// Type definitions
interface StorageDB extends DBSchema {
  keyvalue: {
    key: string;
    value: any;
  };
}

interface StoredData {
  data: any;
  compressed: boolean;
  metadata: {
    created: number;
    ttl?: number;
    version: number;
    encrypted: boolean;
  };
}

interface PersistenceOptions {
  ttl?: number; // Time to live in milliseconds
  compress?: boolean;
  encrypt?: boolean;
  cache?: boolean;
  version?: number;
}

interface StorageInfo {
  keyCount: number;
  estimatedSize: number;
  cacheSize: number;
}

// Memory storage adapter for testing
class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, any>();

  async get<T>(key: string): Promise<T | null> {
    return this.store.get(key) || null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}

// Export singleton instance
export const dataPersistence = new DataPersistence();