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
 * @fileoverview Real-time Streaming Server Integration
 * @author Semantest Team
 * @module infrastructure/server/RealtimeServer
 */

import { Server } from 'http';
import { Redis } from 'ioredis';
import { Logger } from '@shared/infrastructure/logger';
import { WebSocketServer, WebSocketConfig } from '../websocket/websocket-server';
import { EventStore, EventStoreConfig } from '../events/event-store';
import { TestStreamingService } from '../../application/services/test-streaming.service';
import { AIStreamingService } from '../../application/services/ai-streaming.service';

export interface RealtimeServerConfig {
  websocket: WebSocketConfig;
  eventStore: EventStoreConfig;
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  server?: {
    port?: number;
    host?: string;
  };
}

export interface ServerStats {
  uptime: number;
  connectedClients: number;
  activeTestStreams: number;
  activeAIAnalyses: number;
  eventsPerSecond: number;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

/**
 * Main real-time streaming server with integrated services
 */
export class RealtimeServer {
  private httpServer?: Server;
  private redis: Redis;
  private eventStore: EventStore;
  private webSocketServer: WebSocketServer;
  private testStreamingService: TestStreamingService;
  private aiStreamingService: AIStreamingService;
  private startTime: Date = new Date();

  constructor(
    private readonly config: RealtimeServerConfig,
    private readonly logger: Logger
  ) {
    this.initializeComponents();
    this.setupEventIntegration();
  }

  /**
   * Initialize all server components
   */
  private initializeComponents(): void {
    // Initialize Redis
    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db || 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3
    });

    // Initialize Event Store
    this.eventStore = new EventStore(
      {
        ...this.config.eventStore,
        redis: this.redis
      },
      this.logger
    );

    // Initialize WebSocket Server
    this.webSocketServer = new WebSocketServer(
      this.config.websocket,
      this.logger,
      this.redis,
      this.eventStore
    );

    // Initialize Test Streaming Service
    this.testStreamingService = new TestStreamingService(
      this.webSocketServer,
      this.eventStore,
      this.logger
    );

    // Initialize AI Streaming Service
    this.aiStreamingService = new AIStreamingService(
      this.webSocketServer,
      this.eventStore,
      this.logger
    );

    this.logger.info('Realtime server components initialized');
  }

  /**
   * Setup event integration between services
   */
  private setupEventIntegration(): void {
    // Test streaming to AI insights integration
    this.testStreamingService.on('execution_completed', async (data) => {
      const { testId, runId, result, stream } = data;
      
      // Generate AI insights based on test results
      if (result.status === 'failed' || stream.metrics.failedSteps > 0) {
        await this.aiStreamingService.generateInsight({
          type: 'test_recommendation',
          title: 'Test Failure Analysis',
          description: `Test ${testId} failed with ${stream.metrics.failedSteps} failed steps`,
          data: {
            testId,
            runId,
            failedSteps: stream.metrics.failedSteps,
            totalSteps: stream.metrics.stepCount,
            duration: stream.metrics.totalDuration
          },
          confidence: 0.8,
          severity: stream.metrics.failedSteps > stream.metrics.stepCount * 0.5 ? 'high' : 'medium',
          category: 'testing',
          context: {
            testId,
            triggeredBy: 'test_failure'
          },
          source: 'test_analysis_engine'
        });
      }

      // Performance insights
      if (stream.metrics.averageStepDuration > 5000) { // 5 seconds
        await this.aiStreamingService.generateInsight({
          type: 'performance_optimization',
          title: 'Slow Test Performance Detected',
          description: `Test execution is slower than expected (${stream.metrics.averageStepDuration}ms average)`,
          data: {
            testId,
            averageDuration: stream.metrics.averageStepDuration,
            totalDuration: stream.metrics.totalDuration,
            stepCount: stream.metrics.stepCount
          },
          confidence: 0.75,
          severity: 'medium',
          category: 'performance',
          context: {
            testId,
            triggeredBy: 'performance_analysis'
          },
          source: 'performance_monitor'
        });
      }
    });

    // AI analysis to test streaming integration
    this.aiStreamingService.on('insight_generated', async (insight) => {
      // If insight is test-related, update relevant test streams
      if (insight.context.testId && insight.type === 'test_recommendation') {
        const activeStreams = this.testStreamingService.getActiveStreams();
        
        for (const [streamKey, stream] of activeStreams) {
          if (stream.testId === insight.context.testId) {
            // Broadcast AI insight to test subscribers
            await this.webSocketServer.broadcast({
              type: 'ai_insight_generated',
              channel: `test:${stream.testId}`,
              data: {
                insight,
                relatedToCurrentTest: true
              },
              timestamp: new Date(),
              messageId: this.generateMessageId(),
              source: 'ai_insight_integration'
            });
          }
        }
      }
    });

    // Error handling integration
    this.testStreamingService.on('error', (error) => {
      this.logger.error('Test streaming error', error);
    });

    this.aiStreamingService.on('error', (error) => {
      this.logger.error('AI streaming error', error);
    });

    this.webSocketServer.on('error', (error) => {
      this.logger.error('WebSocket server error', error);
    });

    this.eventStore.on('error', (error) => {
      this.logger.error('Event store error', error);
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis error', error);
    });

    this.logger.info('Event integration setup completed');
  }

  /**
   * Start the real-time server
   */
  async start(httpServer?: Server): Promise<void> {
    try {
      this.httpServer = httpServer;

      // Start WebSocket server
      await this.webSocketServer.start(this.httpServer);

      // Setup health check endpoint if we have an HTTP server
      if (this.httpServer) {
        this.setupHealthCheck();
      }

      // Start metrics reporting
      this.startMetricsReporting();

      this.logger.info('Realtime server started successfully', {
        websocketPort: this.config.websocket.port,
        redisHost: this.config.redis.host,
        redisPort: this.config.redis.port
      });

    } catch (error) {
      this.logger.error('Failed to start realtime server', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop the real-time server
   */
  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping realtime server...');

      // Stop WebSocket server
      await this.webSocketServer.stop();

      // Close Redis connection
      this.redis.disconnect();

      // Stop HTTP server if we manage it
      if (this.httpServer && this.config.server) {
        await new Promise<void>((resolve) => {
          this.httpServer!.close(() => resolve());
        });
      }

      this.logger.info('Realtime server stopped successfully');

    } catch (error) {
      this.logger.error('Error stopping realtime server', { error: error.message });
      throw error;
    }
  }

  /**
   * Get server statistics
   */
  getStats(): ServerStats {
    const wsStats = this.webSocketServer.getStats();
    const testStreams = this.testStreamingService.getActiveStreams();
    const aiStats = this.aiStreamingService.getStreamingStats();
    const memUsage = process.memoryUsage();

    return {
      uptime: Date.now() - this.startTime.getTime(),
      connectedClients: wsStats.connectedClients,
      activeTestStreams: testStreams.size,
      activeAIAnalyses: aiStats.activeAnalyses,
      eventsPerSecond: wsStats.messagesPerSecond,
      memoryUsage: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      }
    };
  }

  /**
   * Public API for services
   */
  getTestStreamingService(): TestStreamingService {
    return this.testStreamingService;
  }

  getAIStreamingService(): AIStreamingService {
    return this.aiStreamingService;
  }

  getWebSocketServer(): WebSocketServer {
    return this.webSocketServer;
  }

  getEventStore(): EventStore {
    return this.eventStore;
  }

  /**
   * Private helper methods
   */
  private setupHealthCheck(): void {
    // Add health check route to existing HTTP server
    const originalListeners = this.httpServer!.listeners('request');
    
    this.httpServer!.removeAllListeners('request');
    
    this.httpServer!.on('request', (req, res) => {
      if (req.url === '/health' && req.method === 'GET') {
        this.handleHealthCheck(req, res);
      } else {
        // Pass to original handlers
        for (const listener of originalListeners) {
          (listener as Function)(req, res);
        }
      }
    });
  }

  private handleHealthCheck(req: any, res: any): void {
    try {
      const stats = this.getStats();
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: stats.uptime,
        connectedClients: stats.connectedClients,
        activeStreams: stats.activeTestStreams,
        memoryUsage: stats.memoryUsage,
        services: {
          websocket: 'healthy',
          eventStore: 'healthy',
          redis: this.redis.status === 'ready' ? 'healthy' : 'unhealthy'
        }
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health, null, 2));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  }

  private startMetricsReporting(): void {
    setInterval(() => {
      const stats = this.getStats();
      this.logger.info('Server metrics', stats);
    }, 30000); // Every 30 seconds
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Factory function to create and configure realtime server
 */
export async function createRealtimeServer(
  config: RealtimeServerConfig,
  logger: Logger
): Promise<RealtimeServer> {
  const server = new RealtimeServer(config, logger);
  return server;
}