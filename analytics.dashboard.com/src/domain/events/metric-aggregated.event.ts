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
 * @fileoverview Metric Aggregated Event
 * @author Semantest Team
 * @module domain/events/MetricAggregatedEvent
 */

import { DomainEvent } from '@shared/domain/domain-event';
import { AggregationMethod } from '../entities/metric.entity';

/**
 * Event fired when metrics are aggregated
 */
export class MetricAggregatedEvent extends DomainEvent {
  constructor(
    public readonly aggregatedMetricId: string,
    public readonly metricName: string,
    public readonly aggregationMethod: AggregationMethod,
    public readonly sourceMetricIds: string[],
    public readonly aggregatedValue: number,
    public readonly aggregatedAt: Date
  ) {
    super({
      eventId: crypto.randomUUID(),
      eventType: 'MetricAggregated',
      aggregateId: aggregatedMetricId,
      aggregateType: 'Metric',
      eventVersion: 1,
      occurredAt: aggregatedAt,
      payload: {
        aggregatedMetricId,
        metricName,
        aggregationMethod,
        sourceMetricIds,
        aggregatedValue,
        aggregatedAt: aggregatedAt.toISOString()
      }
    });
  }
}