/*
                     @semantest/analytics-dashboard

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
 * @fileoverview Real-time Data Streaming Service
 * @author Semantest Team
 * @module application/services/RealTimeStreamingService
 */

import { Server, Socket } from 'socket.io';
import { Redis } from 'ioredis';
import { EventSubscriber } from '@shared/infrastructure/event-subscriber';
import { Logger } from '@shared/infrastructure/logger';
import { MetricCollectedEvent } from '@domain/events/metric-collected.event';
import { MetricAggregatedEvent } from '@domain/events/metric-aggregated.event';

export interface StreamingClient {
  id: string;
  socket: Socket;
  subscriptions: Set<string>;
  filters: StreamingFilters;
  connectedAt: Date;
  lastActivity: Date;
}

export interface StreamingFilters {
  metricNames?: string[];
  metricTypes?: string[];
  sources?: string[];
  tags?: Record<string, string>;
  minValue?: number;
  maxValue?: number;
}

export interface StreamingMessage {
  type: string;
  data: any;
  timestamp: Date;
  clientId?: string;
}

export interface DashboardUpdate {
  metricName: string;
  value: number | string | boolean | object;
  timestamp: Date;
  tags: Record<string, string>;
  source: string;
  change?: {
    previous: any;
    current: any;
    percentage: number;
  };
}

/**
 * Real-time data streaming service using WebSockets and Redis
 */
export class RealTimeStreamingService {
  private clients: Map<string, StreamingClient> = new Map();
  private metricSubscriptions: Map<string, Set<string>> = new Map();
  private clientHeartbeats: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly io: Server,
    private readonly redis: Redis,
    private readonly eventSubscriber: EventSubscriber,
    private readonly logger: Logger
  ) {
    this.initializeEventHandlers();
    this.initializeSocketHandlers();
    this.startHeartbeatMonitoring();
  }

  /**
   * Initialize event handlers for domain events
   */
  private initializeEventHandlers(): void {
    this.eventSubscriber.subscribe('MetricCollected', this.handleMetricCollected.bind(this));
    this.eventSubscriber.subscribe('MetricAggregated', this.handleMetricAggregated.bind(this));
  }

  /**
   * Initialize Socket.IO handlers
   */
  private initializeSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleClientConnection(socket);

      socket.on('subscribe', (data) => this.handleSubscription(socket, data));
      socket.on('unsubscribe', (data) => this.handleUnsubscription(socket, data));
      socket.on('setFilters', (filters) => this.handleFiltersUpdate(socket, filters));
      socket.on('ping', () => this.handlePing(socket));
      socket.on('disconnect', () => this.handleClientDisconnection(socket));
    });
  }

  /**
   * Handle new client connection
   */
  private handleClientConnection(socket: Socket): void {
    const client: StreamingClient = {
      id: socket.id,
      socket,
      subscriptions: new Set(),
      filters: {},
      connectedAt: new Date(),
      lastActivity: new Date()
    };

    this.clients.set(socket.id, client);
    this.startClientHeartbeat(socket.id);

    this.logger.info('Client connected to streaming service', { 
      clientId: socket.id,
      totalClients: this.clients.size
    });

    // Send welcome message with available metrics
    socket.emit('connected', {
      clientId: socket.id,
      serverTime: new Date().toISOString(),
      availableChannels: this.getAvailableChannels()
    });
  }

  /**
   * Handle client disconnection
   */
  private handleClientDisconnection(socket: Socket): void {
    const client = this.clients.get(socket.id);
    if (client) {
      // Remove client from all subscriptions
      client.subscriptions.forEach(channel => {
        const subscribers = this.metricSubscriptions.get(channel);
        if (subscribers) {
          subscribers.delete(socket.id);
          if (subscribers.size === 0) {
            this.metricSubscriptions.delete(channel);
          }
        }
      });

      this.clients.delete(socket.id);
      this.stopClientHeartbeat(socket.id);

      this.logger.info('Client disconnected from streaming service', { 
        clientId: socket.id,
        totalClients: this.clients.size
      });
    }
  }

  /**
   * Handle subscription request
   */
  private handleSubscription(socket: Socket, data: { channels: string[] }): void {
    const client = this.clients.get(socket.id);
    if (!client) return;

    data.channels.forEach(channel => {
      client.subscriptions.add(channel);
      
      if (!this.metricSubscriptions.has(channel)) {
        this.metricSubscriptions.set(channel, new Set());
      }
      this.metricSubscriptions.get(channel)!.add(socket.id);
    });

    client.lastActivity = new Date();

    this.logger.debug('Client subscribed to channels', { 
      clientId: socket.id,
      channels: data.channels
    });

    socket.emit('subscribed', { 
      channels: data.channels,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle unsubscription request
   */
  private handleUnsubscription(socket: Socket, data: { channels: string[] }): void {
    const client = this.clients.get(socket.id);
    if (!client) return;

    data.channels.forEach(channel => {
      client.subscriptions.delete(channel);
      
      const subscribers = this.metricSubscriptions.get(channel);
      if (subscribers) {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          this.metricSubscriptions.delete(channel);
        }
      }
    });

    client.lastActivity = new Date();

    this.logger.debug('Client unsubscribed from channels', { 
      clientId: socket.id,
      channels: data.channels
    });

    socket.emit('unsubscribed', { 
      channels: data.channels,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle filters update
   */
  private handleFiltersUpdate(socket: Socket, filters: StreamingFilters): void {
    const client = this.clients.get(socket.id);
    if (!client) return;

    client.filters = filters;
    client.lastActivity = new Date();

    this.logger.debug('Client updated filters', { 
      clientId: socket.id,
      filters
    });

    socket.emit('filtersUpdated', { 
      filters,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle ping from client
   */
  private handlePing(socket: Socket): void {
    const client = this.clients.get(socket.id);
    if (client) {
      client.lastActivity = new Date();
    }

    socket.emit('pong', { 
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle metric collected event
   */
  private async handleMetricCollected(event: MetricCollectedEvent): Promise<void> {
    try {
      const update: DashboardUpdate = {
        metricName: event.metricName,
        value: event.value,
        timestamp: event.collectedAt,
        tags: event.tags,
        source: event.source
      };

      // Stream to Redis for horizontal scaling
      await this.redis.publish('metrics:stream', JSON.stringify({
        type: 'metric_collected',
        data: update
      }));

      // Stream to connected clients
      await this.streamToClients('metric_collected', update);

      this.logger.debug('Streamed metric collected event', { 
        metricId: event.metricId,
        metricName: event.metricName
      });
    } catch (error) {
      this.logger.error('Failed to handle metric collected event', { 
        error: error.message,
        metricId: event.metricId
      });
    }
  }

  /**
   * Handle metric aggregated event
   */
  private async handleMetricAggregated(event: MetricAggregatedEvent): Promise<void> {
    try {
      const update: DashboardUpdate = {
        metricName: event.metricName,
        value: event.aggregatedValue,
        timestamp: event.aggregatedAt,
        tags: { aggregation_method: event.aggregationMethod },
        source: 'aggregation'
      };

      // Stream to Redis
      await this.redis.publish('metrics:stream', JSON.stringify({
        type: 'metric_aggregated',
        data: update
      }));

      // Stream to connected clients
      await this.streamToClients('metric_aggregated', update);

      this.logger.debug('Streamed metric aggregated event', { 
        metricName: event.metricName,
        aggregationMethod: event.aggregationMethod
      });
    } catch (error) {
      this.logger.error('Failed to handle metric aggregated event', { 
        error: error.message,
        metricName: event.metricName
      });
    }
  }

  /**
   * Stream data to connected clients
   */
  private async streamToClients(messageType: string, data: any): Promise<void> {
    const relevantChannels = this.getRelevantChannels(data);
    
    for (const channel of relevantChannels) {
      const subscribers = this.metricSubscriptions.get(channel);
      if (!subscribers) continue;

      for (const clientId of subscribers) {
        const client = this.clients.get(clientId);
        if (!client) continue;

        // Apply client filters
        if (this.passesClientFilters(data, client.filters)) {
          client.socket.emit(messageType, {
            channel,
            data,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  }

  /**
   * Get relevant channels for data
   */
  private getRelevantChannels(data: any): string[] {
    const channels: string[] = [];
    
    // General channels
    channels.push('all_metrics');
    
    // Metric-specific channels
    if (data.metricName) {
      channels.push(`metric:${data.metricName}`);
    }
    
    // Source-specific channels
    if (data.source) {
      channels.push(`source:${data.source}`);
    }
    
    // Tag-based channels
    if (data.tags) {
      Object.entries(data.tags).forEach(([key, value]) => {
        channels.push(`tag:${key}:${value}`);
      });
    }
    
    return channels;
  }

  /**
   * Check if data passes client filters
   */
  private passesClientFilters(data: any, filters: StreamingFilters): boolean {
    if (filters.metricNames && !filters.metricNames.includes(data.metricName)) {
      return false;
    }

    if (filters.sources && !filters.sources.includes(data.source)) {
      return false;
    }

    if (typeof data.value === 'number') {
      if (filters.minValue !== undefined && data.value < filters.minValue) {
        return false;
      }
      if (filters.maxValue !== undefined && data.value > filters.maxValue) {
        return false;
      }
    }

    if (filters.tags) {
      for (const [key, value] of Object.entries(filters.tags)) {
        if (!data.tags || data.tags[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Start heartbeat monitoring for a client
   */
  private startClientHeartbeat(clientId: string): void {
    const heartbeat = setInterval(() => {
      const client = this.clients.get(clientId);
      if (!client) {
        clearInterval(heartbeat);
        return;
      }

      const now = new Date();
      const timeSinceActivity = now.getTime() - client.lastActivity.getTime();
      
      // Disconnect inactive clients (30 seconds)
      if (timeSinceActivity > 30000) {
        this.logger.warn('Disconnecting inactive client', { clientId });
        client.socket.disconnect();
        clearInterval(heartbeat);
      }
    }, 10000); // Check every 10 seconds

    this.clientHeartbeats.set(clientId, heartbeat);
  }

  /**
   * Stop heartbeat monitoring for a client
   */
  private stopClientHeartbeat(clientId: string): void {
    const heartbeat = this.clientHeartbeats.get(clientId);
    if (heartbeat) {
      clearInterval(heartbeat);
      this.clientHeartbeats.delete(clientId);
    }
  }

  /**
   * Start general heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    setInterval(() => {
      this.logger.debug('Streaming service status', {
        connectedClients: this.clients.size,
        activeSubscriptions: this.metricSubscriptions.size
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Get available channels
   */
  private getAvailableChannels(): string[] {
    return [
      'all_metrics',
      'metric:*',
      'source:*',
      'tag:*'
    ];
  }

  /**
   * Broadcast message to all clients
   */
  async broadcastToAll(messageType: string, data: any): Promise<void> {
    this.io.emit(messageType, {
      data,
      timestamp: new Date().toISOString()
    });

    this.logger.debug('Broadcasted message to all clients', { 
      messageType,
      clientCount: this.clients.size
    });
  }

  /**
   * Send message to specific client
   */
  async sendToClient(clientId: string, messageType: string, data: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    client.socket.emit(messageType, {
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get connected clients statistics
   */
  getConnectedClientsStats(): any {
    return {
      totalClients: this.clients.size,
      totalSubscriptions: Array.from(this.metricSubscriptions.values())
        .reduce((sum, subscribers) => sum + subscribers.size, 0),
      clients: Array.from(this.clients.values()).map(client => ({
        id: client.id,
        connectedAt: client.connectedAt,
        lastActivity: client.lastActivity,
        subscriptions: Array.from(client.subscriptions),
        filters: client.filters
      }))
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Clear all heartbeat intervals
    this.clientHeartbeats.forEach(heartbeat => clearInterval(heartbeat));
    this.clientHeartbeats.clear();

    // Disconnect all clients
    this.clients.forEach(client => client.socket.disconnect());
    this.clients.clear();

    // Clear subscriptions
    this.metricSubscriptions.clear();

    this.logger.info('Real-time streaming service cleaned up');
  }
}