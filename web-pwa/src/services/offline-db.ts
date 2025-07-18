import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SemantestDB extends DBSchema {
  tests: {
    key: string;
    value: {
      id: string;
      name: string;
      description?: string;
      status: 'pending' | 'running' | 'completed' | 'failed';
      createdAt: Date;
      updatedAt: Date;
      syncStatus: 'synced' | 'pending' | 'conflict';
      lastSyncAt?: Date;
      results?: any;
      metadata?: Record<string, any>;
    };
    indexes: { 
      'by-status': string;
      'by-sync-status': string;
      'by-created': Date;
    };
  };
  projects: {
    key: string;
    value: {
      id: string;
      name: string;
      description?: string;
      tests: string[];
      createdAt: Date;
      updatedAt: Date;
      syncStatus: 'synced' | 'pending' | 'conflict';
    };
    indexes: { 
      'by-name': string;
      'by-created': Date;
    };
  };
  results: {
    key: string;
    value: {
      id: string;
      testId: string;
      executionTime: number;
      status: 'passed' | 'failed' | 'skipped';
      output: any;
      createdAt: Date;
      syncStatus: 'synced' | 'pending' | 'conflict';
    };
    indexes: { 
      'by-test': string;
      'by-status': string;
    };
  };
  offline_queue: {
    key: string;
    value: {
      id: string;
      type: 'create' | 'update' | 'delete';
      entity: 'test' | 'project' | 'result';
      entityId: string;
      data: any;
      attempts: number;
      createdAt: Date;
      lastAttemptAt?: Date;
    };
    indexes: { 
      'by-entity': string;
      'by-created': Date;
    };
  };
}

export class OfflineDatabase {
  private db: IDBPDatabase<SemantestDB> | null = null;
  private readonly DB_NAME = 'semantest-offline';
  private readonly DB_VERSION = 1;

  async initialize(): Promise<void> {
    this.db = await openDB<SemantestDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Tests store
        if (!db.objectStoreNames.contains('tests')) {
          const testStore = db.createObjectStore('tests', { keyPath: 'id' });
          testStore.createIndex('by-status', 'status');
          testStore.createIndex('by-sync-status', 'syncStatus');
          testStore.createIndex('by-created', 'createdAt');
        }

        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('by-name', 'name');
          projectStore.createIndex('by-created', 'createdAt');
        }

        // Results store
        if (!db.objectStoreNames.contains('results')) {
          const resultStore = db.createObjectStore('results', { keyPath: 'id' });
          resultStore.createIndex('by-test', 'testId');
          resultStore.createIndex('by-status', 'status');
        }

        // Offline queue store
        if (!db.objectStoreNames.contains('offline_queue')) {
          const queueStore = db.createObjectStore('offline_queue', { keyPath: 'id' });
          queueStore.createIndex('by-entity', 'entity');
          queueStore.createIndex('by-created', 'createdAt');
        }
      },
    });
  }

  // Test operations
  async saveTest(test: SemantestDB['tests']['value']): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('tests', test);
  }

  async getTest(id: string): Promise<SemantestDB['tests']['value'] | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.get('tests', id);
  }

  async getAllTests(): Promise<SemantestDB['tests']['value'][]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAll('tests');
  }

  async getTestsByStatus(status: string): Promise<SemantestDB['tests']['value'][]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAllFromIndex('tests', 'by-status', status);
  }

  async deleteTest(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.delete('tests', id);
  }

  // Project operations
  async saveProject(project: SemantestDB['projects']['value']): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('projects', project);
  }

  async getProject(id: string): Promise<SemantestDB['projects']['value'] | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.get('projects', id);
  }

  async getAllProjects(): Promise<SemantestDB['projects']['value'][]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAll('projects');
  }

  // Result operations
  async saveResult(result: SemantestDB['results']['value']): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('results', result);
  }

  async getResultsByTest(testId: string): Promise<SemantestDB['results']['value'][]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAllFromIndex('results', 'by-test', testId);
  }

  // Offline queue operations
  async addToQueue(item: Omit<SemantestDB['offline_queue']['value'], 'id'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const id = crypto.randomUUID();
    await this.db.put('offline_queue', { ...item, id });
  }

  async getQueueItems(): Promise<SemantestDB['offline_queue']['value'][]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAll('offline_queue');
  }

  async removeFromQueue(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.delete('offline_queue', id);
  }

  async updateQueueItem(item: SemantestDB['offline_queue']['value']): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('offline_queue', item);
  }

  // Sync operations
  async getPendingSyncItems<T extends keyof SemantestDB>(
    storeName: T
  ): Promise<SemantestDB[T]['value'][]> {
    if (!this.db) throw new Error('Database not initialized');
    if (storeName === 'tests' || storeName === 'projects' || storeName === 'results') {
      return this.db.getAllFromIndex(storeName, 'by-sync-status' as any, 'pending') as any;
    }
    return [];
  }

  async markAsSynced<T extends keyof SemantestDB>(
    storeName: T,
    id: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const item = await this.db.get(storeName, id as any);
    if (item && 'syncStatus' in item) {
      (item as any).syncStatus = 'synced';
      (item as any).lastSyncAt = new Date();
      await this.db.put(storeName, item as any);
    }
  }

  // Utility methods
  async clear(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stores: (keyof SemantestDB)[] = ['tests', 'projects', 'results', 'offline_queue'];
    await Promise.all(stores.map(store => this.db!.clear(store)));
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
let dbInstance: OfflineDatabase | null = null;

export async function getOfflineDB(): Promise<OfflineDatabase> {
  if (!dbInstance) {
    dbInstance = new OfflineDatabase();
    await dbInstance.initialize();
  }
  return dbInstance;
}