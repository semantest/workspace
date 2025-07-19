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
 * @fileoverview Export Controller for Analytics Data
 * @author Semantest Team
 * @module api/controllers/ExportController
 */

import { Request, Response } from 'express';
import Joi from 'joi';
import { ExportService } from '@application/services/export.service';
import { ReportGenerationService } from '@application/services/report-generation.service';
import { Logger } from '@shared/infrastructure/logger';

/**
 * Export controller for analytics data
 */
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly reportService: ReportGenerationService,
    private readonly logger: Logger
  ) {}

  /**
   * Export metrics data
   */
  async exportMetrics(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = this.validateExportRequest(req.body);
      if (validationResult.error) {
        res.status(400).json({
          error: 'Validation Error',
          details: validationResult.error.details.map(d => d.message)
        });
        return;
      }

      const exportRequest = validationResult.value;
      const result = await this.exportService.exportMetrics(exportRequest);

      this.logger.info('Metrics exported successfully', { 
        exportId: result.id,
        format: exportRequest.format
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      this.logger.error('Error exporting metrics', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to export metrics'
      });
    }
  }

  /**
   * Export dashboard data
   */
  async exportDashboard(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = this.validateDashboardExportRequest(req.body);
      if (validationResult.error) {
        res.status(400).json({
          error: 'Validation Error',
          details: validationResult.error.details.map(d => d.message)
        });
        return;
      }

      const exportRequest = validationResult.value;
      const result = await this.exportService.exportDashboard(exportRequest);

      this.logger.info('Dashboard exported successfully', { 
        exportId: result.id,
        dashboardId: exportRequest.dashboardId
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      this.logger.error('Error exporting dashboard', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to export dashboard'
      });
    }
  }

  /**
   * Generate and export report
   */
  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = this.validateReportRequest(req.body);
      if (validationResult.error) {
        res.status(400).json({
          error: 'Validation Error',
          details: validationResult.error.details.map(d => d.message)
        });
        return;
      }

      const reportRequest = validationResult.value;
      const report = await this.reportService.generateReport(reportRequest);

      this.logger.info('Report generated successfully', { 
        reportId: report.id,
        name: reportRequest.name
      });

      res.status(201).json({
        success: true,
        data: report
      });
    } catch (error) {
      this.logger.error('Error generating report', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate report'
      });
    }
  }

  /**
   * Bulk export multiple metrics
   */
  async bulkExport(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = this.validateBulkExportRequest(req.body);
      if (validationResult.error) {
        res.status(400).json({
          error: 'Validation Error',
          details: validationResult.error.details.map(d => d.message)
        });
        return;
      }

      const bulkRequest = validationResult.value;
      const result = await this.exportService.bulkExport(bulkRequest);

      this.logger.info('Bulk export completed', { 
        exportId: result.id,
        itemCount: bulkRequest.items.length
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      this.logger.error('Error in bulk export', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to perform bulk export'
      });
    }
  }

  /**
   * Get export status
   */
  async getExportStatus(req: Request, res: Response): Promise<void> {
    try {
      const { exportId } = req.params;
      const status = await this.exportService.getExportStatus(exportId);

      if (!status) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Export not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      this.logger.error('Error getting export status', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get export status'
      });
    }
  }

  /**
   * Download export file
   */
  async downloadExport(req: Request, res: Response): Promise<void> {
    try {
      const { exportId } = req.params;
      const exportInfo = await this.exportService.getExportInfo(exportId);

      if (!exportInfo) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Export not found'
        });
        return;
      }

      if (exportInfo.status !== 'completed') {
        res.status(400).json({
          error: 'Export Not Ready',
          message: 'Export is not yet completed',
          status: exportInfo.status
        });
        return;
      }

      // Set appropriate headers
      res.setHeader('Content-Type', this.getContentType(exportInfo.format));
      res.setHeader('Content-Disposition', `attachment; filename="${exportInfo.filename}"`);

      // Stream file to response
      const fileStream = await this.exportService.getExportFileStream(exportId);
      fileStream.pipe(res);

      this.logger.info('Export file downloaded', { exportId });
    } catch (error) {
      this.logger.error('Error downloading export', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to download export'
      });
    }
  }

  /**
   * Get export history
   */
  async getExportHistory(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 20, offset = 0, format, status } = req.query;
      
      const filters = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        format: format as string,
        status: status as string
      };

      const history = await this.exportService.getExportHistory(filters);

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      this.logger.error('Error getting export history', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get export history'
      });
    }
  }

  /**
   * Cancel export
   */
  async cancelExport(req: Request, res: Response): Promise<void> {
    try {
      const { exportId } = req.params;
      await this.exportService.cancelExport(exportId);

      this.logger.info('Export cancelled', { exportId });

      res.status(200).json({
        success: true,
        message: 'Export cancelled successfully'
      });
    } catch (error) {
      this.logger.error('Error cancelling export', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to cancel export'
      });
    }
  }

  /**
   * Get available export formats
   */
  async getExportFormats(req: Request, res: Response): Promise<void> {
    try {
      const formats = await this.exportService.getAvailableFormats();

      res.status(200).json({
        success: true,
        data: formats
      });
    } catch (error) {
      this.logger.error('Error getting export formats', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get export formats'
      });
    }
  }

  /**
   * Validate export request
   */
  private validateExportRequest(data: any): Joi.ValidationResult {
    const schema = Joi.object({
      metricNames: Joi.array().items(Joi.string()).min(1).required(),
      format: Joi.string().valid('csv', 'excel', 'json', 'pdf').required(),
      timeRange: Joi.object({
        from: Joi.date().required(),
        to: Joi.date().required()
      }).required(),
      filters: Joi.object({
        sources: Joi.array().items(Joi.string()).optional(),
        tags: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
        valueRange: Joi.object({
          min: Joi.number().optional(),
          max: Joi.number().optional()
        }).optional()
      }).optional(),
      options: Joi.object({
        includeMetadata: Joi.boolean().optional(),
        compression: Joi.boolean().optional(),
        maxRows: Joi.number().min(1).max(1000000).optional()
      }).optional()
    });

    return schema.validate(data);
  }

  /**
   * Validate dashboard export request
   */
  private validateDashboardExportRequest(data: any): Joi.ValidationResult {
    const schema = Joi.object({
      dashboardId: Joi.string().required(),
      format: Joi.string().valid('pdf', 'png', 'json').required(),
      options: Joi.object({
        includeData: Joi.boolean().optional(),
        theme: Joi.string().valid('light', 'dark').optional(),
        resolution: Joi.string().valid('low', 'medium', 'high').optional()
      }).optional()
    });

    return schema.validate(data);
  }

  /**
   * Validate report request
   */
  private validateReportRequest(data: any): Joi.ValidationResult {
    const schema = Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional(),
      type: Joi.string().valid('summary', 'detailed', 'trend', 'comparative', 'custom').required(),
      format: Joi.string().valid('pdf', 'excel', 'csv', 'json', 'html').required(),
      timeRange: Joi.object({
        from: Joi.date().required(),
        to: Joi.date().required()
      }).required(),
      metrics: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          aggregation: Joi.string().valid('sum', 'avg', 'min', 'max', 'count', 'percentile').required(),
          percentile: Joi.number().min(1).max(99).optional(),
          alias: Joi.string().optional()
        })
      ).min(1).required(),
      filters: Joi.object({
        sources: Joi.array().items(Joi.string()).optional(),
        tags: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
        valueRange: Joi.object({
          min: Joi.number().optional(),
          max: Joi.number().optional()
        }).optional()
      }).optional(),
      options: Joi.object({
        includeCharts: Joi.boolean().optional(),
        includeRawData: Joi.boolean().optional(),
        includeSummary: Joi.boolean().optional(),
        pageOrientation: Joi.string().valid('portrait', 'landscape').optional()
      }).optional()
    });

    return schema.validate(data);
  }

  /**
   * Validate bulk export request
   */
  private validateBulkExportRequest(data: any): Joi.ValidationResult {
    const schema = Joi.object({
      items: Joi.array().items(
        Joi.object({
          type: Joi.string().valid('metrics', 'dashboard', 'report').required(),
          config: Joi.object().required() // Specific validation per type
        })
      ).min(1).max(10).required(),
      format: Joi.string().valid('zip', 'tar').required(),
      options: Joi.object({
        compression: Joi.boolean().optional(),
        includeManifest: Joi.boolean().optional()
      }).optional()
    });

    return schema.validate(data);
  }

  /**
   * Get content type for format
   */
  private getContentType(format: string): string {
    const contentTypes: Record<string, string> = {
      'csv': 'text/csv',
      'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'json': 'application/json',
      'pdf': 'application/pdf',
      'png': 'image/png',
      'zip': 'application/zip',
      'tar': 'application/x-tar'
    };

    return contentTypes[format] || 'application/octet-stream';
  }
}