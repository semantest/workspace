import { getOfflineDB } from './offline-db';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  errors: string[];
}

export interface ConflictResolution {
  strategy: 'local-first' | 'remote-first' | 'merge' | 'manual';
  resolver?: (local: any, remote: any) => any;
}

export class SyncService {
  private syncInProgress = false;
  private syncInterval: number | null = null;
  private readonly API_BASE_URL = process.env.VITE_API_URL || '/api';

  async startPeriodicSync(intervalMs: number = 30000): void {
    if (this.syncInterval) {
      this.stopPeriodicSync();
    }

    // Initial sync
    await this.syncAll();

    // Set up periodic sync
    this.syncInterval = window.setInterval(() => {
      this.syncAll().catch(console.error);
    }, intervalMs);

    // Sync on online event
    window.addEventListener('online', () => {
      this.syncAll().catch(console.error);
    });
  }

  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncAll(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: 0,
        errors: ['Sync already in progress'],
      };
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: 0,
      errors: [],
    };

    try {
      // Process offline queue first
      await this.processOfflineQueue(result);

      // Sync each entity type
      await this.syncTests(result);
      await this.syncProjects(result);
      await this.syncResults(result);

      // Request background sync if available
      if ('serviceWorker' in navigator && 'sync' in (await navigator.serviceWorker.ready)) {
        await (navigator.serviceWorker.ready as any).sync.register('sync-tests');
      }
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  private async processOfflineQueue(result: SyncResult): Promise<void> {
    const db = await getOfflineDB();
    const queueItems = await db.getQueueItems();

    for (const item of queueItems) {
      try {
        const response = await this.sendQueueItem(item);
        
        if (response.ok) {
          await db.removeFromQueue(item.id);
          result.synced++;
        } else if (response.status === 409) {
          // Conflict
          result.conflicts++;
          await this.handleConflict(item);
        } else {
          // Other error
          item.attempts++;
          item.lastAttemptAt = new Date();
          await db.updateQueueItem(item);
          result.failed++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to sync ${item.entity} ${item.entityId}`);
      }
    }
  }

  private async sendQueueItem(item: any): Promise<Response> {
    const endpoint = `${this.API_BASE_URL}/${item.entity}s`;
    const method = item.type === 'create' ? 'POST' : 
                   item.type === 'update' ? 'PUT' : 'DELETE';
    
    const url = item.type === 'create' ? endpoint : `${endpoint}/${item.entityId}`;

    return fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Mode': 'offline-queue',
      },
      body: JSON.stringify(item.data),
    });
  }

  private async syncTests(result: SyncResult): Promise<void> {
    const db = await getOfflineDB();
    const pendingTests = await db.getPendingSyncItems('tests');

    for (const test of pendingTests) {
      try {
        const response = await fetch(`${this.API_BASE_URL}/tests/${test.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Sync-Mode': 'bidirectional',
          },
          body: JSON.stringify(test),
        });

        if (response.ok) {
          await db.markAsSynced('tests', test.id);
          result.synced++;
        } else if (response.status === 409) {
          const remoteTest = await response.json();
          await this.resolveTestConflict(test, remoteTest);
          result.conflicts++;
        } else {
          result.failed++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to sync test ${test.id}`);
      }
    }
  }

  private async syncProjects(result: SyncResult): Promise<void> {
    const db = await getOfflineDB();
    const pendingProjects = await db.getPendingSyncItems('projects');

    for (const project of pendingProjects) {
      try {
        const response = await fetch(`${this.API_BASE_URL}/projects/${project.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Sync-Mode': 'bidirectional',
          },
          body: JSON.stringify(project),
        });

        if (response.ok) {
          await db.markAsSynced('projects', project.id);
          result.synced++;
        } else if (response.status === 409) {
          result.conflicts++;
        } else {
          result.failed++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to sync project ${project.id}`);
      }
    }
  }

  private async syncResults(result: SyncResult): Promise<void> {
    const db = await getOfflineDB();
    const pendingResults = await db.getPendingSyncItems('results');

    for (const testResult of pendingResults) {
      try {
        const response = await fetch(`${this.API_BASE_URL}/results/${testResult.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Sync-Mode': 'bidirectional',
          },
          body: JSON.stringify(testResult),
        });

        if (response.ok) {
          await db.markAsSynced('results', testResult.id);
          result.synced++;
        } else {
          result.failed++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to sync result ${testResult.id}`);
      }
    }
  }

  private async handleConflict(item: any): Promise<void> {
    // Store conflict for manual resolution
    const db = await getOfflineDB();
    const conflictItem = {
      ...item,
      syncStatus: 'conflict' as const,
      conflictDetectedAt: new Date(),
    };
    await db.updateQueueItem(conflictItem);
  }

  private async resolveTestConflict(
    localTest: any,
    remoteTest: any,
    resolution: ConflictResolution = { strategy: 'remote-first' }
  ): Promise<void> {
    const db = await getOfflineDB();
    
    let resolvedTest: any;
    
    switch (resolution.strategy) {
      case 'local-first':
        resolvedTest = { ...remoteTest, ...localTest };
        break;
      case 'remote-first':
        resolvedTest = { ...localTest, ...remoteTest };
        break;
      case 'merge':
        resolvedTest = this.mergeTests(localTest, remoteTest);
        break;
      case 'manual':
        if (resolution.resolver) {
          resolvedTest = resolution.resolver(localTest, remoteTest);
        } else {
          throw new Error('Manual resolution requires a resolver function');
        }
        break;
    }

    resolvedTest.syncStatus = 'synced';
    resolvedTest.lastSyncAt = new Date();
    await db.saveTest(resolvedTest);
  }

  private mergeTests(local: any, remote: any): any {
    // Simple merge strategy - can be customized
    return {
      ...remote,
      ...local,
      updatedAt: new Date(Math.max(
        new Date(local.updatedAt).getTime(),
        new Date(remote.updatedAt).getTime()
      )),
      metadata: {
        ...remote.metadata,
        ...local.metadata,
      },
    };
  }

  // Network state monitoring
  isOnline(): boolean {
    return navigator.onLine;
  }

  async waitForConnection(): Promise<void> {
    if (this.isOnline()) return;

    return new Promise((resolve) => {
      const handler = () => {
        window.removeEventListener('online', handler);
        resolve();
      };
      window.addEventListener('online', handler);
    });
  }
}

// Singleton instance
let syncServiceInstance: SyncService | null = null;

export function getSyncService(): SyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService();
  }
  return syncServiceInstance;
}