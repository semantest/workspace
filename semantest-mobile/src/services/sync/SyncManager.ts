/*
                     @semantest/mobile-app

 Copyright (C) 2025-today  Semantest Team

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * @fileoverview Offline Sync Manager for Mobile App
 * @author Semantest Team
 * @module services/sync/SyncManager
 */

import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { ApiClient } from '../api/ApiClient';
import { OfflineManager, OfflineTestData } from '../offline/OfflineManager';
import { NotificationService } from '../notifications/NotificationService';
import { EventEmitter } from 'events';

export interface SyncConfig {
  autoSync: boolean;
  syncInterval: number; // in milliseconds
  maxRetryAttempts: number;
  retryDelay: number;
  batchSize: number;
  compressionEnabled: boolean;
  conflictResolution: 'server' | 'client' | 'manual';
  prioritySync: string[]; // Test IDs to sync first
}

export interface SyncOperation {
  id: string;
  type: 'upload' | 'download' | 'delete' | 'conflict_resolution';
  entityType: 'test' | 'execution' | 'project' | 'settings';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data?: any;
  priority: number;
  attempts: number;
  lastAttempt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'conflict';
  error?: string;
  createdAt: Date;
  scheduledAt?: Date;
}

export interface SyncResult {
  success: boolean;
  operationsCompleted: number;
  operationsFailed: number;
  conflicts: SyncConflict[];
  duration: number;
  dataTransferred: number;
  errors: SyncError[];
}

export interface SyncConflict {
  entityType: string;
  entityId: string;
  localVersion: any;
  serverVersion: any;
  conflictType: 'version' | 'modification' | 'deletion';
  timestamp: Date;
  resolution?: 'local' | 'server' | 'manual';
}

export interface SyncError {
  operationId: string;
  entityId: string;
  error: string;
  timestamp: Date;
  retryable: boolean;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync?: Date;
  nextSync?: Date;
  pendingOperations: number;
  conflicts: number;
  errors: number;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
}

/**
 * Comprehensive sync manager for offline/online data synchronization
 */
export class SyncManager extends EventEmitter {
  private config: SyncConfig;
  private isOnline: boolean = false;
  private isSyncing: boolean = false;
  private syncInterval?: NodeJS.Timeout;
  private operationQueue: SyncOperation[] = [];
  private conflictQueue: SyncConflict[] = [];
  private retryQueue: SyncOperation[] = [];

  constructor(
    private readonly apiClient: ApiClient,
    private readonly offlineManager: OfflineManager,
    private readonly notificationService: NotificationService,
    config?: Partial<SyncConfig>
  ) {
    super();
    
    this.config = {
      autoSync: true,
      syncInterval: 5 * 60 * 1000, // 5 minutes
      maxRetryAttempts: 3,
      retryDelay: 30000, // 30 seconds
      batchSize: 10,
      compressionEnabled: true,
      conflictResolution: 'manual',
      prioritySync: [],
      ...config
    };

    this.initializeNetworkMonitoring();
    this.loadPendingOperations();
  }

  /**
   * Initialize network monitoring
   */
  private initializeNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;

      if (!wasOnline && this.isOnline) {
        this.emit('online');
        this.onConnectionRestored();
      } else if (wasOnline && !this.isOnline) {
        this.emit('offline');
        this.onConnectionLost();
      }
    });

    // Get initial network state
    NetInfo.fetch().then(state => {
      this.isOnline = state.isConnected && state.isInternetReachable;
    });
  }

  /**
   * Start sync manager
   */
  async start(): Promise<void> {
    console.log('Starting SyncManager');

    if (this.config.autoSync) {
      this.schedulePeriodicSync();
    }

    // Process any pending operations
    if (this.isOnline) {
      await this.performSync();
    }

    this.emit('started');
  }

  /**
   * Stop sync manager
   */
  async stop(): Promise<void> {
    console.log('Stopping SyncManager');

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }

    if (this.isSyncing) {
      // Wait for current sync to complete or timeout
      await this.waitForSyncCompletion(10000);
    }

    await this.savePendingOperations();
    this.emit('stopped');
  }

  /**
   * Manually trigger sync
   */
  async sync(options?: { force?: boolean; priority?: string[] }): Promise<SyncResult> {
    if (this.isSyncing && !options?.force) {
      throw new Error('Sync already in progress');
    }

    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    return await this.performSync(options?.priority);
  }

  /**
   * Perform synchronization
   */
  private async performSync(priorityEntities?: string[]): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    const startTime = Date.now();
    let operationsCompleted = 0;
    let operationsFailed = 0;
    let dataTransferred = 0;
    const conflicts: SyncConflict[] = [];
    const errors: SyncError[] = [];

    try {
      this.emit('syncStarted');

      // 1. Download server changes first
      console.log('Downloading server changes...');
      const downloadResult = await this.downloadServerChanges();
      operationsCompleted += downloadResult.completed;
      operationsFailed += downloadResult.failed;
      dataTransferred += downloadResult.dataTransferred;
      conflicts.push(...downloadResult.conflicts);
      errors.push(...downloadResult.errors);

      // 2. Upload local changes
      console.log('Uploading local changes...');
      const uploadResult = await this.uploadLocalChanges(priorityEntities);
      operationsCompleted += uploadResult.completed;
      operationsFailed += uploadResult.failed;
      dataTransferred += uploadResult.dataTransferred;
      conflicts.push(...uploadResult.conflicts);
      errors.push(...uploadResult.errors);

      // 3. Process retry queue
      if (this.retryQueue.length > 0) {
        console.log('Processing retry queue...');
        const retryResult = await this.processRetryQueue();
        operationsCompleted += retryResult.completed;
        operationsFailed += retryResult.failed;
        dataTransferred += retryResult.dataTransferred;
      }

      // 4. Handle conflicts if auto-resolution is enabled
      if (conflicts.length > 0 && this.config.conflictResolution !== 'manual') {
        console.log('Auto-resolving conflicts...');
        await this.autoResolveConflicts(conflicts);
      }

      // Update last sync time
      await this.updateLastSyncTime();

      const duration = Date.now() - startTime;
      const result: SyncResult = {
        success: operationsFailed === 0 && conflicts.length === 0,
        operationsCompleted,
        operationsFailed,
        conflicts,
        duration,
        dataTransferred,
        errors
      };

      this.emit('syncCompleted', result);

      // Send notification if there are conflicts or errors
      if (conflicts.length > 0 || errors.length > 0) {
        await this.notificationService.sendNotification({
          title: 'Sync Issues',
          body: `${conflicts.length} conflicts, ${errors.length} errors need attention`,
          data: { conflicts: conflicts.length, errors: errors.length }
        });
      }

      return result;

    } catch (error) {
      console.error('Sync failed', { error: error.message });
      
      const result: SyncResult = {
        success: false,
        operationsCompleted,
        operationsFailed: operationsFailed + 1,
        conflicts,
        duration: Date.now() - startTime,
        dataTransferred,
        errors: [...errors, {
          operationId: 'sync_operation',
          entityId: 'global',
          error: error.message,
          timestamp: new Date(),
          retryable: true
        }]
      };

      this.emit('syncFailed', result);
      return result;

    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Download changes from server
   */
  private async downloadServerChanges(): Promise<{
    completed: number;
    failed: number;
    dataTransferred: number;
    conflicts: SyncConflict[];
    errors: SyncError[];
  }> {
    let completed = 0;
    let failed = 0;
    let dataTransferred = 0;
    const conflicts: SyncConflict[] = [];
    const errors: SyncError[] = [];

    try {
      // Get last sync timestamp
      const lastSync = await this.getLastSyncTime();
      
      // Download tests
      const testsResult = await this.downloadTests(lastSync);
      completed += testsResult.completed;
      failed += testsResult.failed;
      dataTransferred += testsResult.dataTransferred;
      conflicts.push(...testsResult.conflicts);
      errors.push(...testsResult.errors);

      // Download projects
      const projectsResult = await this.downloadProjects(lastSync);
      completed += projectsResult.completed;
      failed += projectsResult.failed;
      dataTransferred += projectsResult.dataTransferred;

      // Download execution results
      const executionsResult = await this.downloadExecutions(lastSync);
      completed += executionsResult.completed;
      failed += executionsResult.failed;
      dataTransferred += executionsResult.dataTransferred;

    } catch (error) {
      console.error('Failed to download server changes', { error });
      errors.push({
        operationId: 'download_server_changes',
        entityId: 'global',
        error: error.message,
        timestamp: new Date(),
        retryable: true
      });
      failed++;
    }

    return { completed, failed, dataTransferred, conflicts, errors };
  }

  /**
   * Upload local changes to server
   */
  private async uploadLocalChanges(priorityEntities?: string[]): Promise<{
    completed: number;
    failed: number;
    dataTransferred: number;
    conflicts: SyncConflict[];
    errors: SyncError[];
  }> {
    let completed = 0;
    let failed = 0;
    let dataTransferred = 0;
    const conflicts: SyncConflict[] = [];
    const errors: SyncError[] = [];

    try {
      // Get local changes that need to be uploaded
      const localTests = await this.getLocalChanges(priorityEntities);
      
      // Process in batches
      const batches = this.createBatches(localTests, this.config.batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.emit('syncProgress', {
          current: i + 1,
          total: batches.length,
          percentage: Math.round(((i + 1) / batches.length) * 100)
        });

        const batchResult = await this.uploadBatch(batch);
        completed += batchResult.completed;
        failed += batchResult.failed;
        dataTransferred += batchResult.dataTransferred;
        conflicts.push(...batchResult.conflicts);
        errors.push(...batchResult.errors);
      }

    } catch (error) {
      console.error('Failed to upload local changes', { error });
      errors.push({
        operationId: 'upload_local_changes',
        entityId: 'global',
        error: error.message,
        timestamp: new Date(),
        retryable: true
      });
      failed++;
    }

    return { completed, failed, dataTransferred, conflicts, errors };
  }

  /**
   * Download tests from server
   */
  private async downloadTests(since?: Date): Promise<any> {
    try {
      const params: any = {};
      if (since) {
        params.since = since.toISOString();
      }

      const response = await this.apiClient.get('/tests/sync', { params });
      const serverTests = response.data;
      
      let completed = 0;
      let failed = 0;
      let dataTransferred = 0;
      const conflicts: SyncConflict[] = [];
      const errors: SyncError[] = [];

      for (const serverTest of serverTests) {
        try {
          const localTest = await this.offlineManager.getTest(serverTest.id);
          
          if (localTest) {
            // Check for conflicts
            if (this.hasConflict(localTest, serverTest)) {
              const conflict: SyncConflict = {
                entityType: 'test',
                entityId: serverTest.id,
                localVersion: localTest,
                serverVersion: serverTest,
                conflictType: 'modification',
                timestamp: new Date()
              };
              conflicts.push(conflict);
              this.conflictQueue.push(conflict);
              continue;
            }
          }

          // Update local test
          await this.offlineManager.storeTest({
            ...serverTest,
            syncStatus: 'synced',
            lastSyncAt: new Date().toISOString()
          });

          completed++;
          dataTransferred += JSON.stringify(serverTest).length;

        } catch (error) {
          console.error('Failed to process server test', { testId: serverTest.id, error });
          errors.push({
            operationId: 'download_test',
            entityId: serverTest.id,
            error: error.message,
            timestamp: new Date(),
            retryable: true
          });
          failed++;
        }
      }

      return { completed, failed, dataTransferred, conflicts, errors };

    } catch (error) {
      console.error('Failed to download tests', { error });
      throw error;
    }
  }

  /**
   * Download projects from server
   */
  private async downloadProjects(since?: Date): Promise<any> {
    try {
      const params: any = {};
      if (since) {
        params.since = since.toISOString();
      }

      const response = await this.apiClient.get('/projects/sync', { params });
      const projects = response.data;

      // Store projects locally
      for (const project of projects) {
        await AsyncStorage.setItem(`project_${project.id}`, JSON.stringify(project));
      }

      return {
        completed: projects.length,
        failed: 0,
        dataTransferred: JSON.stringify(projects).length
      };

    } catch (error) {
      console.error('Failed to download projects', { error });
      return { completed: 0, failed: 1, dataTransferred: 0 };
    }
  }

  /**
   * Download execution results from server
   */
  private async downloadExecutions(since?: Date): Promise<any> {
    try {
      const params: any = {};
      if (since) {
        params.since = since.toISOString();
      }

      const response = await this.apiClient.get('/executions/sync', { params });
      const executions = response.data;

      // Store executions locally
      for (const execution of executions) {
        await AsyncStorage.setItem(`execution_${execution.id}`, JSON.stringify(execution));
      }

      return {
        completed: executions.length,
        failed: 0,
        dataTransferred: JSON.stringify(executions).length
      };

    } catch (error) {
      console.error('Failed to download executions', { error });
      return { completed: 0, failed: 1, dataTransferred: 0 };
    }
  }

  /**
   * Get local changes that need to be uploaded
   */
  private async getLocalChanges(priorityEntities?: string[]): Promise<OfflineTestData[]> {
    // Get tests that need to be synced
    const allTests = await this.offlineManager.getAllTests();
    
    let localChanges = allTests.filter(test => 
      test.syncStatus === 'local' || test.syncStatus === 'pending'
    );

    // Prioritize specific entities if requested
    if (priorityEntities && priorityEntities.length > 0) {
      const priorityTests = localChanges.filter(test => 
        priorityEntities.includes(test.id)
      );
      const otherTests = localChanges.filter(test => 
        !priorityEntities.includes(test.id)
      );
      localChanges = [...priorityTests, ...otherTests];
    }

    return localChanges;
  }

  /**
   * Upload batch of tests
   */
  private async uploadBatch(batch: OfflineTestData[]): Promise<any> {
    let completed = 0;
    let failed = 0;
    let dataTransferred = 0;
    const conflicts: SyncConflict[] = [];
    const errors: SyncError[] = [];

    for (const test of batch) {
      try {
        const operation: SyncOperation = {
          id: this.generateOperationId(),
          type: 'upload',
          entityType: 'test',
          entityId: test.id,
          operation: 'update',
          data: test,
          priority: this.config.prioritySync.includes(test.id) ? 10 : 5,
          attempts: 0,
          status: 'processing',
          createdAt: new Date()
        };

        const result = await this.executeUploadOperation(operation);
        
        if (result.success) {
          // Update local test as synced
          await this.offlineManager.updateTest(test.id, {
            syncStatus: 'synced',
            lastSyncAt: new Date().toISOString()
          });
          completed++;
          dataTransferred += JSON.stringify(test).length;
        } else if (result.conflict) {
          conflicts.push(result.conflict);
        } else {
          errors.push({
            operationId: operation.id,
            entityId: test.id,
            error: result.error || 'Upload failed',
            timestamp: new Date(),
            retryable: true
          });
          failed++;
          
          // Add to retry queue
          this.retryQueue.push({
            ...operation,
            status: 'failed',
            error: result.error,
            lastAttempt: new Date()
          });
        }

      } catch (error) {
        console.error('Failed to upload test', { testId: test.id, error });
        errors.push({
          operationId: 'upload_test',
          entityId: test.id,
          error: error.message,
          timestamp: new Date(),
          retryable: true
        });
        failed++;
      }
    }

    return { completed, failed, dataTransferred, conflicts, errors };
  }

  /**
   * Execute upload operation
   */
  private async executeUploadOperation(operation: SyncOperation): Promise<any> {
    try {
      const response = await this.apiClient.put(
        `/tests/${operation.entityId}`,
        operation.data
      );

      return { success: true, data: response.data };

    } catch (error) {
      if (error.response?.status === 409) {
        // Conflict detected
        const serverData = error.response.data;
        const conflict: SyncConflict = {
          entityType: operation.entityType,
          entityId: operation.entityId,
          localVersion: operation.data,
          serverVersion: serverData,
          conflictType: 'version',
          timestamp: new Date()
        };

        return { success: false, conflict };
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Process retry queue
   */
  private async processRetryQueue(): Promise<any> {
    let completed = 0;
    let failed = 0;
    let dataTransferred = 0;

    const retryableOperations = this.retryQueue.filter(op => 
      op.attempts < this.config.maxRetryAttempts
    );

    for (const operation of retryableOperations) {
      try {
        operation.attempts++;
        operation.lastAttempt = new Date();
        operation.status = 'processing';

        const result = await this.executeUploadOperation(operation);
        
        if (result.success) {
          // Remove from retry queue
          this.retryQueue = this.retryQueue.filter(op => op.id !== operation.id);
          completed++;
          dataTransferred += JSON.stringify(operation.data).length;
        } else {
          operation.status = 'failed';
          operation.error = result.error;
          failed++;
        }

      } catch (error) {
        operation.status = 'failed';
        operation.error = error.message;
        failed++;
      }
    }

    // Remove operations that exceeded retry attempts
    this.retryQueue = this.retryQueue.filter(op => 
      op.attempts < this.config.maxRetryAttempts
    );

    return { completed, failed, dataTransferred };
  }

  /**
   * Auto-resolve conflicts
   */
  private async autoResolveConflicts(conflicts: SyncConflict[]): Promise<void> {
    for (const conflict of conflicts) {
      try {
        let resolution: 'local' | 'server';

        switch (this.config.conflictResolution) {
          case 'server':
            resolution = 'server';
            break;
          case 'client':
            resolution = 'local';
            break;
          default:
            continue; // Skip manual resolution
        }

        await this.resolveConflict(conflict.entityId, resolution);
        conflict.resolution = resolution;

        // Remove from conflict queue
        this.conflictQueue = this.conflictQueue.filter(c => 
          c.entityId !== conflict.entityId
        );

      } catch (error) {
        console.error('Failed to auto-resolve conflict', { 
          entityId: conflict.entityId, 
          error 
        });
      }
    }
  }

  /**
   * Resolve specific conflict
   */
  async resolveConflict(entityId: string, resolution: 'local' | 'server'): Promise<void> {
    const conflict = this.conflictQueue.find(c => c.entityId === entityId);
    if (!conflict) {
      throw new Error('Conflict not found');
    }

    try {
      if (resolution === 'server') {
        // Use server version
        await this.offlineManager.storeTest({
          ...conflict.serverVersion,
          syncStatus: 'synced',
          lastSyncAt: new Date().toISOString()
        });
      } else {
        // Use local version and force upload
        const operation: SyncOperation = {
          id: this.generateOperationId(),
          type: 'upload',
          entityType: 'test',
          entityId: conflict.entityId,
          operation: 'update',
          data: conflict.localVersion,
          priority: 10, // High priority for conflict resolution
          attempts: 0,
          status: 'pending',
          createdAt: new Date()
        };

        await this.executeUploadOperation(operation);
      }

      // Remove from conflict queue
      this.conflictQueue = this.conflictQueue.filter(c => c.entityId !== entityId);

      this.emit('conflictResolved', { entityId, resolution });

    } catch (error) {
      console.error('Failed to resolve conflict', { entityId, resolution, error });
      throw error;
    }
  }

  /**
   * Check for conflicts between local and server data
   */
  private hasConflict(localData: any, serverData: any): boolean {
    // Compare versions or modification times
    if (localData.version && serverData.version) {
      return localData.version !== serverData.version;
    }

    if (localData.updatedAt && serverData.updatedAt) {
      const localTime = new Date(localData.updatedAt).getTime();
      const serverTime = new Date(serverData.updatedAt).getTime();
      
      // Consider it a conflict if both were modified and times differ significantly
      return Math.abs(localTime - serverTime) > 60000; // 1 minute threshold
    }

    return false;
  }

  /**
   * Connection event handlers
   */
  private async onConnectionRestored(): Promise<void> {
    console.log('Connection restored, triggering sync');
    
    await this.notificationService.sendNotification({
      title: 'Connection Restored',
      body: 'Synchronizing data with server...',
      data: { type: 'sync' }
    });

    // Trigger sync after connection is restored
    if (this.config.autoSync) {
      setTimeout(() => {
        this.performSync();
      }, 2000); // Wait 2 seconds for connection to stabilize
    }
  }

  private onConnectionLost(): void {
    console.log('Connection lost, switching to offline mode');
    
    this.notificationService.sendNotification({
      title: 'Offline Mode',
      body: 'Working offline. Data will sync when connection is restored.',
      data: { type: 'offline' }
    });
  }

  /**
   * Scheduling methods
   */
  private schedulePeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (this.isOnline && !this.isSyncing) {
        try {
          await this.performSync();
        } catch (error) {
          console.error('Scheduled sync failed', { error });
        }
      }
    }, this.config.syncInterval);
  }

  /**
   * Utility methods
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getLastSyncTime(): Promise<Date | undefined> {
    try {
      const lastSync = await AsyncStorage.getItem('last_sync_time');
      return lastSync ? new Date(lastSync) : undefined;
    } catch (error) {
      console.error('Failed to get last sync time', { error });
      return undefined;
    }
  }

  private async updateLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem('last_sync_time', new Date().toISOString());
    } catch (error) {
      console.error('Failed to update last sync time', { error });
    }
  }

  private async loadPendingOperations(): Promise<void> {
    try {
      const operations = await AsyncStorage.getItem('pending_sync_operations');
      if (operations) {
        this.operationQueue = JSON.parse(operations);
      }

      const conflicts = await AsyncStorage.getItem('sync_conflicts');
      if (conflicts) {
        this.conflictQueue = JSON.parse(conflicts);
      }

      const retryOps = await AsyncStorage.getItem('retry_sync_operations');
      if (retryOps) {
        this.retryQueue = JSON.parse(retryOps);
      }
    } catch (error) {
      console.error('Failed to load pending operations', { error });
    }
  }

  private async savePendingOperations(): Promise<void> {
    try {
      await AsyncStorage.setItem('pending_sync_operations', JSON.stringify(this.operationQueue));
      await AsyncStorage.setItem('sync_conflicts', JSON.stringify(this.conflictQueue));
      await AsyncStorage.setItem('retry_sync_operations', JSON.stringify(this.retryQueue));
    } catch (error) {
      console.error('Failed to save pending operations', { error });
    }
  }

  private async waitForSyncCompletion(timeout: number): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (!this.isSyncing || (Date.now() - startTime) > timeout) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Public API methods
   */
  getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSync: undefined, // Would get from storage
      nextSync: undefined, // Would calculate based on interval
      pendingOperations: this.operationQueue.length + this.retryQueue.length,
      conflicts: this.conflictQueue.length,
      errors: this.retryQueue.filter(op => op.status === 'failed').length
    };
  }

  getConflicts(): SyncConflict[] {
    return [...this.conflictQueue];
  }

  getPendingOperations(): SyncOperation[] {
    return [...this.operationQueue, ...this.retryQueue];
  }

  async clearConflicts(): Promise<void> {
    this.conflictQueue = [];
    await AsyncStorage.removeItem('sync_conflicts');
  }

  async resetSync(): Promise<void> {
    this.operationQueue = [];
    this.conflictQueue = [];
    this.retryQueue = [];
    
    await AsyncStorage.multiRemove([
      'pending_sync_operations',
      'sync_conflicts',
      'retry_sync_operations',
      'last_sync_time'
    ]);
  }

  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.syncInterval && this.config.autoSync) {
      this.schedulePeriodicSync();
    }
  }
}