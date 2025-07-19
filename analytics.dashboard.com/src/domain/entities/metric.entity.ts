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
 * @fileoverview Metric Entity for analytics data
 * @author Semantest Team
 * @module domain/entities/MetricEntity
 */

import { AggregateRoot } from '@shared/domain/aggregate-root';
import { MetricId } from '../value-objects/metric-id.value-object';
import { MetricValue } from '../value-objects/metric-value.value-object';
import { MetricMetadata } from '../value-objects/metric-metadata.value-object';
import { MetricCollectedEvent } from '../events/metric-collected.event';
import { MetricAggregatedEvent } from '../events/metric-aggregated.event';

/**
 * Metric types supported by the analytics system
 */
export type MetricType = 
  | 'counter'
  | 'gauge'
  | 'histogram'
  | 'summary'
  | 'rate'
  | 'timer'
  | 'custom';

/**
 * Metric aggregation methods
 */
export type AggregationMethod = 
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'count'
  | 'percentile'
  | 'variance'
  | 'stddev';

/**
 * Metric entity properties
 */
export interface MetricProps {
  id: MetricId;
  name: string;
  type: MetricType;
  value: MetricValue;
  metadata: MetricMetadata;
  timestamp: Date;
  source: string;
  tags: Record<string, string>;
  aggregationMethods: AggregationMethod[];
  retentionPeriod: number; // in days
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Metric aggregate root
 * Represents a single metric data point in the analytics system
 */
export class Metric extends AggregateRoot<MetricProps> {
  constructor(props: MetricProps) {
    super(props);
  }

  /**
   * Create a new metric
   */
  static create(
    name: string,
    type: MetricType,
    value: number | string | boolean | object,
    source: string,
    tags: Record<string, string> = {},
    metadata: Partial<MetricMetadata> = {}
  ): Metric {
    const metricId = MetricId.generate();
    const metricValue = MetricValue.create(value, type);
    const metricMetadata = MetricMetadata.create({
      unit: metadata.unit || 'count',
      description: metadata.description || '',
      category: metadata.category || 'general',
      ...metadata
    });

    const now = new Date();
    
    const metric = new Metric({
      id: metricId,
      name,
      type,
      value: metricValue,
      metadata: metricMetadata,
      timestamp: now,
      source,
      tags,
      aggregationMethods: this.getDefaultAggregationMethods(type),
      retentionPeriod: 90, // 90 days default
      isActive: true,
      createdAt: now,
      updatedAt: now
    });

    // Emit metric collected event
    metric.addDomainEvent(new MetricCollectedEvent(
      metricId.getValue(),
      name,
      type,
      metricValue.getValue(),
      source,
      tags,
      now
    ));

    return metric;
  }

  /**
   * Update metric value
   */
  updateValue(value: number | string | boolean | object): void {
    const newValue = MetricValue.create(value, this.props.type);
    const now = new Date();
    
    this.props.value = newValue;
    this.props.timestamp = now;
    this.props.updatedAt = now;

    // Emit metric collected event for the update
    this.addDomainEvent(new MetricCollectedEvent(
      this.props.id.getValue(),
      this.props.name,
      this.props.type,
      newValue.getValue(),
      this.props.source,
      this.props.tags,
      now
    ));
  }

  /**
   * Add or update tags
   */
  updateTags(tags: Record<string, string>): void {
    this.props.tags = { ...this.props.tags, ...tags };
    this.props.updatedAt = new Date();
  }

  /**
   * Update metadata
   */
  updateMetadata(metadata: Partial<MetricMetadata>): void {
    this.props.metadata = MetricMetadata.create({
      ...this.props.metadata.getProps(),
      ...metadata
    });
    this.props.updatedAt = new Date();
  }

  /**
   * Set aggregation methods
   */
  setAggregationMethods(methods: AggregationMethod[]): void {
    this.props.aggregationMethods = methods;
    this.props.updatedAt = new Date();
  }

  /**
   * Set retention period
   */
  setRetentionPeriod(days: number): void {
    if (days < 1) {
      throw new Error('Retention period must be at least 1 day');
    }
    this.props.retentionPeriod = days;
    this.props.updatedAt = new Date();
  }

  /**
   * Deactivate metric
   */
  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  /**
   * Activate metric
   */
  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  /**
   * Check if metric is expired based on retention period
   */
  isExpired(): boolean {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - this.props.retentionPeriod);
    return this.props.timestamp < expirationDate;
  }

  /**
   * Aggregate with another metric
   */
  aggregateWith(other: Metric, method: AggregationMethod): Metric {
    if (this.props.name !== other.props.name || this.props.type !== other.props.type) {
      throw new Error('Cannot aggregate metrics with different names or types');
    }

    const aggregatedValue = this.calculateAggregation(
      this.props.value.getValue() as number,
      other.props.value.getValue() as number,
      method
    );

    const aggregatedMetric = Metric.create(
      `${this.props.name}_${method}`,
      this.props.type,
      aggregatedValue,
      'aggregation',
      { ...this.props.tags, aggregation_method: method },
      this.props.metadata.getProps()
    );

    // Emit aggregation event
    aggregatedMetric.addDomainEvent(new MetricAggregatedEvent(
      aggregatedMetric.getId().getValue(),
      this.props.name,
      method,
      [this.props.id.getValue(), other.props.id.getValue()],
      aggregatedValue,
      new Date()
    ));

    return aggregatedMetric;
  }

  /**
   * Calculate aggregation value
   */
  private calculateAggregation(value1: number, value2: number, method: AggregationMethod): number {
    switch (method) {
      case 'sum':
        return value1 + value2;
      case 'avg':
        return (value1 + value2) / 2;
      case 'min':
        return Math.min(value1, value2);
      case 'max':
        return Math.max(value1, value2);
      case 'count':
        return 2; // Count of values being aggregated
      default:
        throw new Error(`Unsupported aggregation method: ${method}`);
    }
  }

  /**
   * Get default aggregation methods for metric type
   */
  private static getDefaultAggregationMethods(type: MetricType): AggregationMethod[] {
    switch (type) {
      case 'counter':
        return ['sum', 'count'];
      case 'gauge':
        return ['avg', 'min', 'max'];
      case 'histogram':
        return ['avg', 'min', 'max', 'percentile'];
      case 'summary':
        return ['sum', 'avg', 'count'];
      case 'rate':
        return ['avg', 'sum'];
      case 'timer':
        return ['avg', 'min', 'max', 'percentile'];
      default:
        return ['avg', 'sum', 'count'];
    }
  }

  /**
   * Convert to primitive object
   */
  toPrimitive(): any {
    return {
      id: this.props.id.getValue(),
      name: this.props.name,
      type: this.props.type,
      value: this.props.value.getValue(),
      metadata: this.props.metadata.getProps(),
      timestamp: this.props.timestamp.toISOString(),
      source: this.props.source,
      tags: this.props.tags,
      aggregationMethods: this.props.aggregationMethods,
      retentionPeriod: this.props.retentionPeriod,
      isActive: this.props.isActive,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString()
    };
  }

  // Getters
  getId(): MetricId { return this.props.id; }
  getName(): string { return this.props.name; }
  getType(): MetricType { return this.props.type; }
  getValue(): MetricValue { return this.props.value; }
  getMetadata(): MetricMetadata { return this.props.metadata; }
  getTimestamp(): Date { return this.props.timestamp; }
  getSource(): string { return this.props.source; }
  getTags(): Record<string, string> { return this.props.tags; }
  getAggregationMethods(): AggregationMethod[] { return this.props.aggregationMethods; }
  getRetentionPeriod(): number { return this.props.retentionPeriod; }
  isMetricActive(): boolean { return this.props.isActive; }
  getCreatedAt(): Date { return this.props.createdAt; }
  getUpdatedAt(): Date { return this.props.updatedAt; }
}