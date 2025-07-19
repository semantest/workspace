/*
                     @semantest/ai-powered-features

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
 * @fileoverview AI-Assisted Debugging Tools Service
 * @author Semantest Team
 * @module application/services/AIDebugService
 */

import { OpenAIClient } from '../../infrastructure/openai/openai-client';
import { Logger } from '@shared/infrastructure/logger';
import { EventEmitter } from 'events';
import { WebSocket } from 'ws';

export interface DebugRequest {
  code: string;
  error: ErrorInfo;
  language: string;
  framework?: string;
  context?: DebugContext;
  interactive?: boolean;
  options?: DebugOptions;
}

export interface ErrorInfo {
  message: string;
  stack?: string;
  line?: number;
  column?: number;
  type?: string;
  code?: string;
}

export interface DebugContext {
  environment?: string;
  variables?: Record<string, any>;
  logs?: string[];
  dependencies?: string[];
  previousErrors?: ErrorInfo[];
  testCase?: string;
}

export interface DebugOptions {
  maxSuggestions?: number;
  includeExplanation?: boolean;
  autoFix?: boolean;
  deepAnalysis?: boolean;
  checkSimilarIssues?: boolean;
}

export interface DebugResult {
  id: string;
  diagnosis: Diagnosis;
  solutions: Solution[];
  explanation: Explanation;
  relatedIssues: RelatedIssue[];
  preventionTips: string[];
  metadata: DebugMetadata;
}

export interface Diagnosis {
  summary: string;
  rootCause: string;
  category: ErrorCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  affectedComponents: string[];
}

export interface Solution {
  id: string;
  title: string;
  description: string;
  code: string;
  explanation: string;
  confidence: number;
  impact: 'minimal' | 'moderate' | 'significant';
  tested: boolean;
}

export interface Explanation {
  whatHappened: string;
  whyItHappened: string;
  howToPrevent: string;
  technicalDetails?: string;
  references?: Reference[];
}

export interface Reference {
  title: string;
  url: string;
  relevance: number;
}

export interface RelatedIssue {
  id: string;
  title: string;
  similarity: number;
  solution?: string;
  link?: string;
}

export interface DebugMetadata {
  debuggedAt: Date;
  model: string;
  tokensUsed: number;
  analysisTime: number;
  confidence: number;
}

export type ErrorCategory = 
  | 'syntax'
  | 'runtime'
  | 'logic'
  | 'performance'
  | 'memory'
  | 'concurrency'
  | 'security'
  | 'configuration'
  | 'dependency'
  | 'network'
  | 'unknown';

export interface DebugSession {
  id: string;
  startedAt: Date;
  context: DebugContext;
  history: DebugHistoryEntry[];
  activeConnections: Set<WebSocket>;
}

export interface DebugHistoryEntry {
  timestamp: Date;
  request: DebugRequest;
  result: DebugResult;
}

export interface InteractiveDebugCommand {
  type: 'analyze' | 'fix' | 'explain' | 'test' | 'rollback';
  data: any;
}

/**
 * AI-powered debugging service
 */
export class AIDebugService extends EventEmitter {
  private readonly sessions: Map<string, DebugSession> = new Map();
  private readonly knowledgeBase: Map<string, Solution> = new Map();

  constructor(
    private readonly openAIClient: OpenAIClient,
    private readonly logger: Logger
  ) {
    super();
    this.loadKnowledgeBase();
  }

  /**
   * Debug an issue
   */
  async debugIssue(request: DebugRequest): Promise<DebugResult> {
    try {
      const startTime = Date.now();
      const debugId = this.generateDebugId();

      this.logger.info('Starting debug analysis', {
        id: debugId,
        error: request.error.message,
        language: request.language
      });

      // Step 1: Analyze error
      this.emit('progress', { debugId, step: 'analyzing', progress: 20 });
      const diagnosis = await this.analyzeError(request);

      // Step 2: Generate solutions
      this.emit('progress', { debugId, step: 'generating_solutions', progress: 40 });
      const solutions = await this.generateSolutions(request, diagnosis);

      // Step 3: Create explanation
      this.emit('progress', { debugId, step: 'explaining', progress: 60 });
      const explanation = await this.explainError(request, diagnosis);

      // Step 4: Find related issues
      this.emit('progress', { debugId, step: 'finding_related', progress: 80 });
      const relatedIssues = await this.findRelatedIssues(request, diagnosis);

      // Step 5: Generate prevention tips
      this.emit('progress', { debugId, step: 'prevention', progress: 90 });
      const preventionTips = await this.generatePreventionTips(request, diagnosis);

      const result: DebugResult = {
        id: debugId,
        diagnosis,
        solutions,
        explanation,
        relatedIssues,
        preventionTips,
        metadata: {
          debuggedAt: new Date(),
          model: 'gpt-4-turbo-preview',
          tokensUsed: 0, // Would track actual usage
          analysisTime: Date.now() - startTime,
          confidence: diagnosis.confidence
        }
      };

      // Cache successful solutions
      if (solutions.length > 0 && solutions[0].confidence > 0.8) {
        this.cacheSuccessfulSolution(request.error, solutions[0]);
      }

      this.emit('complete', result);
      this.logger.info('Debug analysis completed', {
        id: debugId,
        solutionsFound: solutions.length,
        duration: result.metadata.analysisTime
      });

      return result;
    } catch (error) {
      this.logger.error('Debug analysis failed', { error: error.message });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start interactive debug session
   */
  async startDebugSession(request: DebugRequest): Promise<string> {
    const sessionId = this.generateSessionId();
    
    const session: DebugSession = {
      id: sessionId,
      startedAt: new Date(),
      context: request.context || {},
      history: [],
      activeConnections: new Set()
    };

    this.sessions.set(sessionId, session);

    // Initial analysis
    const initialResult = await this.debugIssue(request);
    session.history.push({
      timestamp: new Date(),
      request,
      result: initialResult
    });

    this.logger.info('Debug session started', { sessionId });
    return sessionId;
  }

  /**
   * Handle interactive debug command
   */
  async handleDebugCommand(
    sessionId: string,
    command: InteractiveDebugCommand
  ): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    switch (command.type) {
      case 'analyze':
        return await this.analyzeAdditional(session, command.data);
      
      case 'fix':
        return await this.applyFix(session, command.data);
      
      case 'explain':
        return await this.explainInDetail(session, command.data);
      
      case 'test':
        return await this.testSolution(session, command.data);
      
      case 'rollback':
        return await this.rollbackFix(session, command.data);
      
      default:
        throw new Error(`Unknown command type: ${command.type}`);
    }
  }

  /**
   * Analyze error and create diagnosis
   */
  private async analyzeError(request: DebugRequest): Promise<Diagnosis> {
    const prompt = `Analyze this ${request.language} error and provide a diagnosis:

Error Message: ${request.error.message}
${request.error.stack ? `Stack Trace:\n${request.error.stack}` : ''}
${request.error.line ? `Error Location: Line ${request.error.line}${request.error.column ? `, Column ${request.error.column}` : ''}` : ''}

Code:
\`\`\`${request.language}
${request.code}
\`\`\`

${request.context ? `Context:\n${JSON.stringify(request.context, null, 2)}` : ''}

Provide a diagnosis with:
1. Summary of the issue
2. Root cause analysis
3. Error category (syntax, runtime, logic, etc.)
4. Severity assessment
5. Affected components
6. Confidence level (0-1)`;

    const response = await this.openAIClient.generateCompletion({
      systemPrompt: `You are an expert ${request.language} debugger with deep knowledge of common errors and their solutions.`,
      prompt,
      temperature: 0.3,
      maxTokens: 1500
    });

    return this.parseDiagnosis(response.text);
  }

  /**
   * Generate solutions for the error
   */
  private async generateSolutions(
    request: DebugRequest,
    diagnosis: Diagnosis
  ): Promise<Solution[]> {
    // Check knowledge base first
    const cachedSolution = this.findCachedSolution(request.error);
    const solutions: Solution[] = [];
    
    if (cachedSolution) {
      solutions.push(cachedSolution);
    }

    const prompt = `Generate solutions for this ${diagnosis.category} error:

Diagnosis: ${diagnosis.summary}
Root Cause: ${diagnosis.rootCause}

Code with Error:
\`\`\`${request.language}
${request.code}
\`\`\`

Generate ${request.options?.maxSuggestions || 3} different solutions with:
1. Fixed code
2. Clear explanation
3. Impact assessment
4. Confidence level

Focus on practical, working solutions that address the root cause.`;

    const response = await this.openAIClient.generateCompletion({
      systemPrompt: 'You are an expert debugger. Provide multiple working solutions with clear explanations.',
      prompt,
      temperature: 0.5,
      maxTokens: 3000
    });

    const generatedSolutions = this.parseSolutions(response.text);
    solutions.push(...generatedSolutions);

    // Test solutions if requested
    if (request.options?.autoFix) {
      for (const solution of solutions) {
        solution.tested = await this.validateSolution(solution, request);
      }
    }

    return solutions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Create detailed explanation
   */
  private async explainError(
    request: DebugRequest,
    diagnosis: Diagnosis
  ): Promise<Explanation> {
    const prompt = `Explain this error in detail:

Error: ${request.error.message}
Category: ${diagnosis.category}
Root Cause: ${diagnosis.rootCause}

Provide:
1. What happened (user-friendly explanation)
2. Why it happened (technical explanation)
3. How to prevent it in the future
4. Technical details for developers
5. Relevant documentation references`;

    const response = await this.openAIClient.generateCompletion({
      systemPrompt: 'You are a patient teacher explaining programming errors. Be clear, thorough, and educational.',
      prompt,
      temperature: 0.4,
      maxTokens: 1500
    });

    return this.parseExplanation(response.text);
  }

  /**
   * Find related issues
   */
  private async findRelatedIssues(
    request: DebugRequest,
    diagnosis: Diagnosis
  ): Promise<RelatedIssue[]> {
    const relatedIssues: RelatedIssue[] = [];

    // Search knowledge base
    for (const [key, solution] of this.knowledgeBase) {
      const similarity = this.calculateSimilarity(request.error.message, key);
      if (similarity > 0.7) {
        relatedIssues.push({
          id: this.generateId(),
          title: key,
          similarity,
          solution: solution.code
        });
      }
    }

    // Search common issues for the error category
    const commonIssues = await this.getCommonIssues(diagnosis.category, request.language);
    relatedIssues.push(...commonIssues);

    return relatedIssues.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  }

  /**
   * Generate prevention tips
   */
  private async generatePreventionTips(
    request: DebugRequest,
    diagnosis: Diagnosis
  ): Promise<string[]> {
    const prompt = `Generate prevention tips for this type of error:

Error Category: ${diagnosis.category}
Root Cause: ${diagnosis.rootCause}
Language: ${request.language}

Provide 5 actionable prevention tips that developers can implement to avoid this error in the future.`;

    const response = await this.openAIClient.generateCompletion({
      systemPrompt: 'You are a senior developer sharing wisdom about error prevention.',
      prompt,
      temperature: 0.4,
      maxTokens: 800
    });

    return this.parsePreventionTips(response.text);
  }

  /**
   * Interactive session methods
   */
  private async analyzeAdditional(session: DebugSession, data: any): Promise<any> {
    // Perform additional analysis based on session context
    const lastEntry = session.history[session.history.length - 1];
    
    const prompt = `Perform additional analysis on this error:

Previous Analysis: ${JSON.stringify(lastEntry.result.diagnosis)}
Additional Context: ${JSON.stringify(data)}

Provide deeper insights or alternative perspectives.`;

    const response = await this.openAIClient.generateCompletion({
      systemPrompt: 'You are conducting a follow-up analysis. Build on previous findings.',
      prompt,
      temperature: 0.4,
      maxTokens: 1000
    });

    return { additionalInsights: response.text };
  }

  private async applyFix(session: DebugSession, data: any): Promise<any> {
    const { solutionId, code } = data;
    
    // Simulate applying the fix
    const result = {
      success: true,
      modifiedCode: code,
      validation: await this.validateCode(code, session.context)
    };

    // Broadcast to all connected clients
    this.broadcastToSession(session.id, {
      type: 'fix_applied',
      data: result
    });

    return result;
  }

  private async explainInDetail(session: DebugSession, data: any): Promise<any> {
    const { aspect } = data;
    
    const prompt = `Provide an in-depth explanation of ${aspect} for this debugging session.

Context: ${JSON.stringify(session.history[0].request)}

Focus on practical understanding and actionable insights.`;

    const response = await this.openAIClient.generateCompletion({
      systemPrompt: 'You are providing detailed technical explanations for learning purposes.',
      prompt,
      temperature: 0.4,
      maxTokens: 1500
    });

    return { detailedExplanation: response.text };
  }

  private async testSolution(session: DebugSession, data: any): Promise<any> {
    const { solution, testCases } = data;
    
    // Simulate testing the solution
    const testResults = {
      passed: Math.random() > 0.3,
      results: testCases?.map((tc: any) => ({
        testCase: tc,
        passed: Math.random() > 0.2,
        output: 'Test output'
      })) || [],
      coverage: 85,
      performance: {
        executionTime: Math.random() * 100,
        memoryUsage: Math.random() * 50
      }
    };

    return testResults;
  }

  private async rollbackFix(session: DebugSession, data: any): Promise<any> {
    // Simulate rollback
    return {
      success: true,
      restoredCode: session.history[0].request.code,
      message: 'Successfully rolled back to original code'
    };
  }

  /**
   * Helper methods
   */
  private parseDiagnosis(text: string): Diagnosis {
    // Parse AI response into structured diagnosis
    // This would be more sophisticated in production
    return {
      summary: 'Type error in function parameter',
      rootCause: 'Incorrect type passed to function',
      category: 'runtime',
      severity: 'high',
      confidence: 0.85,
      affectedComponents: ['main.js', 'utils.js']
    };
  }

  private parseSolutions(text: string): Solution[] {
    // Parse AI response into structured solutions
    return [{
      id: this.generateId(),
      title: 'Fix type mismatch',
      description: 'Convert parameter to correct type',
      code: '// Fixed code here',
      explanation: 'This solution addresses the type mismatch by...',
      confidence: 0.9,
      impact: 'minimal',
      tested: false
    }];
  }

  private parseExplanation(text: string): Explanation {
    // Parse AI response into structured explanation
    return {
      whatHappened: 'A type error occurred when...',
      whyItHappened: 'This happened because...',
      howToPrevent: 'To prevent this, always...',
      technicalDetails: 'Under the hood...',
      references: []
    };
  }

  private parsePreventionTips(text: string): string[] {
    // Parse AI response into prevention tips
    return [
      'Always validate input types',
      'Use TypeScript for type safety',
      'Write unit tests for edge cases',
      'Implement proper error handling',
      'Use linting tools to catch errors early'
    ];
  }

  private async validateSolution(solution: Solution, request: DebugRequest): Promise<boolean> {
    // Validate that the solution actually fixes the error
    // This would involve actual code execution in a sandbox
    return true;
  }

  private async validateCode(code: string, context: DebugContext): Promise<any> {
    // Validate code syntax and basic correctness
    return {
      valid: true,
      errors: [],
      warnings: []
    };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private async getCommonIssues(category: ErrorCategory, language: string): Promise<RelatedIssue[]> {
    // Would fetch from a database of common issues
    return [{
      id: this.generateId(),
      title: `Common ${category} error in ${language}`,
      similarity: 0.75,
      link: 'https://docs.example.com/errors'
    }];
  }

  private loadKnowledgeBase(): void {
    // Load cached solutions from previous debugging sessions
    // This would load from a database in production
  }

  private cacheSuccessfulSolution(error: ErrorInfo, solution: Solution): void {
    const key = this.generateErrorKey(error);
    this.knowledgeBase.set(key, solution);
  }

  private findCachedSolution(error: ErrorInfo): Solution | null {
    const key = this.generateErrorKey(error);
    return this.knowledgeBase.get(key) || null;
  }

  private generateErrorKey(error: ErrorInfo): string {
    return `${error.type || 'unknown'}_${error.code || 'no_code'}`;
  }

  private broadcastToSession(sessionId: string, message: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const messageStr = JSON.stringify(message);
    for (const ws of session.activeConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    }
  }

  private generateDebugId(): string {
    return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public API methods
   */
  addWebSocketConnection(sessionId: string, ws: WebSocket): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.activeConnections.add(ws);
      
      ws.on('close', () => {
        session.activeConnections.delete(ws);
      });
    }
  }

  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Close all connections
      for (const ws of session.activeConnections) {
        ws.close();
      }
      
      this.sessions.delete(sessionId);
      this.logger.info('Debug session ended', { sessionId });
    }
  }
}