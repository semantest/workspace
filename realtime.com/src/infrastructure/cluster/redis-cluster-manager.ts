/*
                     @semantest/realtime-streaming

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
 * @fileoverview Redis Cluster Manager with High Availability
 * @author Semantest Team
 * @module infrastructure/cluster/RedisClusterManager
 */

import { Cluster, Redis } from 'ioredis';
import { EventEmitter } from 'events';
import { Logger } from '@shared/infrastructure/logger';

export interface RedisClusterConfig {
  nodes: ClusterNode[];
  options: ClusterOptions;
  monitoring: MonitoringConfig;
  failover: FailoverConfig;
  sharding: ShardingConfig;
  replication: ReplicationConfig;
}

export interface ClusterNode {
  host: string;
  port: number;
  role: 'master' | 'slave';
  slots?: number[];
  weight?: number;
  datacenter?: string;
}

export interface ClusterOptions {
  enableReadyCheck: boolean;
  redisOptions: {
    password?: string;
    connectTimeout: number;
    commandTimeout: number;
    retryDelayOnFailover: number;
    maxRetriesPerRequest: number;
    keepAlive: number;
    family: number;
  };
  clusterRetryDelayOnFailover: number;
  clusterRetryDelayOnClusterDown: number;
  clusterRetryDelayOnMoved: number;
  clusterMaxRedirections: number;
  clusterMode: 'cluster' | 'sentinel';
  scaleReads: 'master' | 'slave' | 'all';
  readOnly: boolean;
  enableOfflineQueue: boolean;
}

export interface MonitoringConfig {
  healthCheckInterval: number;
  performanceMetrics: boolean;
  slowLogThreshold: number;
  memoryThreshold: number;
  connectionThreshold: number;
}

export interface FailoverConfig {
  enabled: boolean;
  automaticFailover: boolean;
  failoverTimeout: number;
  maxFailoverAttempts: number;
  backupNodes: ClusterNode[];
}

export interface ShardingConfig {
  strategy: 'hash' | 'range' | 'consistent_hash';
  virtualNodes: number;
  rebalanceThreshold: number;
  autoRebalance: boolean;
}

export interface ReplicationConfig {
  enabled: boolean;
  replicationFactor: number;
  asyncReplication: boolean;
  replicationTimeout: number;
}

export interface ClusterStats {
  totalNodes: number;
  masterNodes: number;
  slaveNodes: number;
  healthyNodes: number;
  unhealthyNodes: number;
  totalMemoryUsage: number;
  totalConnections: number;
  operationsPerSecond: number;
  averageLatency: number;
  clusterSlotsOk: boolean;
  replicationStatus: 'healthy' | 'degraded' | 'failed';
}

export interface NodeStats {
  nodeId: string;
  host: string;
  port: number;
  role: 'master' | 'slave';
  connected: boolean;
  lastSeen: Date;
  memoryUsage: number;
  connections: number;
  operationsPerSecond: number;
  latency: number;
  slots: number[];
  slaves: string[];
}

export interface ShardInfo {
  shardId: string;
  master: NodeStats;
  slaves: NodeStats[];
  slots: number[];
  healthy: boolean;
}

/**
 * Redis Cluster Manager with high availability and auto-scaling
 */
export class RedisClusterManager extends EventEmitter {
  private cluster: Cluster;
  private nodes: Map<string, NodeStats> = new Map();
  private shards: Map<string, ShardInfo> = new Map();
  private monitoring: ClusterMonitoring;
  private failoverManager: FailoverManager;
  private shardingManager: ShardingManager;
  private isInitialized = false;

  constructor(
    private readonly config: RedisClusterConfig,
    private readonly logger: Logger
  ) {
    super();
    this.initializeCluster();
    this.initializeManagers();
  }

  /**
   * Initialize Redis cluster
   */
  private initializeCluster(): void {
    this.cluster = new Cluster(
      this.config.nodes.map(node => ({ 
        host: node.host, 
        port: node.port 
      })),
      this.config.options
    );

    this.setupClusterEvents();
  }

  /**
   * Initialize management components
   */
  private initializeManagers(): void {
    this.monitoring = new ClusterMonitoring(
      this.cluster,
      this.config.monitoring,
      this.logger
    );

    this.failoverManager = new FailoverManager(
      this.cluster,
      this.config.failover,
      this.logger
    );

    this.shardingManager = new ShardingManager(
      this.cluster,
      this.config.sharding,
      this.logger
    );

    this.setupManagerEvents();
  }

  /**
   * Setup cluster event handlers
   */
  private setupClusterEvents(): void {
    this.cluster.on('ready', () => {
      this.logger.info('Redis cluster ready');
      this.isInitialized = true;
      this.emit('cluster_ready');
      this.startClusterDiscovery();
    });

    this.cluster.on('error', (error) => {
      this.logger.error('Redis cluster error', { error: error.message });
      this.emit('cluster_error', error);
    });

    this.cluster.on('node error', (error, node) => {
      this.logger.error('Redis node error', { 
        error: error.message, 
        node: `${node.options.host}:${node.options.port}` 
      });
      this.handleNodeError(node, error);
    });

    this.cluster.on('+node', (node) => {
      this.logger.info('Node added to cluster', { 
        node: `${node.options.host}:${node.options.port}` 
      });
      this.handleNodeAdded(node);
    });

    this.cluster.on('-node', (node) => {
      this.logger.info('Node removed from cluster', { 
        node: `${node.options.host}:${node.options.port}` 
      });
      this.handleNodeRemoved(node);
    });

    this.cluster.on('reconnecting', () => {
      this.logger.info('Redis cluster reconnecting');
      this.emit('cluster_reconnecting');
    });
  }

  /**
   * Setup manager event handlers
   */
  private setupManagerEvents(): void {
    this.monitoring.on('node_unhealthy', (nodeId) => {
      this.handleUnhealthyNode(nodeId);
    });

    this.monitoring.on('cluster_degraded', (stats) => {
      this.handleClusterDegraded(stats);
    });

    this.failoverManager.on('failover_initiated', (data) => {
      this.logger.info('Failover initiated', data);
      this.emit('failover_started', data);
    });

    this.failoverManager.on('failover_completed', (data) => {
      this.logger.info('Failover completed', data);
      this.emit('failover_completed', data);
    });

    this.shardingManager.on('rebalance_needed', (data) => {
      this.logger.info('Cluster rebalancing needed', data);
      this.emit('rebalance_needed', data);
    });
  }

  /**
   * Start cluster manager
   */
  async start(): Promise<void> {
    try {
      await this.waitForClusterReady();
      
      this.monitoring.start();
      this.failoverManager.start();
      this.shardingManager.start();

      this.logger.info('Redis cluster manager started');
      this.emit('manager_started');

    } catch (error) {
      this.logger.error('Failed to start cluster manager', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop cluster manager
   */
  async stop(): Promise<void> {
    try {
      this.monitoring.stop();
      this.failoverManager.stop();
      this.shardingManager.stop();

      this.cluster.disconnect();

      this.logger.info('Redis cluster manager stopped');
      this.emit('manager_stopped');

    } catch (error) {
      this.logger.error('Error stopping cluster manager', { error: error.message });
      throw error;
    }
  }

  /**
   * Get cluster statistics
   */
  async getClusterStats(): Promise<ClusterStats> {
    try {
      const nodeStats = Array.from(this.nodes.values());
      const masterNodes = nodeStats.filter(n => n.role === 'master');
      const slaveNodes = nodeStats.filter(n => n.role === 'slave');
      const healthyNodes = nodeStats.filter(n => n.connected);

      const totalMemory = nodeStats.reduce((sum, node) => sum + node.memoryUsage, 0);
      const totalConnections = nodeStats.reduce((sum, node) => sum + node.connections, 0);
      const totalOps = nodeStats.reduce((sum, node) => sum + node.operationsPerSecond, 0);
      const avgLatency = nodeStats.length > 0 
        ? nodeStats.reduce((sum, node) => sum + node.latency, 0) / nodeStats.length 
        : 0;

      const clusterInfo = await this.cluster.cluster('info');
      const clusterSlotsOk = clusterInfo.includes('cluster_slots_ok:16384');

      return {
        totalNodes: nodeStats.length,
        masterNodes: masterNodes.length,
        slaveNodes: slaveNodes.length,
        healthyNodes: healthyNodes.length,
        unhealthyNodes: nodeStats.length - healthyNodes.length,
        totalMemoryUsage: totalMemory,
        totalConnections: totalConnections,
        operationsPerSecond: totalOps,
        averageLatency: avgLatency,
        clusterSlotsOk,
        replicationStatus: this.getReplicationStatus()
      };

    } catch (error) {
      this.logger.error('Failed to get cluster stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Get shard information
   */
  getShardInfo(): Map<string, ShardInfo> {
    return new Map(this.shards);
  }

  /**
   * Get node statistics
   */
  getNodeStats(): Map<string, NodeStats> {
    return new Map(this.nodes);
  }

  /**
   * Add node to cluster
   */
  async addNode(node: ClusterNode): Promise<void> {
    try {
      const nodeId = `${node.host}:${node.port}`;
      
      // Add node to cluster
      const masterNode = Array.from(this.nodes.values()).find(n => n.role === 'master');
      if (masterNode) {
        const redis = new Redis(masterNode.port, masterNode.host);
        await redis.cluster('meet', node.host, node.port);
        redis.disconnect();
      }

      this.logger.info('Node added to cluster', { nodeId });
      this.emit('node_added', { nodeId, node });

    } catch (error) {
      this.logger.error('Failed to add node to cluster', { error: error.message });
      throw error;
    }
  }

  /**
   * Remove node from cluster
   */
  async removeNode(nodeId: string): Promise<void> {
    try {
      const node = this.nodes.get(nodeId);
      if (!node) {
        throw new Error(`Node ${nodeId} not found`);
      }

      // Migrate slots if master node
      if (node.role === 'master' && node.slots.length > 0) {
        await this.migrateSlots(nodeId, node.slots);
      }

      // Remove node from cluster
      const masterNode = Array.from(this.nodes.values()).find(
        n => n.role === 'master' && n.nodeId !== nodeId
      );
      
      if (masterNode) {
        const redis = new Redis(masterNode.port, masterNode.host);
        await redis.cluster('forget', node.nodeId);
        redis.disconnect();
      }

      this.nodes.delete(nodeId);
      this.logger.info('Node removed from cluster', { nodeId });
      this.emit('node_removed', { nodeId });

    } catch (error) {
      this.logger.error('Failed to remove node from cluster', { error: error.message });
      throw error;
    }
  }

  /**
   * Trigger manual failover
   */
  async triggerFailover(masterNodeId: string, targetSlaveId?: string): Promise<void> {
    return this.failoverManager.triggerFailover(masterNodeId, targetSlaveId);
  }

  /**
   * Rebalance cluster
   */
  async rebalanceCluster(): Promise<void> {
    return this.shardingManager.rebalanceCluster();
  }

  /**
   * Scale cluster up
   */
  async scaleUp(newNodes: ClusterNode[]): Promise<void> {
    try {
      for (const node of newNodes) {
        await this.addNode(node);
      }

      // Rebalance after adding nodes
      if (this.config.sharding.autoRebalance) {
        await this.rebalanceCluster();
      }

      this.logger.info('Cluster scaled up', { newNodes: newNodes.length });
      this.emit('cluster_scaled_up', { newNodes });

    } catch (error) {
      this.logger.error('Failed to scale cluster up', { error: error.message });
      throw error;
    }
  }

  /**
   * Scale cluster down
   */
  async scaleDown(nodeIds: string[]): Promise<void> {
    try {
      for (const nodeId of nodeIds) {
        await this.removeNode(nodeId);
      }

      // Rebalance after removing nodes
      if (this.config.sharding.autoRebalance) {
        await this.rebalanceCluster();
      }

      this.logger.info('Cluster scaled down', { removedNodes: nodeIds.length });
      this.emit('cluster_scaled_down', { removedNodes: nodeIds });

    } catch (error) {
      this.logger.error('Failed to scale cluster down', { error: error.message });
      throw error;
    }
  }

  /**
   * Get cluster health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    recommendations: string[];
  }> {
    const stats = await this.getClusterStats();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check cluster health
    if (!stats.clusterSlotsOk) {
      issues.push('Cluster slots not properly distributed');
      recommendations.push('Run cluster rebalancing');
    }

    if (stats.unhealthyNodes > 0) {
      issues.push(`${stats.unhealthyNodes} nodes are unhealthy`);
      recommendations.push('Check node connectivity and resources');
    }

    if (stats.replicationStatus !== 'healthy') {
      issues.push('Replication is degraded');
      recommendations.push('Check slave node connectivity');
    }

    if (stats.averageLatency > this.config.monitoring.slowLogThreshold) {
      issues.push('High average latency detected');
      recommendations.push('Check network and resource usage');
    }

    const status = issues.length === 0 ? 'healthy' : 
                  issues.length <= 2 ? 'degraded' : 'unhealthy';

    return { status, issues, recommendations };
  }

  /**
   * Private helper methods
   */
  private async waitForClusterReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isInitialized) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Cluster initialization timeout'));
      }, 30000);

      this.once('cluster_ready', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  private async startClusterDiscovery(): Promise<void> {
    try {
      await this.discoverNodes();
      await this.discoverShards();
      
      // Start periodic discovery
      setInterval(() => {
        this.discoverNodes().catch(error => 
          this.logger.error('Node discovery failed', { error: error.message })
        );
      }, 30000); // Every 30 seconds

    } catch (error) {
      this.logger.error('Cluster discovery failed', { error: error.message });
    }
  }

  private async discoverNodes(): Promise<void> {
    try {
      const clusterNodes = await this.cluster.cluster('nodes');
      const lines = clusterNodes.split('\n').filter(line => line.trim());

      this.nodes.clear();

      for (const line of lines) {
        const parts = line.split(' ');
        if (parts.length < 8) continue;

        const [nodeId, endpoint, flags, master, pingSent, pongRecv, configEpoch, linkState, ...slots] = parts;
        const [host, port] = endpoint.split(':');

        const nodeStats: NodeStats = {
          nodeId,
          host,
          port: parseInt(port),
          role: flags.includes('master') ? 'master' : 'slave',
          connected: linkState === 'connected',
          lastSeen: new Date(),
          memoryUsage: 0, // Will be updated by monitoring
          connections: 0, // Will be updated by monitoring
          operationsPerSecond: 0, // Will be updated by monitoring
          latency: 0, // Will be updated by monitoring
          slots: this.parseSlots(slots),
          slaves: []
        };

        this.nodes.set(`${host}:${port}`, nodeStats);
      }

    } catch (error) {
      this.logger.error('Failed to discover nodes', { error: error.message });
    }
  }

  private async discoverShards(): Promise<void> {
    this.shards.clear();

    const masterNodes = Array.from(this.nodes.values()).filter(n => n.role === 'master');

    for (const master of masterNodes) {
      const slaveNodes = Array.from(this.nodes.values()).filter(
        n => n.role === 'slave' // In real implementation, would check master relationship
      );

      const shardInfo: ShardInfo = {
        shardId: master.nodeId,
        master,
        slaves: slaveNodes,
        slots: master.slots,
        healthy: master.connected && slaveNodes.every(s => s.connected)
      };

      this.shards.set(master.nodeId, shardInfo);
    }
  }

  private parseSlots(slots: string[]): number[] {
    const result: number[] = [];
    
    for (const slot of slots) {
      if (slot.includes('-')) {
        const [start, end] = slot.split('-').map(Number);
        for (let i = start; i <= end; i++) {
          result.push(i);
        }
      } else if (!isNaN(parseInt(slot))) {
        result.push(parseInt(slot));
      }
    }

    return result;
  }

  private async migrateSlots(fromNodeId: string, slots: number[]): Promise<void> {
    const targetNodes = Array.from(this.nodes.values()).filter(
      n => n.role === 'master' && n.nodeId !== fromNodeId
    );

    if (targetNodes.length === 0) {
      throw new Error('No target nodes available for slot migration');
    }

    const slotsPerNode = Math.ceil(slots.length / targetNodes.length);
    
    for (let i = 0; i < targetNodes.length; i++) {
      const targetNode = targetNodes[i];
      const nodeSlots = slots.slice(i * slotsPerNode, (i + 1) * slotsPerNode);
      
      if (nodeSlots.length === 0) break;

      // Migrate slots to target node
      await this.shardingManager.migrateSlots(fromNodeId, targetNode.nodeId, nodeSlots);
    }
  }

  private getReplicationStatus(): 'healthy' | 'degraded' | 'failed' {
    const masterShards = Array.from(this.shards.values());
    const healthyShards = masterShards.filter(s => s.healthy);
    
    if (healthyShards.length === masterShards.length) {
      return 'healthy';
    } else if (healthyShards.length >= masterShards.length * 0.8) {
      return 'degraded';
    } else {
      return 'failed';
    }
  }

  private handleNodeError(node: any, error: Error): void {
    const nodeId = `${node.options.host}:${node.options.port}`;
    const nodeStats = this.nodes.get(nodeId);
    
    if (nodeStats) {
      nodeStats.connected = false;
      this.emit('node_error', { nodeId, error });
    }
  }

  private handleNodeAdded(node: any): void {
    // Refresh cluster topology
    this.discoverNodes().catch(error => 
      this.logger.error('Failed to refresh nodes after addition', { error: error.message })
    );
  }

  private handleNodeRemoved(node: any): void {
    const nodeId = `${node.options.host}:${node.options.port}`;
    this.nodes.delete(nodeId);
    
    // Remove from shards
    for (const [shardId, shard] of this.shards) {
      if (shard.master.nodeId === nodeId) {
        this.shards.delete(shardId);
      } else {
        shard.slaves = shard.slaves.filter(s => s.nodeId !== nodeId);
      }
    }
  }

  private handleUnhealthyNode(nodeId: string): void {
    this.logger.warn('Node marked as unhealthy', { nodeId });
    
    if (this.config.failover.automaticFailover) {
      const node = this.nodes.get(nodeId);
      if (node && node.role === 'master') {
        this.failoverManager.triggerFailover(nodeId).catch(error => 
          this.logger.error('Automatic failover failed', { nodeId, error: error.message })
        );
      }
    }
  }

  private handleClusterDegraded(stats: ClusterStats): void {
    this.logger.warn('Cluster performance degraded', stats);
    this.emit('cluster_degraded', stats);
  }
}

/**
 * Cluster monitoring component
 */
class ClusterMonitoring extends EventEmitter {
  private isRunning = false;

  constructor(
    private readonly cluster: Cluster,
    private readonly config: MonitoringConfig,
    private readonly logger: Logger
  ) {
    super();
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startHealthChecks();
    this.startPerformanceMonitoring();
  }

  stop(): void {
    this.isRunning = false;
  }

  private startHealthChecks(): void {
    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }

      this.performHealthCheck().catch(error => 
        this.logger.error('Health check failed', { error: error.message })
      );
    }, this.config.healthCheckInterval);
  }

  private startPerformanceMonitoring(): void {
    if (!this.config.performanceMetrics) return;

    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }

      this.collectPerformanceMetrics().catch(error => 
        this.logger.error('Performance monitoring failed', { error: error.message })
      );
    }, 30000); // Every 30 seconds
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const nodes = await this.cluster.cluster('nodes');
      const lines = nodes.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const parts = line.split(' ');
        if (parts.length < 8) continue;

        const [nodeId, endpoint, flags, , , , , linkState] = parts;
        const [host, port] = endpoint.split(':');
        const nodeKey = `${host}:${port}`;

        if (linkState !== 'connected') {
          this.emit('node_unhealthy', nodeKey);
        }
      }

    } catch (error) {
      this.logger.error('Health check failed', { error: error.message });
    }
  }

  private async collectPerformanceMetrics(): Promise<void> {
    try {
      const info = await this.cluster.info();
      const memoryUsage = this.parseInfoValue(info, 'used_memory');
      const connections = this.parseInfoValue(info, 'connected_clients');

      if (memoryUsage > this.config.memoryThreshold) {
        this.emit('high_memory_usage', { memoryUsage });
      }

      if (connections > this.config.connectionThreshold) {
        this.emit('high_connection_count', { connections });
      }

    } catch (error) {
      this.logger.error('Performance metrics collection failed', { error: error.message });
    }
  }

  private parseInfoValue(info: string, key: string): number {
    const line = info.split('\n').find(l => l.startsWith(key + ':'));
    return line ? parseInt(line.split(':')[1]) : 0;
  }
}

/**
 * Failover management component
 */
class FailoverManager extends EventEmitter {
  private isRunning = false;

  constructor(
    private readonly cluster: Cluster,
    private readonly config: FailoverConfig,
    private readonly logger: Logger
  ) {
    super();
  }

  start(): void {
    this.isRunning = true;
  }

  stop(): void {
    this.isRunning = false;
  }

  async triggerFailover(masterNodeId: string, targetSlaveId?: string): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Failover is disabled');
    }

    try {
      this.emit('failover_initiated', { masterNodeId, targetSlaveId });

      // Implementation would depend on specific failover strategy
      // This is a simplified version
      if (targetSlaveId) {
        // Manual failover to specific slave
        await this.cluster.cluster('failover');
      } else {
        // Automatic failover
        await this.cluster.cluster('failover');
      }

      this.emit('failover_completed', { masterNodeId, newMaster: targetSlaveId });

    } catch (error) {
      this.logger.error('Failover failed', { 
        masterNodeId, 
        targetSlaveId, 
        error: error.message 
      });
      throw error;
    }
  }
}

/**
 * Sharding management component
 */
class ShardingManager extends EventEmitter {
  private isRunning = false;

  constructor(
    private readonly cluster: Cluster,
    private readonly config: ShardingConfig,
    private readonly logger: Logger
  ) {
    super();
  }

  start(): void {
    this.isRunning = true;
    
    if (this.config.autoRebalance) {
      this.startRebalanceMonitoring();
    }
  }

  stop(): void {
    this.isRunning = false;
  }

  async rebalanceCluster(): Promise<void> {
    try {
      this.logger.info('Starting cluster rebalancing');
      
      // Implementation would depend on sharding strategy
      // This is a simplified version
      await this.cluster.cluster('rebalance');
      
      this.logger.info('Cluster rebalancing completed');

    } catch (error) {
      this.logger.error('Cluster rebalancing failed', { error: error.message });
      throw error;
    }
  }

  async migrateSlots(sourceNodeId: string, targetNodeId: string, slots: number[]): Promise<void> {
    try {
      for (const slot of slots) {
        await this.cluster.cluster('setslot', slot, 'migrating', targetNodeId);
        await this.cluster.cluster('setslot', slot, 'importing', sourceNodeId);
        await this.cluster.cluster('setslot', slot, 'node', targetNodeId);
      }

      this.logger.info('Slot migration completed', { 
        sourceNodeId, 
        targetNodeId, 
        slots: slots.length 
      });

    } catch (error) {
      this.logger.error('Slot migration failed', { error: error.message });
      throw error;
    }
  }

  private startRebalanceMonitoring(): void {
    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }

      this.checkRebalanceNeeded().catch(error => 
        this.logger.error('Rebalance check failed', { error: error.message })
      );
    }, 300000); // Every 5 minutes
  }

  private async checkRebalanceNeeded(): Promise<void> {
    try {
      // Check if cluster needs rebalancing
      const nodes = await this.cluster.cluster('nodes');
      const imbalance = this.calculateImbalance(nodes);

      if (imbalance > this.config.rebalanceThreshold) {
        this.emit('rebalance_needed', { imbalance });
        
        if (this.config.autoRebalance) {
          await this.rebalanceCluster();
        }
      }

    } catch (error) {
      this.logger.error('Rebalance check failed', { error: error.message });
    }
  }

  private calculateImbalance(nodes: string): number {
    // Simplified imbalance calculation
    // In real implementation, would analyze slot distribution
    return Math.random() * 100; // Placeholder
  }
}