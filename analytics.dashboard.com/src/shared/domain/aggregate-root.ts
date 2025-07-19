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
 * @fileoverview Base Aggregate Root class
 * @author Semantest Team
 * @module shared/domain/AggregateRoot
 */

import { Entity } from './entity';
import { DomainEvent } from './domain-event';

/**
 * Base aggregate root class
 */
export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent[] = [];

  constructor(props: T) {
    super(props);
  }

  /**
   * Add domain event
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * Clear domain events
   */
  clearEvents(): void {
    this._domainEvents = [];
  }

  /**
   * Get uncommitted domain events
   */
  getUncommittedEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  /**
   * Mark events as committed
   */
  markEventsAsCommitted(): void {
    this._domainEvents = [];
  }
}