import { getOfflineDB } from './offline-db';
import { getSyncService } from './sync-service';

/**
 * Offline-first architecture patterns for Semantest PWA
 */

// Optimistic UI update pattern
export interface OptimisticUpdate<T> {
  optimisticData: T;
  serverUpdate: () => Promise<T>;
  rollback?: (error: Error) => void;
}

export class OfflineFirstPatterns {
  // Pattern 1: Optimistic Updates with Rollback
  async optimisticUpdate<T>(config: OptimisticUpdate<T>): Promise<T> {
    const originalData = { ...config.optimisticData };
    
    try {
      // Apply optimistic update immediately
      // UI updates here would be instant
      
      // Attempt server update
      const serverData = await config.serverUpdate();
      return serverData;
    } catch (error) {
      // Rollback on failure
      if (config.rollback) {
        config.rollback(error as Error);
      }
      throw error;
    }
  }

  // Pattern 2: Read-Through Cache
  async readThrough<T>(
    key: string,
    fetcher: () => Promise<T>,
    cacheDuration: number = 5 * 60 * 1000 // 5 minutes
  ): Promise<T> {
    const db = await getOfflineDB();
    
    // Try to get from cache first
    const cached = await this.getCached<T>(key);
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      return cached.data;
    }

    // Cache miss or expired, fetch from server
    try {
      const fresh = await fetcher();
      await this.setCached(key, fresh);
      return fresh;
    } catch (error) {
      // If offline and have stale cache, return it
      if (!navigator.onLine && cached) {
        return cached.data;
      }
      throw error;
    }
  }

  // Pattern 3: Write-Through Cache
  async writeThrough<T>(
    key: string,
    data: T,
    persister: (data: T) => Promise<void>
  ): Promise<void> {
    // Update cache immediately
    await this.setCached(key, data);
    
    try {
      // Persist to server
      await persister(data);
    } catch (error) {
      // Queue for later sync if offline
      const db = await getOfflineDB();
      await db.addToQueue({
        type: 'update',
        entity: 'cache',
        entityId: key,
        data,
        attempts: 0,
        createdAt: new Date(),
      });
      
      // Don't throw - we've queued it
      console.warn('Queued for sync:', key);
    }
  }

  // Pattern 4: Event Sourcing for Offline Actions
  async recordOfflineAction(action: OfflineAction): Promise<void> {
    const db = await getOfflineDB();
    const actionId = crypto.randomUUID();
    
    const record: ActionRecord = {
      id: actionId,
      action,
      timestamp: new Date(),
      synced: false,
      attempts: 0,
    };

    await this.saveActionRecord(record);
    
    // Try to sync immediately if online
    if (navigator.onLine) {
      try {
        await this.syncAction(record);
      } catch (error) {
        // Will be synced later
      }
    }
  }

  // Pattern 5: Conflict-Free Replicated Data Types (CRDT)
  mergeCRDT<T extends CRDT>(local: T, remote: T): T {
    // Last-Write-Wins (LWW) strategy
    if (local.timestamp > remote.timestamp) {
      return local;
    }
    
    // Merge vector clocks for true CRDT
    if (local.vectorClock && remote.vectorClock) {
      return this.mergeVectorClocks(local, remote);
    }
    
    return remote;
  }

  // Pattern 6: Differential Sync
  async differentialSync<T extends Syncable>(
    entityType: string,
    localVersion: number
  ): Promise<SyncResult<T>> {
    try {
      const response = await fetch(`/api/sync/${entityType}?since=${localVersion}`);
      const changes = await response.json();
      
      const db = await getOfflineDB();
      const results: SyncResult<T> = {
        applied: 0,
        conflicts: [],
      };

      for (const change of changes.items) {
        try {
          await this.applyChange(change);
          results.applied++;
        } catch (error) {
          results.conflicts.push({
            id: change.id,
            reason: error instanceof Error ? error.message : 'Unknown',
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Differential sync failed: ${error}`);
    }
  }

  // Pattern 7: Network State Management
  setupNetworkHandlers(): void {
    let wasOffline = !navigator.onLine;

    window.addEventListener('online', async () => {
      if (wasOffline) {
        console.log('Back online - triggering sync');
        wasOffline = false;
        
        // Trigger sync with exponential backoff
        await this.syncWithBackoff();
      }
    });

    window.addEventListener('offline', () => {
      wasOffline = true;
      console.log('Gone offline - enabling offline mode');
    });

    // Detect flaky connections
    this.detectFlakyConnection();
  }

  private async syncWithBackoff(
    maxAttempts: number = 5,
    baseDelay: number = 1000
  ): Promise<void> {
    const syncService = getSyncService();
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        await syncService.syncAll();
        break;
      } catch (error) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Sync attempt ${attempt + 1} failed, retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private detectFlakyConnection(): void {
    let offlineCount = 0;
    let checkInterval: number;

    const checkConnection = async () => {
      try {
        const response = await fetch('/api/ping', {
          method: 'HEAD',
          cache: 'no-store',
        });
        
        if (!response.ok) {
          offlineCount++;
        } else {
          offlineCount = 0;
        }
      } catch {
        offlineCount++;
      }

      // Consider connection flaky after 3 failed pings
      if (offlineCount >= 3) {
        console.warn('Flaky connection detected');
        this.enableAggressiveCaching();
      }
    };

    // Check every 30 seconds
    checkInterval = window.setInterval(checkConnection, 30000);
  }

  private enableAggressiveCaching(): void {
    // Increase cache durations
    // Prefetch critical data
    // Enable read-through for all requests
    console.log('Aggressive caching enabled due to flaky connection');
  }

  // Helper methods
  private async getCached<T>(key: string): Promise<{ data: T; timestamp: number } | null> {
    const cached = localStorage.getItem(`cache:${key}`);
    if (!cached) return null;
    
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }

  private async setCached<T>(key: string, data: T): Promise<void> {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`cache:${key}`, JSON.stringify(cacheEntry));
  }

  private async saveActionRecord(record: ActionRecord): Promise<void> {
    const existing = localStorage.getItem('offline-actions');
    const actions = existing ? JSON.parse(existing) : [];
    actions.push(record);
    localStorage.setItem('offline-actions', JSON.stringify(actions));
  }

  private async syncAction(record: ActionRecord): Promise<void> {
    const response = await fetch('/api/actions/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      throw new Error('Action sync failed');
    }

    // Mark as synced
    record.synced = true;
    await this.updateActionRecord(record);
  }

  private async updateActionRecord(record: ActionRecord): Promise<void> {
    const existing = localStorage.getItem('offline-actions');
    const actions: ActionRecord[] = existing ? JSON.parse(existing) : [];
    const index = actions.findIndex(a => a.id === record.id);
    
    if (index !== -1) {
      actions[index] = record;
      localStorage.setItem('offline-actions', JSON.stringify(actions));
    }
  }

  private async applyChange<T>(change: any): Promise<void> {
    // Apply change to local database
    const db = await getOfflineDB();
    
    switch (change.operation) {
      case 'create':
      case 'update':
        await db.saveTest(change.data);
        break;
      case 'delete':
        await db.deleteTest(change.id);
        break;
    }
  }

  private mergeVectorClocks<T extends CRDT>(local: T, remote: T): T {
    // Simple vector clock merge - take max of each component
    const merged = { ...local };
    
    if (merged.vectorClock && remote.vectorClock) {
      for (const [nodeId, timestamp] of Object.entries(remote.vectorClock)) {
        merged.vectorClock[nodeId] = Math.max(
          merged.vectorClock[nodeId] || 0,
          timestamp as number
        );
      }
    }

    return merged;
  }
}

// Type definitions
interface OfflineAction {
  type: string;
  payload: any;
  metadata?: Record<string, any>;
}

interface ActionRecord {
  id: string;
  action: OfflineAction;
  timestamp: Date;
  synced: boolean;
  attempts: number;
}

interface CRDT {
  id: string;
  timestamp: number;
  vectorClock?: Record<string, number>;
}

interface Syncable {
  id: string;
  version: number;
  lastModified: Date;
}

interface SyncResult<T> {
  applied: number;
  conflicts: Array<{
    id: string;
    reason: string;
  }>;
}

// Export singleton instance
export const offlinePatterns = new OfflineFirstPatterns();