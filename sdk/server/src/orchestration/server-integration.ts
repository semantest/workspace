import { BaseEvent } from '@semantest/core';
import { TestEventTypes, SystemEventTypes } from '@semantest/contracts';
import { TestOrchestrator } from './test-orchestrator';
import { EventPersistence } from '../persistence/event-persistence';
import { SecurityMiddleware } from '../security/security-middleware';
import { ConsoleReporterPlugin, JSONReporterPlugin, PerformancePlugin } from '../plugins/example-plugins';

/**
 * Integration module for connecting orchestration with WebSocket server
 */
export class OrchestratorIntegration {
  private orchestrator: TestOrchestrator;
  private persistence: EventPersistence;
  private security: SecurityMiddleware;

  constructor(options?: {
    dbPath?: string;
    securityPolicy?: Parameters<typeof SecurityMiddleware.prototype.updatePolicy>[0];
  }) {
    // Initialize persistence
    this.persistence = new EventPersistence(options?.dbPath);

    // Initialize security
    this.security = new SecurityMiddleware(options?.securityPolicy);

    // Initialize orchestrator
    this.orchestrator = new TestOrchestrator({
      persistence: this.persistence,
      security: this.security
    });

    // Register default plugins
    this.registerDefaultPlugins();
  }

  /**
   * Register default plugins
   */
  private async registerDefaultPlugins(): Promise<void> {
    // Console reporter for development
    await this.orchestrator.registerPlugin(new ConsoleReporterPlugin());

    // JSON reporter for test results
    await this.orchestrator.registerPlugin(new JSONReporterPlugin('./test-results'));

    // Performance monitoring
    await this.orchestrator.registerPlugin(new PerformancePlugin());
  }

  /**
   * Handle incoming event from WebSocket server
   */
  async handleEvent(event: BaseEvent): Promise<void> {
    try {
      // Route event based on type
      switch (event.type) {
        // Test events
        case TestEventTypes.START_TEST:
          await this.orchestrator.handleTestStart(event);
          break;
        case TestEventTypes.END_TEST:
          await this.orchestrator.handleTestEnd(event);
          break;
        case TestEventTypes.SUITE_START:
          await this.orchestrator.handleSuiteStart(event);
          break;
        case TestEventTypes.SUITE_END:
          await this.orchestrator.handleSuiteEnd(event);
          break;

        // System events
        case SystemEventTypes.CLIENT_CONNECT:
          await this.handleClientConnect(event);
          break;
        case SystemEventTypes.CLIENT_DISCONNECT:
          await this.handleClientDisconnect(event);
          break;

        // Other events - just persist
        default:
          await this.persistence.saveEvent(event);
      }
    } catch (error) {
      console.error('Error handling event:', error);
      // Could emit error event or handle differently
    }
  }

  /**
   * Handle client connect
   */
  private async handleClientConnect(event: BaseEvent): Promise<void> {
    const { clientId, clientType } = event.payload as any;
    console.log(`Client connected: ${clientId} (${clientType})`);
    
    // Persist event
    await this.persistence.saveEvent(event);
  }

  /**
   * Handle client disconnect
   */
  private async handleClientDisconnect(event: BaseEvent): Promise<void> {
    const { clientId, reason } = event.payload as any;
    console.log(`Client disconnected: ${clientId} (${reason || 'unknown'})`);
    
    // Reset rate limit for disconnected client
    this.security.resetRateLimit(clientId);
    
    // Persist event
    await this.persistence.saveEvent(event);
  }

  /**
   * Get orchestrator instance
   */
  getOrchestrator(): TestOrchestrator {
    return this.orchestrator;
  }

  /**
   * Get persistence instance
   */
  getPersistence(): EventPersistence {
    return this.persistence;
  }

  /**
   * Get security instance
   */
  getSecurity(): SecurityMiddleware {
    return this.security;
  }

  /**
   * Create WebSocket event handlers for the server
   */
  createWebSocketHandlers() {
    return {
      // Handle incoming events
      onEvent: async (event: BaseEvent) => {
        await this.handleEvent(event);
      },

      // Handle test run commands
      onStartTestRun: async (config: Parameters<TestOrchestrator['startTestRun']>[0]) => {
        return await this.orchestrator.startTestRun(config);
      },

      onEndTestRun: async (runId: string) => {
        return await this.orchestrator.endTestRun(runId);
      },

      onCancelTestRun: async (runId: string, reason?: string) => {
        return await this.orchestrator.cancelTestRun(runId, reason);
      },

      // Query handlers
      onGetActiveRuns: () => {
        return this.orchestrator.getActiveRuns();
      },

      onGetRunStatus: (runId: string) => {
        return this.orchestrator.getRunStatus(runId);
      },

      // Security handlers
      onValidateEvent: async (event: BaseEvent) => {
        return await this.security.validateEvent(event);
      },

      onGetSecurityMetrics: () => {
        return this.security.getMetrics();
      },

      // Persistence handlers
      onGetEventsByTimeRange: async (startTime: number, endTime: number) => {
        return await this.persistence.getEventsByTimeRange(startTime, endTime);
      },

      onGetTestResultsByRun: async (runId: string) => {
        return await this.persistence.getTestResultsByRun(runId);
      },

      onGetStatistics: async () => {
        return await this.persistence.getStatistics();
      }
    };
  }

  /**
   * Shutdown orchestration system
   */
  async shutdown(): Promise<void> {
    await this.orchestrator.shutdown();
    this.persistence.close();
  }
}

/**
 * Factory function to create orchestration integration
 */
export function createOrchestratorIntegration(options?: Parameters<typeof OrchestratorIntegration>[0]) {
  return new OrchestratorIntegration(options);
}