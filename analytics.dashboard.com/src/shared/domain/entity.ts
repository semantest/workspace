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
 * @fileoverview Base Entity class
 * @author Semantest Team
 * @module shared/domain/Entity
 */

/**
 * Base entity class
 */
export abstract class Entity<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = props;
  }

  /**
   * Check equality with another entity
   */
  equals(entity: Entity<T>): boolean {
    if (!entity || entity.constructor !== this.constructor) {
      return false;
    }

    return this.props === entity.props;
  }
}