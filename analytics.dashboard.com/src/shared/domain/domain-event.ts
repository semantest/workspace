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
 * @fileoverview Base Domain Event class
 * @author Semantest Team
 * @module shared/domain/DomainEvent
 */

export interface DomainEventProps {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  eventVersion: number;
  occurredAt: Date;
  payload: any;
  metadata?: Record<string, any>;
}

/**
 * Base domain event class
 */
export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly aggregateType: string;
  public readonly eventVersion: number;
  public readonly occurredAt: Date;
  public readonly payload: any;
  public readonly metadata: Record<string, any>;

  constructor(props: DomainEventProps) {
    this.eventId = props.eventId;
    this.eventType = props.eventType;
    this.aggregateId = props.aggregateId;
    this.aggregateType = props.aggregateType;
    this.eventVersion = props.eventVersion;
    this.occurredAt = props.occurredAt;
    this.payload = props.payload;
    this.metadata = props.metadata || {};
  }

  /**
   * Convert event to primitive object
   */
  toPrimitive(): any {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      payload: this.payload,
      metadata: this.metadata
    };
  }
}