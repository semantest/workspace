import { getOfflineDB } from './offline-db';

export interface ConflictMetadata {
  localVersion: number;
  remoteVersion: number;
  localTimestamp: Date;
  remoteTimestamp: Date;
  conflictType: 'update-update' | 'delete-update' | 'create-create';
  fieldConflicts?: FieldConflict[];
}

export interface FieldConflict {
  field: string;
  localValue: any;
  remoteValue: any;
  resolution?: 'local' | 'remote' | 'merged';
}

export interface ConflictResolutionStrategy {
  name: string;
  priority: number;
  canResolve: (metadata: ConflictMetadata) => boolean;
  resolve: <T>(local: T, remote: T, metadata: ConflictMetadata) => Promise<T>;
}

export class ConflictResolver {
  private strategies: ConflictResolutionStrategy[] = [];

  constructor() {
    this.registerDefaultStrategies();
  }

  // Register built-in resolution strategies
  private registerDefaultStrategies(): void {
    // Strategy 1: Last Write Wins (LWW)
    this.addStrategy({
      name: 'last-write-wins',
      priority: 1,
      canResolve: () => true, // Can resolve any conflict
      resolve: async (local, remote, metadata) => {
        return metadata.localTimestamp > metadata.remoteTimestamp ? local : remote;
      },
    });

    // Strategy 2: Remote Wins (Server Authority)
    this.addStrategy({
      name: 'remote-wins',
      priority: 2,
      canResolve: (metadata) => metadata.conflictType === 'update-update',
      resolve: async (local, remote) => remote,
    });

    // Strategy 3: Local Wins (Client Authority)
    this.addStrategy({
      name: 'local-wins',
      priority: 3,
      canResolve: (metadata) => metadata.conflictType === 'update-update',
      resolve: async (local) => local,
    });

    // Strategy 4: Field-level Merge
    this.addStrategy({
      name: 'field-merge',
      priority: 4,
      canResolve: (metadata) => 
        metadata.conflictType === 'update-update' && 
        metadata.fieldConflicts !== undefined,
      resolve: async (local, remote, metadata) => {
        const merged = { ...remote };
        
        if (metadata.fieldConflicts) {
          for (const conflict of metadata.fieldConflicts) {
            if (conflict.resolution === 'local') {
              (merged as any)[conflict.field] = conflict.localValue;
            } else if (conflict.resolution === 'merged') {
              (merged as any)[conflict.field] = this.mergeField(
                conflict.localValue,
                conflict.remoteValue,
                conflict.field
              );
            }
          }
        }
        
        return merged;
      },
    });

    // Strategy 5: Three-way Merge
    this.addStrategy({
      name: 'three-way-merge',
      priority: 5,
      canResolve: (metadata) => metadata.conflictType === 'update-update',
      resolve: async (local, remote, metadata) => {
        // Get common ancestor from history
        const ancestor = await this.getCommonAncestor(local, remote);
        if (!ancestor) {
          // Fall back to LWW if no ancestor found
          return metadata.localTimestamp > metadata.remoteTimestamp ? local : remote;
        }
        
        return this.threeWayMerge(ancestor, local, remote);
      },
    });

    // Strategy 6: User Resolution Required
    this.addStrategy({
      name: 'user-resolution',
      priority: 100, // Lowest priority - last resort
      canResolve: () => true,
      resolve: async (local, remote, metadata) => {
        // Store conflict for user resolution
        await this.storeConflictForUser(local, remote, metadata);
        // Return remote version temporarily
        return remote;
      },
    });
  }

  // Add a custom resolution strategy
  addStrategy(strategy: ConflictResolutionStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  // Resolve a conflict using registered strategies
  async resolveConflict<T>(
    local: T,
    remote: T,
    metadata: ConflictMetadata
  ): Promise<T> {
    // Find the first strategy that can handle this conflict
    for (const strategy of this.strategies) {
      if (strategy.canResolve(metadata)) {
        console.log(`Resolving conflict with strategy: ${strategy.name}`);
        return strategy.resolve(local, remote, metadata);
      }
    }

    // Should never reach here due to user-resolution catch-all
    throw new Error('No conflict resolution strategy available');
  }

  // Detect conflicts between local and remote versions
  async detectConflicts<T extends Record<string, any>>(
    local: T,
    remote: T
  ): Promise<ConflictMetadata> {
    const metadata: ConflictMetadata = {
      localVersion: local.version || 0,
      remoteVersion: remote.version || 0,
      localTimestamp: new Date(local.updatedAt || Date.now()),
      remoteTimestamp: new Date(remote.updatedAt || Date.now()),
      conflictType: this.determineConflictType(local, remote),
      fieldConflicts: [],
    };

    // Detect field-level conflicts
    const localKeys = Object.keys(local);
    const remoteKeys = Object.keys(remote);
    const allKeys = new Set([...localKeys, ...remoteKeys]);

    for (const key of allKeys) {
      if (this.isMetaField(key)) continue;

      const localValue = local[key];
      const remoteValue = remote[key];

      if (!this.valuesEqual(localValue, remoteValue)) {
        metadata.fieldConflicts!.push({
          field: key,
          localValue,
          remoteValue,
          resolution: this.suggestFieldResolution(key, localValue, remoteValue),
        });
      }
    }

    return metadata;
  }

  // Helper methods
  private determineConflictType(local: any, remote: any): ConflictMetadata['conflictType'] {
    if (local._deleted && !remote._deleted) return 'delete-update';
    if (!local._deleted && !remote._deleted) return 'update-update';
    return 'create-create';
  }

  private isMetaField(field: string): boolean {
    return ['id', 'version', 'updatedAt', 'createdAt', '_deleted'].includes(field);
  }

  private valuesEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      // Deep equality check
      return JSON.stringify(a) === JSON.stringify(b);
    }

    return false;
  }

  private suggestFieldResolution(
    field: string,
    localValue: any,
    remoteValue: any
  ): 'local' | 'remote' | 'merged' {
    // Heuristics for automatic field resolution
    
    // Arrays: merge unique values
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      return 'merged';
    }

    // Timestamps: use most recent
    if (field.endsWith('At') || field.endsWith('Date')) {
      return new Date(localValue) > new Date(remoteValue) ? 'local' : 'remote';
    }

    // Numbers: for counts/metrics, use higher value
    if (typeof localValue === 'number' && typeof remoteValue === 'number') {
      if (field.includes('count') || field.includes('total')) {
        return localValue > remoteValue ? 'local' : 'remote';
      }
    }

    // Default: use remote (server authority)
    return 'remote';
  }

  private mergeField(localValue: any, remoteValue: any, field: string): any {
    // Array merge: union of unique values
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      return [...new Set([...localValue, ...remoteValue])];
    }

    // Object merge: deep merge
    if (typeof localValue === 'object' && typeof remoteValue === 'object') {
      return { ...remoteValue, ...localValue };
    }

    // String concatenation for certain fields
    if (typeof localValue === 'string' && typeof remoteValue === 'string') {
      if (field === 'notes' || field === 'description') {
        return `${remoteValue}\n\n[Local changes:]\n${localValue}`;
      }
    }

    // Default: use remote value
    return remoteValue;
  }

  private async getCommonAncestor(local: any, remote: any): Promise<any | null> {
    // In a real implementation, this would fetch from version history
    // For now, return null to trigger fallback
    return null;
  }

  private threeWayMerge(ancestor: any, local: any, remote: any): any {
    const merged = { ...ancestor };

    // Apply changes from both local and remote
    for (const key of Object.keys({ ...local, ...remote })) {
      const ancestorValue = ancestor[key];
      const localValue = local[key];
      const remoteValue = remote[key];

      if (localValue !== ancestorValue && remoteValue !== ancestorValue) {
        // Both changed - conflict
        merged[key] = this.mergeField(localValue, remoteValue, key);
      } else if (localValue !== ancestorValue) {
        // Only local changed
        merged[key] = localValue;
      } else if (remoteValue !== ancestorValue) {
        // Only remote changed
        merged[key] = remoteValue;
      }
    }

    return merged;
  }

  private async storeConflictForUser(
    local: any,
    remote: any,
    metadata: ConflictMetadata
  ): Promise<void> {
    const db = await getOfflineDB();
    const conflict = {
      id: crypto.randomUUID(),
      entityId: local.id || remote.id,
      entityType: local.type || 'unknown',
      local,
      remote,
      metadata,
      createdAt: new Date(),
      resolved: false,
    };

    // Store in a conflicts collection
    const existing = localStorage.getItem('unresolved-conflicts');
    const conflicts = existing ? JSON.parse(existing) : [];
    conflicts.push(conflict);
    localStorage.setItem('unresolved-conflicts', JSON.stringify(conflicts));
  }

  // Get unresolved conflicts for user interface
  async getUnresolvedConflicts(): Promise<any[]> {
    const existing = localStorage.getItem('unresolved-conflicts');
    return existing ? JSON.parse(existing) : [];
  }

  // Mark a conflict as resolved
  async markConflictResolved(conflictId: string, resolution: any): Promise<void> {
    const existing = localStorage.getItem('unresolved-conflicts');
    const conflicts = existing ? JSON.parse(existing) : [];
    
    const index = conflicts.findIndex((c: any) => c.id === conflictId);
    if (index !== -1) {
      conflicts[index].resolved = true;
      conflicts[index].resolution = resolution;
      conflicts[index].resolvedAt = new Date();
      localStorage.setItem('unresolved-conflicts', JSON.stringify(conflicts));
    }
  }
}

// Export singleton instance
export const conflictResolver = new ConflictResolver();