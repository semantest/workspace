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
 * @fileoverview Data Aggregation Service
 * @author Semantest Team
 * @module application/services/DataAggregationService
 */

import { Queue, Job } from 'bull';
import { CronJob } from 'cron';
import { MetricRepository } from '@domain/repositories/metric.repository';
import { Metric, AggregationMethod } from '@domain/entities/metric.entity';
import { Logger } from '@shared/infrastructure/logger';
import { CacheService } from '@shared/infrastructure/cache.service';
import { EventPublisher } from '@shared/infrastructure/event-publisher';

export interface AggregationJob {
  id: string;
  metricName: string;
  method: AggregationMethod;
  timeWindow: TimeWindow;
  interval: AggregationInterval;
  filters?: AggregationFilters;
  retentionDays: number;
  isActive: boolean;
  createdAt: Date;
  lastRun?: Date;
  nextRun?: Date;
}

export interface TimeWindow {
  duration: number; // in minutes
  unit: 'minutes' | 'hours' | 'days';
  offset?: number; // offset from current time
}

export interface AggregationInterval {
  value: number;
  unit: 'minutes' | 'hours' | 'days';
  cron?: string; // custom cron expression
}

export interface AggregationFilters {
  sources?: string[];
  tags?: Record<string, string>;
  valueRange?: { min?: number; max?: number };
}

export interface AggregationResult {
  jobId: string;
  metricName: string;
  method: AggregationMethod;
  value: number;
  count: number;
  timeWindow: { from: Date; to: Date };
  aggregatedAt: Date;
  sourceMetrics: string[];
}

export interface PipelineConfig {
  name: string;
  description: string;
  jobs: AggregationJob[];
  dependencies: { [jobId: string]: string[] };
  parallelJobs: number;
  retryAttempts: number;
  timeout: number;
  isActive: boolean;
}

/**
 * Service for managing data aggregation pipelines and background jobs
 */
export class DataAggregationService {
  private aggregationQueue: Queue;
  private scheduledJobs: Map<string, CronJob> = new Map();
  private runningJobs: Map<string, Job> = new Map();

  constructor(
    private readonly metricRepository: MetricRepository,
    private readonly logger: Logger,
    private readonly cacheService: CacheService,
    private readonly eventPublisher: EventPublisher,
    redisConfig: any
  ) {
    this.aggregationQueue = new Queue('data aggregation', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    this.initializeQueueProcessors();
  }

  /**
   * Initialize queue processors
   */
  private initializeQueueProcessors(): void {
    this.aggregationQueue.process('aggregate_metrics', 5, this.processAggregationJob.bind(this));
    this.aggregationQueue.process('cleanup_old_data', 1, this.processCleanupJob.bind(this));
    
    this.aggregationQueue.on('completed', this.handleJobCompleted.bind(this));
    this.aggregationQueue.on('failed', this.handleJobFailed.bind(this));
    this.aggregationQueue.on('stalled', this.handleJobStalled.bind(this));
  }

  /**
   * Create aggregation job
   */
  async createAggregationJob(config: Partial<AggregationJob>): Promise<AggregationJob> {
    try {
      const job: AggregationJob = {
        id: this.generateJobId(),
        metricName: config.metricName!,
        method: config.method!,
        timeWindow: config.timeWindow!,
        interval: config.interval!,
        filters: config.filters,
        retentionDays: config.retentionDays || 30,
        isActive: config.isActive !== false,
        createdAt: new Date(),
        nextRun: this.calculateNextRun(config.interval!)
      };

      // Validate job configuration
      this.validateAggregationJob(job);

      // Store job configuration
      await this.cacheService.set(`aggregation_job:${job.id}`, job, 0); // No expiration

      // Schedule job if active
      if (job.isActive) {
        await this.scheduleAggregationJob(job);
      }

      this.logger.info('Aggregation job created', { jobId: job.id, metricName: job.metricName });

      return job;
    } catch (error) {
      this.logger.error('Failed to create aggregation job', { error: error.message });
      throw error;
    }
  }

  /**
   * Schedule aggregation job
   */
  private async scheduleAggregationJob(job: AggregationJob): Promise<void> {
    const cronExpression = job.interval.cron || this.generateCronExpression(job.interval);
    
    const cronJob = new CronJob(cronExpression, async () => {
      try {
        await this.executeAggregationJob(job);
      } catch (error) {
        this.logger.error('Failed to execute scheduled aggregation job', { 
          jobId: job.id,
          error: error.message 
        });
      }
    });

    cronJob.start();
    this.scheduledJobs.set(job.id, cronJob);

    this.logger.debug('Aggregation job scheduled', { 
      jobId: job.id,
      cronExpression
    });
  }

  /**
   * Execute aggregation job
   */
  async executeAggregationJob(job: AggregationJob): Promise<AggregationResult> {
    try {
      this.logger.info('Executing aggregation job', { jobId: job.id });

      // Add job to queue
      const queueJob = await this.aggregationQueue.add('aggregate_metrics', {
        job,
        executedAt: new Date()
      }, {
        priority: this.getJobPriority(job),
        delay: 0
      });

      this.runningJobs.set(job.id, queueJob);

      // Wait for job completion
      const result = await queueJob.finished();
      
      // Update job last run time
      job.lastRun = new Date();
      job.nextRun = this.calculateNextRun(job.interval);
      await this.cacheService.set(`aggregation_job:${job.id}`, job, 0);

      return result;
    } catch (error) {
      this.logger.error('Failed to execute aggregation job', { 
        jobId: job.id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Process aggregation job
   */
  private async processAggregationJob(queueJob: Job): Promise<AggregationResult> {
    const { job, executedAt } = queueJob.data;
    
    try {
      this.logger.debug('Processing aggregation job', { jobId: job.id });

      // Calculate time window
      const timeWindow = this.calculateTimeWindow(job.timeWindow, executedAt);

      // Fetch metrics for aggregation
      const metrics = await this.fetchMetricsForAggregation(job, timeWindow);

      if (metrics.length === 0) {
        this.logger.warn('No metrics found for aggregation', { 
          jobId: job.id,
          timeWindow 
        });
        return this.createEmptyResult(job, timeWindow, executedAt);
      }

      // Perform aggregation
      const aggregatedValue = this.performAggregation(metrics, job.method);

      // Create aggregated metric
      const aggregatedMetric = await this.createAggregatedMetric(
        job,
        aggregatedValue,
        timeWindow,
        metrics
      );

      // Store aggregated metric
      await this.metricRepository.save(aggregatedMetric);

      // Create result
      const result: AggregationResult = {
        jobId: job.id,
        metricName: job.metricName,
        method: job.method,
        value: aggregatedValue,
        count: metrics.length,
        timeWindow,
        aggregatedAt: executedAt,
        sourceMetrics: metrics.map(m => m.getId().getValue())
      };

      // Publish events
      const events = aggregatedMetric.getUncommittedEvents();
      for (const event of events) {
        await this.eventPublisher.publish(event);
      }
      aggregatedMetric.markEventsAsCommitted();

      this.logger.info('Aggregation job completed', { 
        jobId: job.id,
        value: aggregatedValue,
        count: metrics.length
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to process aggregation job', { 
        jobId: job.id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Fetch metrics for aggregation
   */
  private async fetchMetricsForAggregation(
    job: AggregationJob,
    timeWindow: { from: Date; to: Date }
  ): Promise<Metric[]> {
    const metrics = await this.metricRepository.findByName(
      job.metricName,
      timeWindow.from,
      timeWindow.to
    );

    if (!job.filters) return metrics;

    return metrics.filter(metric => {
      if (job.filters!.sources && !job.filters!.sources.includes(metric.getSource())) {
        return false;
      }

      if (job.filters!.valueRange) {
        const value = metric.getValue().getValue();
        if (typeof value === 'number') {
          const { min, max } = job.filters!.valueRange;
          if (min !== undefined && value < min) return false;
          if (max !== undefined && value > max) return false;
        }
      }

      if (job.filters!.tags) {
        const metricTags = metric.getTags();
        for (const [key, value] of Object.entries(job.filters!.tags)) {
          if (metricTags[key] !== value) return false;
        }
      }

      return true;
    });
  }

  /**
   * Perform aggregation calculation
   */
  private performAggregation(metrics: Metric[], method: AggregationMethod): number {
    const numericValues = metrics
      .map(m => m.getValue().getValue())
      .filter(v => typeof v === 'number') as number[];

    if (numericValues.length === 0) return 0;

    switch (method) {
      case 'sum':
        return numericValues.reduce((sum, val) => sum + val, 0);
      
      case 'avg':
        return numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
      
      case 'min':
        return Math.min(...numericValues);
      
      case 'max':
        return Math.max(...numericValues);
      
      case 'count':
        return numericValues.length;
      
      case 'percentile':
        // Default to 95th percentile
        const sorted = numericValues.sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * 0.95) - 1;
        return sorted[index] || 0;
      
      case 'variance':
        const avg = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
        const squaredDiffs = numericValues.map(val => Math.pow(val - avg, 2));
        return squaredDiffs.reduce((sum, val) => sum + val, 0) / numericValues.length;
      
      case 'stddev':
        const variance = this.performAggregation(metrics, 'variance');
        return Math.sqrt(variance);
      
      default:
        throw new Error(`Unsupported aggregation method: ${method}`);
    }
  }

  /**
   * Create aggregated metric
   */
  private async createAggregatedMetric(
    job: AggregationJob,
    value: number,
    timeWindow: { from: Date; to: Date },
    sourceMetrics: Metric[]
  ): Promise<Metric> {
    const aggregatedName = `${job.metricName}_${job.method}_${job.timeWindow.duration}${job.timeWindow.unit}`;
    
    return Metric.create(
      aggregatedName,
      'summary',
      value,
      'aggregation',
      {
        aggregation_method: job.method,
        source_metric: job.metricName,
        time_window: `${job.timeWindow.duration}${job.timeWindow.unit}`,
        source_count: sourceMetrics.length.toString(),
        window_start: timeWindow.from.toISOString(),
        window_end: timeWindow.to.toISOString()
      },
      {
        unit: sourceMetrics[0]?.getMetadata().getUnit() || 'count',
        description: `Aggregated ${job.method} of ${job.metricName} over ${job.timeWindow.duration} ${job.timeWindow.unit}`,
        category: 'aggregated'
      }
    );
  }

  /**
   * Create pipeline configuration
   */
  async createPipeline(config: PipelineConfig): Promise<string> {
    try {
      const pipelineId = this.generatePipelineId();
      
      // Validate pipeline configuration
      this.validatePipelineConfig(config);

      // Store pipeline configuration
      await this.cacheService.set(`pipeline:${pipelineId}`, config, 0);

      // Create and schedule jobs
      if (config.isActive) {
        for (const job of config.jobs) {
          if (job.isActive) {
            await this.createAggregationJob(job);
          }
        }
      }

      this.logger.info('Aggregation pipeline created', { 
        pipelineId,
        name: config.name,
        jobCount: config.jobs.length
      });

      return pipelineId;
    } catch (error) {
      this.logger.error('Failed to create pipeline', { error: error.message });
      throw error;
    }
  }

  /**
   * Schedule cleanup job
   */
  async scheduleCleanupJob(retentionDays: number = 90): Promise<void> {
    // Schedule daily cleanup at 2 AM
    const cronJob = new CronJob('0 2 * * *', async () => {
      await this.aggregationQueue.add('cleanup_old_data', {
        retentionDays,
        executedAt: new Date()
      });
    });

    cronJob.start();
    this.scheduledJobs.set('cleanup', cronJob);

    this.logger.info('Cleanup job scheduled', { retentionDays });
  }

  /**
   * Process cleanup job
   */
  private async processCleanupJob(queueJob: Job): Promise<void> {
    const { retentionDays } = queueJob.data;
    
    try {
      this.logger.info('Starting data cleanup', { retentionDays });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      await this.metricRepository.deleteOlderThan(cutoffDate);

      this.logger.info('Data cleanup completed', { cutoffDate });
    } catch (error) {
      this.logger.error('Failed to cleanup old data', { error: error.message });
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private calculateTimeWindow(window: TimeWindow, referenceTime: Date): { from: Date; to: Date } {
    const to = new Date(referenceTime);
    if (window.offset) {
      to.setMinutes(to.getMinutes() - window.offset);
    }

    const from = new Date(to);
    switch (window.unit) {
      case 'minutes':
        from.setMinutes(from.getMinutes() - window.duration);
        break;
      case 'hours':
        from.setHours(from.getHours() - window.duration);
        break;
      case 'days':
        from.setDate(from.getDate() - window.duration);
        break;
    }

    return { from, to };
  }

  private calculateNextRun(interval: AggregationInterval): Date {
    const next = new Date();
    switch (interval.unit) {
      case 'minutes':
        next.setMinutes(next.getMinutes() + interval.value);
        break;
      case 'hours':
        next.setHours(next.getHours() + interval.value);
        break;
      case 'days':
        next.setDate(next.getDate() + interval.value);
        break;
    }
    return next;
  }

  private generateCronExpression(interval: AggregationInterval): string {
    switch (interval.unit) {
      case 'minutes':
        return `*/${interval.value} * * * *`;
      case 'hours':
        return `0 */${interval.value} * * *`;
      case 'days':
        return `0 0 */${interval.value} * *`;
      default:
        return '0 * * * *'; // Every hour as fallback
    }
  }

  private createEmptyResult(job: AggregationJob, timeWindow: any, executedAt: Date): AggregationResult {
    return {
      jobId: job.id,
      metricName: job.metricName,
      method: job.method,
      value: 0,
      count: 0,
      timeWindow,
      aggregatedAt: executedAt,
      sourceMetrics: []
    };
  }

  private getJobPriority(job: AggregationJob): number {
    // Higher priority for shorter intervals
    switch (job.interval.unit) {
      case 'minutes': return 10;
      case 'hours': return 5;
      case 'days': return 1;
      default: return 1;
    }
  }

  private validateAggregationJob(job: AggregationJob): void {
    if (!job.metricName?.trim()) {
      throw new Error('Metric name is required');
    }

    if (!job.method) {
      throw new Error('Aggregation method is required');
    }

    if (!job.timeWindow || job.timeWindow.duration <= 0) {
      throw new Error('Valid time window is required');
    }

    if (!job.interval || job.interval.value <= 0) {
      throw new Error('Valid interval is required');
    }
  }

  private validatePipelineConfig(config: PipelineConfig): void {
    if (!config.name?.trim()) {
      throw new Error('Pipeline name is required');
    }

    if (!config.jobs || config.jobs.length === 0) {
      throw new Error('Pipeline must have at least one job');
    }

    // Validate job dependencies
    for (const [jobId, deps] of Object.entries(config.dependencies || {})) {
      for (const dep of deps) {
        if (!config.jobs.find(j => j.id === dep)) {
          throw new Error(`Dependency job '${dep}' not found for job '${jobId}'`);
        }
      }
    }
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePipelineId(): string {
    return `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleJobCompleted(job: Job, result: any): void {
    this.logger.debug('Aggregation job completed', { jobId: job.id, result });
    this.runningJobs.delete(job.data.job.id);
  }

  private handleJobFailed(job: Job, error: Error): void {
    this.logger.error('Aggregation job failed', { 
      jobId: job.id,
      error: error.message,
      attempts: job.attemptsMade
    });
    this.runningJobs.delete(job.data.job.id);
  }

  private handleJobStalled(job: Job): void {
    this.logger.warn('Aggregation job stalled', { jobId: job.id });
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<any> {
    const job = await this.cacheService.get(`aggregation_job:${jobId}`);
    const runningJob = this.runningJobs.get(jobId);
    
    return {
      job,
      isRunning: !!runningJob,
      queuePosition: runningJob ? await runningJob.getPosition() : null,
      progress: runningJob ? runningJob.progress() : null
    };
  }

  /**
   * Stop and cleanup
   */
  async cleanup(): Promise<void> {
    // Stop all scheduled jobs
    this.scheduledJobs.forEach(job => job.stop());
    this.scheduledJobs.clear();

    // Close queue
    await this.aggregationQueue.close();

    this.logger.info('Data aggregation service cleaned up');
  }
}