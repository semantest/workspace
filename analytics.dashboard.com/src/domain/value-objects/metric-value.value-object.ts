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
 * @fileoverview Metric Value Value Object
 * @author Semantest Team
 * @module domain/value-objects/MetricValue
 */

import { ValueObject } from '@shared/domain/value-object';
import { MetricType } from '../entities/metric.entity';

interface MetricValueProps {
  value: number | string | boolean | object;
  type: MetricType;
  unit?: string;
}

/**
 * Metric value value object with type validation
 */
export class MetricValue extends ValueObject<MetricValueProps> {
  constructor(props: MetricValueProps) {
    super(props);
  }

  /**
   * Create a new metric value
   */
  static create(
    value: number | string | boolean | object,
    type: MetricType,
    unit?: string
  ): MetricValue {
    this.validateValueForType(value, type);

    return new MetricValue({
      value,
      type,
      unit
    });
  }

  /**
   * Validate value based on metric type
   */
  private static validateValueForType(
    value: number | string | boolean | object,
    type: MetricType
  ): void {
    switch (type) {
      case 'counter':
        if (typeof value !== 'number' || value < 0) {
          throw new Error('Counter metrics must be non-negative numbers');
        }
        break;
      
      case 'gauge':
        if (typeof value !== 'number') {
          throw new Error('Gauge metrics must be numbers');
        }
        break;
      
      case 'histogram':
        if (typeof value !== 'number') {
          throw new Error('Histogram metrics must be numbers');
        }
        break;
      
      case 'summary':
        if (typeof value !== 'number') {
          throw new Error('Summary metrics must be numbers');
        }
        break;
      
      case 'rate':
        if (typeof value !== 'number' || value < 0) {
          throw new Error('Rate metrics must be non-negative numbers');
        }
        break;
      
      case 'timer':
        if (typeof value !== 'number' || value < 0) {
          throw new Error('Timer metrics must be non-negative numbers');
        }
        break;
      
      case 'custom':
        // Custom types allow any value
        break;
      
      default:
        throw new Error(`Unknown metric type: ${type}`);
    }
  }

  /**
   * Get numeric value (for mathematical operations)
   */
  getNumericValue(): number {
    if (typeof this.props.value !== 'number') {
      throw new Error('Cannot get numeric value from non-numeric metric');
    }
    return this.props.value;
  }

  /**
   * Get string representation
   */
  getStringValue(): string {
    if (typeof this.props.value === 'string') {
      return this.props.value;
    }
    if (typeof this.props.value === 'number') {
      return this.props.value.toString();
    }
    if (typeof this.props.value === 'boolean') {
      return this.props.value.toString();
    }
    return JSON.stringify(this.props.value);
  }

  /**
   * Get boolean value
   */
  getBooleanValue(): boolean {
    if (typeof this.props.value === 'boolean') {
      return this.props.value;
    }
    if (typeof this.props.value === 'number') {
      return this.props.value !== 0;
    }
    if (typeof this.props.value === 'string') {
      return this.props.value.toLowerCase() === 'true';
    }
    return Boolean(this.props.value);
  }

  /**
   * Get object value
   */
  getObjectValue(): object {
    if (typeof this.props.value === 'object') {
      return this.props.value;
    }
    throw new Error('Cannot get object value from non-object metric');
  }

  /**
   * Check if value is numeric
   */
  isNumeric(): boolean {
    return typeof this.props.value === 'number';
  }

  /**
   * Check if value is string
   */
  isString(): boolean {
    return typeof this.props.value === 'string';
  }

  /**
   * Check if value is boolean
   */
  isBoolean(): boolean {
    return typeof this.props.value === 'boolean';
  }

  /**
   * Check if value is object
   */
  isObject(): boolean {
    return typeof this.props.value === 'object';
  }

  /**
   * Add two metric values (for numeric types)
   */
  add(other: MetricValue): MetricValue {
    if (!this.isNumeric() || !other.isNumeric()) {
      throw new Error('Cannot add non-numeric values');
    }

    if (this.props.type !== other.props.type) {
      throw new Error('Cannot add values of different metric types');
    }

    return MetricValue.create(
      this.getNumericValue() + other.getNumericValue(),
      this.props.type,
      this.props.unit
    );
  }

  /**
   * Subtract two metric values (for numeric types)
   */
  subtract(other: MetricValue): MetricValue {
    if (!this.isNumeric() || !other.isNumeric()) {
      throw new Error('Cannot subtract non-numeric values');
    }

    if (this.props.type !== other.props.type) {
      throw new Error('Cannot subtract values of different metric types');
    }

    return MetricValue.create(
      this.getNumericValue() - other.getNumericValue(),
      this.props.type,
      this.props.unit
    );
  }

  /**
   * Multiply metric value by scalar
   */
  multiply(scalar: number): MetricValue {
    if (!this.isNumeric()) {
      throw new Error('Cannot multiply non-numeric value');
    }

    return MetricValue.create(
      this.getNumericValue() * scalar,
      this.props.type,
      this.props.unit
    );
  }

  /**
   * Divide metric value by scalar
   */
  divide(scalar: number): MetricValue {
    if (!this.isNumeric()) {
      throw new Error('Cannot divide non-numeric value');
    }

    if (scalar === 0) {
      throw new Error('Cannot divide by zero');
    }

    return MetricValue.create(
      this.getNumericValue() / scalar,
      this.props.type,
      this.props.unit
    );
  }

  /**
   * Format value with unit
   */
  format(): string {
    const valueStr = this.getStringValue();
    return this.props.unit ? `${valueStr} ${this.props.unit}` : valueStr;
  }

  getValue(): number | string | boolean | object {
    return this.props.value;
  }

  getType(): MetricType {
    return this.props.type;
  }

  getUnit(): string | undefined {
    return this.props.unit;
  }

  /**
   * Convert to primitive object
   */
  toPrimitive(): any {
    return {
      value: this.props.value,
      type: this.props.type,
      unit: this.props.unit
    };
  }
}