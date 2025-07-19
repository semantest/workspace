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
 * @fileoverview Metric Collected Event
 * @author Semantest Team
 * @module domain/events/MetricCollectedEvent
 */

import { DomainEvent } from '@shared/domain/domain-event';
import { MetricType } from '../entities/metric.entity';

/**
 * Event fired when a metric is collected
 */
export class MetricCollectedEvent extends DomainEvent {
  constructor(
    public readonly metricId: string,
    public readonly metricName: string,
    public readonly metricType: MetricType,
    public readonly value: number | string | boolean | object,
    public readonly source: string,
    public readonly tags: Record<string, string>,
    public readonly collectedAt: Date
  ) {
    super({
      eventId: crypto.randomUUID(),
      eventType: 'MetricCollected',
      aggregateId: metricId,
      aggregateType: 'Metric',
      eventVersion: 1,
      occurredAt: collectedAt,
      payload: {
        metricId,
        metricName,
        metricType,
        value,
        source,
        tags,
        collectedAt: collectedAt.toISOString()
      }
    });
  }
}