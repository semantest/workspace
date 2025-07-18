import { Entity, DomainEvent } from '@semantest/core';
import { ModelInference } from './model-inference';
import { TimeSeriesAnalyzer } from './time-series-analyzer';

/**
 * Predictive analytics for test optimization and planning
 */
export class PredictiveAnalytics extends Entity<PredictiveAnalytics> {
  private modelInference: ModelInference;
  private timeSeriesAnalyzer: TimeSeriesAnalyzer;
  
  constructor(
    private readonly config: PredictiveAnalyticsConfig
  ) {
    super();
    this.modelInference = new ModelInference(config.modelPath);
    this.timeSeriesAnalyzer = new TimeSeriesAnalyzer();
  }

  /**
   * Predict test execution time
   */
  async predictExecutionTime(
    testSuite: TestSuite,
    context: ExecutionContext
  ): Promise<ExecutionTimePrediction> {
    // Get historical execution data
    const historicalData = await this.getHistoricalExecutions(testSuite.id);
    
    // Extract features
    const features = await this.extractExecutionFeatures(testSuite, context);
    
    // Analyze time series patterns
    const timeSeriesAnalysis = await this.timeSeriesAnalyzer.analyze(
      historicalData.map(d => ({
        timestamp: d.timestamp,
        value: d.executionTime
      }))
    );
    
    // Predict using ML model
    const prediction = await this.modelInference.predictExecutionTime({
      features,
      historicalData,
      timeSeriesAnalysis,
      context
    });
    
    // Calculate confidence intervals
    const confidenceIntervals = this.calculateConfidenceIntervals(
      prediction.baseTime,
      historicalData
    );
    
    this.addDomainEvent(new ExecutionTimePredicted({
      correlationId: this.generateCorrelationId(),
      testSuiteId: testSuite.id,
      predictedTime: prediction.baseTime,
      confidence: prediction.confidence,
      timestamp: new Date()
    }));
    
    return {
      baseTime: prediction.baseTime,
      confidence: prediction.confidence,
      confidenceIntervals,
      breakdown: this.generateTimeBreakdown(testSuite, prediction),
      factors: prediction.factors,
      recommendations: this.generateTimeOptimizationRecommendations(prediction)
    };
  }

  /**
   * Calculate failure probability for tests
   */
  async predictFailureProbability(
    tests: Test[],
    changeSet?: ChangeSet
  ): Promise<FailureProbabilityPrediction[]> {
    const predictions: FailureProbabilityPrediction[] = [];
    
    for (const test of tests) {
      // Get test history
      const history = await this.getTestHistory(test.id);
      
      // Extract risk features
      const riskFeatures = await this.extractRiskFeatures(test, changeSet);
      
      // Analyze failure patterns
      const failurePatterns = this.analyzeFailurePatterns(history);
      
      // Predict failure probability
      const prediction = await this.modelInference.predictFailureProbability({
        test,
        history,
        riskFeatures,
        failurePatterns,
        changeSet
      });
      
      // Calculate impact score
      const impactScore = await this.calculateImpactScore(test, prediction);
      
      predictions.push({
        testId: test.id,
        testName: test.name,
        probability: prediction.probability,
        confidence: prediction.confidence,
        riskFactors: prediction.riskFactors,
        impactScore,
        recommendation: this.generateRiskMitigationRecommendation(
          prediction,
          impactScore
        )
      });
    }
    
    // Sort by risk score (probability × impact)
    predictions.sort((a, b) => 
      (b.probability * b.impactScore) - (a.probability * a.impactScore)
    );
    
    this.addDomainEvent(new FailureProbabilityPredicted({
      correlationId: this.generateCorrelationId(),
      predictions: predictions.slice(0, 10), // Top 10 risky tests
      timestamp: new Date()
    }));
    
    return predictions;
  }

  /**
   * Forecast resource usage
   */
  async forecastResourceUsage(
    timeframe: TimeFrame,
    workload?: PlannedWorkload
  ): Promise<ResourceForecast> {
    // Get historical resource data
    const historicalUsage = await this.getHistoricalResourceUsage();
    
    // Analyze trends
    const trends = await this.timeSeriesAnalyzer.identifyTrends(historicalUsage);
    
    // Factor in planned workload
    const workloadImpact = workload ? 
      await this.estimateWorkloadImpact(workload) : null;
    
    // Generate forecast
    const forecast = await this.modelInference.forecastResources({
      historicalUsage,
      trends,
      timeframe,
      workloadImpact,
      seasonality: this.identifySeasonality(historicalUsage)
    });
    
    // Calculate resource requirements
    const requirements = this.calculateResourceRequirements(forecast);
    
    return {
      cpu: this.generateResourceTimeSeries('cpu', forecast),
      memory: this.generateResourceTimeSeries('memory', forecast),
      storage: this.generateResourceTimeSeries('storage', forecast),
      network: this.generateResourceTimeSeries('network', forecast),
      peakUsage: this.identifyPeakUsage(forecast),
      recommendations: this.generateResourceRecommendations(forecast, requirements),
      confidence: forecast.confidence
    };
  }

  /**
   * Generate quality gate recommendations
   */
  async recommendQualityGates(
    project: Project,
    historicalMetrics: QualityMetrics[]
  ): Promise<QualityGateRecommendations> {
    // Analyze project characteristics
    const projectAnalysis = await this.analyzeProject(project);
    
    // Benchmark against similar projects
    const benchmarks = await this.getBenchmarks(projectAnalysis.type);
    
    // Analyze historical trends
    const trends = this.analyzeQualityTrends(historicalMetrics);
    
    // Use ML to recommend thresholds
    const recommendations = await this.modelInference.recommendQualityGates({
      projectAnalysis,
      benchmarks,
      trends,
      currentMetrics: historicalMetrics[historicalMetrics.length - 1],
      objectives: project.qualityObjectives
    });
    
    // Validate recommendations
    const validated = await this.validateRecommendations(recommendations, project);
    
    this.addDomainEvent(new QualityGatesRecommended({
      correlationId: this.generateCorrelationId(),
      projectId: project.id,
      recommendations: validated,
      timestamp: new Date()
    }));
    
    return {
      gates: validated.gates,
      rationale: validated.rationale,
      expectedImpact: this.calculateExpectedImpact(validated.gates, historicalMetrics),
      implementationPlan: this.generateImplementationPlan(validated.gates),
      risks: this.identifyImplementationRisks(validated.gates, project)
    };
  }

  /**
   * Predict test maintenance needs
   */
  async predictMaintenanceNeeds(
    testSuite: TestSuite,
    codebaseMetrics: CodebaseMetrics
  ): Promise<MaintenancePrediction> {
    // Analyze test complexity
    const complexityAnalysis = await this.analyzeTestComplexity(testSuite);
    
    // Check code coverage trends
    const coverageTrends = await this.analyzeCoverageTrends(testSuite.id);
    
    // Analyze code churn impact
    const churnImpact = this.analyzeCodeChurnImpact(
      testSuite,
      codebaseMetrics.churnRate
    );
    
    // Predict maintenance needs
    const prediction = await this.modelInference.predictMaintenance({
      complexityAnalysis,
      coverageTrends,
      churnImpact,
      testAge: this.calculateTestAge(testSuite),
      frameworkChanges: await this.getFrameworkChanges()
    });
    
    // Generate maintenance timeline
    const timeline = this.generateMaintenanceTimeline(prediction);
    
    return {
      urgency: prediction.urgency,
      estimatedEffort: prediction.effort,
      maintenanceTasks: prediction.tasks,
      timeline,
      costBenefit: this.calculateMaintenanceCostBenefit(prediction),
      deferralRisk: this.calculateDeferralRisk(prediction)
    };
  }

  /**
   * Extract features for execution time prediction
   */
  private async extractExecutionFeatures(
    testSuite: TestSuite,
    context: ExecutionContext
  ): Promise<ExecutionFeatures> {
    return {
      testCount: testSuite.tests.length,
      totalSteps: testSuite.tests.reduce((sum, test) => sum + test.steps.length, 0),
      avgComplexity: this.calculateAverageComplexity(testSuite),
      parallelizationFactor: this.calculateParallelizationFactor(testSuite),
      resourceRequirements: await this.estimateResourceRequirements(testSuite),
      environmentFactors: {
        browser: context.browser,
        platform: context.platform,
        networkConditions: context.networkConditions
      },
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    };
  }

  /**
   * Calculate confidence intervals for predictions
   */
  private calculateConfidenceIntervals(
    prediction: number,
    historicalData: HistoricalExecution[]
  ): ConfidenceIntervals {
    const values = historicalData.map(d => d.executionTime);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      lower95: Math.max(0, prediction - 1.96 * stdDev),
      upper95: prediction + 1.96 * stdDev,
      lower99: Math.max(0, prediction - 2.58 * stdDev),
      upper99: prediction + 2.58 * stdDev
    };
  }

  /**
   * Analyze failure patterns in test history
   */
  private analyzeFailurePatterns(
    history: TestHistory[]
  ): FailurePatterns {
    const failures = history.filter(h => h.status === 'failed');
    const total = history.length;
    
    return {
      failureRate: failures.length / total,
      consecutiveFailures: this.findConsecutiveFailures(history),
      failuresByDayOfWeek: this.groupFailuresByDayOfWeek(failures),
      failuresByTimeOfDay: this.groupFailuresByTimeOfDay(failures),
      commonErrorTypes: this.extractCommonErrorTypes(failures),
      environmentalFactors: this.extractEnvironmentalFactors(failures)
    };
  }

  /**
   * Calculate impact score for test failure
   */
  private async calculateImpactScore(
    test: Test,
    prediction: FailurePrediction
  ): Promise<number> {
    const factors = {
      criticality: test.priority === 'critical' ? 1.0 : 
                   test.priority === 'high' ? 0.7 : 0.4,
      dependencies: await this.getTestDependencyCount(test.id) * 0.1,
      coverage: test.coverage || 0,
      userImpact: await this.estimateUserImpact(test),
      businessValue: test.businessValue || 0.5
    };
    
    return Object.values(factors).reduce((sum, factor) => 
      sum + factor, 0) / Object.keys(factors).length;
  }

  getId(): string {
    return this.config.id;
  }
}

// Domain Events
export class ExecutionTimePredicted extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      testSuiteId: string;
      predictedTime: number;
      confidence: number;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

export class FailureProbabilityPredicted extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      predictions: FailureProbabilityPrediction[];
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

export class QualityGatesRecommended extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      projectId: string;
      recommendations: any;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

// Types
export interface PredictiveAnalyticsConfig {
  id: string;
  modelPath: string;
  confidenceThreshold: number;
  forecastHorizon: number;
}

export interface ExecutionTimePrediction {
  baseTime: number;
  confidence: number;
  confidenceIntervals: ConfidenceIntervals;
  breakdown: TimeBreakdown;
  factors: TimeFactor[];
  recommendations: string[];
}

export interface ConfidenceIntervals {
  lower95: number;
  upper95: number;
  lower99: number;
  upper99: number;
}

export interface TimeBreakdown {
  setup: number;
  execution: number;
  teardown: number;
  reporting: number;
}

export interface FailureProbabilityPrediction {
  testId: string;
  testName: string;
  probability: number;
  confidence: number;
  riskFactors: RiskFactor[];
  impactScore: number;
  recommendation: string;
}

export interface RiskFactor {
  name: string;
  contribution: number;
  description: string;
}

export interface ResourceForecast {
  cpu: TimeSeries;
  memory: TimeSeries;
  storage: TimeSeries;
  network: TimeSeries;
  peakUsage: PeakUsage;
  recommendations: ResourceRecommendation[];
  confidence: number;
}

export interface TimeSeries {
  timestamps: Date[];
  values: number[];
  unit: string;
}

export interface QualityGateRecommendations {
  gates: QualityGate[];
  rationale: string[];
  expectedImpact: ImpactAnalysis;
  implementationPlan: ImplementationPlan;
  risks: Risk[];
}

export interface QualityGate {
  metric: string;
  threshold: number;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  severity: 'error' | 'warning' | 'info';
}

export interface MaintenancePrediction {
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort: number;
  maintenanceTasks: MaintenanceTask[];
  timeline: MaintenanceTimeline;
  costBenefit: CostBenefitAnalysis;
  deferralRisk: number;
}

export interface MaintenanceTask {
  id: string;
  description: string;
  type: 'refactor' | 'update' | 'fix' | 'optimize';
  estimatedHours: number;
  priority: number;
}