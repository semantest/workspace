import BackgroundFetch from 'react-native-background-fetch';
import NetInfo from '@react-native-community/netinfo';
import { MMKV } from 'react-native-mmkv';
import { API_BASE_URL } from '../config/api';
import { useAuthStore } from '../stores/authStore';

interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: string;
  data: any;
  timestamp: number;
  retries: number;
}

export class SyncService {
  private static instance: SyncService;
  private storage: MMKV;
  private syncQueue: Map<string, SyncQueueItem>;
  private isSyncing: boolean = false;
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();

  constructor() {
    this.storage = new MMKV({ id: 'sync-storage' });
    this.syncQueue = new Map();
    this.loadQueue();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  static initialize(): void {
    const instance = SyncService.getInstance();
    instance.setup();
  }

  private setup(): void {
    // Configure background fetch
    BackgroundFetch.configure(
      {
        minimumFetchInterval: 15, // 15 minutes
        forceAlarmManager: false,
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
      },
      async (taskId) => {
        console.log('[BackgroundFetch] taskId:', taskId);
        
        try {
          await this.performSync();
        } catch (error) {
          console.error('[BackgroundFetch] sync error:', error);
        }
        
        BackgroundFetch.finish(taskId);
      },
      (taskId) => {
        console.log('[BackgroundFetch] TIMEOUT taskId:', taskId);
        BackgroundFetch.finish(taskId);
      }
    );

    // Monitor network connectivity
    NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.isSyncing) {
        this.performSync();
      }
    });

    // Start BackgroundFetch
    BackgroundFetch.start();
  }

  private loadQueue(): void {
    const queueData = this.storage.getString('sync-queue');
    if (queueData) {
      const items: SyncQueueItem[] = JSON.parse(queueData);
      items.forEach((item) => {
        this.syncQueue.set(item.id, item);
      });
    }
  }

  private saveQueue(): void {
    const items = Array.from(this.syncQueue.values());
    this.storage.set('sync-queue', JSON.stringify(items));
  }

  public addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): void {
    const id = `${item.type}-${item.resource}-${Date.now()}`;
    const queueItem: SyncQueueItem = {
      ...item,
      id,
      timestamp: Date.now(),
      retries: 0,
    };

    this.syncQueue.set(id, queueItem);
    this.saveQueue();

    // Try immediate sync if online
    NetInfo.fetch().then((state) => {
      if (state.isConnected && !this.isSyncing) {
        this.performSync();
      }
    });
  }

  public async performSync(): Promise<SyncResult> {
    if (this.isSyncing || this.syncQueue.size === 0) {
      return { success: true, syncedItems: 0, failedItems: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners({ status: 'syncing', progress: 0, total: this.syncQueue.size });

    const results: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
    };

    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      this.isSyncing = false;
      this.notifyListeners({ status: 'offline', progress: 0, total: 0 });
      return results;
    }

    const token = useAuthStore.getState().accessToken;
    if (!token) {
      this.isSyncing = false;
      this.notifyListeners({ status: 'error', progress: 0, total: 0, error: 'Not authenticated' });
      return results;
    }

    const items = Array.from(this.syncQueue.values());
    let processed = 0;

    for (const item of items) {
      try {
        await this.syncItem(item, token);
        this.syncQueue.delete(item.id);
        results.syncedItems++;
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        item.retries++;
        
        if (item.retries >= 3) {
          // Move to failed items after max retries
          this.syncQueue.delete(item.id);
          results.failedItems++;
        }
      }

      processed++;
      this.notifyListeners({
        status: 'syncing',
        progress: processed,
        total: items.length,
      });
    }

    this.saveQueue();
    this.isSyncing = false;
    this.notifyListeners({
      status: 'complete',
      progress: processed,
      total: items.length,
      syncedItems: results.syncedItems,
      failedItems: results.failedItems,
    });

    return results;
  }

  private async syncItem(item: SyncQueueItem, token: string): Promise<void> {
    const url = `${API_BASE_URL}/${item.resource}`;
    
    let method: string;
    let fetchUrl = url;
    
    switch (item.type) {
      case 'create':
        method = 'POST';
        break;
      case 'update':
        method = 'PUT';
        fetchUrl = `${url}/${item.data.id}`;
        break;
      case 'delete':
        method = 'DELETE';
        fetchUrl = `${url}/${item.data.id}`;
        break;
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }

    const response = await fetch(fetchUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: item.type !== 'delete' ? JSON.stringify(item.data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }
  }

  public onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(listener);
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  private notifyListeners(status: SyncStatus): void {
    this.syncListeners.forEach((listener) => listener(status));
  }

  public getQueueSize(): number {
    return this.syncQueue.size;
  }

  public clearQueue(): void {
    this.syncQueue.clear();
    this.saveQueue();
  }

  // Conflict resolution strategies
  public async resolveConflict(
    localData: any,
    remoteData: any,
    strategy: 'local' | 'remote' | 'merge'
  ): Promise<any> {
    switch (strategy) {
      case 'local':
        return localData;
      case 'remote':
        return remoteData;
      case 'merge':
        // Custom merge logic based on timestamps
        return {
          ...remoteData,
          ...localData,
          updatedAt: Math.max(localData.updatedAt, remoteData.updatedAt),
        };
      default:
        return remoteData;
    }
  }
}

interface SyncStatus {
  status: 'idle' | 'syncing' | 'complete' | 'error' | 'offline';
  progress: number;
  total: number;
  error?: string;
  syncedItems?: number;
  failedItems?: number;
}

interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
}