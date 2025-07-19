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
 * @fileoverview Metric Metadata Value Object
 * @author Semantest Team
 * @module domain/value-objects/MetricMetadata
 */

import { ValueObject } from '@shared/domain/value-object';

export interface MetricMetadataProps {
  unit: string;
  description: string;
  category: string;
  owner?: string;
  documentation?: string;
  alertThresholds?: {
    warning?: number;
    critical?: number;
  };
  sla?: {
    target: number;
    unit: string;
  };
  businessContext?: {
    impact: 'low' | 'medium' | 'high' | 'critical';
    department: string;
    stakeholders: string[];
  };
  technicalContext?: {
    dataSource: string;
    calculationMethod?: string;
    dependencies: string[];
    freshness: number; // in seconds
  };
  compliance?: {
    gdpr: boolean;
    pii: boolean;
    retention: number; // in days
  };
}

/**
 * Metric metadata value object
 */
export class MetricMetadata extends ValueObject<MetricMetadataProps> {
  constructor(props: MetricMetadataProps) {
    super(props);
  }

  /**
   * Create metric metadata
   */
  static create(props: Partial<MetricMetadataProps>): MetricMetadata {
    const metadata: MetricMetadataProps = {
      unit: props.unit || 'count',
      description: props.description || '',
      category: props.category || 'general',
      owner: props.owner,
      documentation: props.documentation,
      alertThresholds: props.alertThresholds,
      sla: props.sla,
      businessContext: props.businessContext,
      technicalContext: props.technicalContext,
      compliance: props.compliance
    };

    this.validateMetadata(metadata);
    return new MetricMetadata(metadata);
  }

  /**
   * Validate metadata properties
   */
  private static validateMetadata(metadata: MetricMetadataProps): void {
    if (!metadata.unit.trim()) {
      throw new Error('Unit cannot be empty');
    }

    if (!metadata.category.trim()) {
      throw new Error('Category cannot be empty');
    }

    if (metadata.alertThresholds) {
      const { warning, critical } = metadata.alertThresholds;
      if (warning !== undefined && critical !== undefined && warning >= critical) {
        throw new Error('Warning threshold must be less than critical threshold');
      }
    }

    if (metadata.sla) {
      if (metadata.sla.target < 0) {
        throw new Error('SLA target must be non-negative');
      }
      if (!metadata.sla.unit.trim()) {
        throw new Error('SLA unit cannot be empty');
      }
    }

    if (metadata.technicalContext) {
      if (metadata.technicalContext.freshness < 0) {
        throw new Error('Freshness must be non-negative');
      }
    }

    if (metadata.compliance) {
      if (metadata.compliance.retention < 1) {
        throw new Error('Retention period must be at least 1 day');
      }
    }
  }

  /**
   * Update alert thresholds
   */
  withAlertThresholds(warning?: number, critical?: number): MetricMetadata {
    const alertThresholds = { warning, critical };
    
    if (warning !== undefined && critical !== undefined && warning >= critical) {
      throw new Error('Warning threshold must be less than critical threshold');
    }

    return new MetricMetadata({
      ...this.props,
      alertThresholds
    });
  }

  /**
   * Update SLA configuration
   */
  withSLA(target: number, unit: string): MetricMetadata {
    if (target < 0) {
      throw new Error('SLA target must be non-negative');
    }
    if (!unit.trim()) {
      throw new Error('SLA unit cannot be empty');
    }

    return new MetricMetadata({
      ...this.props,
      sla: { target, unit }
    });
  }

  /**
   * Update business context
   */
  withBusinessContext(
    impact: 'low' | 'medium' | 'high' | 'critical',
    department: string,
    stakeholders: string[]
  ): MetricMetadata {
    return new MetricMetadata({
      ...this.props,
      businessContext: { impact, department, stakeholders }
    });
  }

  /**
   * Update technical context
   */
  withTechnicalContext(
    dataSource: string,
    dependencies: string[],
    freshness: number,
    calculationMethod?: string
  ): MetricMetadata {
    if (freshness < 0) {
      throw new Error('Freshness must be non-negative');
    }

    return new MetricMetadata({
      ...this.props,
      technicalContext: {
        dataSource,
        dependencies,
        freshness,
        calculationMethod
      }
    });
  }

  /**
   * Update compliance settings
   */
  withCompliance(gdpr: boolean, pii: boolean, retention: number): MetricMetadata {
    if (retention < 1) {
      throw new Error('Retention period must be at least 1 day');
    }

    return new MetricMetadata({
      ...this.props,
      compliance: { gdpr, pii, retention }
    });
  }

  /**
   * Check if metric has alert thresholds
   */
  hasAlertThresholds(): boolean {
    return Boolean(this.props.alertThresholds);
  }

  /**
   * Check if metric has SLA configuration
   */
  hasSLA(): boolean {
    return Boolean(this.props.sla);
  }

  /**
   * Check if metric contains PII
   */
  containsPII(): boolean {
    return this.props.compliance?.pii || false;
  }

  /**
   * Check if metric is GDPR compliant
   */
  isGDPRCompliant(): boolean {
    return this.props.compliance?.gdpr || false;
  }

  /**
   * Get business impact level
   */
  getBusinessImpact(): 'low' | 'medium' | 'high' | 'critical' | undefined {
    return this.props.businessContext?.impact;
  }

  /**
   * Get data freshness requirement
   */
  getDataFreshness(): number {
    return this.props.technicalContext?.freshness || 0;
  }

  /**
   * Get retention period
   */
  getRetentionPeriod(): number {
    return this.props.compliance?.retention || 90; // 90 days default
  }

  /**
   * Check if metric value is above warning threshold
   */
  isAboveWarningThreshold(value: number): boolean {
    return this.props.alertThresholds?.warning !== undefined && 
           value > this.props.alertThresholds.warning;
  }

  /**
   * Check if metric value is above critical threshold
   */
  isAboveCriticalThreshold(value: number): boolean {
    return this.props.alertThresholds?.critical !== undefined && 
           value > this.props.alertThresholds.critical;
  }

  /**
   * Check if metric meets SLA target
   */
  meetsSLA(value: number): boolean {
    if (!this.props.sla) return true;
    return value >= this.props.sla.target;
  }

  getProps(): MetricMetadataProps {
    return this.props;
  }

  getUnit(): string {
    return this.props.unit;
  }

  getDescription(): string {
    return this.props.description;
  }

  getCategory(): string {
    return this.props.category;
  }

  getOwner(): string | undefined {
    return this.props.owner;
  }
}