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
 * @fileoverview Report Generation Service
 * @author Semantest Team
 * @module application/services/ReportGenerationService
 */

import { MetricRepository } from '@domain/repositories/metric.repository';
import { Logger } from '@shared/infrastructure/logger';
import { CacheService } from '@shared/infrastructure/cache.service';
import { FileStorageService } from '@shared/infrastructure/file-storage.service';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import { Parser } from 'json2csv';

export interface ReportRequest {
  name: string;
  description?: string;
  type: ReportType;
  format: ReportFormat;
  timeRange: {
    from: Date;
    to: Date;
  };
  metrics: ReportMetricConfig[];
  filters?: ReportFilters;
  groupBy?: string[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  options?: ReportOptions;
}

export interface ReportMetricConfig {
  name: string;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile';
  percentile?: number;
  alias?: string;
}

export interface ReportFilters {
  sources?: string[];
  tags?: Record<string, string>;
  valueRange?: { min?: number; max?: number };
}

export interface ReportOptions {
  includeCharts?: boolean;
  includeRawData?: boolean;
  includeSummary?: boolean;
  pageOrientation?: 'portrait' | 'landscape';
  fontSize?: number;
  theme?: 'light' | 'dark';
  logo?: string;
  headerText?: string;
  footerText?: string;
}

export type ReportType = 
  | 'summary'
  | 'detailed'
  | 'trend'
  | 'comparative'
  | 'custom';

export type ReportFormat = 
  | 'pdf'
  | 'excel'
  | 'csv'
  | 'json'
  | 'html';

export interface GeneratedReport {
  id: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  filePath: string;
  downloadUrl: string;
  size: number;
  generatedAt: Date;
  expiresAt: Date;
  metadata: {
    metrics: number;
    dataPoints: number;
    timeRange: { from: Date; to: Date };
    filters: ReportFilters;
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  defaultFormat: ReportFormat;
  metrics: ReportMetricConfig[];
  filters: ReportFilters;
  options: ReportOptions;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service for generating various types of analytics reports
 */
export class ReportGenerationService {
  constructor(
    private readonly metricRepository: MetricRepository,
    private readonly logger: Logger,
    private readonly cacheService: CacheService,
    private readonly fileStorage: FileStorageService
  ) {}

  /**
   * Generate report from request
   */
  async generateReport(request: ReportRequest): Promise<GeneratedReport> {
    try {
      this.logger.info('Starting report generation', { 
        name: request.name,
        type: request.type,
        format: request.format
      });

      // Validate request
      this.validateReportRequest(request);

      // Generate unique report ID
      const reportId = this.generateReportId();

      // Fetch and process data
      const reportData = await this.fetchReportData(request);

      // Generate report based on format
      const filePath = await this.generateReportFile(reportId, request, reportData);

      // Get file info
      const fileStats = await this.fileStorage.getFileStats(filePath);

      // Create report metadata
      const report: GeneratedReport = {
        id: reportId,
        name: request.name,
        type: request.type,
        format: request.format,
        filePath,
        downloadUrl: await this.fileStorage.generateDownloadUrl(filePath),
        size: fileStats.size,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        metadata: {
          metrics: request.metrics.length,
          dataPoints: reportData.length,
          timeRange: request.timeRange,
          filters: request.filters || {}
        }
      };

      // Cache report metadata
      await this.cacheService.set(
        `report:${reportId}`, 
        report, 
        7 * 24 * 60 * 60 // 7 days
      );

      this.logger.info('Report generated successfully', { 
        reportId,
        name: request.name,
        size: report.size
      });

      return report;
    } catch (error) {
      this.logger.error('Failed to generate report', { 
        error: error.message,
        name: request.name
      });
      throw error;
    }
  }

  /**
   * Generate PDF report
   */
  private async generatePDFReport(
    reportId: string,
    request: ReportRequest,
    data: any[]
  ): Promise<string> {
    const filePath = `reports/${reportId}.pdf`;
    const doc = new PDFDocument({
      size: 'A4',
      layout: request.options?.pageOrientation || 'portrait',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Create write stream
    const stream = await this.fileStorage.createWriteStream(filePath);
    doc.pipe(stream);

    // Add header
    doc.fontSize(20).text(request.name, { align: 'center' });
    doc.moveDown();

    if (request.description) {
      doc.fontSize(12).text(request.description, { align: 'center' });
      doc.moveDown();
    }

    // Add report metadata
    doc.fontSize(10)
       .text(`Generated: ${new Date().toISOString()}`)
       .text(`Time Range: ${request.timeRange.from.toISOString()} - ${request.timeRange.to.toISOString()}`)
       .text(`Data Points: ${data.length}`)
       .moveDown();

    // Add summary section
    if (request.options?.includeSummary !== false) {
      doc.fontSize(14).text('Summary', { underline: true });
      doc.moveDown(0.5);
      
      const summary = this.generateSummary(data, request);
      Object.entries(summary).forEach(([key, value]) => {
        doc.fontSize(10).text(`${key}: ${value}`);
      });
      doc.moveDown();
    }

    // Add data tables
    if (request.options?.includeRawData !== false) {
      doc.fontSize(14).text('Metrics Data', { underline: true });
      doc.moveDown(0.5);
      
      this.addDataTable(doc, data, request);
    }

    // Add footer
    if (request.options?.footerText) {
      doc.fontSize(8).text(request.options.footerText, { align: 'center' });
    }

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  /**
   * Generate Excel report
   */
  private async generateExcelReport(
    reportId: string,
    request: ReportRequest,
    data: any[]
  ): Promise<string> {
    const filePath = `reports/${reportId}.xlsx`;
    
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    if (request.options?.includeSummary !== false) {
      const summary = this.generateSummary(data, request);
      const summaryData = Object.entries(summary).map(([key, value]) => ({ Metric: key, Value: value }));
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }

    // Data sheet
    if (request.options?.includeRawData !== false) {
      const dataSheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');
    }

    // Metrics configuration sheet
    const configData = request.metrics.map(metric => ({
      Name: metric.name,
      Aggregation: metric.aggregation,
      Alias: metric.alias || metric.name,
      Percentile: metric.percentile || 'N/A'
    }));
    const configSheet = XLSX.utils.json_to_sheet(configData);
    XLSX.utils.book_append_sheet(workbook, configSheet, 'Configuration');

    // Write file
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    await this.fileStorage.writeFile(filePath, buffer);

    return filePath;
  }

  /**
   * Generate CSV report
   */
  private async generateCSVReport(
    reportId: string,
    request: ReportRequest,
    data: any[]
  ): Promise<string> {
    const filePath = `reports/${reportId}.csv`;
    
    const parser = new Parser({
      fields: this.getCSVFields(data),
      header: true
    });

    const csv = parser.parse(data);
    await this.fileStorage.writeFile(filePath, csv);

    return filePath;
  }

  /**
   * Generate JSON report
   */
  private async generateJSONReport(
    reportId: string,
    request: ReportRequest,
    data: any[]
  ): Promise<string> {
    const filePath = `reports/${reportId}.json`;
    
    const reportContent = {
      metadata: {
        id: reportId,
        name: request.name,
        description: request.description,
        type: request.type,
        generatedAt: new Date().toISOString(),
        timeRange: request.timeRange,
        filters: request.filters,
        options: request.options
      },
      summary: this.generateSummary(data, request),
      data,
      metrics: request.metrics
    };

    await this.fileStorage.writeFile(filePath, JSON.stringify(reportContent, null, 2));

    return filePath;
  }

  /**
   * Generate HTML report
   */
  private async generateHTMLReport(
    reportId: string,
    request: ReportRequest,
    data: any[]
  ): Promise<string> {
    const filePath = `reports/${reportId}.html`;
    
    const summary = this.generateSummary(data, request);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${request.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background: #f5f5f5; padding: 15px; margin: 20px 0; }
        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .data-table th { background-color: #f2f2f2; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${request.name}</h1>
        ${request.description ? `<p>${request.description}</p>` : ''}
        <p><small>Generated: ${new Date().toISOString()}</small></p>
    </div>

    <div class="summary">
        <h2>Summary</h2>
        ${Object.entries(summary).map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`).join('')}
    </div>

    <div class="data">
        <h2>Metrics Data</h2>
        <table class="data-table">
            <thead>
                <tr>
                    ${this.getCSVFields(data).map(field => `<th>${field}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${data.slice(0, 1000).map(row => `
                    <tr>
                        ${this.getCSVFields(data).map(field => `<td>${row[field] || ''}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${data.length > 1000 ? `<p><em>Showing first 1000 of ${data.length} records</em></p>` : ''}
    </div>

    <div class="footer">
        <p>Generated by Semantest Analytics Dashboard</p>
        ${request.options?.footerText ? `<p>${request.options.footerText}</p>` : ''}
    </div>
</body>
</html>`;

    await this.fileStorage.writeFile(filePath, html);

    return filePath;
  }

  /**
   * Fetch report data
   */
  private async fetchReportData(request: ReportRequest): Promise<any[]> {
    const allData: any[] = [];

    for (const metricConfig of request.metrics) {
      const metrics = await this.metricRepository.findByName(
        metricConfig.name,
        request.timeRange.from,
        request.timeRange.to,
        request.limit
      );

      // Apply filters
      const filteredMetrics = this.applyFilters(metrics, request.filters);

      // Process metrics based on aggregation
      const processedData = this.processMetricData(filteredMetrics, metricConfig, request);
      
      allData.push(...processedData);
    }

    // Group and sort data
    return this.groupAndSortData(allData, request);
  }

  /**
   * Apply filters to metrics
   */
  private applyFilters(metrics: any[], filters?: ReportFilters): any[] {
    if (!filters) return metrics;

    return metrics.filter(metric => {
      if (filters.sources && !filters.sources.includes(metric.getSource())) {
        return false;
      }

      if (filters.valueRange) {
        const value = metric.getValue().getValue();
        if (typeof value === 'number') {
          if (filters.valueRange.min !== undefined && value < filters.valueRange.min) {
            return false;
          }
          if (filters.valueRange.max !== undefined && value > filters.valueRange.max) {
            return false;
          }
        }
      }

      if (filters.tags) {
        const metricTags = metric.getTags();
        for (const [key, value] of Object.entries(filters.tags)) {
          if (metricTags[key] !== value) {
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Process metric data based on aggregation
   */
  private processMetricData(metrics: any[], config: ReportMetricConfig, request: ReportRequest): any[] {
    return metrics.map(metric => ({
      metric_name: config.alias || config.name,
      value: metric.getValue().getValue(),
      timestamp: metric.getTimestamp(),
      source: metric.getSource(),
      tags: metric.getTags(),
      unit: metric.getMetadata().getUnit(),
      category: metric.getMetadata().getCategory()
    }));
  }

  /**
   * Group and sort data
   */
  private groupAndSortData(data: any[], request: ReportRequest): any[] {
    let processedData = [...data];

    // Apply sorting
    if (request.orderBy && request.orderBy.length > 0) {
      processedData.sort((a, b) => {
        for (const sort of request.orderBy!) {
          const aValue = a[sort.field];
          const bValue = b[sort.field];
          
          let comparison = 0;
          if (aValue < bValue) comparison = -1;
          else if (aValue > bValue) comparison = 1;
          
          if (comparison !== 0) {
            return sort.direction === 'desc' ? -comparison : comparison;
          }
        }
        return 0;
      });
    }

    return processedData;
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(data: any[], request: ReportRequest): Record<string, any> {
    const summary: Record<string, any> = {
      'Total Data Points': data.length,
      'Time Range': `${request.timeRange.from.toISOString()} - ${request.timeRange.to.toISOString()}`,
      'Metrics Included': request.metrics.map(m => m.alias || m.name).join(', ')
    };

    if (data.length > 0) {
      const numericValues = data
        .map(d => d.value)
        .filter(v => typeof v === 'number')
        .sort((a, b) => a - b);

      if (numericValues.length > 0) {
        summary['Min Value'] = numericValues[0];
        summary['Max Value'] = numericValues[numericValues.length - 1];
        summary['Average Value'] = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
        summary['Median Value'] = numericValues[Math.floor(numericValues.length / 2)];
      }

      const sources = [...new Set(data.map(d => d.source))];
      summary['Data Sources'] = sources.join(', ');
    }

    return summary;
  }

  /**
   * Get CSV fields from data
   */
  private getCSVFields(data: any[]): string[] {
    if (data.length === 0) return [];
    
    const firstRow = data[0];
    return Object.keys(firstRow).filter(key => 
      typeof firstRow[key] !== 'object' || firstRow[key] === null
    );
  }

  /**
   * Add data table to PDF
   */
  private addDataTable(doc: any, data: any[], request: ReportRequest): void {
    const fields = this.getCSVFields(data);
    const maxRows = 50; // Limit for PDF
    
    // Table headers
    doc.fontSize(8);
    const startY = doc.y;
    let currentY = startY;
    
    fields.forEach((field, index) => {
      doc.text(field, 50 + (index * 80), currentY, { width: 75 });
    });
    
    currentY += 15;
    
    // Table data
    data.slice(0, maxRows).forEach((row, rowIndex) => {
      fields.forEach((field, colIndex) => {
        const value = row[field] || '';
        doc.text(String(value).substring(0, 10), 50 + (colIndex * 80), currentY, { width: 75 });
      });
      currentY += 12;
      
      if (currentY > 700) { // New page
        doc.addPage();
        currentY = 50;
      }
    });
    
    if (data.length > maxRows) {
      doc.text(`... and ${data.length - maxRows} more rows`, 50, currentY + 10);
    }
  }

  /**
   * Generate report file based on format
   */
  private async generateReportFile(
    reportId: string,
    request: ReportRequest,
    data: any[]
  ): Promise<string> {
    switch (request.format) {
      case 'pdf':
        return this.generatePDFReport(reportId, request, data);
      case 'excel':
        return this.generateExcelReport(reportId, request, data);
      case 'csv':
        return this.generateCSVReport(reportId, request, data);
      case 'json':
        return this.generateJSONReport(reportId, request, data);
      case 'html':
        return this.generateHTMLReport(reportId, request, data);
      default:
        throw new Error(`Unsupported report format: ${request.format}`);
    }
  }

  /**
   * Validate report request
   */
  private validateReportRequest(request: ReportRequest): void {
    if (!request.name?.trim()) {
      throw new Error('Report name is required');
    }

    if (!request.metrics || request.metrics.length === 0) {
      throw new Error('At least one metric must be specified');
    }

    if (request.timeRange.from >= request.timeRange.to) {
      throw new Error('Invalid time range: from date must be before to date');
    }

    const validTypes: ReportType[] = ['summary', 'detailed', 'trend', 'comparative', 'custom'];
    if (!validTypes.includes(request.type)) {
      throw new Error(`Invalid report type: ${request.type}`);
    }

    const validFormats: ReportFormat[] = ['pdf', 'excel', 'csv', 'json', 'html'];
    if (!validFormats.includes(request.format)) {
      throw new Error(`Invalid report format: ${request.format}`);
    }
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get report by ID
   */
  async getReportById(reportId: string): Promise<GeneratedReport | null> {
    try {
      return await this.cacheService.get(`report:${reportId}`);
    } catch (error) {
      this.logger.error('Failed to get report by ID', { error: error.message, reportId });
      return null;
    }
  }

  /**
   * Delete report
   */
  async deleteReport(reportId: string): Promise<void> {
    try {
      const report = await this.getReportById(reportId);
      if (report) {
        await this.fileStorage.deleteFile(report.filePath);
        await this.cacheService.delete(`report:${reportId}`);
      }
    } catch (error) {
      this.logger.error('Failed to delete report', { error: error.message, reportId });
      throw error;
    }
  }
}