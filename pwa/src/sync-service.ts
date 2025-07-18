// Background sync service for offline-first architecture
import { offlineStorage } from './offline-storage';

export interface SyncOptions {
  interval?: number; // Sync interval in milliseconds
  retryDelay?: number; // Delay between retry attempts
  maxRetries?: number; // Maximum retry attempts
  conflictStrategy?: 'local-wins' | 'server-wins' | 'merge';
}

export class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private listeners: Set<(event: SyncEvent) => void> = new Set();
  private options: Required<SyncOptions>;

  constructor(options: SyncOptions = {}) {
    this.options = {
      interval: options.interval || 30000, // 30 seconds
      retryDelay: options.retryDelay || 5000, // 5 seconds
      maxRetries: options.maxRetries || 3,
      conflictStrategy: options.conflictStrategy || 'server-wins'
    };

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Register service worker sync
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      this.registerBackgroundSync();
    }
  }

  // Start periodic sync
  start(): void {
    if (this.syncInterval) return;

    // Initial sync if online
    if (navigator.onLine) {
      this.sync();
    }

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.sync();
      }
    }, this.options.interval);
  }

  // Stop periodic sync
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Manual sync trigger
  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress');
      return { success: false, message: 'Sync already in progress' };
    }

    if (!navigator.onLine) {
      console.log('[SyncService] Cannot sync while offline');
      return { success: false, message: 'Device is offline' };
    }

    this.isSyncing = true;
    this.emit({ type: 'sync-start', timestamp: new Date() });

    try {
      // Sync each entity type
      const results = await Promise.all([
        this.syncTests(),
        this.syncResults(),
        this.syncProjects()
      ]);

      // Process sync queue
      const queueResult = await offlineStorage.syncPendingData();

      const totalSynced = results.reduce((sum, r) => sum + r.synced, 0) + queueResult.synced;
      const totalFailed = results.reduce((sum, r) => sum + r.failed, 0) + queueResult.failed;

      this.emit({
        type: 'sync-complete',
        timestamp: new Date(),
        data: { synced: totalSynced, failed: totalFailed }
      });

      return {
        success: true,
        message: `Synced ${totalSynced} items`,
        synced: totalSynced,
        failed: totalFailed
      };
    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
      
      this.emit({
        type: 'sync-error',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed'
      };
    } finally {
      this.isSyncing = false;
    }
  }

  // Sync tests
  private async syncTests(): Promise<{ synced: number; failed: number }> {
    const pendingTests = await offlineStorage.getPendingSyncTests();
    let synced = 0;
    let failed = 0;

    for (const test of pendingTests) {
      try {
        const response = await fetch(`/api/tests/${test.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(test)
        });

        if (response.ok) {
          // Check for conflicts
          if (response.status === 409) {
            const serverData = await response.json();
            const resolved = await offlineStorage.resolveConflicts(
              test,
              serverData,
              this.options.conflictStrategy
            );
            
            // Retry with resolved data
            const retryResponse = await fetch(`/api/tests/${test.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(resolved)
            });

            if (retryResponse.ok) {
              await offlineStorage.markTestSynced(test.id);
              synced++;
            } else {
              failed++;
            }
          } else {
            await offlineStorage.markTestSynced(test.id);
            synced++;
          }
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`[SyncService] Failed to sync test ${test.id}:`, error);
        failed++;
      }
    }

    return { synced, failed };
  }

  // Sync results
  private async syncResults(): Promise<{ synced: number; failed: number }> {
    const pendingResults = await offlineStorage.getPendingSyncResults();
    let synced = 0;
    let failed = 0;

    for (const result of pendingResults) {
      try {
        const response = await fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result)
        });

        if (response.ok) {
          // Update sync status
          result.syncStatus = 'synced';
          await offlineStorage.saveResult(result);
          synced++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`[SyncService] Failed to sync result ${result.id}:`, error);
        failed++;
      }
    }

    return { synced, failed };
  }

  // Sync projects
  private async syncProjects(): Promise<{ synced: number; failed: number }> {
    const projects = await offlineStorage.getAllProjects();
    const pendingProjects = projects.filter(p => p.syncStatus === 'pending');
    let synced = 0;
    let failed = 0;

    for (const project of pendingProjects) {
      try {
        const response = await fetch(`/api/projects/${project.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(project)
        });

        if (response.ok) {
          project.syncStatus = 'synced';
          await offlineStorage.saveProject(project);
          synced++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`[SyncService] Failed to sync project ${project.id}:`, error);
        failed++;
      }
    }

    return { synced, failed };
  }

  // Register background sync
  private async registerBackgroundSync(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('sync' in registration) {
        await (registration as any).sync.register('sync-data');
        console.log('[SyncService] Background sync registered');
      }
    } catch (error) {
      console.error('[SyncService] Failed to register background sync:', error);
    }
  }

  // Handle online event
  private handleOnline = (): void => {
    console.log('[SyncService] Device is online, triggering sync');
    this.sync();
  };

  // Handle offline event
  private handleOffline = (): void => {
    console.log('[SyncService] Device is offline');
    this.emit({ type: 'offline', timestamp: new Date() });
  };

  // Event emitter
  on(listener: (event: SyncEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SyncEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  // Cleanup
  destroy(): void {
    this.stop();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners.clear();
  }
}

// Types
export interface SyncResult {
  success: boolean;
  message: string;
  synced?: number;
  failed?: number;
}

export interface SyncEvent {
  type: 'sync-start' | 'sync-complete' | 'sync-error' | 'offline';
  timestamp: Date;
  data?: any;
  error?: string;
}

// React hook for sync service
export function useSyncService(options?: SyncOptions) {
  const [syncService] = React.useState(() => new SyncService(options));
  const [syncStatus, setSyncStatus] = React.useState<'idle' | 'syncing' | 'error'>('idle');
  const [lastSync, setLastSync] = React.useState<Date | null>(null);

  React.useEffect(() => {
    // Start sync service
    syncService.start();

    // Listen for sync events
    const unsubscribe = syncService.on((event) => {
      switch (event.type) {
        case 'sync-start':
          setSyncStatus('syncing');
          break;
        case 'sync-complete':
          setSyncStatus('idle');
          setLastSync(event.timestamp);
          break;
        case 'sync-error':
          setSyncStatus('error');
          break;
      }
    });

    return () => {
      unsubscribe();
      syncService.destroy();
    };
  }, [syncService]);

  const triggerSync = React.useCallback(() => {
    return syncService.sync();
  }, [syncService]);

  return {
    syncStatus,
    lastSync,
    triggerSync
  };
}

// Singleton instance
export const syncService = new SyncService();

// Auto-start sync service
if (typeof window !== 'undefined') {
  syncService.start();
}