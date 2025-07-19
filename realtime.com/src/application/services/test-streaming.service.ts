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
 * @fileoverview Live Test Execution Streaming Service
 * @author Semantest Team
 * @module application/services/TestStreamingService
 */

import { EventEmitter } from 'events';
import { WebSocketServer, StreamMessage } from '../../infrastructure/websocket/websocket-server';
import { EventStore } from '../../infrastructure/events/event-store';
import { Logger } from '@shared/infrastructure/logger';

export interface TestExecutionStream {
  testId: string;
  runId: string;
  status: TestExecutionStatus;
  startTime: Date;
  endTime?: Date;
  progress: TestExecutionProgress;
  steps: TestStepStream[];
  metrics: TestExecutionMetrics;
  subscribers: Set<string>;
}

export type TestExecutionStatus = 
  | 'queued'
  | 'starting'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface TestExecutionProgress {
  currentStep: number;
  totalSteps: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  throughput?: number;
}

export interface TestStepStream {
  stepId: string;
  name: string;
  status: TestStepStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  result?: any;
  error?: string;
  metrics?: StepMetrics;
}

export type TestStepStatus = 
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'warning';

export interface StepMetrics {
  responseTime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  networkLatency?: number;
  assertions?: AssertionResult[];
}

export interface AssertionResult {
  id: string;
  description: string;
  passed: boolean;
  expected: any;
  actual: any;
  duration: number;
}

export interface TestExecutionMetrics {
  totalDuration: number;
  stepCount: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  averageStepDuration: number;
  peakMemoryUsage: number;
  totalAssertions: number;
  passedAssertions: number;
  failedAssertions: number;
}

export interface LiveTestCommand {
  type: TestCommandType;
  testId: string;
  runId?: string;
  parameters?: any;
  timestamp: Date;
  clientId: string;
}

export type TestCommandType =
  | 'start'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'debug'
  | 'step_into'
  | 'step_over'
  | 'set_breakpoint'
  | 'remove_breakpoint';

export interface TestSubscriptionRequest {
  testId?: string;
  runId?: string;
  projectId?: string;
  userId?: string;
  filters?: TestStreamFilter;
  realTimeOnly?: boolean;
}

export interface TestStreamFilter {
  status?: TestExecutionStatus[];
  stepTypes?: string[];
  errorTypes?: string[];
  minDuration?: number;
  maxDuration?: number;
  includeLogs?: boolean;
  includeMetrics?: boolean;
}

export interface TestExecutionEvent {
  eventType: string;
  testId: string;
  runId: string;
  data: any;
  timestamp: Date;
  correlationId?: string;
}

/**
 * Service for streaming live test execution updates
 */
export class TestStreamingService extends EventEmitter {
  private activeStreams: Map<string, TestExecutionStream> = new Map();
  private testSubscriptions: Map<string, Set<string>> = new Map(); // testId -> clientIds
  private clientSubscriptions: Map<string, Set<string>> = new Map(); // clientId -> testIds
  private commandHandlers: Map<TestCommandType, (command: LiveTestCommand) => Promise<void>> = new Map();

  constructor(
    private readonly webSocketServer: WebSocketServer,
    private readonly eventStore: EventStore,
    private readonly logger: Logger
  ) {
    super();
    this.setupEventListeners();
    this.setupCommandHandlers();
    this.startStreamMaintenance();
  }

  /**
   * Start streaming test execution
   */
  async startTestStream(
    testId: string,
    runId: string,
    initialData?: any
  ): Promise<TestExecutionStream> {
    try {
      const streamKey = this.getStreamKey(testId, runId);
      
      if (this.activeStreams.has(streamKey)) {
        throw new Error(`Test stream already active: ${streamKey}`);
      }

      const stream: TestExecutionStream = {
        testId,
        runId,
        status: 'starting',
        startTime: new Date(),
        progress: {
          currentStep: 0,
          totalSteps: initialData?.totalSteps || 0,
          percentage: 0
        },
        steps: [],
        metrics: {
          totalDuration: 0,
          stepCount: 0,
          passedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          averageStepDuration: 0,
          peakMemoryUsage: 0,
          totalAssertions: 0,
          passedAssertions: 0,
          failedAssertions: 0
        },
        subscribers: new Set()
      };

      this.activeStreams.set(streamKey, stream);

      // Store initial event in event store
      await this.eventStore.append({
        streamId: `test-execution-${runId}`,
        eventType: 'TestExecutionStarted',
        data: {
          testId,
          runId,
          startTime: stream.startTime,
          initialData
        },
        metadata: {
          timestamp: new Date(),
          source: 'test_streaming_service'
        }
      });

      // Broadcast to subscribers
      await this.broadcastTestUpdate(testId, runId, {
        type: 'test_execution_started',
        channel: `test:${testId}`,
        data: {
          testId,
          runId,
          status: stream.status,
          startTime: stream.startTime,
          progress: stream.progress
        },
        timestamp: new Date(),
        messageId: this.generateMessageId()
      });

      this.logger.info('Test stream started', { testId, runId });
      this.emit('stream_started', { testId, runId, stream });

      return stream;

    } catch (error) {
      this.logger.error('Failed to start test stream', { testId, runId, error: error.message });
      throw error;
    }
  }

  /**
   * Update test execution progress
   */
  async updateTestProgress(
    testId: string,
    runId: string,
    progress: Partial<TestExecutionProgress>,
    stepUpdate?: Partial<TestStepStream>
  ): Promise<void> {
    try {
      const streamKey = this.getStreamKey(testId, runId);
      const stream = this.activeStreams.get(streamKey);
      
      if (!stream) {
        this.logger.warn('Attempted to update non-existent stream', { testId, runId });
        return;
      }

      // Update progress
      stream.progress = { ...stream.progress, ...progress };
      stream.status = 'running';

      // Update current step if provided
      if (stepUpdate) {
        const currentStepIndex = stream.steps.findIndex(s => s.stepId === stepUpdate.stepId);
        if (currentStepIndex >= 0) {
          stream.steps[currentStepIndex] = { ...stream.steps[currentStepIndex], ...stepUpdate };
        } else if (stepUpdate.stepId) {
          // Add new step
          const newStep: TestStepStream = {
            stepId: stepUpdate.stepId,
            name: stepUpdate.name || `Step ${stream.steps.length + 1}`,
            status: stepUpdate.status || 'running',
            startTime: stepUpdate.startTime || new Date(),
            ...stepUpdate
          };
          stream.steps.push(newStep);
        }
      }

      // Update metrics
      this.updateStreamMetrics(stream);

      // Store progress event
      await this.eventStore.append({
        streamId: `test-execution-${runId}`,
        eventType: 'TestExecutionProgress',
        data: {
          testId,
          runId,
          progress: stream.progress,
          stepUpdate,
          timestamp: new Date()
        },
        metadata: {
          timestamp: new Date(),
          source: 'test_streaming_service'
        }
      });

      // Broadcast update
      await this.broadcastTestUpdate(testId, runId, {
        type: 'test_execution_progress',
        channel: `test:${testId}`,
        data: {
          testId,
          runId,
          progress: stream.progress,
          currentStep: stepUpdate,
          metrics: stream.metrics
        },
        timestamp: new Date(),
        messageId: this.generateMessageId()
      });

      this.emit('progress_updated', { testId, runId, progress, stepUpdate });

    } catch (error) {
      this.logger.error('Failed to update test progress', { testId, runId, error: error.message });
    }
  }

  /**
   * Complete test execution
   */
  async completeTestExecution(
    testId: string,
    runId: string,
    result: {
      status: TestExecutionStatus;
      finalMetrics?: Partial<TestExecutionMetrics>;
      error?: string;
    }
  ): Promise<void> {
    try {
      const streamKey = this.getStreamKey(testId, runId);
      const stream = this.activeStreams.get(streamKey);
      
      if (!stream) {
        this.logger.warn('Attempted to complete non-existent stream', { testId, runId });
        return;
      }

      stream.status = result.status;
      stream.endTime = new Date();
      
      if (result.finalMetrics) {
        stream.metrics = { ...stream.metrics, ...result.finalMetrics };
      }

      // Calculate final metrics
      stream.metrics.totalDuration = stream.endTime.getTime() - stream.startTime.getTime();
      this.updateStreamMetrics(stream);

      // Store completion event
      const eventType = result.status === 'completed' ? 'TestExecutionCompleted' : 'TestExecutionFailed';
      await this.eventStore.append({
        streamId: `test-execution-${runId}`,
        eventType,
        data: {
          testId,
          runId,
          status: result.status,
          endTime: stream.endTime,
          finalMetrics: stream.metrics,
          error: result.error
        },
        metadata: {
          timestamp: new Date(),
          source: 'test_streaming_service'
        }
      });

      // Broadcast completion
      await this.broadcastTestUpdate(testId, runId, {
        type: result.status === 'completed' ? 'test_execution_completed' : 'test_execution_failed',
        channel: `test:${testId}`,
        data: {
          testId,
          runId,
          status: result.status,
          endTime: stream.endTime,
          finalMetrics: stream.metrics,
          error: result.error
        },
        timestamp: new Date(),
        messageId: this.generateMessageId()
      });

      this.logger.info('Test execution completed', { 
        testId, 
        runId, 
        status: result.status,
        duration: stream.metrics.totalDuration
      });

      this.emit('execution_completed', { testId, runId, result, stream });

      // Clean up after delay to allow final updates
      setTimeout(() => {
        this.cleanupStream(streamKey);
      }, 30000); // 30 seconds

    } catch (error) {
      this.logger.error('Failed to complete test execution', { testId, runId, error: error.message });
    }
  }

  /**
   * Subscribe client to test updates
   */
  async subscribeToTest(
    clientId: string,
    request: TestSubscriptionRequest
  ): Promise<void> {
    try {
      const subscriptionKey = this.buildSubscriptionKey(request);
      
      // Add client to test subscriptions
      if (!this.testSubscriptions.has(subscriptionKey)) {
        this.testSubscriptions.set(subscriptionKey, new Set());
      }
      this.testSubscriptions.get(subscriptionKey)!.add(clientId);

      // Add test to client subscriptions
      if (!this.clientSubscriptions.has(clientId)) {
        this.clientSubscriptions.set(clientId, new Set());
      }
      this.clientSubscriptions.get(clientId)!.add(subscriptionKey);

      // Add to active stream subscribers if applicable
      if (request.testId && request.runId) {
        const streamKey = this.getStreamKey(request.testId, request.runId);
        const stream = this.activeStreams.get(streamKey);
        if (stream) {
          stream.subscribers.add(clientId);
        }
      }

      // Send current state if test is active
      await this.sendCurrentTestState(clientId, request);

      this.logger.debug('Client subscribed to test updates', { clientId, request });

    } catch (error) {
      this.logger.error('Failed to subscribe to test', { clientId, request, error: error.message });
    }
  }

  /**
   * Unsubscribe client from test updates
   */
  async unsubscribeFromTest(
    clientId: string,
    request: TestSubscriptionRequest
  ): Promise<void> {
    try {
      const subscriptionKey = this.buildSubscriptionKey(request);
      
      // Remove from test subscriptions
      const testSubscribers = this.testSubscriptions.get(subscriptionKey);
      if (testSubscribers) {
        testSubscribers.delete(clientId);
        if (testSubscribers.size === 0) {
          this.testSubscriptions.delete(subscriptionKey);
        }
      }

      // Remove from client subscriptions
      const clientSubs = this.clientSubscriptions.get(clientId);
      if (clientSubs) {
        clientSubs.delete(subscriptionKey);
        if (clientSubs.size === 0) {
          this.clientSubscriptions.delete(clientId);
        }
      }

      // Remove from active stream subscribers
      if (request.testId && request.runId) {
        const streamKey = this.getStreamKey(request.testId, request.runId);
        const stream = this.activeStreams.get(streamKey);
        if (stream) {
          stream.subscribers.delete(clientId);
        }
      }

      this.logger.debug('Client unsubscribed from test updates', { clientId, request });

    } catch (error) {
      this.logger.error('Failed to unsubscribe from test', { clientId, request, error: error.message });
    }
  }

  /**
   * Handle test command from client
   */
  async handleTestCommand(command: LiveTestCommand): Promise<void> {
    try {
      const handler = this.commandHandlers.get(command.type);
      if (!handler) {
        throw new Error(`Unknown command type: ${command.type}`);
      }

      await handler(command);

      // Store command event
      await this.eventStore.append({
        streamId: `test-commands-${command.testId}`,
        eventType: 'TestCommandReceived',
        data: command,
        metadata: {
          timestamp: command.timestamp,
          source: 'test_streaming_service',
          clientId: command.clientId
        }
      });

      this.logger.info('Test command handled', { 
        type: command.type, 
        testId: command.testId,
        clientId: command.clientId
      });

    } catch (error) {
      this.logger.error('Failed to handle test command', { 
        command, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get active test streams
   */
  getActiveStreams(): Map<string, TestExecutionStream> {
    return new Map(this.activeStreams);
  }

  /**
   * Get stream by test and run ID
   */
  getStream(testId: string, runId: string): TestExecutionStream | undefined {
    const streamKey = this.getStreamKey(testId, runId);
    return this.activeStreams.get(streamKey);
  }

  /**
   * Private helper methods
   */
  private setupEventListeners(): void {
    // Listen to WebSocket server events
    this.webSocketServer.on('client_disconnected', ({ clientId }) => {
      this.cleanupClientSubscriptions(clientId);
    });

    this.webSocketServer.on('test_command', (data) => {
      this.handleTestCommand(data).catch(error => {
        this.logger.error('Error handling test command', { data, error: error.message });
      });
    });
  }

  private setupCommandHandlers(): void {
    this.commandHandlers.set('start', async (command) => {
      await this.handleStartCommand(command);
    });

    this.commandHandlers.set('pause', async (command) => {
      await this.handlePauseCommand(command);
    });

    this.commandHandlers.set('resume', async (command) => {
      await this.handleResumeCommand(command);
    });

    this.commandHandlers.set('stop', async (command) => {
      await this.handleStopCommand(command);
    });

    this.commandHandlers.set('debug', async (command) => {
      await this.handleDebugCommand(command);
    });
  }

  private async handleStartCommand(command: LiveTestCommand): Promise<void> {
    this.emit('test_start_requested', {
      testId: command.testId,
      parameters: command.parameters,
      clientId: command.clientId
    });
  }

  private async handlePauseCommand(command: LiveTestCommand): Promise<void> {
    if (command.runId) {
      const stream = this.getStream(command.testId, command.runId);
      if (stream) {
        stream.status = 'paused';
        await this.broadcastTestUpdate(command.testId, command.runId, {
          type: 'test_execution_progress',
          channel: `test:${command.testId}`,
          data: { testId: command.testId, runId: command.runId, status: 'paused' },
          timestamp: new Date(),
          messageId: this.generateMessageId()
        });
      }
    }

    this.emit('test_pause_requested', {
      testId: command.testId,
      runId: command.runId,
      clientId: command.clientId
    });
  }

  private async handleResumeCommand(command: LiveTestCommand): Promise<void> {
    if (command.runId) {
      const stream = this.getStream(command.testId, command.runId);
      if (stream) {
        stream.status = 'running';
        await this.broadcastTestUpdate(command.testId, command.runId, {
          type: 'test_execution_progress',
          channel: `test:${command.testId}`,
          data: { testId: command.testId, runId: command.runId, status: 'running' },
          timestamp: new Date(),
          messageId: this.generateMessageId()
        });
      }
    }

    this.emit('test_resume_requested', {
      testId: command.testId,
      runId: command.runId,
      clientId: command.clientId
    });
  }

  private async handleStopCommand(command: LiveTestCommand): Promise<void> {
    this.emit('test_stop_requested', {
      testId: command.testId,
      runId: command.runId,
      clientId: command.clientId
    });
  }

  private async handleDebugCommand(command: LiveTestCommand): Promise<void> {
    this.emit('test_debug_requested', {
      testId: command.testId,
      runId: command.runId,
      parameters: command.parameters,
      clientId: command.clientId
    });
  }

  private updateStreamMetrics(stream: TestExecutionStream): void {
    stream.metrics.stepCount = stream.steps.length;
    stream.metrics.passedSteps = stream.steps.filter(s => s.status === 'passed').length;
    stream.metrics.failedSteps = stream.steps.filter(s => s.status === 'failed').length;
    stream.metrics.skippedSteps = stream.steps.filter(s => s.status === 'skipped').length;

    const completedSteps = stream.steps.filter(s => s.duration !== undefined);
    if (completedSteps.length > 0) {
      const totalDuration = completedSteps.reduce((sum, step) => sum + (step.duration || 0), 0);
      stream.metrics.averageStepDuration = totalDuration / completedSteps.length;
    }

    // Calculate assertion metrics
    let totalAssertions = 0;
    let passedAssertions = 0;
    
    for (const step of stream.steps) {
      if (step.metrics?.assertions) {
        totalAssertions += step.metrics.assertions.length;
        passedAssertions += step.metrics.assertions.filter(a => a.passed).length;
      }
    }
    
    stream.metrics.totalAssertions = totalAssertions;
    stream.metrics.passedAssertions = passedAssertions;
    stream.metrics.failedAssertions = totalAssertions - passedAssertions;
  }

  private async broadcastTestUpdate(
    testId: string,
    runId: string,
    message: StreamMessage
  ): Promise<void> {
    await this.webSocketServer.broadcast(message);
  }

  private async sendCurrentTestState(
    clientId: string,
    request: TestSubscriptionRequest
  ): Promise<void> {
    if (request.testId && request.runId) {
      const stream = this.getStream(request.testId, request.runId);
      if (stream) {
        await this.webSocketServer.sendToClient(clientId, {
          type: 'test_execution_progress',
          channel: `test:${request.testId}`,
          data: {
            testId: request.testId,
            runId: request.runId,
            status: stream.status,
            progress: stream.progress,
            steps: stream.steps.slice(-5), // Last 5 steps
            metrics: stream.metrics
          },
          timestamp: new Date(),
          messageId: this.generateMessageId()
        });
      }
    }
  }

  private cleanupClientSubscriptions(clientId: string): void {
    const subscriptions = this.clientSubscriptions.get(clientId);
    if (subscriptions) {
      for (const subscriptionKey of subscriptions) {
        const testSubscribers = this.testSubscriptions.get(subscriptionKey);
        if (testSubscribers) {
          testSubscribers.delete(clientId);
          if (testSubscribers.size === 0) {
            this.testSubscriptions.delete(subscriptionKey);
          }
        }
      }
      this.clientSubscriptions.delete(clientId);
    }

    // Remove from active stream subscribers
    for (const stream of this.activeStreams.values()) {
      stream.subscribers.delete(clientId);
    }
  }

  private cleanupStream(streamKey: string): void {
    const stream = this.activeStreams.get(streamKey);
    if (stream) {
      this.activeStreams.delete(streamKey);
      this.logger.debug('Stream cleaned up', { streamKey });
    }
  }

  private startStreamMaintenance(): void {
    // Clean up old completed streams every 5 minutes
    setInterval(() => {
      this.performStreamMaintenance();
    }, 5 * 60 * 1000);
  }

  private performStreamMaintenance(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [streamKey, stream] of this.activeStreams) {
      if (stream.endTime && (now - stream.endTime.getTime()) > maxAge) {
        this.cleanupStream(streamKey);
      }
    }
  }

  private getStreamKey(testId: string, runId: string): string {
    return `${testId}:${runId}`;
  }

  private buildSubscriptionKey(request: TestSubscriptionRequest): string {
    const parts = [];
    if (request.testId) parts.push(`test:${request.testId}`);
    if (request.runId) parts.push(`run:${request.runId}`);
    if (request.projectId) parts.push(`project:${request.projectId}`);
    if (request.userId) parts.push(`user:${request.userId}`);
    return parts.join('|') || 'global';
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}