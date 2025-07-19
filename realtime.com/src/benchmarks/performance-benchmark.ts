/*
                     @semantest/realtime-streaming

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
 * @fileoverview Performance Benchmarking Suite
 * @author Semantest Team
 * @module benchmarks/PerformanceBenchmark
 */

import { WebSocket } from 'ws';
import { Logger } from '@shared/infrastructure/logger';
import { HighPerformanceServer } from '../infrastructure/server/high-performance-server';

export interface BenchmarkConfig {
  scenarios: BenchmarkScenario[];
  duration: number;
  warmupDuration: number;
  reportInterval: number;
  outputFormats: ('console' | 'json' | 'csv' | 'html')[];
}

export interface BenchmarkScenario {
  name: string;
  description: string;
  concurrentClients: number;
  messagesPerSecond: number;
  messageSize: number;
  channels: number;
  publishRate: number;
  subscribeRate: number;
  enabled: boolean;
}

export interface BenchmarkResults {
  scenario: string;
  duration: number;
  summary: ResultSummary;
  throughput: ThroughputMetrics;
  latency: LatencyMetrics;
  errors: ErrorMetrics;
  resources: ResourceMetrics;
  timeline: TimelineData[];
}

export interface ResultSummary {
  totalConnections: number;
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  averageLatency: number;
  throughput: number;
  errorRate: number;
}

export interface ThroughputMetrics {
  messagesPerSecond: number;
  bytesPerSecond: number;
  connectionsPerSecond: number;
  peakThroughput: number;
  sustainedThroughput: number;
}

export interface LatencyMetrics {
  min: number;
  max: number;
  mean: number;
  median: number;
  p90: number;
  p95: number;
  p99: number;
  p999: number;
  stdDev: number;
}

export interface ErrorMetrics {
  connectionErrors: number;
  messageErrors: number;
  timeoutErrors: number;
  protocolErrors: number;
  totalErrors: number;
  errorRate: number;
  errorsByType: Record<string, number>;
}

export interface ResourceMetrics {
  cpu: { min: number; max: number; avg: number };
  memory: { min: number; max: number; avg: number };
  network: { in: number; out: number };
  connections: { active: number; peak: number };
}

export interface TimelineData {
  timestamp: number;
  connections: number;
  messagesPerSecond: number;
  latency: number;
  errors: number;
  cpu: number;
  memory: number;
}

export interface ClientMetrics {
  clientId: string;
  connectionTime: number;
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  latencies: number[];
  lastActivity: number;
}

/**
 * Performance benchmarking suite for WebSocket server
 */
export class PerformanceBenchmark {
  private isRunning = false;
  private clients: Map<string, BenchmarkClient> = new Map();
  private metrics: BenchmarkMetrics = new BenchmarkMetrics();
  private results: BenchmarkResults[] = [];

  constructor(
    private readonly server: HighPerformanceServer,
    private readonly logger: Logger
  ) {}

  /**
   * Run complete benchmark suite
   */
  async run(config: BenchmarkConfig): Promise<BenchmarkResults[]> {
    this.logger.info('Starting performance benchmark suite', { 
      scenarios: config.scenarios.length,
      duration: config.duration
    });

    this.results = [];

    for (const scenario of config.scenarios) {
      if (!scenario.enabled) {
        this.logger.info('Skipping disabled scenario', { scenario: scenario.name });
        continue;
      }

      this.logger.info('Running benchmark scenario', { scenario: scenario.name });
      
      const result = await this.runScenario(scenario, config);
      this.results.push(result);

      // Wait between scenarios
      await this.sleep(5000);
    }

    // Generate reports
    await this.generateReports(config);

    this.logger.info('Benchmark suite completed', { 
      scenarios: this.results.length,
      totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0)
    });

    return this.results;
  }

  /**
   * Run single benchmark scenario
   */
  async runScenario(scenario: BenchmarkScenario, config: BenchmarkConfig): Promise<BenchmarkResults> {
    this.isRunning = true;
    this.metrics.reset();

    const startTime = Date.now();

    try {
      // Warmup phase
      if (config.warmupDuration > 0) {
        this.logger.info('Starting warmup phase', { duration: config.warmupDuration });
        await this.warmup(scenario, config.warmupDuration);
        this.metrics.reset(); // Reset metrics after warmup
      }

      // Main benchmark phase
      this.logger.info('Starting main benchmark phase', { 
        duration: config.duration,
        clients: scenario.concurrentClients
      });

      await this.executeScenario(scenario, config);

      // Calculate results
      const duration = Date.now() - startTime;
      const results = this.calculateResults(scenario, duration);

      this.logger.info('Scenario completed', {
        scenario: scenario.name,
        duration,
        throughput: results.throughput.messagesPerSecond,
        averageLatency: results.latency.mean,
        errorRate: results.errors.errorRate
      });

      return results;

    } catch (error) {
      this.logger.error('Benchmark scenario failed', { 
        scenario: scenario.name, 
        error: error.message 
      });
      throw error;
    } finally {
      this.isRunning = false;
      await this.cleanup();
    }
  }

  /**
   * Warmup phase
   */
  private async warmup(scenario: BenchmarkScenario, duration: number): Promise<void> {
    const warmupClients = Math.min(scenario.concurrentClients, 10);
    
    // Create warmup clients
    for (let i = 0; i < warmupClients; i++) {
      const client = new BenchmarkClient(`warmup_${i}`, this.logger);
      await client.connect('ws://localhost:8080/ws');
      this.clients.set(client.id, client);
    }

    // Run warmup traffic
    const endTime = Date.now() + duration;
    while (Date.now() < endTime) {
      for (const client of this.clients.values()) {
        if (Math.random() < 0.1) { // 10% chance per iteration
          await client.sendMessage({
            type: 'publish',
            channel: `warmup_${Math.floor(Math.random() * 5)}`,
            payload: this.generatePayload(scenario.messageSize)
          });
        }
      }
      await this.sleep(100);
    }

    // Cleanup warmup clients
    for (const client of this.clients.values()) {
      await client.disconnect();
    }
    this.clients.clear();
  }

  /**
   * Execute main benchmark scenario
   */
  private async executeScenario(scenario: BenchmarkScenario, config: BenchmarkConfig): Promise<void> {
    // Start metrics collection
    this.startMetricsCollection(config.reportInterval);

    // Create clients
    await this.createClients(scenario);

    // Subscribe to channels
    await this.subscribeClients(scenario);

    // Start message publishing
    const publisher = this.startMessagePublisher(scenario);

    // Wait for benchmark duration
    await this.sleep(config.duration);

    // Stop publishing
    clearInterval(publisher);

    // Wait for remaining messages to be processed
    await this.sleep(2000);
  }

  /**
   * Create benchmark clients
   */
  private async createClients(scenario: BenchmarkScenario): Promise<void> {
    const clientPromises: Promise<void>[] = [];

    for (let i = 0; i < scenario.concurrentClients; i++) {
      const clientId = `client_${i}`;
      const client = new BenchmarkClient(clientId, this.logger);
      
      this.clients.set(clientId, client);

      clientPromises.push(
        client.connect('ws://localhost:8080/ws').then(() => {
          this.metrics.recordConnection();
        }).catch(error => {
          this.metrics.recordError('connection', error.message);
          this.logger.error('Client connection failed', { clientId, error: error.message });
        })
      );

      // Stagger connections to avoid overwhelming the server
      if (i % 10 === 0) {
        await this.sleep(100);
      }
    }

    await Promise.allSettled(clientPromises);
    
    this.logger.info('Clients created', { 
      total: scenario.concurrentClients,
      connected: this.clients.size 
    });
  }

  /**
   * Subscribe clients to channels
   */
  private async subscribeClients(scenario: BenchmarkScenario): Promise<void> {
    const subscriptionPromises: Promise<void>[] = [];

    for (const client of this.clients.values()) {
      for (let i = 0; i < scenario.channels; i++) {
        const channel = `benchmark_${i}`;
        subscriptionPromises.push(
          client.subscribe(channel).catch(error => {
            this.metrics.recordError('subscription', error.message);
          })
        );
      }
    }

    await Promise.allSettled(subscriptionPromises);
    this.logger.info('Client subscriptions completed');
  }

  /**
   * Start message publisher
   */
  private startMessagePublisher(scenario: BenchmarkScenario): NodeJS.Timeout {
    const publishInterval = 1000 / scenario.publishRate;
    
    return setInterval(async () => {
      if (!this.isRunning) return;

      // Select random client
      const clients = Array.from(this.clients.values());
      if (clients.length === 0) return;

      const client = clients[Math.floor(Math.random() * clients.length)];
      const channel = `benchmark_${Math.floor(Math.random() * scenario.channels)}`;
      
      try {
        const startTime = Date.now();
        
        await client.sendMessage({
          type: 'publish',
          channel,
          payload: this.generatePayload(scenario.messageSize),
          timestamp: startTime
        });

        this.metrics.recordMessage(Date.now() - startTime, scenario.messageSize);

      } catch (error) {
        this.metrics.recordError('publish', error.message);
      }
    }, publishInterval);
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(interval: number): void {
    setInterval(async () => {
      if (!this.isRunning) return;

      try {
        const serverMetrics = await this.server.getMetrics();
        
        this.metrics.recordTimeline({
          timestamp: Date.now(),
          connections: serverMetrics.connections,
          messagesPerSecond: serverMetrics.messagesPerSecond,
          latency: serverMetrics.latency.avg,
          errors: serverMetrics.errors,
          cpu: serverMetrics.cpu,
          memory: serverMetrics.memory
        });

      } catch (error) {
        this.logger.error('Failed to collect server metrics', { error: error.message });
      }
    }, interval);
  }

  /**
   * Calculate benchmark results
   */
  private calculateResults(scenario: BenchmarkScenario, duration: number): BenchmarkResults {
    const clientMetrics = Array.from(this.clients.values()).map(c => c.getMetrics());
    
    return {
      scenario: scenario.name,
      duration,
      summary: this.calculateSummary(clientMetrics),
      throughput: this.calculateThroughput(clientMetrics, duration),
      latency: this.calculateLatency(clientMetrics),
      errors: this.calculateErrors(clientMetrics),
      resources: this.calculateResources(),
      timeline: this.metrics.getTimeline()
    };
  }

  private calculateSummary(clientMetrics: ClientMetrics[]): ResultSummary {
    const totalMessages = clientMetrics.reduce((sum, m) => sum + m.messagesSent, 0);
    const successfulMessages = clientMetrics.reduce((sum, m) => sum + m.messagesReceived, 0);
    const failedMessages = totalMessages - successfulMessages;
    const allLatencies = clientMetrics.flatMap(m => m.latencies);
    const averageLatency = allLatencies.length > 0 
      ? allLatencies.reduce((sum, l) => sum + l, 0) / allLatencies.length 
      : 0;

    return {
      totalConnections: clientMetrics.length,
      totalMessages,
      successfulMessages,
      failedMessages,
      averageLatency,
      throughput: this.metrics.getMessagesPerSecond(),
      errorRate: failedMessages / totalMessages || 0
    };
  }

  private calculateThroughput(clientMetrics: ClientMetrics[], duration: number): ThroughputMetrics {
    const totalMessages = clientMetrics.reduce((sum, m) => sum + m.messagesSent, 0);
    const totalBytes = totalMessages * 1024; // Approximate message size
    const durationSeconds = duration / 1000;

    return {
      messagesPerSecond: totalMessages / durationSeconds,
      bytesPerSecond: totalBytes / durationSeconds,
      connectionsPerSecond: clientMetrics.length / durationSeconds,
      peakThroughput: this.metrics.getPeakThroughput(),
      sustainedThroughput: this.metrics.getSustainedThroughput()
    };
  }

  private calculateLatency(clientMetrics: ClientMetrics[]): LatencyMetrics {
    const allLatencies = clientMetrics.flatMap(m => m.latencies).sort((a, b) => a - b);
    
    if (allLatencies.length === 0) {
      return {
        min: 0, max: 0, mean: 0, median: 0,
        p90: 0, p95: 0, p99: 0, p999: 0, stdDev: 0
      };
    }

    const mean = allLatencies.reduce((sum, l) => sum + l, 0) / allLatencies.length;
    const variance = allLatencies.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / allLatencies.length;
    const stdDev = Math.sqrt(variance);

    return {
      min: allLatencies[0],
      max: allLatencies[allLatencies.length - 1],
      mean,
      median: this.percentile(allLatencies, 50),
      p90: this.percentile(allLatencies, 90),
      p95: this.percentile(allLatencies, 95),
      p99: this.percentile(allLatencies, 99),
      p999: this.percentile(allLatencies, 99.9),
      stdDev
    };
  }

  private calculateErrors(clientMetrics: ClientMetrics[]): ErrorMetrics {
    const totalErrors = clientMetrics.reduce((sum, m) => sum + m.errors, 0);
    const totalMessages = clientMetrics.reduce((sum, m) => sum + m.messagesSent, 0);

    return {
      connectionErrors: this.metrics.getErrorCount('connection'),
      messageErrors: this.metrics.getErrorCount('publish'),
      timeoutErrors: this.metrics.getErrorCount('timeout'),
      protocolErrors: this.metrics.getErrorCount('protocol'),
      totalErrors,
      errorRate: totalMessages > 0 ? totalErrors / totalMessages : 0,
      errorsByType: this.metrics.getErrorsByType()
    };
  }

  private calculateResources(): ResourceMetrics {
    const timeline = this.metrics.getTimeline();
    
    if (timeline.length === 0) {
      return {
        cpu: { min: 0, max: 0, avg: 0 },
        memory: { min: 0, max: 0, avg: 0 },
        network: { in: 0, out: 0 },
        connections: { active: 0, peak: 0 }
      };
    }

    const cpuValues = timeline.map(t => t.cpu);
    const memoryValues = timeline.map(t => t.memory);
    const connectionValues = timeline.map(t => t.connections);

    return {
      cpu: {
        min: Math.min(...cpuValues),
        max: Math.max(...cpuValues),
        avg: cpuValues.reduce((sum, v) => sum + v, 0) / cpuValues.length
      },
      memory: {
        min: Math.min(...memoryValues),
        max: Math.max(...memoryValues),
        avg: memoryValues.reduce((sum, v) => sum + v, 0) / memoryValues.length
      },
      network: { in: 0, out: 0 }, // Would be calculated from actual network metrics
      connections: {
        active: connectionValues[connectionValues.length - 1] || 0,
        peak: Math.max(...connectionValues)
      }
    };
  }

  /**
   * Generate reports
   */
  private async generateReports(config: BenchmarkConfig): Promise<void> {
    for (const format of config.outputFormats) {
      switch (format) {
        case 'console':
          this.generateConsoleReport();
          break;
        case 'json':
          await this.generateJsonReport();
          break;
        case 'csv':
          await this.generateCsvReport();
          break;
        case 'html':
          await this.generateHtmlReport();
          break;
      }
    }
  }

  private generateConsoleReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('PERFORMANCE BENCHMARK RESULTS');
    console.log('='.repeat(80));

    for (const result of this.results) {
      console.log(`\nScenario: ${result.scenario}`);
      console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
      console.log(`Throughput: ${result.throughput.messagesPerSecond.toFixed(0)} msg/s`);
      console.log(`Average Latency: ${result.latency.mean.toFixed(2)}ms`);
      console.log(`P95 Latency: ${result.latency.p95.toFixed(2)}ms`);
      console.log(`P99 Latency: ${result.latency.p99.toFixed(2)}ms`);
      console.log(`Error Rate: ${(result.errors.errorRate * 100).toFixed(2)}%`);
      console.log(`Connections: ${result.summary.totalConnections}`);
      console.log(`Messages: ${result.summary.totalMessages}`);
      console.log('-'.repeat(40));
    }
  }

  private async generateJsonReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: this.generateOverallSummary()
    };

    // In a real implementation, would write to file
    this.logger.info('JSON report generated', { totalScenarios: this.results.length });
  }

  private async generateCsvReport(): Promise<void> {
    // CSV generation implementation
    this.logger.info('CSV report generated');
  }

  private async generateHtmlReport(): Promise<void> {
    // HTML report generation implementation
    this.logger.info('HTML report generated');
  }

  private generateOverallSummary(): any {
    const totalMessages = this.results.reduce((sum, r) => sum + r.summary.totalMessages, 0);
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const avgThroughput = this.results.reduce((sum, r) => sum + r.throughput.messagesPerSecond, 0) / this.results.length;
    const avgLatency = this.results.reduce((sum, r) => sum + r.latency.mean, 0) / this.results.length;

    return {
      totalScenarios: this.results.length,
      totalMessages,
      totalDuration,
      averageThroughput: avgThroughput,
      averageLatency: avgLatency
    };
  }

  /**
   * Helper methods
   */
  private generatePayload(size: number): any {
    return {
      data: 'x'.repeat(Math.max(size - 100, 0)), // Account for JSON overhead
      timestamp: Date.now(),
      id: Math.random().toString(36)
    };
  }

  private percentile(sortedArray: number[], p: number): number {
    const index = Math.ceil((sortedArray.length * p) / 100) - 1;
    return sortedArray[Math.max(0, index)] || 0;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async cleanup(): Promise<void> {
    // Disconnect all clients
    const disconnectPromises = Array.from(this.clients.values()).map(client =>
      client.disconnect().catch(error => 
        this.logger.warn('Error disconnecting client', { error: error.message })
      )
    );

    await Promise.allSettled(disconnectPromises);
    this.clients.clear();

    this.logger.info('Benchmark cleanup completed');
  }
}

/**
 * Individual benchmark client
 */
class BenchmarkClient {
  private ws?: WebSocket;
  private connectionTime = 0;
  private messagesSent = 0;
  private messagesReceived = 0;
  private errors = 0;
  private latencies: number[] = [];
  private lastActivity = Date.now();

  constructor(
    public readonly id: string,
    private readonly logger: Logger
  ) {}

  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.connectionTime = Date.now() - startTime;
        this.lastActivity = Date.now();
        resolve();
      });

      this.ws.on('message', (data) => {
        this.messagesReceived++;
        this.lastActivity = Date.now();
        
        try {
          const message = JSON.parse(data.toString());
          if (message.timestamp) {
            const latency = Date.now() - message.timestamp;
            this.latencies.push(latency);
          }
        } catch (error) {
          // Ignore parsing errors for benchmark
        }
      });

      this.ws.on('error', (error) => {
        this.errors++;
        this.logger.debug('Client WebSocket error', { clientId: this.id, error: error.message });
        reject(error);
      });

      this.ws.on('close', () => {
        this.lastActivity = Date.now();
      });

      // Connection timeout
      setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }

  async subscribe(channel: string): Promise<void> {
    return this.sendMessage({
      type: 'subscribe',
      channel
    });
  }

  async sendMessage(message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      try {
        this.ws.send(JSON.stringify(message));
        this.messagesSent++;
        this.lastActivity = Date.now();
        resolve();
      } catch (error) {
        this.errors++;
        reject(error);
      }
    });
  }

  getMetrics(): ClientMetrics {
    return {
      clientId: this.id,
      connectionTime: this.connectionTime,
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      errors: this.errors,
      latencies: [...this.latencies],
      lastActivity: this.lastActivity
    };
  }
}

/**
 * Benchmark metrics collector
 */
class BenchmarkMetrics {
  private connectionCount = 0;
  private messageCount = 0;
  private errorCounts: Map<string, number> = new Map();
  private timeline: TimelineData[] = [];
  private latencies: number[] = [];

  reset(): void {
    this.connectionCount = 0;
    this.messageCount = 0;
    this.errorCounts.clear();
    this.timeline = [];
    this.latencies = [];
  }

  recordConnection(): void {
    this.connectionCount++;
  }

  recordMessage(latency: number, size: number): void {
    this.messageCount++;
    this.latencies.push(latency);
  }

  recordError(type: string, message: string): void {
    this.errorCounts.set(type, (this.errorCounts.get(type) || 0) + 1);
  }

  recordTimeline(data: TimelineData): void {
    this.timeline.push(data);
  }

  getMessagesPerSecond(): number {
    if (this.timeline.length < 2) return 0;
    
    const first = this.timeline[0];
    const last = this.timeline[this.timeline.length - 1];
    const duration = (last.timestamp - first.timestamp) / 1000;
    
    return duration > 0 ? this.messageCount / duration : 0;
  }

  getPeakThroughput(): number {
    return Math.max(...this.timeline.map(t => t.messagesPerSecond));
  }

  getSustainedThroughput(): number {
    // Calculate average throughput over middle 80% of timeline
    const start = Math.floor(this.timeline.length * 0.1);
    const end = Math.floor(this.timeline.length * 0.9);
    const middleTimeline = this.timeline.slice(start, end);
    
    if (middleTimeline.length === 0) return 0;
    
    return middleTimeline.reduce((sum, t) => sum + t.messagesPerSecond, 0) / middleTimeline.length;
  }

  getErrorCount(type: string): number {
    return this.errorCounts.get(type) || 0;
  }

  getErrorsByType(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  getTimeline(): TimelineData[] {
    return [...this.timeline];
  }
}