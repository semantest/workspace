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
 * @fileoverview Metrics Collection Controller
 * @author Semantest Team
 * @module api/controllers/MetricsController
 */

import { Request, Response } from 'express';
import Joi from 'joi';
import { MetricsCollectionService } from '@application/services/metrics-collection.service';
import { MetricType } from '@domain/entities/metric.entity';
import { Logger } from '@shared/infrastructure/logger';

/**
 * Metrics collection endpoint controller
 */
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsCollectionService,
    private readonly logger: Logger
  ) {}

  /**
   * Collect a single metric
   */
  async collectMetric(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = this.validateMetricRequest(req.body);
      if (validationResult.error) {
        res.status(400).json({
          error: 'Validation Error',
          details: validationResult.error.details.map(d => d.message)
        });
        return;
      }

      const {
        name,
        type,
        value,
        source,
        tags = {},
        metadata = {}
      } = validationResult.value;

      const metric = await this.metricsService.collectMetric({
        name,
        type,
        value,
        source,
        tags,
        metadata
      });

      this.logger.info('Metric collected', { metricId: metric.getId().getValue(), name });

      res.status(201).json({
        success: true,
        data: {
          id: metric.getId().getValue(),
          name: metric.getName(),
          type: metric.getType(),
          value: metric.getValue().getValue(),
          timestamp: metric.getTimestamp().toISOString()
        }
      });
    } catch (error) {
      this.logger.error('Error collecting metric', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to collect metric'
      });
    }
  }

  /**
   * Collect multiple metrics in batch
   */
  async collectMetricsBatch(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = this.validateBatchRequest(req.body);
      if (validationResult.error) {
        res.status(400).json({
          error: 'Validation Error',
          details: validationResult.error.details.map(d => d.message)
        });
        return;
      }

      const { metrics } = validationResult.value;
      
      const results = await this.metricsService.collectMetricsBatch(metrics);

      this.logger.info('Batch metrics collected', { count: results.length });

      res.status(201).json({
        success: true,
        data: {
          collected: results.length,
          metrics: results.map(metric => ({
            id: metric.getId().getValue(),
            name: metric.getName(),
            type: metric.getType(),
            value: metric.getValue().getValue(),
            timestamp: metric.getTimestamp().toISOString()
          }))
        }
      });
    } catch (error) {
      this.logger.error('Error collecting batch metrics', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to collect batch metrics'
      });
    }
  }

  /**
   * Get metrics by filters
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const filters = this.parseQueryFilters(req.query);
      const metrics = await this.metricsService.getMetrics(filters);

      res.status(200).json({
        success: true,
        data: {
          count: metrics.length,
          metrics: metrics.map(metric => metric.toPrimitive())
        }
      });
    } catch (error) {
      this.logger.error('Error getting metrics', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve metrics'
      });
    }
  }

  /**
   * Get metric by ID
   */
  async getMetricById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const metric = await this.metricsService.getMetricById(id);

      if (!metric) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Metric not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: metric.toPrimitive()
      });
    } catch (error) {
      this.logger.error('Error getting metric by ID', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve metric'
      });
    }
  }

  /**
   * Get metrics by name
   */
  async getMetricsByName(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const { from, to, limit = 100 } = req.query;

      const metrics = await this.metricsService.getMetricsByName({
        name,
        from: from ? new Date(from as string) : undefined,
        to: to ? new Date(to as string) : undefined,
        limit: parseInt(limit as string)
      });

      res.status(200).json({
        success: true,
        data: {
          name,
          count: metrics.length,
          metrics: metrics.map(metric => metric.toPrimitive())
        }
      });
    } catch (error) {
      this.logger.error('Error getting metrics by name', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve metrics'
      });
    }
  }

  /**
   * Get metric statistics
   */
  async getMetricStats(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const { from, to, aggregation } = req.query;

      const stats = await this.metricsService.getMetricStatistics({
        name,
        from: from ? new Date(from as string) : undefined,
        to: to ? new Date(to as string) : undefined,
        aggregationMethod: aggregation as string
      });

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      this.logger.error('Error getting metric statistics', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve metric statistics'
      });
    }
  }

  /**
   * Delete metric
   */
  async deleteMetric(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.metricsService.deleteMetric(id);

      this.logger.info('Metric deleted', { metricId: id });

      res.status(204).send();
    } catch (error) {
      this.logger.error('Error deleting metric', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete metric'
      });
    }
  }

  /**
   * Validate metric request
   */
  private validateMetricRequest(data: any): Joi.ValidationResult {
    const schema = Joi.object({
      name: Joi.string().required().min(1).max(255),
      type: Joi.string().valid('counter', 'gauge', 'histogram', 'summary', 'rate', 'timer', 'custom').required(),
      value: Joi.alternatives().try(
        Joi.number(),
        Joi.string(),
        Joi.boolean(),
        Joi.object()
      ).required(),
      source: Joi.string().required().min(1).max(255),
      tags: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
      metadata: Joi.object({
        unit: Joi.string().optional(),
        description: Joi.string().optional(),
        category: Joi.string().optional()
      }).optional()
    });

    return schema.validate(data);
  }

  /**
   * Validate batch request
   */
  private validateBatchRequest(data: any): Joi.ValidationResult {
    const metricSchema = Joi.object({
      name: Joi.string().required().min(1).max(255),
      type: Joi.string().valid('counter', 'gauge', 'histogram', 'summary', 'rate', 'timer', 'custom').required(),
      value: Joi.alternatives().try(
        Joi.number(),
        Joi.string(),
        Joi.boolean(),
        Joi.object()
      ).required(),
      source: Joi.string().required().min(1).max(255),
      tags: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
      metadata: Joi.object({
        unit: Joi.string().optional(),
        description: Joi.string().optional(),
        category: Joi.string().optional()
      }).optional()
    });

    const schema = Joi.object({
      metrics: Joi.array().items(metricSchema).min(1).max(100).required()
    });

    return schema.validate(data);
  }

  /**
   * Parse query filters
   */
  private parseQueryFilters(query: any): any {
    const filters: any = {};

    if (query.type) {
      filters.type = query.type;
    }

    if (query.source) {
      filters.source = query.source;
    }

    if (query.from) {
      filters.from = new Date(query.from);
    }

    if (query.to) {
      filters.to = new Date(query.to);
    }

    if (query.tags) {
      try {
        filters.tags = JSON.parse(query.tags);
      } catch {
        // Ignore invalid JSON
      }
    }

    if (query.limit) {
      filters.limit = parseInt(query.limit);
    }

    if (query.offset) {
      filters.offset = parseInt(query.offset);
    }

    return filters;
  }
}