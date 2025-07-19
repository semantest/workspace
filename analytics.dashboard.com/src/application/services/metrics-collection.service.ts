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
 * @fileoverview Metrics Collection Service
 * @author Semantest Team
 * @module application/services/MetricsCollectionService
 */

import { Metric, MetricType, AggregationMethod } from '@domain/entities/metric.entity';
import { MetricRepository } from '@domain/repositories/metric.repository';
import { EventPublisher } from '@shared/infrastructure/event-publisher';
import { Logger } from '@shared/infrastructure/logger';
import { CacheService } from '@shared/infrastructure/cache.service';

export interface CollectMetricRequest {
  name: string;
  type: MetricType;
  value: number | string | boolean | object;
  source: string;
  tags?: Record<string, string>;
  metadata?: any;
}

export interface MetricFilters {
  type?: MetricType;
  source?: string;
  from?: Date;
  to?: Date;
  tags?: Record<string, string>;
  limit?: number;
  offset?: number;
}

export interface MetricStatsRequest {
  name: string;
  from?: Date;
  to?: Date;
  aggregationMethod?: string;
}

export interface MetricsByNameRequest {
  name: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

/**
 * Application service for metrics collection and retrieval
 */
export class MetricsCollectionService {
  constructor(
    private readonly metricRepository: MetricRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly logger: Logger,
    private readonly cacheService: CacheService
  ) {}

  /**
   * Collect a single metric
   */
  async collectMetric(request: CollectMetricRequest): Promise<Metric> {
    try {
      this.logger.debug('Collecting metric', { name: request.name, type: request.type });

      const metric = Metric.create(
        request.name,
        request.type,
        request.value,
        request.source,
        request.tags,
        request.metadata
      );

      await this.metricRepository.save(metric);

      // Publish domain events
      const events = metric.getUncommittedEvents();
      for (const event of events) {
        await this.eventPublisher.publish(event);
      }
      metric.markEventsAsCommitted();

      // Invalidate related caches
      await this.invalidateMetricCaches(request.name);

      this.logger.info('Metric collected successfully', { 
        metricId: metric.getId().getValue(),
        name: request.name
      });

      return metric;
    } catch (error) {
      this.logger.error('Failed to collect metric', { 
        error: error.message,
        name: request.name
      });
      throw error;
    }
  }

  /**
   * Collect multiple metrics in batch
   */
  async collectMetricsBatch(requests: CollectMetricRequest[]): Promise<Metric[]> {
    try {
      this.logger.debug('Collecting batch metrics', { count: requests.length });

      const metrics: Metric[] = [];
      const allEvents: any[] = [];

      for (const request of requests) {
        const metric = Metric.create(
          request.name,
          request.type,
          request.value,
          request.source,
          request.tags,
          request.metadata
        );

        metrics.push(metric);
        allEvents.push(...metric.getUncommittedEvents());
      }

      // Save all metrics in batch
      await this.metricRepository.saveBatch(metrics);

      // Publish all events
      for (const event of allEvents) {
        await this.eventPublisher.publish(event);
      }

      // Mark events as committed
      metrics.forEach(metric => metric.markEventsAsCommitted());

      // Invalidate caches for all metric names
      const metricNames = [...new Set(requests.map(r => r.name))];
      await Promise.all(metricNames.map(name => this.invalidateMetricCaches(name)));

      this.logger.info('Batch metrics collected successfully', { count: metrics.length });

      return metrics;
    } catch (error) {
      this.logger.error('Failed to collect batch metrics', { 
        error: error.message,
        count: requests.length
      });
      throw error;
    }
  }

  /**
   * Get metrics by filters
   */
  async getMetrics(filters: MetricFilters): Promise<Metric[]> {
    try {
      this.logger.debug('Getting metrics', { filters });

      const cacheKey = this.generateFiltersCacheKey(filters);
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        this.logger.debug('Returning cached metrics', { filters });
        return cached.map((data: any) => this.hydrateMetric(data));
      }

      const metrics = await this.metricRepository.findByFilters(filters);

      // Cache results for 5 minutes
      await this.cacheService.set(
        cacheKey, 
        metrics.map(m => m.toPrimitive()), 
        300
      );

      this.logger.debug('Retrieved metrics from repository', { 
        count: metrics.length,
        filters 
      });

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get metrics', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * Get metric by ID
   */
  async getMetricById(id: string): Promise<Metric | null> {
    try {
      this.logger.debug('Getting metric by ID', { id });

      const cacheKey = `metric:${id}`;
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        return this.hydrateMetric(cached);
      }

      const metric = await this.metricRepository.findById(id);
      
      if (metric) {
        await this.cacheService.set(cacheKey, metric.toPrimitive(), 300);
      }

      return metric;
    } catch (error) {
      this.logger.error('Failed to get metric by ID', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Get metrics by name with time range
   */
  async getMetricsByName(request: MetricsByNameRequest): Promise<Metric[]> {
    try {
      this.logger.debug('Getting metrics by name', { request });

      const cacheKey = `metrics:name:${request.name}:${request.from?.getTime() || 'all'}:${request.to?.getTime() || 'all'}:${request.limit || 100}`;
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        return cached.map((data: any) => this.hydrateMetric(data));
      }

      const metrics = await this.metricRepository.findByName(
        request.name,
        request.from,
        request.to,
        request.limit
      );

      await this.cacheService.set(
        cacheKey, 
        metrics.map(m => m.toPrimitive()), 
        180 // 3 minutes for time-series data
      );

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get metrics by name', { error: error.message, request });
      throw error;
    }
  }

  /**
   * Get metric statistics
   */
  async getMetricStatistics(request: MetricStatsRequest): Promise<any> {
    try {
      this.logger.debug('Getting metric statistics', { request });

      const cacheKey = `stats:${request.name}:${request.from?.getTime() || 'all'}:${request.to?.getTime() || 'all'}:${request.aggregationMethod || 'default'}`;
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const stats = await this.metricRepository.getStatistics(
        request.name,
        request.from,
        request.to,
        request.aggregationMethod as AggregationMethod
      );

      await this.cacheService.set(cacheKey, stats, 300);

      return stats;
    } catch (error) {
      this.logger.error('Failed to get metric statistics', { error: error.message, request });
      throw error;
    }
  }

  /**
   * Delete metric
   */
  async deleteMetric(id: string): Promise<void> {
    try {
      this.logger.debug('Deleting metric', { id });

      const metric = await this.metricRepository.findById(id);
      if (!metric) {
        throw new Error('Metric not found');
      }

      await this.metricRepository.delete(id);

      // Invalidate related caches
      await this.invalidateMetricCaches(metric.getName());
      await this.cacheService.delete(`metric:${id}`);

      this.logger.info('Metric deleted successfully', { id });
    } catch (error) {
      this.logger.error('Failed to delete metric', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Get metric names
   */
  async getMetricNames(): Promise<string[]> {
    try {
      const cacheKey = 'metric:names';
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const names = await this.metricRepository.getMetricNames();
      await this.cacheService.set(cacheKey, names, 600); // 10 minutes

      return names;
    } catch (error) {
      this.logger.error('Failed to get metric names', { error: error.message });
      throw error;
    }
  }

  /**
   * Get metric sources
   */
  async getMetricSources(): Promise<string[]> {
    try {
      const cacheKey = 'metric:sources';
      const cached = await this.cacheService.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const sources = await this.metricRepository.getMetricSources();
      await this.cacheService.set(cacheKey, sources, 600); // 10 minutes

      return sources;
    } catch (error) {
      this.logger.error('Failed to get metric sources', { error: error.message });
      throw error;
    }
  }

  /**
   * Invalidate metric-related caches
   */
  private async invalidateMetricCaches(metricName: string): Promise<void> {
    const patterns = [
      `metrics:name:${metricName}:*`,
      `stats:${metricName}:*`,
      'metric:names',
      'metric:sources'
    ];

    await Promise.all(patterns.map(pattern => this.cacheService.deletePattern(pattern)));
  }

  /**
   * Generate cache key for filters
   */
  private generateFiltersCacheKey(filters: MetricFilters): string {
    const parts = [
      'metrics:filters',
      filters.type || 'all',
      filters.source || 'all',
      filters.from?.getTime() || 'all',
      filters.to?.getTime() || 'all',
      JSON.stringify(filters.tags || {}),
      filters.limit || 100,
      filters.offset || 0
    ];

    return parts.join(':');
  }

  /**
   * Hydrate metric from primitive data
   */
  private hydrateMetric(data: any): Metric {
    // This would typically involve more complex hydration logic
    // For now, we'll use the create method and then update the properties
    const metric = Metric.create(
      data.name,
      data.type,
      data.value.value,
      data.source,
      data.tags,
      data.metadata
    );

    // Update timestamps and ID if needed
    // This is a simplified approach - in production you'd have proper hydration
    return metric;
  }
}