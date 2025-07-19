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
 * @fileoverview OpenAI API Client for AI-powered features
 * @author Semantest Team
 * @module infrastructure/openai/OpenAIClient
 */

import OpenAI from 'openai';
import { Logger } from '@shared/infrastructure/logger';

export interface OpenAIConfig {
  apiKey: string;
  organization?: string;
  baseURL?: string;
  maxRetries?: number;
  timeout?: number;
  model?: string;
}

export interface CompletionRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  systemPrompt?: string;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionResponse {
  id: string;
  text: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

export interface EmbeddingRequest {
  text: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface CodeAnalysisRequest {
  code: string;
  language: string;
  analysisType: 'security' | 'performance' | 'quality' | 'all';
  context?: string;
}

export interface TestGenerationRequest {
  code: string;
  language: string;
  framework?: string;
  coverage?: 'unit' | 'integration' | 'e2e' | 'all';
  style?: 'bdd' | 'tdd' | 'atdd';
}

/**
 * OpenAI API client for AI-powered features
 */
export class OpenAIClient {
  private client: OpenAI;
  private defaultModel: string;
  private readonly logger: Logger;

  constructor(config: OpenAIConfig, logger: Logger) {
    this.logger = logger;
    this.defaultModel = config.model || 'gpt-4-turbo-preview';

    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      baseURL: config.baseURL,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 60000,
    });

    this.logger.info('OpenAI client initialized', { 
      model: this.defaultModel,
      organization: config.organization 
    });
  }

  /**
   * Generate completion using chat model
   */
  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const messages: ChatMessage[] = request.messages || [];
      
      if (request.systemPrompt) {
        messages.unshift({
          role: 'system',
          content: request.systemPrompt
        });
      }

      if (request.prompt) {
        messages.push({
          role: 'user',
          content: request.prompt
        });
      }

      const completion = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: messages as any,
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7,
        top_p: request.topP || 1,
        frequency_penalty: request.frequencyPenalty || 0,
        presence_penalty: request.presencePenalty || 0,
        stop: request.stop,
      });

      const choice = completion.choices[0];
      
      return {
        id: completion.id,
        text: choice.message.content || '',
        model: completion.model,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        finishReason: choice.finish_reason || 'stop',
      };
    } catch (error) {
      this.logger.error('Failed to generate completion', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    try {
      const input = Array.isArray(request.text) ? request.text : [request.text];
      const model = request.model || 'text-embedding-ada-002';

      const response = await this.client.embeddings.create({
        model,
        input,
      });

      return {
        embeddings: response.data.map(item => item.embedding),
        model: response.model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate embeddings', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze code using AI
   */
  async analyzeCode(request: CodeAnalysisRequest): Promise<string> {
    const prompts = {
      security: `Analyze the following ${request.language} code for security vulnerabilities, potential exploits, and best practices violations. Provide specific line numbers and recommendations.`,
      performance: `Analyze the following ${request.language} code for performance issues, bottlenecks, and optimization opportunities. Include Big O complexity analysis where applicable.`,
      quality: `Analyze the following ${request.language} code for quality issues, design patterns violations, maintainability concerns, and code smells. Suggest refactoring improvements.`,
      all: `Perform a comprehensive analysis of the following ${request.language} code covering security vulnerabilities, performance issues, and code quality concerns.`
    };

    const systemPrompt = `You are an expert ${request.language} developer and code reviewer with deep knowledge of security, performance optimization, and software design patterns.`;

    const userPrompt = `${prompts[request.analysisType]}

${request.context ? `Context: ${request.context}\n` : ''}
Code:
\`\`\`${request.language}
${request.code}
\`\`\`

Provide your analysis in a structured format with:
1. Issue summary
2. Detailed findings with line numbers
3. Severity levels (Critical, High, Medium, Low)
4. Recommended fixes
5. Best practices to follow`;

    const response = await this.generateCompletion({
      systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
      maxTokens: 3000,
    });

    return response.text;
  }

  /**
   * Generate tests using AI
   */
  async generateTests(request: TestGenerationRequest): Promise<string> {
    const frameworks = {
      javascript: request.framework || 'jest',
      typescript: request.framework || 'jest',
      python: request.framework || 'pytest',
      java: request.framework || 'junit',
      go: request.framework || 'testing',
    };

    const framework = frameworks[request.language.toLowerCase()] || request.framework || 'generic';

    const coveragePrompts = {
      unit: 'Generate comprehensive unit tests that test individual functions/methods in isolation',
      integration: 'Generate integration tests that test component interactions and API endpoints',
      e2e: 'Generate end-to-end tests that test complete user workflows',
      all: 'Generate a comprehensive test suite including unit, integration, and e2e tests'
    };

    const stylePrompts = {
      bdd: 'Use Behavior-Driven Development (BDD) style with Given-When-Then format',
      tdd: 'Use Test-Driven Development (TDD) style focusing on test-first approach',
      atdd: 'Use Acceptance Test-Driven Development (ATDD) style with user story acceptance criteria'
    };

    const systemPrompt = `You are an expert test engineer specializing in ${request.language} and ${framework} framework. You write comprehensive, maintainable tests following best practices.`;

    const userPrompt = `${coveragePrompts[request.coverage || 'all']} for the following ${request.language} code using ${framework} framework.
${request.style ? stylePrompts[request.style] : 'Use best practices for the framework'}.

Code to test:
\`\`\`${request.language}
${request.code}
\`\`\`

Generate tests that:
1. Cover all public methods/functions
2. Test edge cases and error conditions
3. Include proper setup and teardown
4. Use appropriate assertions
5. Follow ${framework} best practices
6. Include helpful test descriptions
7. Achieve high code coverage`;

    const response = await this.generateCompletion({
      systemPrompt,
      prompt: userPrompt,
      temperature: 0.5,
      maxTokens: 4000,
    });

    return response.text;
  }

  /**
   * Stream completion response
   */
  async *streamCompletion(request: CompletionRequest): AsyncGenerator<string> {
    try {
      const messages: ChatMessage[] = request.messages || [];
      
      if (request.systemPrompt) {
        messages.unshift({
          role: 'system',
          content: request.systemPrompt
        });
      }

      if (request.prompt) {
        messages.push({
          role: 'user',
          content: request.prompt
        });
      }

      const stream = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: messages as any,
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      this.logger.error('Failed to stream completion', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      this.logger.error('Invalid API key', { error: error.message });
      return false;
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.client.models.list();
      return models.data
        .filter(model => model.id.startsWith('gpt'))
        .map(model => model.id);
    } catch (error) {
      this.logger.error('Failed to fetch models', { error: error.message });
      throw error;
    }
  }

  /**
   * Update default model
   */
  setDefaultModel(model: string): void {
    this.defaultModel = model;
    this.logger.info('Default model updated', { model });
  }

  /**
   * Get usage statistics
   */
  async getUsageStatistics(): Promise<any> {
    // This would integrate with OpenAI's usage API
    // For now, return placeholder data
    return {
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0,
      averageTokensPerRequest: 0,
    };
  }
}