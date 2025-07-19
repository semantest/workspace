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
 * @fileoverview AI Insight Broadcasting Service
 * @author Semantest Team
 * @module application/services/AIStreamingService
 */

import { EventEmitter } from 'events';
import { WebSocketServer, StreamMessage } from '../../infrastructure/websocket/websocket-server';
import { EventStore } from '../../infrastructure/events/event-store';
import { Logger } from '@shared/infrastructure/logger';

export interface AIInsight {
  id: string;
  type: AIInsightType;
  title: string;
  description: string;
  data: any;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: AIInsightCategory;
  context: AIInsightContext;
  timestamp: Date;
  source: string;
  correlationId?: string;
}

export type AIInsightType = 
  | 'performance_optimization'
  | 'security_vulnerability'
  | 'code_quality_issue'
  | 'test_recommendation'
  | 'architectural_suggestion'
  | 'error_prediction'
  | 'resource_optimization'
  | 'user_behavior_pattern'
  | 'anomaly_detection'
  | 'trend_analysis';

export type AIInsightCategory =
  | 'performance'
  | 'security'
  | 'quality'
  | 'testing'
  | 'architecture'
  | 'monitoring'
  | 'analytics'
  | 'prediction';

export interface AIInsightContext {
  projectId?: string;
  testId?: string;
  userId?: string;
  sessionId?: string;
  environment?: string;
  location?: string;
  triggeredBy?: string;
  relatedEntities?: string[];
}

export interface AIAnalysisProgress {
  analysisId: string;
  stage: AnalysisStage;
  progress: number;
  currentTask: string;
  estimatedTimeRemaining?: number;
  intermediateResults?: any[];
  errors?: string[];
  metrics?: AnalysisMetrics;
}

export type AnalysisStage =
  | 'initializing'
  | 'data_collection'
  | 'preprocessing'
  | 'analysis'
  | 'pattern_recognition'
  | 'insight_generation'
  | 'validation'
  | 'completion';

export interface AnalysisMetrics {
  dataPointsProcessed: number;
  patternsIdentified: number;
  insightsGenerated: number;
  confidence: number;
  processingTime: number;
  memoryUsage: number;
}

export interface AIStreamSubscription {
  clientId: string;
  filters: AIStreamFilter;
  priority: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export interface AIStreamFilter {
  insightTypes?: AIInsightType[];
  categories?: AIInsightCategory[];
  minConfidence?: number;
  severity?: ('low' | 'medium' | 'high' | 'critical')[];
  projectIds?: string[];
  userIds?: string[];
  includeProgress?: boolean;
  includeDebugInfo?: boolean;
}

export interface AIStreamStats {
  activeAnalyses: number;
  insightsPerMinute: number;
  averageConfidence: number;
  topCategories: Record<AIInsightCategory, number>;
  subscriberCount: number;
  totalInsightsGenerated: number;
}

/**
 * Service for streaming AI insights and analysis progress in real-time
 */
export class AIStreamingService extends EventEmitter {
  private activeAnalyses: Map<string, AIAnalysisProgress> = new Map();
  private insightBuffer: Map<string, AIInsight[]> = new Map();
  private subscriptions: Map<string, AIStreamSubscription> = new Map();
  private recentInsights: AIInsight[] = [];
  private metrics = {
    insightsGenerated: 0,
    analysesStarted: 0,
    lastResetTime: Date.now()
  };

  constructor(
    private readonly webSocketServer: WebSocketServer,
    private readonly eventStore: EventStore,
    private readonly logger: Logger
  ) {
    super();
    this.setupEventListeners();
    this.startMetricsCollection();
    this.startInsightBufferMaintenance();
  }

  /**
   * Start AI analysis with real-time progress streaming
   */
  async startAnalysis(
    analysisId: string,
    analysisType: string,
    context: AIInsightContext,
    options?: { estimatedDuration?: number; priority?: 'low' | 'medium' | 'high' }
  ): Promise<void> {
    try {
      const progress: AIAnalysisProgress = {
        analysisId,
        stage: 'initializing',
        progress: 0,
        currentTask: 'Initializing AI analysis pipeline',
        estimatedTimeRemaining: options?.estimatedDuration || 60000,
        intermediateResults: [],
        errors: [],
        metrics: {
          dataPointsProcessed: 0,
          patternsIdentified: 0,
          insightsGenerated: 0,
          confidence: 0,
          processingTime: 0,
          memoryUsage: 0
        }
      };

      this.activeAnalyses.set(analysisId, progress);
      this.metrics.analysesStarted++;

      // Store analysis start event
      await this.eventStore.append({
        streamId: `ai-analysis-${analysisId}`,
        eventType: 'AIAnalysisStarted',
        data: {
          analysisId,
          analysisType,
          context,
          options,
          startTime: new Date()
        },
        metadata: {
          timestamp: new Date(),
          source: 'ai_streaming_service'
        }
      });

      // Broadcast analysis start
      await this.broadcastProgress(progress);

      this.logger.info('AI analysis started', { analysisId, analysisType });
      this.emit('analysis_started', { analysisId, analysisType, context });

    } catch (error) {
      this.logger.error('Failed to start AI analysis', { analysisId, error: error.message });
      throw error;
    }
  }

  /**
   * Update analysis progress
   */
  async updateAnalysisProgress(
    analysisId: string,
    updates: Partial<AIAnalysisProgress>
  ): Promise<void> {
    try {
      const progress = this.activeAnalyses.get(analysisId);
      if (!progress) {
        this.logger.warn('Attempted to update non-existent analysis', { analysisId });
        return;
      }

      // Update progress
      Object.assign(progress, updates);

      // Store progress event
      await this.eventStore.append({
        streamId: `ai-analysis-${analysisId}`,
        eventType: 'AIAnalysisProgress',
        data: {
          analysisId,
          progress: progress.progress,
          stage: progress.stage,
          currentTask: progress.currentTask,
          metrics: progress.metrics
        },
        metadata: {
          timestamp: new Date(),
          source: 'ai_streaming_service'
        }
      });

      // Broadcast progress update
      await this.broadcastProgress(progress);

      this.emit('progress_updated', { analysisId, progress });

    } catch (error) {
      this.logger.error('Failed to update analysis progress', { analysisId, error: error.message });
    }
  }

  /**
   * Generate and broadcast AI insight
   */
  async generateInsight(insight: Omit<AIInsight, 'id' | 'timestamp'>): Promise<string> {
    try {
      const aiInsight: AIInsight = {
        ...insight,
        id: this.generateInsightId(),
        timestamp: new Date()
      };

      // Buffer insight
      await this.bufferInsight(aiInsight);

      // Store insight event
      await this.eventStore.append({
        streamId: `ai-insights-${aiInsight.category}`,
        eventType: 'AIInsightGenerated',
        data: aiInsight,
        metadata: {
          timestamp: aiInsight.timestamp,
          source: 'ai_streaming_service',
          correlationId: aiInsight.correlationId
        }
      });

      // Broadcast to subscribers
      await this.broadcastInsight(aiInsight);

      // Update metrics
      this.metrics.insightsGenerated++;
      this.recentInsights.push(aiInsight);
      
      // Keep only last 100 insights
      if (this.recentInsights.length > 100) {
        this.recentInsights.shift();
      }

      this.logger.info('AI insight generated', {
        id: aiInsight.id,
        type: aiInsight.type,
        confidence: aiInsight.confidence,
        severity: aiInsight.severity
      });

      this.emit('insight_generated', aiInsight);
      return aiInsight.id;

    } catch (error) {
      this.logger.error('Failed to generate AI insight', { error: error.message });
      throw error;
    }
  }

  /**
   * Complete analysis
   */
  async completeAnalysis(
    analysisId: string,
    finalResults: {
      insights: AIInsight[];
      summary: string;
      recommendations?: string[];
      metrics?: AnalysisMetrics;
    }
  ): Promise<void> {
    try {
      const progress = this.activeAnalyses.get(analysisId);
      if (!progress) {
        this.logger.warn('Attempted to complete non-existent analysis', { analysisId });
        return;
      }

      // Update to completion
      progress.stage = 'completion';
      progress.progress = 100;
      progress.currentTask = 'Analysis completed';
      progress.metrics = { ...progress.metrics, ...finalResults.metrics };

      // Store completion event
      await this.eventStore.append({
        streamId: `ai-analysis-${analysisId}`,
        eventType: 'AIAnalysisCompleted',
        data: {
          analysisId,
          finalResults,
          completedAt: new Date(),
          totalTime: Date.now() - (progress.metrics?.processingTime || 0)
        },
        metadata: {
          timestamp: new Date(),
          source: 'ai_streaming_service'
        }
      });

      // Broadcast completion
      await this.broadcastProgress(progress);

      // Generate insights from results
      for (const insight of finalResults.insights) {
        await this.generateInsight(insight);
      }

      // Clean up after delay
      setTimeout(() => {
        this.activeAnalyses.delete(analysisId);
      }, 300000); // 5 minutes

      this.logger.info('AI analysis completed', {
        analysisId,
        insightsGenerated: finalResults.insights.length,
        totalTime: progress.metrics?.processingTime
      });

      this.emit('analysis_completed', { analysisId, results: finalResults });

    } catch (error) {
      this.logger.error('Failed to complete AI analysis', { analysisId, error: error.message });
    }
  }

  /**
   * Subscribe client to AI insights
   */
  async subscribeToAIInsights(
    clientId: string,
    filter: AIStreamFilter,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    try {
      const subscription: AIStreamSubscription = {
        clientId,
        filters: filter,
        priority,
        metadata: {
          subscribedAt: new Date(),
          lastActivity: new Date()
        }
      };

      this.subscriptions.set(clientId, subscription);

      // Send recent insights that match filter
      await this.sendRecentInsights(clientId, filter);

      // Send current analysis progress if requested
      if (filter.includeProgress) {
        for (const progress of this.activeAnalyses.values()) {
          await this.sendProgressUpdate(clientId, progress);
        }
      }

      this.logger.debug('Client subscribed to AI insights', { clientId, filter });

    } catch (error) {
      this.logger.error('Failed to subscribe to AI insights', { clientId, error: error.message });
    }
  }

  /**
   * Unsubscribe client from AI insights
   */
  async unsubscribeFromAIInsights(clientId: string): Promise<void> {
    this.subscriptions.delete(clientId);
    this.logger.debug('Client unsubscribed from AI insights', { clientId });
  }

  /**
   * Get AI streaming statistics
   */
  getStreamingStats(): AIStreamStats {
    const categories: Record<AIInsightCategory, number> = {
      performance: 0,
      security: 0,
      quality: 0,
      testing: 0,
      architecture: 0,
      monitoring: 0,
      analytics: 0,
      prediction: 0
    };

    // Count insights by category
    for (const insight of this.recentInsights) {
      categories[insight.category]++;
    }

    const totalConfidence = this.recentInsights.reduce((sum, insight) => sum + insight.confidence, 0);

    return {
      activeAnalyses: this.activeAnalyses.size,
      insightsPerMinute: this.calculateInsightsPerMinute(),
      averageConfidence: this.recentInsights.length > 0 ? totalConfidence / this.recentInsights.length : 0,
      topCategories: categories,
      subscriberCount: this.subscriptions.size,
      totalInsightsGenerated: this.metrics.insightsGenerated
    };
  }

  /**
   * Private helper methods
   */
  private setupEventListeners(): void {
    // Listen to WebSocket server events
    this.webSocketServer.on('client_disconnected', ({ clientId }) => {
      this.unsubscribeFromAIInsights(clientId);
    });

    this.webSocketServer.on('ai_query', (data) => {
      this.handleAIQuery(data).catch(error => {
        this.logger.error('Error handling AI query', { data, error: error.message });
      });
    });
  }

  private async handleAIQuery(data: any): Promise<void> {
    const { clientId, query, context, options } = data;
    
    // Start analysis for the query
    const analysisId = this.generateAnalysisId();
    await this.startAnalysis(analysisId, 'natural_language_query', {
      userId: context?.userId,
      sessionId: context?.sessionId,
      triggeredBy: 'user_query'
    });

    // Simulate query processing
    setTimeout(async () => {
      await this.updateAnalysisProgress(analysisId, {
        stage: 'analysis',
        progress: 50,
        currentTask: 'Processing natural language query'
      });

      setTimeout(async () => {
        const insight: Omit<AIInsight, 'id' | 'timestamp'> = {
          type: 'test_recommendation',
          title: 'Test Recommendation',
          description: `Based on your query: "${query}", here are some suggestions`,
          data: { query, suggestions: ['Suggestion 1', 'Suggestion 2'] },
          confidence: 0.85,
          severity: 'medium',
          category: 'testing',
          context: { userId: context?.userId },
          source: 'nlp_processor',
          correlationId: analysisId
        };

        await this.generateInsight(insight);
        await this.completeAnalysis(analysisId, {
          insights: [insight as AIInsight],
          summary: 'Query processed successfully',
          recommendations: ['Consider adding more test cases', 'Review code coverage'],
          metrics: {
            dataPointsProcessed: 1,
            patternsIdentified: 2,
            insightsGenerated: 1,
            confidence: 0.85,
            processingTime: 3000,
            memoryUsage: 15
          }
        });
      }, 2000);
    }, 1000);
  }

  private async broadcastProgress(progress: AIAnalysisProgress): Promise<void> {
    const message: StreamMessage = {
      type: 'ai_analysis_progress',
      channel: 'ai',
      data: progress,
      timestamp: new Date(),
      messageId: this.generateMessageId(),
      source: 'ai_streaming_service'
    };

    await this.webSocketServer.broadcast(message);
  }

  private async broadcastInsight(insight: AIInsight): Promise<void> {
    const message: StreamMessage = {
      type: 'ai_insight_generated',
      channel: `ai:${insight.category}`,
      data: insight,
      timestamp: insight.timestamp,
      messageId: this.generateMessageId(),
      source: 'ai_streaming_service'
    };

    // Send to all matching subscribers
    for (const [clientId, subscription] of this.subscriptions) {
      if (this.insightMatchesFilter(insight, subscription.filters)) {
        await this.webSocketServer.sendToClient(clientId, message);
      }
    }

    // Also broadcast to general AI channel
    await this.webSocketServer.broadcast({
      ...message,
      channel: 'ai'
    });
  }

  private async sendProgressUpdate(clientId: string, progress: AIAnalysisProgress): Promise<void> {
    const message: StreamMessage = {
      type: 'ai_analysis_progress',
      channel: 'ai',
      data: progress,
      timestamp: new Date(),
      messageId: this.generateMessageId(),
      source: 'ai_streaming_service'
    };

    await this.webSocketServer.sendToClient(clientId, message);
  }

  private async sendRecentInsights(clientId: string, filter: AIStreamFilter): Promise<void> {
    const matchingInsights = this.recentInsights
      .filter(insight => this.insightMatchesFilter(insight, filter))
      .slice(-10); // Last 10 matching insights

    for (const insight of matchingInsights) {
      const message: StreamMessage = {
        type: 'ai_insight_generated',
        channel: `ai:${insight.category}`,
        data: insight,
        timestamp: insight.timestamp,
        messageId: this.generateMessageId(),
        source: 'ai_streaming_service'
      };

      await this.webSocketServer.sendToClient(clientId, message);
    }
  }

  private insightMatchesFilter(insight: AIInsight, filter: AIStreamFilter): boolean {
    if (filter.insightTypes && !filter.insightTypes.includes(insight.type)) {
      return false;
    }

    if (filter.categories && !filter.categories.includes(insight.category)) {
      return false;
    }

    if (filter.minConfidence && insight.confidence < filter.minConfidence) {
      return false;
    }

    if (filter.severity && !filter.severity.includes(insight.severity)) {
      return false;
    }

    if (filter.projectIds && insight.context.projectId && 
        !filter.projectIds.includes(insight.context.projectId)) {
      return false;
    }

    if (filter.userIds && insight.context.userId && 
        !filter.userIds.includes(insight.context.userId)) {
      return false;
    }

    return true;
  }

  private async bufferInsight(insight: AIInsight): Promise<void> {
    const key = `insights:${insight.category}`;
    if (!this.insightBuffer.has(key)) {
      this.insightBuffer.set(key, []);
    }

    const buffer = this.insightBuffer.get(key)!;
    buffer.push(insight);

    // Keep only last 50 insights per category
    if (buffer.length > 50) {
      buffer.shift();
    }
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMetrics();
    }, 60000); // Every minute
  }

  private startInsightBufferMaintenance(): void {
    setInterval(() => {
      this.cleanupOldInsights();
    }, 300000); // Every 5 minutes
  }

  private updateMetrics(): void {
    const stats = this.getStreamingStats();
    this.logger.info('AI streaming metrics', stats);
  }

  private cleanupOldInsights(): void {
    const cutoffTime = Date.now() - 3600000; // 1 hour ago
    
    this.recentInsights = this.recentInsights.filter(
      insight => insight.timestamp.getTime() > cutoffTime
    );

    for (const [category, insights] of this.insightBuffer) {
      const filtered = insights.filter(
        insight => insight.timestamp.getTime() > cutoffTime
      );
      this.insightBuffer.set(category, filtered);
    }
  }

  private calculateInsightsPerMinute(): number {
    const oneMinuteAgo = Date.now() - 60000;
    const recentInsights = this.recentInsights.filter(
      insight => insight.timestamp.getTime() > oneMinuteAgo
    );
    return recentInsights.length;
  }

  private generateInsightId(): string {
    return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAnalysisId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}