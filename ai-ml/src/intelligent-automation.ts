import { Entity, DomainEvent } from '@semantest/core';
import { TestExecution, ElementLocator, TestStep } from './types';
import { ModelInference } from './model-inference';
import { PatternMatcher } from './pattern-matcher';

/**
 * Intelligent test automation with self-healing capabilities
 */
export class IntelligentAutomation extends Entity<IntelligentAutomation> {
  private modelInference: ModelInference;
  private patternMatcher: PatternMatcher;
  private healingHistory: Map<string, HealingRecord[]> = new Map();
  
  constructor(
    private readonly config: AutomationConfig
  ) {
    super();
    this.modelInference = new ModelInference(config.modelPath);
    this.patternMatcher = new PatternMatcher();
  }

  /**
   * Self-healing test execution
   */
  async executeWithHealing(
    test: TestExecution,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionSteps: ExecutedStep[] = [];
    let healingApplied = false;
    
    try {
      for (const step of test.steps) {
        try {
          // Execute step normally
          const result = await this.executeStep(step, context);
          executionSteps.push({
            step,
            result,
            healingApplied: false
          });
        } catch (error) {
          // Attempt self-healing
          const healingResult = await this.attemptHealing(step, error, context);
          
          if (healingResult.success) {
            healingApplied = true;
            executionSteps.push({
              step: healingResult.healedStep,
              result: healingResult.result,
              healingApplied: true,
              healingDetails: healingResult.details
            });
            
            // Record healing for future use
            this.recordHealing(step, healingResult);
          } else {
            throw error;
          }
        }
      }
      
      const executionTime = Date.now() - startTime;
      
      this.addDomainEvent(new TestExecutedWithHealing({
        correlationId: this.generateCorrelationId(),
        testId: test.id,
        healingApplied,
        executionTime,
        timestamp: new Date()
      }));
      
      return {
        status: 'passed',
        executionSteps,
        executionTime,
        healingApplied
      };
    } catch (error) {
      return {
        status: 'failed',
        executionSteps,
        executionTime: Date.now() - startTime,
        error: error as Error,
        healingApplied
      };
    }
  }

  /**
   * Dynamic wait strategies using AI
   */
  async intelligentWait(
    condition: WaitCondition,
    context: ExecutionContext
  ): Promise<boolean> {
    const startTime = Date.now();
    const maxWaitTime = condition.timeout || this.config.defaultTimeout;
    
    // Predict optimal wait time based on historical data
    const predictedWaitTime = await this.predictWaitTime(condition, context);
    
    // Use adaptive polling intervals
    const pollingStrategy = this.determinePollingStrategy(predictedWaitTime);
    
    while (Date.now() - startTime < maxWaitTime) {
      // Check condition
      if (await this.evaluateCondition(condition, context)) {
        // Learn from successful wait
        this.recordWaitSuccess(condition, Date.now() - startTime);
        return true;
      }
      
      // Adaptive wait
      const waitInterval = this.calculateNextInterval(
        pollingStrategy,
        Date.now() - startTime,
        predictedWaitTime
      );
      
      await this.sleep(waitInterval);
      
      // Check if we should adjust strategy
      if (this.shouldAdjustStrategy(Date.now() - startTime, predictedWaitTime)) {
        pollingStrategy.adjust();
      }
    }
    
    // Record wait failure for learning
    this.recordWaitFailure(condition, maxWaitTime);
    return false;
  }

  /**
   * Smart element locator with fallback strategies
   */
  async smartLocate(
    locator: ElementLocator,
    context: ExecutionContext
  ): Promise<Element | null> {
    // Try primary locator
    let element = await this.findElement(locator, context);
    
    if (element) {
      return element;
    }
    
    // Generate alternative locators using AI
    const alternatives = await this.generateAlternativeLocators(locator, context);
    
    // Try alternatives in order of confidence
    for (const alt of alternatives) {
      element = await this.findElement(alt.locator, context);
      
      if (element) {
        // Validate element is correct
        if (await this.validateElement(element, locator, context)) {
          // Update locator for future use
          this.updateLocatorMapping(locator, alt.locator);
          
          this.addDomainEvent(new LocatorHealed({
            correlationId: this.generateCorrelationId(),
            originalLocator: locator,
            healedLocator: alt.locator,
            confidence: alt.confidence,
            timestamp: new Date()
          }));
          
          return element;
        }
      }
    }
    
    // Try visual recognition as last resort
    if (this.config.enableVisualRecognition) {
      return await this.locateByVisualRecognition(locator, context);
    }
    
    return null;
  }

  /**
   * Adaptive test execution based on system state
   */
  async adaptiveExecute(
    testSuite: TestSuite,
    systemState: SystemState
  ): Promise<AdaptiveExecutionResult> {
    // Analyze system state
    const analysis = await this.analyzeSystemState(systemState);
    
    // Determine execution strategy
    const strategy = await this.modelInference.determineExecutionStrategy({
      testSuite,
      systemState: analysis,
      historicalPerformance: await this.getHistoricalPerformance(testSuite.id),
      constraints: {
        maxExecutionTime: this.config.maxExecutionTime,
        resourceLimits: this.config.resourceLimits
      }
    });
    
    // Optimize test order
    const optimizedOrder = await this.optimizeTestOrder(
      testSuite.tests,
      strategy,
      analysis
    );
    
    // Execute with adaptive parallelism
    const results = await this.executeWithAdaptiveParallelism(
      optimizedOrder,
      strategy,
      systemState
    );
    
    return {
      results,
      strategy,
      adaptations: this.getAdaptationsMade(),
      performance: this.calculatePerformanceMetrics(results)
    };
  }

  /**
   * Attempt to heal a failed test step
   */
  private async attemptHealing(
    step: TestStep,
    error: Error,
    context: ExecutionContext
  ): Promise<HealingResult> {
    // Analyze error
    const errorAnalysis = await this.analyzeError(error, step);
    
    // Check healing history
    const previousHealing = this.getHealingHistory(step.id);
    
    // Generate healing strategies
    const strategies = await this.modelInference.generateHealingStrategies({
      step,
      error: errorAnalysis,
      context,
      previousAttempts: previousHealing,
      confidence: this.config.healingConfidenceThreshold
    });
    
    // Try strategies in order
    for (const strategy of strategies) {
      try {
        const healedStep = await this.applyHealingStrategy(step, strategy);
        const result = await this.executeStep(healedStep, context);
        
        return {
          success: true,
          healedStep,
          result,
          details: {
            strategy: strategy.type,
            modifications: strategy.modifications,
            confidence: strategy.confidence
          }
        };
      } catch (healingError) {
        // Continue to next strategy
        continue;
      }
    }
    
    return {
      success: false,
      healedStep: step,
      result: null,
      details: null
    };
  }

  /**
   * Generate alternative locators using AI
   */
  private async generateAlternativeLocators(
    original: ElementLocator,
    context: ExecutionContext
  ): Promise<AlternativeLocator[]> {
    // Get page structure
    const pageStructure = await this.getPageStructure(context);
    
    // Find similar elements
    const similarElements = await this.findSimilarElements(original, pageStructure);
    
    // Generate locators using AI
    const alternatives = await this.modelInference.generateLocators({
      original,
      pageStructure,
      similarElements,
      context: {
        url: context.url,
        pageTitle: context.pageTitle,
        previousLocators: this.getPreviousLocators(original)
      }
    });
    
    // Rank by confidence
    return alternatives.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Locate element using visual recognition
   */
  private async locateByVisualRecognition(
    locator: ElementLocator,
    context: ExecutionContext
  ): Promise<Element | null> {
    // Take screenshot
    const screenshot = await this.takeScreenshot(context);
    
    // Use AI to find element visually
    const visualMatch = await this.modelInference.findElementVisually({
      screenshot,
      targetDescription: locator.description || locator.value,
      elementType: locator.type,
      context
    });
    
    if (visualMatch) {
      // Convert coordinates to element
      return await this.getElementAtCoordinates(
        visualMatch.x,
        visualMatch.y,
        context
      );
    }
    
    return null;
  }

  /**
   * Predict optimal wait time
   */
  private async predictWaitTime(
    condition: WaitCondition,
    context: ExecutionContext
  ): Promise<number> {
    // Get historical wait times
    const history = await this.getWaitHistory(condition);
    
    // Use ML to predict wait time
    const prediction = await this.modelInference.predictWaitTime({
      condition,
      history,
      context,
      systemLoad: await this.getSystemLoad(),
      timeOfDay: new Date().getHours()
    });
    
    // Add safety margin
    return prediction.time * (1 + this.config.waitTimeSafetyMargin);
  }

  /**
   * Optimize test execution order
   */
  private async optimizeTestOrder(
    tests: Test[],
    strategy: ExecutionStrategy,
    systemAnalysis: SystemAnalysis
  ): Promise<Test[]> {
    // Calculate dependencies
    const dependencies = await this.calculateTestDependencies(tests);
    
    // Estimate execution times
    const estimations = await this.estimateExecutionTimes(tests, systemAnalysis);
    
    // Use AI to optimize order
    const optimizedOrder = await this.modelInference.optimizeTestOrder({
      tests,
      dependencies,
      estimations,
      strategy,
      objectives: {
        minimizeTime: strategy.prioritizeSpeed,
        maximizeCoverage: strategy.prioritizeCoverage,
        minimizeResourceUsage: strategy.prioritizeResources
      }
    });
    
    return optimizedOrder;
  }

  getId(): string {
    return this.config.id;
  }
}

// Domain Events
export class TestExecutedWithHealing extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      testId: string;
      healingApplied: boolean;
      executionTime: number;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

export class LocatorHealed extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      originalLocator: ElementLocator;
      healedLocator: ElementLocator;
      confidence: number;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

// Types
export interface AutomationConfig {
  id: string;
  modelPath: string;
  defaultTimeout: number;
  healingConfidenceThreshold: number;
  enableVisualRecognition: boolean;
  waitTimeSafetyMargin: number;
  maxExecutionTime: number;
  resourceLimits: ResourceLimits;
}

export interface ExecutionContext {
  url: string;
  pageTitle: string;
  browser: string;
  viewport: Viewport;
  sessionId: string;
}

export interface ExecutionResult {
  status: 'passed' | 'failed';
  executionSteps: ExecutedStep[];
  executionTime: number;
  healingApplied: boolean;
  error?: Error;
}

export interface ExecutedStep {
  step: TestStep;
  result: any;
  healingApplied: boolean;
  healingDetails?: HealingDetails;
}

export interface HealingResult {
  success: boolean;
  healedStep: TestStep;
  result: any;
  details: HealingDetails | null;
}

export interface HealingDetails {
  strategy: string;
  modifications: any[];
  confidence: number;
}

export interface WaitCondition {
  type: 'visibility' | 'presence' | 'clickable' | 'custom';
  target: string;
  timeout?: number;
  predicate?: () => boolean;
}

export interface AlternativeLocator {
  locator: ElementLocator;
  confidence: number;
  reasoning: string;
}

export interface SystemState {
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  activeProcesses: number;
  timestamp: Date;
}

export interface AdaptiveExecutionResult {
  results: TestResult[];
  strategy: ExecutionStrategy;
  adaptations: Adaptation[];
  performance: PerformanceMetrics;
}

export interface ExecutionStrategy {
  parallelism: number;
  prioritizeSpeed: boolean;
  prioritizeCoverage: boolean;
  prioritizeResources: boolean;
  adaptiveParallelism: boolean;
}