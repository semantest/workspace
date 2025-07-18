// AI/ML Module - Public API
export * from './test-generator';
export * from './pattern-recognition';
export * from './intelligent-automation';
export * from './predictive-analytics';
export * from './types';

// Re-export main classes for convenience
export { TestGenerator } from './test-generator';
export { PatternRecognition } from './pattern-recognition';
export { IntelligentAutomation } from './intelligent-automation';
export { PredictiveAnalytics } from './predictive-analytics';

// Module configuration
export interface AIMlConfig {
  modelsPath: string;
  enableFineTuning: boolean;
  confidenceThreshold: number;
  maxExecutionTime: number;
  resourceLimits: {
    maxCpu: number;
    maxMemory: number;
  };
}

// Module initialization
export class AIMlModule {
  private static instance: AIMlModule;
  private config: AIMlConfig;
  
  private testGenerator: TestGenerator | null = null;
  private patternRecognition: PatternRecognition | null = null;
  private intelligentAutomation: IntelligentAutomation | null = null;
  private predictiveAnalytics: PredictiveAnalytics | null = null;
  
  private constructor(config: AIMlConfig) {
    this.config = config;
  }
  
  static initialize(config: AIMlConfig): AIMlModule {
    if (!AIMlModule.instance) {
      AIMlModule.instance = new AIMlModule(config);
    }
    return AIMlModule.instance;
  }
  
  static getInstance(): AIMlModule {
    if (!AIMlModule.instance) {
      throw new Error('AIMlModule not initialized. Call initialize() first.');
    }
    return AIMlModule.instance;
  }
  
  getTestGenerator(): TestGenerator {
    if (!this.testGenerator) {
      this.testGenerator = new TestGenerator({
        id: 'default-test-generator',
        modelPath: `${this.config.modelsPath}/test-generator`,
        enableFineTuning: this.config.enableFineTuning,
        maxTestsPerRequirement: 10,
        confidenceThreshold: this.config.confidenceThreshold
      });
    }
    return this.testGenerator;
  }
  
  getPatternRecognition(): PatternRecognition {
    if (!this.patternRecognition) {
      this.patternRecognition = new PatternRecognition({
        id: 'default-pattern-recognition',
        modelPath: `${this.config.modelsPath}/pattern-recognition`,
        similarityThreshold: 0.8,
        maxExecutionTime: this.config.maxExecutionTime,
        minCoverageTarget: 80
      });
    }
    return this.patternRecognition;
  }
  
  getIntelligentAutomation(): IntelligentAutomation {
    if (!this.intelligentAutomation) {
      this.intelligentAutomation = new IntelligentAutomation({
        id: 'default-intelligent-automation',
        modelPath: `${this.config.modelsPath}/intelligent-automation`,
        defaultTimeout: 30000,
        healingConfidenceThreshold: this.config.confidenceThreshold,
        enableVisualRecognition: true,
        waitTimeSafetyMargin: 0.2,
        maxExecutionTime: this.config.maxExecutionTime,
        resourceLimits: this.config.resourceLimits
      });
    }
    return this.intelligentAutomation;
  }
  
  getPredictiveAnalytics(): PredictiveAnalytics {
    if (!this.predictiveAnalytics) {
      this.predictiveAnalytics = new PredictiveAnalytics({
        id: 'default-predictive-analytics',
        modelPath: `${this.config.modelsPath}/predictive-analytics`,
        confidenceThreshold: this.config.confidenceThreshold,
        forecastHorizon: 30 // days
      });
    }
    return this.predictiveAnalytics;
  }
}

// Default export
export default AIMlModule;