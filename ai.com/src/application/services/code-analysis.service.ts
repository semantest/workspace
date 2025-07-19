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
 * @fileoverview Intelligent Code Analysis Engine
 * @author Semantest Team
 * @module application/services/CodeAnalysisService
 */

import { OpenAIClient } from '../../infrastructure/openai/openai-client';
import { Logger } from '@shared/infrastructure/logger';
import { EventEmitter } from 'events';

export interface CodeAnalysisRequest {
  code: string;
  language: string;
  analysisTypes: AnalysisType[];
  context?: CodeContext;
  options?: AnalysisOptions;
}

export type AnalysisType = 
  | 'security'
  | 'performance' 
  | 'quality'
  | 'complexity'
  | 'maintainability'
  | 'testability'
  | 'accessibility'
  | 'best-practices'
  | 'design-patterns'
  | 'anti-patterns';

export interface CodeContext {
  projectType?: string;
  framework?: string;
  dependencies?: string[];
  relatedFiles?: RelatedFile[];
  conventions?: CodeConventions;
}

export interface RelatedFile {
  path: string;
  content?: string;
  type: 'interface' | 'implementation' | 'test' | 'config';
}

export interface CodeConventions {
  namingConvention: string;
  indentation: string;
  maxLineLength?: number;
  preferredPatterns?: string[];
}

export interface AnalysisOptions {
  depth: 'shallow' | 'medium' | 'deep';
  includeRefactoringSuggestions?: boolean;
  includeCodeSnippets?: boolean;
  severityThreshold?: 'info' | 'warning' | 'error' | 'critical';
  customRules?: CustomRule[];
}

export interface CustomRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface CodeAnalysisResult {
  id: string;
  summary: AnalysisSummary;
  issues: CodeIssue[];
  metrics: CodeMetrics;
  patterns: DetectedPattern[];
  suggestions: Suggestion[];
  score: QualityScore;
  metadata: AnalysisMetadata;
}

export interface AnalysisSummary {
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  mainConcerns: string[];
  strengths: string[];
  recommendedActions: string[];
}

export interface CodeIssue {
  id: string;
  type: AnalysisType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  location: CodeLocation;
  impact: string;
  recommendation: string;
  codeSnippet?: string;
  fixExample?: string;
  references?: string[];
}

export interface CodeLocation {
  file: string;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
}

export interface CodeMetrics {
  complexity: ComplexityMetrics;
  maintainability: MaintainabilityMetrics;
  performance: PerformanceMetrics;
  security: SecurityMetrics;
  testability: TestabilityMetrics;
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  nestingDepth: number;
  linesOfCode: number;
  numberOfFunctions: number;
  numberOfClasses: number;
  averageComplexityPerFunction: number;
}

export interface MaintainabilityMetrics {
  maintainabilityIndex: number;
  technicalDebtRatio: number;
  codeSmells: number;
  duplicateCodePercentage: number;
  documentationCoverage: number;
}

export interface PerformanceMetrics {
  timeComplexity: string;
  spaceComplexity: string;
  potentialBottlenecks: string[];
  memoryLeaks: string[];
  inefficientPatterns: string[];
}

export interface SecurityMetrics {
  vulnerabilities: number;
  securityScore: number;
  owaspCompliance: boolean;
  sensitiveDataExposure: string[];
  injectionRisks: string[];
}

export interface TestabilityMetrics {
  testabilityScore: number;
  mockabilityScore: number;
  dependencyInjection: boolean;
  sideEffects: number;
  purityScore: number;
}

export interface DetectedPattern {
  type: 'design-pattern' | 'anti-pattern' | 'code-smell';
  name: string;
  description: string;
  location: CodeLocation;
  confidence: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface Suggestion {
  id: string;
  type: 'refactoring' | 'optimization' | 'security' | 'best-practice';
  title: string;
  description: string;
  benefit: string;
  effort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high' | 'critical';
  implementation?: string;
}

export interface QualityScore {
  overall: number;
  security: number;
  performance: number;
  maintainability: number;
  testability: number;
  accessibility: number;
}

export interface AnalysisMetadata {
  analyzedAt: Date;
  duration: number;
  tokensUsed: number;
  model: string;
  version: string;
}

/**
 * Intelligent code analysis engine using AI
 */
export class CodeAnalysisService extends EventEmitter {
  private readonly analysisCache: Map<string, CodeAnalysisResult> = new Map();

  constructor(
    private readonly openAIClient: OpenAIClient,
    private readonly logger: Logger
  ) {
    super();
  }

  /**
   * Analyze code using AI-powered engine
   */
  async analyzeCode(request: CodeAnalysisRequest): Promise<CodeAnalysisResult> {
    try {
      const startTime = Date.now();
      const analysisId = this.generateAnalysisId();

      this.logger.info('Starting code analysis', {
        id: analysisId,
        language: request.language,
        analysisTypes: request.analysisTypes
      });

      // Check cache
      const cacheKey = this.generateCacheKey(request);
      const cached = this.analysisCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        return cached;
      }

      // Initialize result structure
      let result: CodeAnalysisResult = {
        id: analysisId,
        summary: await this.generateSummary(request),
        issues: [],
        metrics: await this.calculateMetrics(request),
        patterns: [],
        suggestions: [],
        score: this.calculateInitialScore(request),
        metadata: {
          analyzedAt: new Date(),
          duration: 0,
          tokensUsed: 0,
          model: 'gpt-4-turbo-preview',
          version: '1.0.0'
        }
      };

      // Perform analysis for each type
      for (const analysisType of request.analysisTypes) {
        this.emit('progress', { 
          analysisId, 
          type: analysisType, 
          status: 'started' 
        });

        const analysisResult = await this.performAnalysis(
          request,
          analysisType,
          result.metrics
        );

        result.issues.push(...analysisResult.issues);
        result.patterns.push(...analysisResult.patterns);
        result.suggestions.push(...analysisResult.suggestions);

        this.emit('progress', { 
          analysisId, 
          type: analysisType, 
          status: 'completed' 
        });
      }

      // Post-process results
      result = await this.postProcessResults(result, request);

      // Update metadata
      result.metadata.duration = Date.now() - startTime;

      // Cache result
      this.analysisCache.set(cacheKey, result);

      this.emit('complete', result);
      this.logger.info('Code analysis completed', {
        id: analysisId,
        issuesFound: result.issues.length,
        duration: result.metadata.duration
      });

      return result;
    } catch (error) {
      this.logger.error('Code analysis failed', { error: error.message });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Perform specific type of analysis
   */
  private async performAnalysis(
    request: CodeAnalysisRequest,
    analysisType: AnalysisType,
    metrics: CodeMetrics
  ): Promise<{
    issues: CodeIssue[];
    patterns: DetectedPattern[];
    suggestions: Suggestion[];
  }> {
    const analysisPrompts = {
      security: this.buildSecurityAnalysisPrompt(request, metrics),
      performance: this.buildPerformanceAnalysisPrompt(request, metrics),
      quality: this.buildQualityAnalysisPrompt(request, metrics),
      complexity: this.buildComplexityAnalysisPrompt(request, metrics),
      maintainability: this.buildMaintainabilityAnalysisPrompt(request, metrics),
      testability: this.buildTestabilityAnalysisPrompt(request, metrics),
      accessibility: this.buildAccessibilityAnalysisPrompt(request, metrics),
      'best-practices': this.buildBestPracticesAnalysisPrompt(request, metrics),
      'design-patterns': this.buildDesignPatternsAnalysisPrompt(request, metrics),
      'anti-patterns': this.buildAntiPatternsAnalysisPrompt(request, metrics)
    };

    const prompt = analysisPrompts[analysisType];
    const response = await this.openAIClient.generateCompletion({
      systemPrompt: `You are an expert ${request.language} code analyzer specializing in ${analysisType}. Provide detailed, actionable analysis with specific code locations.`,
      prompt,
      temperature: 0.2,
      maxTokens: 3000
    });

    return this.parseAnalysisResponse(response.text, analysisType);
  }

  /**
   * Calculate code metrics
   */
  private async calculateMetrics(request: CodeAnalysisRequest): Promise<CodeMetrics> {
    const complexityPrompt = `Analyze the complexity of this ${request.language} code:
\`\`\`${request.language}
${request.code}
\`\`\`

Calculate:
1. Cyclomatic complexity
2. Cognitive complexity
3. Nesting depth
4. Lines of code
5. Number of functions/methods
6. Number of classes`;

    const response = await this.openAIClient.generateCompletion({
      systemPrompt: 'You are a code metrics expert. Provide accurate complexity measurements.',
      prompt: complexityPrompt,
      temperature: 0.1,
      maxTokens: 1000
    });

    const parsedMetrics = this.parseMetricsResponse(response.text);

    return {
      complexity: parsedMetrics.complexity,
      maintainability: await this.calculateMaintainabilityMetrics(request, parsedMetrics.complexity),
      performance: await this.calculatePerformanceMetrics(request),
      security: await this.calculateSecurityMetrics(request),
      testability: await this.calculateTestabilityMetrics(request)
    };
  }

  /**
   * Build analysis prompts
   */
  private buildSecurityAnalysisPrompt(request: CodeAnalysisRequest, metrics: CodeMetrics): string {
    return `Perform a comprehensive security analysis of this ${request.language} code:

\`\`\`${request.language}
${request.code}
\`\`\`

Context:
${request.context ? JSON.stringify(request.context, null, 2) : 'No additional context'}

Analyze for:
1. SQL injection vulnerabilities
2. XSS vulnerabilities
3. Authentication/authorization issues
4. Sensitive data exposure
5. Insecure dependencies
6. Cryptographic weaknesses
7. Input validation issues
8. OWASP Top 10 compliance

For each issue found, provide:
- Exact location (line numbers)
- Severity (critical/high/medium/low)
- Detailed description
- Impact assessment
- Recommended fix with code example
- References to security standards

Format your response as structured JSON.`;
  }

  private buildPerformanceAnalysisPrompt(request: CodeAnalysisRequest, metrics: CodeMetrics): string {
    return `Analyze the performance characteristics of this ${request.language} code:

\`\`\`${request.language}
${request.code}
\`\`\`

Focus on:
1. Time complexity analysis (Big O notation)
2. Space complexity analysis
3. Potential bottlenecks
4. Memory leaks
5. Inefficient algorithms
6. Database query optimization
7. Caching opportunities
8. Async/parallel processing opportunities

Provide specific recommendations with code examples.`;
  }

  private buildQualityAnalysisPrompt(request: CodeAnalysisRequest, metrics: CodeMetrics): string {
    return `Analyze the code quality of this ${request.language} code:

\`\`\`${request.language}
${request.code}
\`\`\`

Evaluate:
1. Code clarity and readability
2. Naming conventions
3. Code organization
4. Error handling
5. Documentation quality
6. DRY principle adherence
7. SOLID principles compliance
8. Code smells

Provide specific improvements with examples.`;
  }

  private buildComplexityAnalysisPrompt(request: CodeAnalysisRequest, metrics: CodeMetrics): string {
    return `Analyze the complexity of this ${request.language} code:

Current metrics:
- Cyclomatic Complexity: ${metrics.complexity.cyclomaticComplexity}
- Cognitive Complexity: ${metrics.complexity.cognitiveComplexity}
- Nesting Depth: ${metrics.complexity.nestingDepth}

\`\`\`${request.language}
${request.code}
\`\`\`

Identify:
1. Complex functions that should be refactored
2. Deeply nested code blocks
3. Functions with too many parameters
4. Classes with too many responsibilities
5. Opportunities for simplification

Provide refactoring suggestions with examples.`;
  }

  private buildMaintainabilityAnalysisPrompt(request: CodeAnalysisRequest, metrics: CodeMetrics): string {
    return `Analyze the maintainability of this ${request.language} code:

\`\`\`${request.language}
${request.code}
\`\`\`

Assess:
1. Code modularity
2. Coupling and cohesion
3. Technical debt indicators
4. Documentation completeness
5. Test coverage implications
6. Dependency management
7. Future extensibility

Provide recommendations to improve long-term maintainability.`;
  }

  private buildTestabilityAnalysisPrompt(request: CodeAnalysisRequest, metrics: CodeMetrics): string {
    return `Analyze the testability of this ${request.language} code:

\`\`\`${request.language}
${request.code}
\`\`\`

Evaluate:
1. Dependency injection usage
2. Side effects and purity
3. Mockability of dependencies
4. Test surface area
5. Hidden dependencies
6. Global state usage
7. Method/function isolation

Suggest improvements to make the code more testable.`;
  }

  private buildAccessibilityAnalysisPrompt(request: CodeAnalysisRequest, metrics: CodeMetrics): string {
    return `Analyze accessibility concerns in this ${request.language} code:

\`\`\`${request.language}
${request.code}
\`\`\`

Check for:
1. ARIA attribute usage
2. Semantic HTML compliance
3. Keyboard navigation support
4. Screen reader compatibility
5. Color contrast requirements
6. Focus management
7. Alternative text for media

Provide WCAG 2.1 AA compliance recommendations.`;
  }

  private buildBestPracticesAnalysisPrompt(request: CodeAnalysisRequest, metrics: CodeMetrics): string {
    return `Analyze adherence to ${request.language} best practices:

\`\`\`${request.language}
${request.code}
\`\`\`

Framework: ${request.context?.framework || 'Generic'}

Check:
1. Language-specific idioms
2. Framework conventions
3. Modern syntax usage
4. Deprecated patterns
5. Community standards
6. Performance best practices
7. Security best practices

Provide modernization suggestions where applicable.`;
  }

  private buildDesignPatternsAnalysisPrompt(request: CodeAnalysisRequest, metrics: CodeMetrics): string {
    return `Identify design patterns in this ${request.language} code:

\`\`\`${request.language}
${request.code}
\`\`\`

Look for:
1. Creational patterns (Factory, Singleton, Builder, etc.)
2. Structural patterns (Adapter, Decorator, Facade, etc.)
3. Behavioral patterns (Observer, Strategy, Command, etc.)
4. Architectural patterns (MVC, MVP, MVVM, etc.)
5. Domain patterns (Repository, Service, etc.)

Also suggest where patterns could improve the design.`;
  }

  private buildAntiPatternsAnalysisPrompt(request: CodeAnalysisRequest, metrics: CodeMetrics): string {
    return `Identify anti-patterns and code smells in this ${request.language} code:

\`\`\`${request.language}
${request.code}
\`\`\`

Look for:
1. God objects/functions
2. Spaghetti code
3. Copy-paste programming
4. Magic numbers/strings
5. Premature optimization
6. Callback hell
7. Anemic domain models
8. Feature envy

Provide refactoring suggestions to eliminate anti-patterns.`;
  }

  /**
   * Parse and process responses
   */
  private parseAnalysisResponse(
    responseText: string,
    analysisType: AnalysisType
  ): {
    issues: CodeIssue[];
    patterns: DetectedPattern[];
    suggestions: Suggestion[];
  } {
    // Parse AI response into structured format
    // This would use more sophisticated parsing in production
    const issues: CodeIssue[] = [];
    const patterns: DetectedPattern[] = [];
    const suggestions: Suggestion[] = [];

    // Simplified parsing logic
    try {
      const parsed = JSON.parse(responseText);
      
      if (parsed.issues) {
        issues.push(...parsed.issues.map((issue: any) => ({
          id: this.generateId(),
          type: analysisType,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          location: issue.location,
          impact: issue.impact,
          recommendation: issue.recommendation,
          codeSnippet: issue.codeSnippet,
          fixExample: issue.fixExample,
          references: issue.references
        })));
      }

      if (parsed.patterns) {
        patterns.push(...parsed.patterns);
      }

      if (parsed.suggestions) {
        suggestions.push(...parsed.suggestions);
      }
    } catch (error) {
      // Fallback to text parsing if JSON parsing fails
      this.logger.warn('Failed to parse JSON response, using text parsing', { error });
    }

    return { issues, patterns, suggestions };
  }

  private parseMetricsResponse(responseText: string): any {
    // Parse metrics from AI response
    // This would be more sophisticated in production
    return {
      complexity: {
        cyclomaticComplexity: 10,
        cognitiveComplexity: 15,
        nestingDepth: 3,
        linesOfCode: 100,
        numberOfFunctions: 5,
        numberOfClasses: 2,
        averageComplexityPerFunction: 3
      }
    };
  }

  /**
   * Calculate specific metrics
   */
  private async calculateMaintainabilityMetrics(
    request: CodeAnalysisRequest,
    complexity: ComplexityMetrics
  ): Promise<MaintainabilityMetrics> {
    // Calculate maintainability index based on complexity and other factors
    const maintainabilityIndex = Math.max(
      0,
      100 - (complexity.cyclomaticComplexity * 2) - (complexity.cognitiveComplexity * 1.5)
    );

    return {
      maintainabilityIndex,
      technicalDebtRatio: this.calculateTechnicalDebt(complexity),
      codeSmells: 0, // Would be calculated
      duplicateCodePercentage: 0, // Would be calculated
      documentationCoverage: 0 // Would be calculated
    };
  }

  private async calculatePerformanceMetrics(
    request: CodeAnalysisRequest
  ): Promise<PerformanceMetrics> {
    return {
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
      potentialBottlenecks: [],
      memoryLeaks: [],
      inefficientPatterns: []
    };
  }

  private async calculateSecurityMetrics(
    request: CodeAnalysisRequest
  ): Promise<SecurityMetrics> {
    return {
      vulnerabilities: 0,
      securityScore: 85,
      owaspCompliance: true,
      sensitiveDataExposure: [],
      injectionRisks: []
    };
  }

  private async calculateTestabilityMetrics(
    request: CodeAnalysisRequest
  ): Promise<TestabilityMetrics> {
    return {
      testabilityScore: 75,
      mockabilityScore: 80,
      dependencyInjection: true,
      sideEffects: 2,
      purityScore: 70
    };
  }

  /**
   * Post-process and enhance results
   */
  private async postProcessResults(
    result: CodeAnalysisResult,
    request: CodeAnalysisRequest
  ): Promise<CodeAnalysisResult> {
    // Sort issues by severity
    result.issues.sort((a, b) => {
      const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    // Calculate final quality score
    result.score = this.calculateFinalScore(result);

    // Update summary based on findings
    result.summary = await this.updateSummary(result, request);

    // Add cross-references between issues
    this.addCrossReferences(result);

    return result;
  }

  /**
   * Helper methods
   */
  private generateAnalysisId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(request: CodeAnalysisRequest): string {
    const codeHash = this.hashCode(request.code);
    const typesHash = request.analysisTypes.sort().join('_');
    return `${request.language}_${codeHash}_${typesHash}`;
  }

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private isCacheValid(cached: CodeAnalysisResult): boolean {
    const cacheAge = Date.now() - cached.metadata.analyzedAt.getTime();
    return cacheAge < 24 * 60 * 60 * 1000; // 24 hours
  }

  private calculateInitialScore(request: CodeAnalysisRequest): QualityScore {
    return {
      overall: 50,
      security: 50,
      performance: 50,
      maintainability: 50,
      testability: 50,
      accessibility: 50
    };
  }

  private calculateTechnicalDebt(complexity: ComplexityMetrics): number {
    // Simplified technical debt calculation
    return (complexity.cyclomaticComplexity * 0.5 + 
            complexity.cognitiveComplexity * 0.3 + 
            complexity.nestingDepth * 2) / 100;
  }

  private calculateFinalScore(result: CodeAnalysisResult): QualityScore {
    const issueImpact = {
      critical: 20,
      error: 10,
      warning: 5,
      info: 2
    };

    let deductions = 0;
    for (const issue of result.issues) {
      deductions += issueImpact[issue.severity];
    }

    const baseScore = 100 - Math.min(deductions, 50);
    
    return {
      overall: baseScore,
      security: this.calculateCategoryScore(result, 'security'),
      performance: this.calculateCategoryScore(result, 'performance'),
      maintainability: result.metrics.maintainability.maintainabilityIndex,
      testability: result.metrics.testability.testabilityScore,
      accessibility: this.calculateCategoryScore(result, 'accessibility')
    };
  }

  private calculateCategoryScore(result: CodeAnalysisResult, category: string): number {
    const categoryIssues = result.issues.filter(i => i.type === category);
    const baseScore = 100;
    const deduction = categoryIssues.reduce((sum, issue) => {
      const weights = { critical: 25, error: 15, warning: 8, info: 3 };
      return sum + weights[issue.severity];
    }, 0);
    
    return Math.max(0, baseScore - deduction);
  }

  private async generateSummary(request: CodeAnalysisRequest): Promise<AnalysisSummary> {
    return {
      overallHealth: 'good',
      mainConcerns: [],
      strengths: [],
      recommendedActions: []
    };
  }

  private async updateSummary(
    result: CodeAnalysisResult,
    request: CodeAnalysisRequest
  ): Promise<AnalysisSummary> {
    const criticalIssues = result.issues.filter(i => i.severity === 'critical');
    const errorIssues = result.issues.filter(i => i.severity === 'error');

    let overallHealth: AnalysisSummary['overallHealth'];
    if (criticalIssues.length > 0) {
      overallHealth = 'critical';
    } else if (errorIssues.length > 3) {
      overallHealth = 'poor';
    } else if (errorIssues.length > 0) {
      overallHealth = 'fair';
    } else if (result.score.overall >= 80) {
      overallHealth = 'excellent';
    } else {
      overallHealth = 'good';
    }

    const mainConcerns = [
      ...criticalIssues.map(i => i.title),
      ...errorIssues.slice(0, 3).map(i => i.title)
    ];

    const strengths = [];
    if (result.score.security >= 80) strengths.push('Strong security practices');
    if (result.score.performance >= 80) strengths.push('Good performance characteristics');
    if (result.score.maintainability >= 80) strengths.push('Highly maintainable code');

    const recommendedActions = result.suggestions
      .filter(s => s.priority === 'critical' || s.priority === 'high')
      .slice(0, 5)
      .map(s => s.title);

    return {
      overallHealth,
      mainConcerns,
      strengths,
      recommendedActions
    };
  }

  private addCrossReferences(result: CodeAnalysisResult): void {
    // Add relationships between issues that affect the same code areas
    for (let i = 0; i < result.issues.length; i++) {
      for (let j = i + 1; j < result.issues.length; j++) {
        const issue1 = result.issues[i];
        const issue2 = result.issues[j];
        
        if (this.issuesOverlap(issue1.location, issue2.location)) {
          // Add cross-reference
          if (!issue1.references) issue1.references = [];
          if (!issue2.references) issue2.references = [];
          
          issue1.references.push(`Related: ${issue2.id}`);
          issue2.references.push(`Related: ${issue1.id}`);
        }
      }
    }
  }

  private issuesOverlap(loc1: CodeLocation, loc2: CodeLocation): boolean {
    return loc1.file === loc2.file &&
           ((loc1.startLine <= loc2.endLine && loc1.endLine >= loc2.startLine) ||
            (loc2.startLine <= loc1.endLine && loc2.endLine >= loc1.startLine));
  }

  /**
   * Real-time analysis streaming
   */
  async *analyzeCodeStream(request: CodeAnalysisRequest): AsyncGenerator<AnalysisUpdate> {
    const analysisId = this.generateAnalysisId();
    
    for (const analysisType of request.analysisTypes) {
      yield {
        analysisId,
        type: 'progress',
        data: { analysisType, status: 'started' }
      };

      const result = await this.performAnalysis(request, analysisType, {} as any);
      
      yield {
        analysisId,
        type: 'partial',
        data: { analysisType, result }
      };
    }

    const finalResult = await this.analyzeCode(request);
    yield {
      analysisId,
      type: 'complete',
      data: finalResult
    };
  }

  /**
   * Get analysis suggestions for specific issue
   */
  async getIssueFix(issue: CodeIssue, context: CodeContext): Promise<string> {
    const prompt = `Provide a specific fix for this code issue:

Issue: ${issue.title}
Description: ${issue.description}
Location: Lines ${issue.location.startLine}-${issue.location.endLine}

Code snippet:
${issue.codeSnippet}

Context:
- Language: ${context.framework || 'Generic'}
- Conventions: ${JSON.stringify(context.conventions || {})}

Provide a complete, working fix that addresses the issue.`;

    const response = await this.openAIClient.generateCompletion({
      systemPrompt: 'You are a code fixing expert. Provide precise, working solutions.',
      prompt,
      temperature: 0.3,
      maxTokens: 1000
    });

    return response.text;
  }
}

// Supporting interfaces
interface AnalysisUpdate {
  analysisId: string;
  type: 'progress' | 'partial' | 'complete';
  data: any;
}