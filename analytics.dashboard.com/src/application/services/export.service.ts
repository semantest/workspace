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
 * @fileoverview Export Service for Analytics Data
 * @author Semantest Team
 * @module application/services/ExportService
 */

import { Queue, Job } from 'bull';
import { Readable } from 'stream';
import * as archiver from 'archiver';
import * as XLSX from 'xlsx';
import { Parser } from 'json2csv';
import { MetricsCollectionService } from './metrics-collection.service';
import { Logger } from '@shared/infrastructure/logger';
import { FileStorageService } from '@shared/infrastructure/file-storage.service';
import { CacheService } from '@shared/infrastructure/cache.service';

export interface ExportRequest {
  metricNames: string[];
  format: ExportFormat;
  timeRange: {
    from: Date;
    to: Date;
  };
  filters?: ExportFilters;
  options?: ExportOptions;
}

export interface DashboardExportRequest {
  dashboardId: string;
  format: 'pdf' | 'png' | 'json';
  options?: {
    includeData?: boolean;
    theme?: 'light' | 'dark';
    resolution?: 'low' | 'medium' | 'high';
  };
}

export interface BulkExportRequest {
  items: BulkExportItem[];
  format: 'zip' | 'tar';
  options?: {
    compression?: boolean;
    includeManifest?: boolean;
  };
}

export interface BulkExportItem {
  type: 'metrics' | 'dashboard' | 'report';
  config: any;
}

export interface ExportFilters {
  sources?: string[];
  tags?: Record<string, string>;
  valueRange?: { min?: number; max?: number };
}

export interface ExportOptions {
  includeMetadata?: boolean;
  compression?: boolean;
  maxRows?: number;
}

export type ExportFormat = 'csv' | 'excel' | 'json' | 'pdf';

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ExportResult {
  id: string;
  status: ExportStatus;
  format: ExportFormat;
  filename: string;
  downloadUrl?: string;
  size?: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  metadata: {
    metricCount: number;
    rowCount: number;
    timeRange: { from: Date; to: Date };
  };
}

export interface ExportInfo {
  id: string;
  status: ExportStatus;
  format: ExportFormat;
  filename: string;
  filePath: string;
  size: number;
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
}

/**
 * Service for exporting analytics data in various formats
 */
export class ExportService {
  private exportQueue: Queue;

  constructor(
    private readonly metricsService: MetricsCollectionService,
    private readonly fileStorage: FileStorageService,
    private readonly cacheService: CacheService,
    private readonly logger: Logger,
    redisConfig: any
  ) {
    this.exportQueue = new Queue('data export', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 5,
        removeOnFail: 3,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      }
    });

    this.initializeQueueProcessors();
  }

  /**
   * Initialize queue processors
   */
  private initializeQueueProcessors(): void {
    this.exportQueue.process('export_metrics', 3, this.processMetricsExport.bind(this));
    this.exportQueue.process('export_dashboard', 2, this.processDashboardExport.bind(this));
    this.exportQueue.process('bulk_export', 1, this.processBulkExport.bind(this));
    
    this.exportQueue.on('completed', this.handleExportCompleted.bind(this));
    this.exportQueue.on('failed', this.handleExportFailed.bind(this));
  }

  /**
   * Export metrics data
   */
  async exportMetrics(request: ExportRequest): Promise<ExportResult> {
    try {
      const exportId = this.generateExportId();
      
      // Create export record
      const exportResult: ExportResult = {
        id: exportId,
        status: 'pending',
        format: request.format,
        filename: this.generateFilename(request.format, 'metrics'),
        createdAt: new Date(),
        metadata: {
          metricCount: request.metricNames.length,
          rowCount: 0,
          timeRange: request.timeRange
        }
      };

      // Store export info
      await this.cacheService.set(`export:${exportId}`, exportResult, 24 * 60 * 60); // 24 hours

      // Queue export job
      await this.exportQueue.add('export_metrics', {
        exportId,
        request
      }, {
        priority: this.getExportPriority(request.format),
        delay: 0
      });

      this.logger.info('Metrics export queued', { exportId, format: request.format });

      return exportResult;
    } catch (error) {
      this.logger.error('Failed to queue metrics export', { error: error.message });
      throw error;
    }
  }

  /**
   * Export dashboard
   */
  async exportDashboard(request: DashboardExportRequest): Promise<ExportResult> {
    try {
      const exportId = this.generateExportId();
      
      const exportResult: ExportResult = {
        id: exportId,
        status: 'pending',
        format: request.format as ExportFormat,
        filename: this.generateFilename(request.format, 'dashboard'),
        createdAt: new Date(),
        metadata: {
          metricCount: 0,
          rowCount: 0,
          timeRange: { from: new Date(), to: new Date() }
        }
      };

      await this.cacheService.set(`export:${exportId}`, exportResult, 24 * 60 * 60);

      await this.exportQueue.add('export_dashboard', {
        exportId,
        request
      });

      this.logger.info('Dashboard export queued', { exportId, dashboardId: request.dashboardId });

      return exportResult;
    } catch (error) {
      this.logger.error('Failed to queue dashboard export', { error: error.message });
      throw error;
    }
  }

  /**
   * Bulk export
   */
  async bulkExport(request: BulkExportRequest): Promise<ExportResult> {
    try {
      const exportId = this.generateExportId();
      
      const exportResult: ExportResult = {
        id: exportId,
        status: 'pending',
        format: request.format as ExportFormat,
        filename: this.generateFilename(request.format, 'bulk'),
        createdAt: new Date(),
        metadata: {
          metricCount: 0,
          rowCount: request.items.length,
          timeRange: { from: new Date(), to: new Date() }
        }
      };

      await this.cacheService.set(`export:${exportId}`, exportResult, 24 * 60 * 60);

      await this.exportQueue.add('bulk_export', {
        exportId,
        request
      });

      this.logger.info('Bulk export queued', { exportId, itemCount: request.items.length });

      return exportResult;
    } catch (error) {
      this.logger.error('Failed to queue bulk export', { error: error.message });
      throw error;
    }
  }

  /**
   * Process metrics export job
   */
  private async processMetricsExport(job: Job): Promise<void> {
    const { exportId, request } = job.data;
    
    try {
      this.logger.info('Processing metrics export', { exportId });

      // Update status
      await this.updateExportStatus(exportId, 'processing');

      // Fetch data
      const allData: any[] = [];
      for (const metricName of request.metricNames) {
        const metrics = await this.metricsService.getMetricsByName({
          name: metricName,
          from: request.timeRange.from,
          to: request.timeRange.to,
          limit: request.options?.maxRows || 100000
        });

        const processedData = metrics.map(metric => ({
          metric_name: metricName,
          value: metric.getValue().getValue(),
          timestamp: metric.getTimestamp().toISOString(),
          source: metric.getSource(),
          tags: JSON.stringify(metric.getTags()),
          unit: metric.getMetadata().getUnit(),
          category: metric.getMetadata().getCategory()
        }));

        allData.push(...processedData);
      }

      // Apply filters
      const filteredData = this.applyFilters(allData, request.filters);

      // Generate file
      const filePath = await this.generateExportFile(exportId, request.format, filteredData, request.options);

      // Update export with completion info
      const fileStats = await this.fileStorage.getFileStats(filePath);
      await this.updateExportCompletion(exportId, filePath, fileStats.size, filteredData.length);

      this.logger.info('Metrics export completed', { 
        exportId,
        rowCount: filteredData.length,
        size: fileStats.size
      });
    } catch (error) {
      this.logger.error('Failed to process metrics export', { exportId, error: error.message });
      await this.updateExportError(exportId, error.message);
      throw error;
    }
  }

  /**
   * Process dashboard export job
   */
  private async processDashboardExport(job: Job): Promise<void> {
    const { exportId, request } = job.data;
    
    try {
      this.logger.info('Processing dashboard export', { exportId });

      await this.updateExportStatus(exportId, 'processing');

      // This would integrate with a dashboard service to get dashboard data
      // For now, we'll create a placeholder implementation
      const dashboardData = {
        id: request.dashboardId,
        name: 'Dashboard Export',
        widgets: [],
        exportedAt: new Date().toISOString(),
        theme: request.options?.theme || 'light'
      };

      let filePath: string;
      
      switch (request.format) {
        case 'json':
          filePath = await this.generateJSONFile(exportId, dashboardData);
          break;
        case 'pdf':
          filePath = await this.generateDashboardPDF(exportId, dashboardData);
          break;
        case 'png':
          filePath = await this.generateDashboardImage(exportId, dashboardData);
          break;
        default:
          throw new Error(`Unsupported dashboard export format: ${request.format}`);
      }

      const fileStats = await this.fileStorage.getFileStats(filePath);
      await this.updateExportCompletion(exportId, filePath, fileStats.size, 1);

      this.logger.info('Dashboard export completed', { exportId });
    } catch (error) {
      this.logger.error('Failed to process dashboard export', { exportId, error: error.message });
      await this.updateExportError(exportId, error.message);
      throw error;
    }
  }

  /**
   * Process bulk export job
   */
  private async processBulkExport(job: Job): Promise<void> {
    const { exportId, request } = job.data;
    
    try {
      this.logger.info('Processing bulk export', { exportId });

      await this.updateExportStatus(exportId, 'processing');

      const tempFiles: string[] = [];
      
      // Process each item
      for (let i = 0; i < request.items.length; i++) {
        const item = request.items[i];
        job.progress(Math.round((i / request.items.length) * 100));

        let itemFilePath: string;
        
        switch (item.type) {
          case 'metrics':
            const metricsResult = await this.exportMetrics(item.config);
            itemFilePath = await this.waitForExportCompletion(metricsResult.id);
            break;
          case 'dashboard':
            const dashboardResult = await this.exportDashboard(item.config);
            itemFilePath = await this.waitForExportCompletion(dashboardResult.id);
            break;
          case 'report':
            // Would integrate with report service
            itemFilePath = await this.generatePlaceholderFile(exportId, i);
            break;
          default:
            throw new Error(`Unsupported bulk export item type: ${item.type}`);
        }

        tempFiles.push(itemFilePath);
      }

      // Create archive
      const archivePath = await this.createArchive(exportId, tempFiles, request.format, request.options);

      // Cleanup temp files
      await Promise.all(tempFiles.map(file => this.fileStorage.deleteFile(file)));

      const fileStats = await this.fileStorage.getFileStats(archivePath);
      await this.updateExportCompletion(exportId, archivePath, fileStats.size, request.items.length);

      this.logger.info('Bulk export completed', { exportId, itemCount: request.items.length });
    } catch (error) {
      this.logger.error('Failed to process bulk export', { exportId, error: error.message });
      await this.updateExportError(exportId, error.message);
      throw error;
    }
  }

  /**
   * Generate export file based on format
   */
  private async generateExportFile(
    exportId: string,
    format: ExportFormat,
    data: any[],
    options?: ExportOptions
  ): Promise<string> {
    switch (format) {
      case 'csv':
        return this.generateCSVFile(exportId, data);
      case 'excel':
        return this.generateExcelFile(exportId, data, options);
      case 'json':
        return this.generateJSONFile(exportId, data);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate CSV file
   */
  private async generateCSVFile(exportId: string, data: any[]): Promise<string> {
    const filePath = `exports/${exportId}.csv`;
    
    if (data.length === 0) {
      await this.fileStorage.writeFile(filePath, '');
      return filePath;
    }

    const parser = new Parser({
      fields: Object.keys(data[0]),
      header: true
    });

    const csv = parser.parse(data);
    await this.fileStorage.writeFile(filePath, csv);

    return filePath;
  }

  /**
   * Generate Excel file
   */
  private async generateExcelFile(exportId: string, data: any[], options?: ExportOptions): Promise<string> {
    const filePath = `exports/${exportId}.xlsx`;
    
    const workbook = XLSX.utils.book_new();
    
    // Data sheet
    const dataSheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');

    // Metadata sheet if requested
    if (options?.includeMetadata && data.length > 0) {
      const metadata = {
        'Export ID': exportId,
        'Generated At': new Date().toISOString(),
        'Row Count': data.length,
        'Columns': Object.keys(data[0]).join(', ')
      };
      
      const metadataData = Object.entries(metadata).map(([key, value]) => ({ Field: key, Value: value }));
      const metadataSheet = XLSX.utils.json_to_sheet(metadataData);
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    await this.fileStorage.writeFile(filePath, buffer);

    return filePath;
  }

  /**
   * Generate JSON file
   */
  private async generateJSONFile(exportId: string, data: any): Promise<string> {
    const filePath = `exports/${exportId}.json`;
    
    const exportData = {
      exportId,
      generatedAt: new Date().toISOString(),
      data
    };

    await this.fileStorage.writeFile(filePath, JSON.stringify(exportData, null, 2));

    return filePath;
  }

  /**
   * Generate dashboard PDF (placeholder)
   */
  private async generateDashboardPDF(exportId: string, dashboardData: any): Promise<string> {
    const filePath = `exports/${exportId}.pdf`;
    
    // This would integrate with a PDF generation service
    // For now, create a placeholder
    const pdfContent = `Dashboard Export: ${dashboardData.name}\nExported at: ${dashboardData.exportedAt}`;
    await this.fileStorage.writeFile(filePath, pdfContent);

    return filePath;
  }

  /**
   * Generate dashboard image (placeholder)
   */
  private async generateDashboardImage(exportId: string, dashboardData: any): Promise<string> {
    const filePath = `exports/${exportId}.png`;
    
    // This would integrate with a screenshot service
    // For now, create a placeholder
    const imageContent = Buffer.from('placeholder-image-data');
    await this.fileStorage.writeFile(filePath, imageContent);

    return filePath;
  }

  /**
   * Create archive from multiple files
   */
  private async createArchive(
    exportId: string,
    files: string[],
    format: 'zip' | 'tar',
    options?: { compression?: boolean }
  ): Promise<string> {
    const archivePath = `exports/${exportId}.${format}`;
    const archive = archiver(format === 'zip' ? 'zip' : 'tar', {
      zlib: { level: options?.compression ? 9 : 0 }
    });

    const writeStream = await this.fileStorage.createWriteStream(archivePath);
    archive.pipe(writeStream);

    for (const file of files) {
      const fileStream = await this.fileStorage.getFileStream(file);
      const filename = file.split('/').pop() || 'file';
      archive.append(fileStream, { name: filename });
    }

    await archive.finalize();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => resolve(archivePath));
      writeStream.on('error', reject);
    });
  }

  /**
   * Apply filters to data
   */
  private applyFilters(data: any[], filters?: ExportFilters): any[] {
    if (!filters) return data;

    return data.filter(item => {
      if (filters.sources && !filters.sources.includes(item.source)) {
        return false;
      }

      if (filters.valueRange && typeof item.value === 'number') {
        const { min, max } = filters.valueRange;
        if (min !== undefined && item.value < min) return false;
        if (max !== undefined && item.value > max) return false;
      }

      if (filters.tags) {
        try {
          const itemTags = JSON.parse(item.tags || '{}');
          for (const [key, value] of Object.entries(filters.tags)) {
            if (itemTags[key] !== value) return false;
          }
        } catch {
          // Invalid JSON tags, skip
        }
      }

      return true;
    });
  }

  /**
   * Helper methods
   */
  private generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFilename(format: string, type: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${type}_${timestamp}.${format}`;
  }

  private getExportPriority(format: ExportFormat): number {
    const priorities = { csv: 10, json: 8, excel: 6, pdf: 4 };
    return priorities[format] || 1;
  }

  private async updateExportStatus(exportId: string, status: ExportStatus): Promise<void> {
    const exportResult = await this.cacheService.get(`export:${exportId}`);
    if (exportResult) {
      exportResult.status = status;
      await this.cacheService.set(`export:${exportId}`, exportResult, 24 * 60 * 60);
    }
  }

  private async updateExportCompletion(
    exportId: string,
    filePath: string,
    size: number,
    rowCount: number
  ): Promise<void> {
    const exportResult = await this.cacheService.get(`export:${exportId}`);
    if (exportResult) {
      exportResult.status = 'completed';
      exportResult.size = size;
      exportResult.completedAt = new Date();
      exportResult.downloadUrl = await this.fileStorage.generateDownloadUrl(filePath);
      exportResult.metadata.rowCount = rowCount;
      
      await this.cacheService.set(`export:${exportId}`, exportResult, 24 * 60 * 60);
    }
  }

  private async updateExportError(exportId: string, error: string): Promise<void> {
    const exportResult = await this.cacheService.get(`export:${exportId}`);
    if (exportResult) {
      exportResult.status = 'failed';
      exportResult.error = error;
      await this.cacheService.set(`export:${exportId}`, exportResult, 24 * 60 * 60);
    }
  }

  private handleExportCompleted(job: Job): void {
    this.logger.info('Export job completed', { jobId: job.id, type: job.name });
  }

  private handleExportFailed(job: Job, error: Error): void {
    this.logger.error('Export job failed', { 
      jobId: job.id,
      type: job.name,
      error: error.message
    });
  }

  private async generatePlaceholderFile(exportId: string, index: number): Promise<string> {
    const filePath = `temp/${exportId}_item_${index}.txt`;
    await this.fileStorage.writeFile(filePath, `Placeholder for item ${index}`);
    return filePath;
  }

  private async waitForExportCompletion(exportId: string): Promise<string> {
    // Simplified implementation - would need proper polling
    await new Promise(resolve => setTimeout(resolve, 1000));
    const exportInfo = await this.getExportInfo(exportId);
    return exportInfo?.filePath || '';
  }

  /**
   * Public API methods
   */
  async getExportStatus(exportId: string): Promise<ExportResult | null> {
    return await this.cacheService.get(`export:${exportId}`);
  }

  async getExportInfo(exportId: string): Promise<ExportInfo | null> {
    const result = await this.getExportStatus(exportId);
    if (!result) return null;

    return {
      id: result.id,
      status: result.status,
      format: result.format,
      filename: result.filename,
      filePath: result.downloadUrl || '',
      size: result.size || 0,
      createdAt: result.createdAt,
      completedAt: result.completedAt,
      expiresAt: new Date(result.createdAt.getTime() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  async getExportFileStream(exportId: string): Promise<Readable> {
    const exportInfo = await this.getExportInfo(exportId);
    if (!exportInfo) {
      throw new Error('Export not found');
    }

    return await this.fileStorage.getFileStream(exportInfo.filePath);
  }

  async cancelExport(exportId: string): Promise<void> {
    await this.updateExportStatus(exportId, 'cancelled');
    
    // Try to cancel the job if it's still in queue
    const jobs = await this.exportQueue.getJobs(['waiting', 'active']);
    const job = jobs.find(j => j.data.exportId === exportId);
    if (job) {
      await job.remove();
    }
  }

  async getExportHistory(filters: any): Promise<{ exports: ExportResult[]; total: number }> {
    // This would typically query a database
    // For now, return empty results
    return { exports: [], total: 0 };
  }

  async getAvailableFormats(): Promise<any> {
    return {
      metrics: ['csv', 'excel', 'json'],
      dashboard: ['pdf', 'png', 'json'],
      reports: ['pdf', 'excel', 'csv', 'json', 'html']
    };
  }

  async cleanup(): Promise<void> {
    await this.exportQueue.close();
    this.logger.info('Export service cleaned up');
  }
}