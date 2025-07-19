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
 * @fileoverview Event Store Implementation for Event Sourcing
 * @author Semantest Team
 * @module infrastructure/events/EventStore
 */

import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { Logger } from '@shared/infrastructure/logger';
import * as crypto from 'crypto';

export interface Event {
  eventId: string;
  streamId: string;
  eventType: string;
  eventVersion: number;
  data: any;
  metadata: EventMetadata;
  timestamp: Date;
}

export interface EventMetadata {
  timestamp: Date;
  source?: string;
  correlationId?: string;
  causationId?: string;
  userId?: string;
  traceId?: string;
  [key: string]: any;
}

export interface EventStream {
  streamId: string;
  version: number;
  events: Event[];
  metadata: StreamMetadata;
}

export interface StreamMetadata {
  createdAt: Date;
  updatedAt: Date;
  eventCount: number;
  isDeleted: boolean;
  [key: string]: any;
}

export interface AppendEventRequest {
  streamId: string;
  eventType: string;
  data: any;
  metadata: Partial<EventMetadata>;
  expectedVersion?: number;
}

export interface EventFilter {
  streamId?: string;
  eventType?: string[];
  fromVersion?: number;
  toVersion?: number;
  fromTimestamp?: Date;
  toTimestamp?: Date;
  limit?: number;
  offset?: number;
}

export interface Snapshot {
  streamId: string;
  version: number;
  data: any;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface EventStoreConfig {
  redis: Redis;
  snapshotInterval?: number;
  maxEventsBeforeSnapshot?: number;
  eventRetentionDays?: number;
}

export interface ProjectionHandler {
  eventType: string;
  handler: (event: Event) => Promise<void>;
}

export interface EventStreamStats {
  totalStreams: number;
  totalEvents: number;
  eventsPerSecond: number;
  averageEventsPerStream: number;
  diskUsage: number;
}

/**
 * Event Store implementation with Redis backend
 */
export class EventStore extends EventEmitter {
  private readonly snapshotInterval: number;
  private readonly maxEventsBeforeSnapshot: number;
  private readonly eventRetentionDays: number;
  private projectionHandlers: Map<string, ProjectionHandler[]> = new Map();
  private metricsCache = new Map<string, number>();

  constructor(
    private readonly config: EventStoreConfig,
    private readonly logger: Logger
  ) {
    super();
    this.snapshotInterval = config.snapshotInterval || 100;
    this.maxEventsBeforeSnapshot = config.maxEventsBeforeSnapshot || 1000;
    this.eventRetentionDays = config.eventRetentionDays || 365;
    
    this.startMaintenanceTasks();
  }

  /**
   * Append event to stream
   */
  async append(request: AppendEventRequest): Promise<Event> {
    try {
      const streamKey = this.getStreamKey(request.streamId);
      const metadataKey = this.getStreamMetadataKey(request.streamId);

      // Get current stream version
      const currentVersion = await this.getStreamVersion(request.streamId);
      
      // Check expected version for optimistic concurrency
      if (request.expectedVersion !== undefined && request.expectedVersion !== currentVersion) {
        throw new Error(`Concurrency conflict: expected version ${request.expectedVersion}, actual version ${currentVersion}`);
      }

      const newVersion = currentVersion + 1;
      const eventId = this.generateEventId();

      // Create event
      const event: Event = {
        eventId,
        streamId: request.streamId,
        eventType: request.eventType,
        eventVersion: newVersion,
        data: request.data,
        metadata: {
          timestamp: new Date(),
          ...request.metadata
        },
        timestamp: new Date()
      };

      // Use Redis transaction for atomicity
      const multi = this.config.redis.multi();
      
      // Add event to stream
      multi.rpush(streamKey, JSON.stringify(event));
      
      // Update stream metadata
      const streamMetadata: StreamMetadata = {
        createdAt: currentVersion === 0 ? new Date() : await this.getStreamCreatedAt(request.streamId),
        updatedAt: new Date(),
        eventCount: newVersion,
        isDeleted: false
      };
      
      multi.hset(metadataKey, {
        version: newVersion,
        metadata: JSON.stringify(streamMetadata)
      });

      // Add to global event log with timestamp-based ordering
      const globalKey = this.getGlobalEventKey();
      multi.zadd(globalKey, Date.now(), JSON.stringify({
        streamId: request.streamId,
        eventId,
        eventType: request.eventType,
        timestamp: event.timestamp
      }));

      // Add to event type index
      const typeIndexKey = this.getEventTypeIndexKey(request.eventType);
      multi.zadd(typeIndexKey, Date.now(), eventId);

      await multi.exec();

      // Update metrics
      await this.updateMetrics(request.streamId, request.eventType);

      // Emit event for real-time processing
      this.emit('event', event);
      this.emit(`event:${request.eventType}`, event);
      this.emit(`stream:${request.streamId}`, event);

      // Process projections
      await this.processProjections(event);

      // Check if snapshot is needed
      if (newVersion % this.snapshotInterval === 0 || newVersion >= this.maxEventsBeforeSnapshot) {
        this.createSnapshot(request.streamId, newVersion).catch(error => {
          this.logger.warn('Failed to create snapshot', { streamId: request.streamId, error: error.message });
        });
      }

      this.logger.debug('Event appended', {
        streamId: request.streamId,
        eventType: request.eventType,
        eventId,
        version: newVersion
      });

      return event;

    } catch (error) {
      this.logger.error('Failed to append event', {
        streamId: request.streamId,
        eventType: request.eventType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Read events from stream
   */
  async readStream(streamId: string, fromVersion: number = 0, limit?: number): Promise<Event[]> {
    try {
      const streamKey = this.getStreamKey(streamId);
      
      const start = fromVersion;
      const end = limit ? start + limit - 1 : -1;
      
      const eventData = await this.config.redis.lrange(streamKey, start, end);
      
      const events: Event[] = eventData.map(data => JSON.parse(data));
      
      this.logger.debug('Stream read', {
        streamId,
        fromVersion,
        eventsCount: events.length
      });

      return events;

    } catch (error) {
      this.logger.error('Failed to read stream', {
        streamId,
        fromVersion,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Read events with filter
   */
  async readEvents(filter: EventFilter): Promise<Event[]> {
    try {
      const events: Event[] = [];

      if (filter.streamId) {
        // Read from specific stream
        const streamEvents = await this.readStream(
          filter.streamId,
          filter.fromVersion || 0,
          filter.limit
        );
        
        events.push(...this.filterEvents(streamEvents, filter));
      } else {
        // Read from global event log
        const globalEvents = await this.readGlobalEvents(filter);
        events.push(...globalEvents);
      }

      return events.slice(filter.offset || 0, (filter.offset || 0) + (filter.limit || events.length));

    } catch (error) {
      this.logger.error('Failed to read events', { filter, error: error.message });
      throw error;
    }
  }

  /**
   * Get stream information
   */
  async getStreamInfo(streamId: string): Promise<EventStream | null> {
    try {
      const metadataKey = this.getStreamMetadataKey(streamId);
      const metadataExists = await this.config.redis.exists(metadataKey);
      
      if (!metadataExists) {
        return null;
      }

      const metadataHash = await this.config.redis.hgetall(metadataKey);
      const metadata: StreamMetadata = JSON.parse(metadataHash.metadata || '{}');
      const version = parseInt(metadataHash.version || '0', 10);

      // Get recent events (last 10)
      const events = await this.readStream(streamId, Math.max(0, version - 10));

      return {
        streamId,
        version,
        events,
        metadata
      };

    } catch (error) {
      this.logger.error('Failed to get stream info', { streamId, error: error.message });
      throw error;
    }
  }

  /**
   * Create snapshot
   */
  async createSnapshot(streamId: string, version?: number): Promise<void> {
    try {
      const currentVersion = version || await this.getStreamVersion(streamId);
      if (currentVersion === 0) return;

      // Get aggregate state by replaying events
      const events = await this.readStream(streamId);
      const aggregateState = await this.buildAggregateState(events);

      const snapshot: Snapshot = {
        streamId,
        version: currentVersion,
        data: aggregateState,
        timestamp: new Date(),
        metadata: {
          eventCount: events.length,
          createdAt: new Date()
        }
      };

      const snapshotKey = this.getSnapshotKey(streamId);
      await this.config.redis.set(snapshotKey, JSON.stringify(snapshot));

      this.logger.debug('Snapshot created', { streamId, version: currentVersion });

    } catch (error) {
      this.logger.error('Failed to create snapshot', { streamId, error: error.message });
      throw error;
    }
  }

  /**
   * Get latest snapshot
   */
  async getSnapshot(streamId: string): Promise<Snapshot | null> {
    try {
      const snapshotKey = this.getSnapshotKey(streamId);
      const snapshotData = await this.config.redis.get(snapshotKey);
      
      if (!snapshotData) {
        return null;
      }

      return JSON.parse(snapshotData);

    } catch (error) {
      this.logger.error('Failed to get snapshot', { streamId, error: error.message });
      throw error;
    }
  }

  /**
   * Register projection handler
   */
  registerProjection(handler: ProjectionHandler): void {
    if (!this.projectionHandlers.has(handler.eventType)) {
      this.projectionHandlers.set(handler.eventType, []);
    }
    
    this.projectionHandlers.get(handler.eventType)!.push(handler);
    
    this.logger.info('Projection handler registered', { eventType: handler.eventType });
  }

  /**
   * Delete stream
   */
  async deleteStream(streamId: string, hardDelete: boolean = false): Promise<void> {
    try {
      if (hardDelete) {
        // Hard delete - remove all data
        const streamKey = this.getStreamKey(streamId);
        const metadataKey = this.getStreamMetadataKey(streamId);
        const snapshotKey = this.getSnapshotKey(streamId);

        await this.config.redis.del(streamKey, metadataKey, snapshotKey);
      } else {
        // Soft delete - mark as deleted
        const metadataKey = this.getStreamMetadataKey(streamId);
        const currentMetadata = await this.config.redis.hget(metadataKey, 'metadata');
        
        if (currentMetadata) {
          const metadata: StreamMetadata = JSON.parse(currentMetadata);
          metadata.isDeleted = true;
          metadata.updatedAt = new Date();
          
          await this.config.redis.hset(metadataKey, 'metadata', JSON.stringify(metadata));
        }
      }

      this.logger.info('Stream deleted', { streamId, hardDelete });

    } catch (error) {
      this.logger.error('Failed to delete stream', { streamId, error: error.message });
      throw error;
    }
  }

  /**
   * Get event store statistics
   */
  async getStats(): Promise<EventStreamStats> {
    try {
      const totalStreams = await this.getTotalStreamCount();
      const totalEvents = await this.getTotalEventCount();
      const eventsPerSecond = await this.getEventsPerSecond();
      
      return {
        totalStreams,
        totalEvents,
        eventsPerSecond,
        averageEventsPerStream: totalStreams > 0 ? totalEvents / totalStreams : 0,
        diskUsage: await this.estimateDiskUsage()
      };

    } catch (error) {
      this.logger.error('Failed to get stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async getStreamVersion(streamId: string): Promise<number> {
    const metadataKey = this.getStreamMetadataKey(streamId);
    const version = await this.config.redis.hget(metadataKey, 'version');
    return parseInt(version || '0', 10);
  }

  private async getStreamCreatedAt(streamId: string): Promise<Date> {
    const metadataKey = this.getStreamMetadataKey(streamId);
    const metadataJson = await this.config.redis.hget(metadataKey, 'metadata');
    
    if (metadataJson) {
      const metadata: StreamMetadata = JSON.parse(metadataJson);
      return metadata.createdAt;
    }
    
    return new Date();
  }

  private async readGlobalEvents(filter: EventFilter): Promise<Event[]> {
    const globalKey = this.getGlobalEventKey();
    const start = filter.fromTimestamp ? filter.fromTimestamp.getTime() : '-inf';
    const end = filter.toTimestamp ? filter.toTimestamp.getTime() : '+inf';
    
    const globalEventData = await this.config.redis.zrangebyscore(
      globalKey,
      start,
      end,
      'LIMIT',
      filter.offset || 0,
      filter.limit || 100
    );

    const events: Event[] = [];
    
    for (const data of globalEventData) {
      const globalEvent = JSON.parse(data);
      
      // Load full event from stream
      const streamEvents = await this.readStream(globalEvent.streamId);
      const fullEvent = streamEvents.find(e => e.eventId === globalEvent.eventId);
      
      if (fullEvent && this.eventMatchesFilter(fullEvent, filter)) {
        events.push(fullEvent);
      }
    }

    return events;
  }

  private filterEvents(events: Event[], filter: EventFilter): Event[] {
    return events.filter(event => this.eventMatchesFilter(event, filter));
  }

  private eventMatchesFilter(event: Event, filter: EventFilter): boolean {
    if (filter.eventType && !filter.eventType.includes(event.eventType)) {
      return false;
    }

    if (filter.fromVersion && event.eventVersion < filter.fromVersion) {
      return false;
    }

    if (filter.toVersion && event.eventVersion > filter.toVersion) {
      return false;
    }

    if (filter.fromTimestamp && event.timestamp < filter.fromTimestamp) {
      return false;
    }

    if (filter.toTimestamp && event.timestamp > filter.toTimestamp) {
      return false;
    }

    return true;
  }

  private async processProjections(event: Event): Promise<void> {
    const handlers = this.projectionHandlers.get(event.eventType) || [];
    
    const processingPromises = handlers.map(async (handler) => {
      try {
        await handler.handler(event);
      } catch (error) {
        this.logger.error('Projection handler failed', {
          eventType: event.eventType,
          eventId: event.eventId,
          error: error.message
        });
        this.emit('projection_error', { event, handler, error });
      }
    });

    await Promise.allSettled(processingPromises);
  }

  private async buildAggregateState(events: Event[]): Promise<any> {
    // This would be implemented based on specific aggregate logic
    // For now, return a simple state representation
    return {
      lastEventId: events[events.length - 1]?.eventId,
      eventCount: events.length,
      lastUpdated: new Date()
    };
  }

  private async updateMetrics(streamId: string, eventType: string): Promise<void> {
    const now = Date.now();
    const metricsKey = 'metrics:events_per_second';
    
    // Update events per second counter
    await this.config.redis.zadd(metricsKey, now, `${now}:${eventType}`);
    
    // Clean old metrics (older than 1 minute)
    const oneMinuteAgo = now - 60000;
    await this.config.redis.zremrangebyscore(metricsKey, '-inf', oneMinuteAgo);
  }

  private async getTotalStreamCount(): Promise<number> {
    const pattern = this.getStreamMetadataKey('*');
    const keys = await this.config.redis.keys(pattern);
    return keys.length;
  }

  private async getTotalEventCount(): Promise<number> {
    const globalKey = this.getGlobalEventKey();
    return await this.config.redis.zcard(globalKey);
  }

  private async getEventsPerSecond(): Promise<number> {
    const metricsKey = 'metrics:events_per_second';
    const oneMinuteAgo = Date.now() - 60000;
    const count = await this.config.redis.zcount(metricsKey, oneMinuteAgo, '+inf');
    return count / 60; // Events per second over last minute
  }

  private async estimateDiskUsage(): Promise<number> {
    // Estimate disk usage based on Redis memory usage
    const info = await this.config.redis.memory('usage', 'event_store');
    return parseInt(info || '0', 10);
  }

  private startMaintenanceTasks(): void {
    // Cleanup old events every hour
    setInterval(async () => {
      await this.cleanupOldEvents();
    }, 3600000); // 1 hour

    // Update metrics every 10 seconds
    setInterval(async () => {
      await this.updateCachedMetrics();
    }, 10000); // 10 seconds
  }

  private async cleanupOldEvents(): Promise<void> {
    try {
      const cutoffTime = Date.now() - (this.eventRetentionDays * 24 * 60 * 60 * 1000);
      const globalKey = this.getGlobalEventKey();
      
      const removedCount = await this.config.redis.zremrangebyscore(globalKey, '-inf', cutoffTime);
      
      if (removedCount > 0) {
        this.logger.info('Old events cleaned up', { removedCount });
      }

    } catch (error) {
      this.logger.error('Failed to cleanup old events', { error: error.message });
    }
  }

  private async updateCachedMetrics(): Promise<void> {
    try {
      const stats = await this.getStats();
      this.metricsCache.set('totalStreams', stats.totalStreams);
      this.metricsCache.set('totalEvents', stats.totalEvents);
      this.metricsCache.set('eventsPerSecond', stats.eventsPerSecond);
    } catch (error) {
      this.logger.warn('Failed to update cached metrics', { error: error.message });
    }
  }

  /**
   * Key generation methods
   */
  private getStreamKey(streamId: string): string {
    return `events:stream:${streamId}`;
  }

  private getStreamMetadataKey(streamId: string): string {
    return `events:metadata:${streamId}`;
  }

  private getSnapshotKey(streamId: string): string {
    return `events:snapshot:${streamId}`;
  }

  private getGlobalEventKey(): string {
    return 'events:global';
  }

  private getEventTypeIndexKey(eventType: string): string {
    return `events:type:${eventType}`;
  }

  private generateEventId(): string {
    return crypto.randomUUID();
  }
}