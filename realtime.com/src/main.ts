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
 * @fileoverview Main Application Entry Point
 * @author Semantest Team
 * @module main
 */

import { createServer } from 'http';
import { createRealtimeServer, RealtimeServerConfig } from './infrastructure/server/realtime-server';
import { Logger } from '@shared/infrastructure/logger';

// Configuration
const config: RealtimeServerConfig = {
  websocket: {
    port: parseInt(process.env.WS_PORT || '8080'),
    path: '/ws',
    maxConnections: 1000,
    heartbeatInterval: 30000,
    authentication: {
      enabled: process.env.AUTH_ENABLED === 'true',
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      tokenExpiry: 3600000 // 1 hour
    }
  },
  eventStore: {
    snapshotInterval: 100,
    maxEventsBeforeSnapshot: 1000,
    eventRetentionDays: 30
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0')
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0'
  }
};

// Logger setup
const logger: Logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
  },
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta || '');
  },
  debug: (message: string, meta?: any) => {
    if (process.env.DEBUG === 'true') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta || '');
    }
  }
};

/**
 * Main application startup
 */
async function main(): Promise<void> {
  try {
    logger.info('Starting Semantest Realtime Streaming Server...');

    // Create HTTP server
    const httpServer = createServer();

    // Create realtime server
    const realtimeServer = await createRealtimeServer(config, logger);

    // Start the server
    await realtimeServer.start(httpServer);

    // Start HTTP server
    if (config.server) {
      httpServer.listen(config.server.port, config.server.host, () => {
        logger.info(`HTTP server listening on ${config.server!.host}:${config.server!.port}`);
        logger.info(`WebSocket server available at ws://${config.server!.host}:${config.websocket.port}${config.websocket.path}`);
      });
    }

    // Setup graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await gracefulShutdown(realtimeServer, httpServer);
    });

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await gracefulShutdown(realtimeServer, httpServer);
    });

    // Setup example data generation for testing
    if (process.env.GENERATE_TEST_DATA === 'true') {
      setupTestDataGeneration(realtimeServer);
    }

    logger.info('Realtime streaming server started successfully');
    
    // Log configuration
    logger.info('Server configuration', {
      websocketPort: config.websocket.port,
      httpPort: config.server?.port,
      redisHost: config.redis.host,
      authEnabled: config.websocket.authentication?.enabled,
      maxConnections: config.websocket.maxConnections
    });

  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(realtimeServer: any, httpServer: any): Promise<void> {
  try {
    logger.info('Initiating graceful shutdown...');

    // Stop accepting new connections
    httpServer.close();

    // Stop realtime server
    await realtimeServer.stop();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
}

/**
 * Setup test data generation for development/testing
 */
function setupTestDataGeneration(realtimeServer: any): void {
  const testService = realtimeServer.getTestStreamingService();
  const aiService = realtimeServer.getAIStreamingService();

  logger.info('Setting up test data generation...');

  // Generate test execution data every 30 seconds
  setInterval(async () => {
    try {
      const testId = `test_${Math.random().toString(36).substr(2, 9)}`;
      const runId = `run_${Date.now()}`;

      // Start test stream
      const stream = await testService.startTestStream(testId, runId, {
        totalSteps: Math.floor(Math.random() * 10) + 5
      });

      // Simulate test progress
      let currentStep = 0;
      const progressInterval = setInterval(async () => {
        currentStep++;
        const progress = (currentStep / stream.progress.totalSteps) * 100;

        await testService.updateTestProgress(testId, runId, {
          currentStep,
          percentage: progress,
          estimatedTimeRemaining: (stream.progress.totalSteps - currentStep) * 2000
        }, {
          stepId: `step_${currentStep}`,
          name: `Test Step ${currentStep}`,
          status: Math.random() > 0.1 ? 'passed' : 'failed',
          startTime: new Date(),
          duration: Math.floor(Math.random() * 3000) + 500
        });

        if (currentStep >= stream.progress.totalSteps) {
          clearInterval(progressInterval);
          
          // Complete test
          await testService.completeTestExecution(testId, runId, {
            status: Math.random() > 0.2 ? 'completed' : 'failed',
            finalMetrics: {
              totalDuration: Date.now() - stream.startTime.getTime(),
              passedSteps: Math.floor(stream.progress.totalSteps * 0.8),
              failedSteps: Math.floor(stream.progress.totalSteps * 0.2)
            }
          });
        }
      }, 2000);

    } catch (error) {
      logger.error('Error generating test data', { error: error.message });
    }
  }, 30000);

  // Generate AI insights every 20 seconds
  setInterval(async () => {
    try {
      const insightTypes = ['performance_optimization', 'security_vulnerability', 'code_quality_issue', 'test_recommendation'];
      const categories = ['performance', 'security', 'quality', 'testing'];
      const severities = ['low', 'medium', 'high', 'critical'];

      const type = insightTypes[Math.floor(Math.random() * insightTypes.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];

      await aiService.generateInsight({
        type: type as any,
        title: `${type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Detected`,
        description: `Automated analysis has detected a ${severity} severity ${category} issue that requires attention.`,
        data: {
          location: `file_${Math.random().toString(36).substr(2, 6)}.ts`,
          lineNumber: Math.floor(Math.random() * 1000) + 1,
          details: `Sample ${type} data`
        },
        confidence: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
        severity: severity as any,
        category: category as any,
        context: {
          projectId: `project_${Math.random().toString(36).substr(2, 6)}`,
          triggeredBy: 'automated_analysis'
        },
        source: 'test_data_generator'
      });

    } catch (error) {
      logger.error('Error generating AI insight', { error: error.message });
    }
  }, 20000);

  logger.info('Test data generation started');
}

// Start the application
if (require.main === module) {
  main().catch((error) => {
    console.error('Application startup failed:', error);
    process.exit(1);
  });
}

export { main, config, logger };