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
 * @fileoverview AI Controller - API Contracts Implementation
 * @author Semantest Team
 * @module api/controllers/AIController
 */

import { Request, Response } from 'express';
import Joi from 'joi';
import { TestGenerationService } from '@application/services/test-generation.service';
import { CodeAnalysisService } from '@application/services/code-analysis.service';
import { AIDebugService } from '@application/services/ai-debug.service';
import { NaturalLanguageService } from '@application/services/natural-language.service';
import { Logger } from '@shared/infrastructure/logger';
import { PerformanceOptimizer } from '@infrastructure/performance/performance-optimizer';

/**
 * AI Controller with optimized API contracts
 */
export class AIController {
  constructor(
    private readonly testGenerationService: TestGenerationService,
    private readonly codeAnalysisService: CodeAnalysisService,
    private readonly aiDebugService: AIDebugService,
    private readonly nlpService: NaturalLanguageService,
    private readonly performanceOptimizer: PerformanceOptimizer,
    private readonly logger: Logger
  ) {}

  /**
   * Generate tests endpoint with performance optimization
   */
  async generateTests(req: Request, res: Response): Promise<void> {
    try {
      // Validate request
      const validationResult = this.validateTestGenerationRequest(req.body);
      if (validationResult.error) {
        res.status(400).json({
          error: 'Validation Error',
          details: validationResult.error.details.map(d => d.message)
        });
        return;
      }

      const request = validationResult.value;
      
      // Check cache first
      const cached = await this.performanceOptimizer.checkCache('test_gen', request);
      if (cached) {
        res.status(200).json({
          success: true,
          data: cached,
          cached: true
        });
        return;
      }

      // Stream response for large operations
      if (request.options?.stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const stream = this.testGenerationService.generateTestsStream(request);
        
        for await (const update of stream) {
          res.write(`data: ${JSON.stringify(update)}\n\n`);
        }
        
        res.end();
        return;
      }

      // Regular response with performance tracking
      const startTime = Date.now();
      const result = await this.performanceOptimizer.withOptimization(
        'test_generation',
        () => this.testGenerationService.generateTests(request)
      );

      // Cache successful results
      await this.performanceOptimizer.cacheResult('test_gen', request, result);

      const duration = Date.now() - startTime;
      this.logger.info('Test generation completed', {
        duration,
        testsGenerated: result.tests.length,
        tokensUsed: result.metadata.tokensUsed
      });

      res.status(201).json({
        success: true,
        data: result,
        performance: {
          duration,
          optimized: true
        }
      });
    } catch (error) {
      this.logger.error('Test generation failed', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate tests'
      });
    }
  }

  /**
   * Analyze code endpoint with streaming support
   */
  async analyzeCode(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = this.validateCodeAnalysisRequest(req.body);
      if (validationResult.error) {
        res.status(400).json({
          error: 'Validation Error',
          details: validationResult.error.details.map(d => d.message)
        });
        return;
      }

      const request = validationResult.value;

      // Stream analysis updates
      if (request.options?.stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');

        const stream = this.codeAnalysisService.analyzeCodeStream(request);
        
        for await (const update of stream) {
          res.write(`data: ${JSON.stringify(update)}\n\n`);
        }
        
        res.end();
        return;
      }

      // Batch analysis for multiple files
      if (request.batch) {
        const results = await this.performanceOptimizer.batchProcess(
          request.batch,
          (item) => this.codeAnalysisService.analyzeCode(item)
        );

        res.status(200).json({
          success: true,
          data: results,
          batch: true
        });
        return;
      }

      // Single file analysis
      const result = await this.codeAnalysisService.analyzeCode(request);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this.logger.error('Code analysis failed', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to analyze code'
      });
    }
  }

  /**
   * AI-assisted debugging endpoint
   */
  async debugCode(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = this.validateDebugRequest(req.body);
      if (validationResult.error) {
        res.status(400).json({
          error: 'Validation Error',
          details: validationResult.error.details.map(d => d.message)
        });
        return;
      }

      const request = validationResult.value;
      
      // Interactive debugging session
      if (request.interactive) {
        const sessionId = await this.aiDebugService.startDebugSession(request);
        
        res.status(201).json({
          success: true,
          data: {
            sessionId,
            websocketUrl: `/ws/debug/${sessionId}`
          }
        });
        return;
      }

      // One-shot debugging
      const result = await this.aiDebugService.debugIssue(request);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this.logger.error('Debug operation failed', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to debug code'
      });
    }
  }

  /**
   * Natural language query endpoint
   */
  async processNaturalLanguageQuery(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = this.validateNLPRequest(req.body);
      if (validationResult.error) {
        res.status(400).json({
          error: 'Validation Error',
          details: validationResult.error.details.map(d => d.message)
        });
        return;
      }

      const request = validationResult.value;
      
      // Process with context enhancement
      const enhancedRequest = await this.performanceOptimizer.enhanceWithContext(
        request,
        req.user
      );

      const result = await this.nlpService.processQuery(enhancedRequest);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this.logger.error('NLP processing failed', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process natural language query'
      });
    }
  }

  /**
   * Get AI model status and performance metrics
   */
  async getModelStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await this.performanceOptimizer.getSystemStatus();
      
      res.status(200).json({
        success: true,
        data: {
          models: {
            primary: {
              name: 'gpt-4-turbo-preview',
              status: 'online',
              averageLatency: status.averageLatency,
              requestsPerMinute: status.requestsPerMinute
            },
            fallback: {
              name: 'gpt-3.5-turbo',
              status: 'standby'
            }
          },
          performance: {
            cacheHitRate: status.cacheHitRate,
            averageResponseTime: status.averageResponseTime,
            tokensProcessed: status.tokensProcessed,
            costEstimate: status.costEstimate
          },
          limits: {
            rateLimit: '10000 requests/hour',
            concurrentRequests: 50,
            maxTokensPerRequest: 8000
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to get model status', { error: error.message });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get model status'
      });
    }
  }

  /**
   * Validation schemas
   */
  private validateTestGenerationRequest(data: any): Joi.ValidationResult {
    const schema = Joi.object({
      sourceCode: Joi.string().required(),
      language: Joi.string().required(),
      framework: Joi.string().optional(),
      testType: Joi.string().valid('unit', 'integration', 'e2e', 'all').default('all'),
      style: Joi.string().valid('bdd', 'tdd', 'atdd').optional(),
      requirements: Joi.array().items(Joi.string()).optional(),
      existingTests: Joi.string().optional(),
      coverageTarget: Joi.number().min(0).max(100).optional(),
      options: Joi.object({
        includeEdgeCases: Joi.boolean().optional(),
        includeMocks: Joi.boolean().optional(),
        includeFixtures: Joi.boolean().optional(),
        includePerformanceTests: Joi.boolean().optional(),
        includeSecurityTests: Joi.boolean().optional(),
        maxTestsPerFunction: Joi.number().optional(),
        testNamingConvention: Joi.string().valid('descriptive', 'technical', 'bdd').optional(),
        stream: Joi.boolean().optional()
      }).optional()
    });

    return schema.validate(data);
  }

  private validateCodeAnalysisRequest(data: any): Joi.ValidationResult {
    const schema = Joi.object({
      code: Joi.string().required(),
      language: Joi.string().required(),
      analysisTypes: Joi.array().items(
        Joi.string().valid(
          'security', 'performance', 'quality', 'complexity',
          'maintainability', 'testability', 'accessibility',
          'best-practices', 'design-patterns', 'anti-patterns'
        )
      ).min(1).required(),
      context: Joi.object({
        projectType: Joi.string().optional(),
        framework: Joi.string().optional(),
        dependencies: Joi.array().items(Joi.string()).optional(),
        relatedFiles: Joi.array().items(Joi.object({
          path: Joi.string().required(),
          content: Joi.string().optional(),
          type: Joi.string().valid('interface', 'implementation', 'test', 'config').required()
        })).optional(),
        conventions: Joi.object({
          namingConvention: Joi.string().required(),
          indentation: Joi.string().required(),
          maxLineLength: Joi.number().optional(),
          preferredPatterns: Joi.array().items(Joi.string()).optional()
        }).optional()
      }).optional(),
      options: Joi.object({
        depth: Joi.string().valid('shallow', 'medium', 'deep').default('medium'),
        includeRefactoringSuggestions: Joi.boolean().optional(),
        includeCodeSnippets: Joi.boolean().optional(),
        severityThreshold: Joi.string().valid('info', 'warning', 'error', 'critical').optional(),
        customRules: Joi.array().items(Joi.object({
          id: Joi.string().required(),
          name: Joi.string().required(),
          description: Joi.string().required(),
          pattern: Joi.string().required(),
          severity: Joi.string().valid('info', 'warning', 'error', 'critical').required()
        })).optional(),
        stream: Joi.boolean().optional()
      }).optional(),
      batch: Joi.array().items(Joi.object()).optional()
    });

    return schema.validate(data);
  }

  private validateDebugRequest(data: any): Joi.ValidationResult {
    const schema = Joi.object({
      code: Joi.string().required(),
      error: Joi.object({
        message: Joi.string().required(),
        stack: Joi.string().optional(),
        line: Joi.number().optional(),
        column: Joi.number().optional()
      }).required(),
      language: Joi.string().required(),
      framework: Joi.string().optional(),
      context: Joi.object({
        environment: Joi.string().optional(),
        variables: Joi.object().optional(),
        logs: Joi.array().items(Joi.string()).optional()
      }).optional(),
      interactive: Joi.boolean().optional(),
      options: Joi.object({
        maxSuggestions: Joi.number().min(1).max(10).optional(),
        includeExplanation: Joi.boolean().optional(),
        autoFix: Joi.boolean().optional()
      }).optional()
    });

    return schema.validate(data);
  }

  private validateNLPRequest(data: any): Joi.ValidationResult {
    const schema = Joi.object({
      query: Joi.string().required(),
      context: Joi.object({
        projectId: Joi.string().optional(),
        fileContext: Joi.string().optional(),
        history: Joi.array().items(Joi.object({
          query: Joi.string().required(),
          response: Joi.string().required()
        })).optional()
      }).optional(),
      intent: Joi.string().valid(
        'generate_test', 'analyze_code', 'explain_code',
        'find_bugs', 'optimize_performance', 'improve_quality',
        'search_documentation', 'general'
      ).optional(),
      options: Joi.object({
        maxTokens: Joi.number().optional(),
        temperature: Joi.number().min(0).max(1).optional(),
        format: Joi.string().valid('text', 'markdown', 'json').optional()
      }).optional()
    });

    return schema.validate(data);
  }
}