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
 * @fileoverview Metric ID Value Object
 * @author Semantest Team
 * @module domain/value-objects/MetricId
 */

import { ValueObject } from '@shared/domain/value-object';
import { v4 as uuidv4 } from 'uuid';

interface MetricIdProps {
  value: string;
}

/**
 * Metric ID value object
 */
export class MetricId extends ValueObject<MetricIdProps> {
  constructor(props: MetricIdProps) {
    super(props);
  }

  /**
   * Create a new metric ID
   */
  static create(value: string): MetricId {
    if (!value || value.trim().length === 0) {
      throw new Error('Metric ID cannot be empty');
    }

    if (!this.isValidId(value)) {
      throw new Error('Invalid metric ID format');
    }

    return new MetricId({ value: value.trim() });
  }

  /**
   * Generate a new random metric ID
   */
  static generate(): MetricId {
    return new MetricId({ value: uuidv4() });
  }

  /**
   * Validate ID format
   */
  private static isValidId(value: string): boolean {
    // Accept UUID format or custom format with alphanumeric and hyphens
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const customRegex = /^[a-zA-Z0-9_-]+$/;
    
    return uuidRegex.test(value) || customRegex.test(value);
  }

  getValue(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}