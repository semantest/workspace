// IndexedDB wrapper for offline storage
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema
interface SemantestDB extends DBSchema {
  tests: {
    key: string;
    value: {
      id: string;
      name: string;
      description: string;
      type: 'unit' | 'integration' | 'e2e' | 'performance';
      status: 'pending' | 'running' | 'passed' | 'failed';
      createdAt: Date;
      updatedAt: Date;
      syncStatus: 'synced' | 'pending' | 'error';
      lastSyncAttempt?: Date;
      syncError?: string;
    };
    indexes: { 'by-status': string; 'by-sync': string };
  };
  results: {
    key: string;
    value: {
      id: string;
      testId: string;
      status: 'passed' | 'failed' | 'skipped';
      duration: number;
      error?: string;
      timestamp: Date;
      syncStatus: 'synced' | 'pending' | 'error';
    };
    indexes: { 'by-test': string; 'by-sync': string };
  };
  projects: {
    key: string;
    value: {
      id: string;
      name: string;
      description: string;
      tests: string[];
      createdAt: Date;
      updatedAt: Date;
      syncStatus: 'synced' | 'pending' | 'error';
    };
    indexes: { 'by-name': string; 'by-sync': string };
  };
  syncQueue: {
    key: number;
    value: {
      id: number;
      type: 'create' | 'update' | 'delete';
      entity: 'test' | 'result' | 'project';
      entityId: string;
      data: any;
      timestamp: Date;
      attempts: number;
      lastAttempt?: Date;
      error?: string;
    };
    indexes: { 'by-entity': string; 'by-timestamp': Date };
  };
  cache: {
    key: string;
    value: {
      url: string;
      data: any;
      timestamp: Date;
      ttl: number;
    };
  };
}

class OfflineStorage {
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
          testStore.createIndex('by-sync', 'syncStatus');
        }

        // Results store
        if (!db.objectStoreNames.contains('results')) {
          const resultStore = db.createObjectStore('results', { keyPath: 'id' });
          resultStore.createIndex('by-test', 'testId');
          resultStore.createIndex('by-sync', 'syncStatus');
        }

        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('by-name', 'name');
          projectStore.createIndex('by-sync', 'syncStatus');
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          syncStore.createIndex('by-entity', 'entity');
          syncStore.createIndex('by-timestamp', 'timestamp');
        }

        // Cache store
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'url' });
        }
      },
    });
  }

  // Test operations
  async saveTest(test: SemantestDB['tests']['value']): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction('tests', 'readwrite');
    await tx.objectStore('tests').put(test);
    
    // Add to sync queue if offline
    if (!navigator.onLine) {
      await this.addToSyncQueue('create', 'test', test.id, test);
    }
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

  async getPendingSyncTests(): Promise<SemantestDB['tests']['value'][]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAllFromIndex('tests', 'by-sync', 'pending');
  }

  async markTestSynced(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const test = await this.getTest(id);
    if (test) {
      test.syncStatus = 'synced';
      await this.saveTest(test);
    }
  }

  // Result operations
  async saveResult(result: SemantestDB['results']['value']): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction('results', 'readwrite');
    await tx.objectStore('results').put(result);
    
    if (!navigator.onLine) {
      await this.addToSyncQueue('create', 'result', result.id, result);
    }
  }

  async getResultsByTest(testId: string): Promise<SemantestDB['results']['value'][]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAllFromIndex('results', 'by-test', testId);
  }

  async getPendingSyncResults(): Promise<SemantestDB['results']['value'][]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAllFromIndex('results', 'by-sync', 'pending');
  }

  // Project operations
  async saveProject(project: SemantestDB['projects']['value']): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction('projects', 'readwrite');
    await tx.objectStore('projects').put(project);
    
    if (!navigator.onLine) {
      await this.addToSyncQueue('create', 'project', project.id, project);
    }
  }

  async getAllProjects(): Promise<SemantestDB['projects']['value'][]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAll('projects');
  }

  // Sync queue operations
  async addToSyncQueue(
    type: 'create' | 'update' | 'delete',
    entity: 'test' | 'result' | 'project',
    entityId: string,
    data: any
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction('syncQueue', 'readwrite');
    await tx.objectStore('syncQueue').add({
      id: 0, // Will be auto-incremented
      type,
      entity,
      entityId,
      data,
      timestamp: new Date(),
      attempts: 0
    });
  }

  async getSyncQueue(): Promise<SemantestDB['syncQueue']['value'][]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAll('syncQueue');
  }

  async removeSyncQueueItem(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.delete('syncQueue', id);
  }

  async updateSyncQueueItem(item: SemantestDB['syncQueue']['value']): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('syncQueue', item);
  }

  // Cache operations
  async cacheData(url: string, data: any, ttlMinutes: number = 60): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction('cache', 'readwrite');
    await tx.objectStore('cache').put({
      url,
      data,
      timestamp: new Date(),
      ttl: ttlMinutes * 60 * 1000
    });
  }

  async getCachedData(url: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const cached = await this.db.get('cache', url);
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp.getTime();
    if (age > cached.ttl) {
      await this.db.delete('cache', url);
      return null;
    }
    
    return cached.data;
  }

  async clearCache(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction('cache', 'readwrite');
    await tx.objectStore('cache').clear();
  }

  // Sync operations
  async syncPendingData(): Promise<{
    synced: number;
    failed: number;
    errors: Array<{ entity: string; id: string; error: string }>;
  }> {
    if (!this.db) throw new Error('Database not initialized');
    
    const queue = await this.getSyncQueue();
    let synced = 0;
    let failed = 0;
    const errors: Array<{ entity: string; id: string; error: string }> = [];

    for (const item of queue) {
      try {
        // Attempt to sync
        const response = await fetch(`/api/${item.entity}s`, {
          method: item.type === 'delete' ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data)
        });

        if (response.ok) {
          // Remove from queue
          await this.removeSyncQueueItem(item.id);
          
          // Update entity sync status
          switch (item.entity) {
            case 'test':
              await this.markTestSynced(item.entityId);
              break;
            case 'result':
              const result = await this.db.get('results', item.entityId);
              if (result) {
                result.syncStatus = 'synced';
                await this.db.put('results', result);
              }
              break;
            case 'project':
              const project = await this.db.get('projects', item.entityId);
              if (project) {
                project.syncStatus = 'synced';
                await this.db.put('projects', project);
              }
              break;
          }
          
          synced++;
        } else {
          throw new Error(`Server returned ${response.status}`);
        }
      } catch (error) {
        failed++;
        errors.push({
          entity: item.entity,
          id: item.entityId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Update sync queue item with error
        item.attempts++;
        item.lastAttempt = new Date();
        item.error = error instanceof Error ? error.message : 'Unknown error';
        await this.updateSyncQueueItem(item);
      }
    }

    return { synced, failed, errors };
  }

  // Conflict resolution
  async resolveConflicts(
    localData: any,
    serverData: any,
    strategy: 'local-wins' | 'server-wins' | 'merge' = 'server-wins'
  ): Promise<any> {
    switch (strategy) {
      case 'local-wins':
        return localData;
      
      case 'server-wins':
        return serverData;
      
      case 'merge':
        // Custom merge logic based on timestamps
        const localTime = new Date(localData.updatedAt).getTime();
        const serverTime = new Date(serverData.updatedAt).getTime();
        
        if (localTime > serverTime) {
          return { ...serverData, ...localData };
        } else {
          return { ...localData, ...serverData };
        }
      
      default:
        return serverData;
    }
  }

  // Storage info
  async getStorageInfo(): Promise<{
    usage: number;
    quota: number;
    percentUsed: number;
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
      
      return { usage, quota, percentUsed };
    }
    
    return { usage: 0, quota: 0, percentUsed: 0 };
  }

  // Clear all data
  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const stores: Array<keyof SemantestDB> = ['tests', 'results', 'projects', 'syncQueue', 'cache'];
    
    for (const store of stores) {
      const tx = this.db.transaction(store, 'readwrite');
      await tx.objectStore(store).clear();
    }
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorage();

// React hook for offline storage
export function useOfflineStorage() {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    offlineStorage.initialize()
      .then(() => setIsInitialized(true))
      .catch(err => setError(err));
  }, []);

  return {
    storage: offlineStorage,
    isInitialized,
    error
  };
}