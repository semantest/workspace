// Common types for AI/ML module

export interface TestCase {
  id: string;
  name: string;
  description: string;
  steps: TestStep[];
  data: TestData[];
  assertions: Assertion[];
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number;
  coverage?: number;
  businessValue?: number;
  metrics?: TestMetrics;
}

export interface TestStep {
  id: string;
  action: string;
  target: string;
  value?: any;
  description?: string;
  waitBefore?: number;
  waitAfter?: number;
}

export interface TestData {
  id: string;
  name: string;
  values: Record<string, any>;
  type: string;
}

export interface Assertion {
  id: string;
  type: 'equals' | 'contains' | 'exists' | 'visible' | 'custom';
  target: string;
  expected: any;
  message?: string;
}

export interface TestScenario {
  name: string;
  description: string;
  preconditions: string[];
  steps: ScenarioStep[];
  postconditions: string[];
  dataSchema: DataSchema;
}

export interface ScenarioStep {
  action: string;
  object: string;
  data?: any;
  expectedResult: string;
}

export interface TestResult {
  id: string;
  testId: string;
  status: 'passed' | 'failed' | 'skipped';
  executionTime: number;
  timestamp: Date;
  error?: Error;
  stackTrace?: string;
  environment?: EnvironmentInfo;
  metadata?: Record<string, any>;
}

export interface TestPattern {
  id: string;
  name: string;
  description: string;
  regex?: string;
  examples: string[];
  category: string;
  confidence: number;
}

export interface FailurePattern {
  id: string;
  pattern: string;
  frequency: number;
  lastOccurrence: Date;
  affectedTests: string[];
  rootCause?: string;
}

export interface ElementLocator {
  type: 'id' | 'class' | 'xpath' | 'css' | 'text' | 'attribute';
  value: string;
  description?: string;
  fallback?: ElementLocator;
}

export interface TestExecution {
  id: string;
  name: string;
  steps: TestStep[];
  data?: TestData;
  timeout?: number;
}

export interface ExecutionContext {
  url: string;
  browser: string;
  platform: string;
  viewport?: Viewport;
  networkConditions?: NetworkConditions;
  pageTitle?: string;
  sessionId?: string;
}

export interface Viewport {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
}

export interface NetworkConditions {
  offline: boolean;
  downloadThroughput: number;
  uploadThroughput: number;
  latency: number;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: Test[];
  tags: string[];
  configuration?: SuiteConfiguration;
}

export interface Test {
  id: string;
  name: string;
  description: string;
  steps: TestStep[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  dependencies?: string[];
  coverage?: number;
  businessValue?: number;
}

export interface SuiteConfiguration {
  parallel: boolean;
  maxParallel?: number;
  timeout?: number;
  retries?: number;
  environment?: string;
}

export interface PatternMatcher {
  findSimilarPatterns(features: any): Promise<any[]>;
  updatePatterns(patterns: any[]): Promise<void>;
}

export interface ModelInference {
  generateScenarios(input: any): Promise<TestScenario[]>;
  generateEdgeCases(input: any): Promise<any[]>;
  fineTune(patterns: any[]): Promise<void>;
  generateRealisticData(input: any): Promise<any>;
  predictFlakiness(input: any): Promise<number>;
  predictBottlenecks(input: any): Promise<any[]>;
  generateOptimizationPlan(input: any): Promise<any>;
  clusterFailures(features: any[], options: any): Promise<any[]>;
  analyzeRootCause(input: any): Promise<any>;
  identifyFlakinessCauses(results: any[]): Promise<any[]>;
  generateHealingStrategies(input: any): Promise<any[]>;
  generateLocators(input: any): Promise<any[]>;
  findElementVisually(input: any): Promise<any>;
  predictWaitTime(input: any): Promise<any>;
  optimizeTestOrder(input: any): Promise<any[]>;
  determineExecutionStrategy(input: any): Promise<any>;
  predictExecutionTime(input: any): Promise<any>;
  predictFailureProbability(input: any): Promise<any>;
  forecastResources(input: any): Promise<any>;
  recommendQualityGates(input: any): Promise<any>;
  predictMaintenance(input: any): Promise<any>;
}

export interface TimeSeriesAnalyzer {
  analyze(data: any[]): Promise<any>;
  identifyTrends(data: any[]): Promise<any>;
}

export interface DataSchema {
  properties: Record<string, any>;
  required?: string[];
  dependencies?: Record<string, string[]>;
}

export interface EdgeCase {
  id: string;
  description: string;
  input: any;
  expectedBehavior: string;
  riskLevel: 'low' | 'medium' | 'high';
  category: string;
}

export interface EnvironmentInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device?: string;
}

export interface TestMetrics {
  successRate?: number;
  avgExecutionTime?: number;
  flakiness?: number;
  lastRun?: Date;
  totalRuns?: number;
}

export interface PerformanceData {
  timestamp: Date;
  metric: string;
  value: number;
  unit: string;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  timestamp: Date;
}

export interface CoverageData {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
  files: FileCoverage[];
}

export interface FileCoverage {
  path: string;
  lines: number;
  branches: number;
  functions: number;
  statements: number;
  uncoveredLines: number[];
}

export interface ResourceLimits {
  maxCpu: number;
  maxMemory: number;
  maxDisk: number;
  maxNetwork: number;
}

export interface TestHistory {
  id: string;
  testId: string;
  status: 'passed' | 'failed' | 'skipped';
  executionTime: number;
  timestamp: Date;
  error?: string;
}

export interface ChangeSet {
  files: FileChange[];
  commits: Commit[];
  pullRequest?: PullRequest;
}

export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  patch?: string;
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  timestamp: Date;
}

export interface PullRequest {
  id: number;
  title: string;
  description: string;
  author: string;
  reviewers: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  type: string;
  techStack: string[];
  qualityObjectives: QualityObjective[];
}

export interface QualityObjective {
  metric: string;
  target: number;
  priority: 'low' | 'medium' | 'high';
}

export interface QualityMetrics {
  coverage: number;
  complexity: number;
  duplications: number;
  bugs: number;
  vulnerabilities: number;
  codeSmells: number;
  technicalDebt: number;
  timestamp: Date;
}

export interface CodebaseMetrics {
  totalLines: number;
  totalFiles: number;
  languages: Record<string, number>;
  churnRate: number;
  complexity: number;
  dependencies: number;
}

export interface TimeFrame {
  start: Date;
  end: Date;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export interface PlannedWorkload {
  tests: number;
  expectedDuration: number;
  peakTime: Date;
  resourceRequirements: ResourceRequirements;
}

export interface ResourceRequirements {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
}

export interface HealingRecord {
  timestamp: Date;
  originalStep: TestStep;
  healedStep: TestStep;
  strategy: string;
  success: boolean;
}

export interface Recommendation {
  id: string;
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}