/**
 * @fileoverview TypeScript Type Definitions for Enterprise Compliance Framework
 * @description Comprehensive types for SOC2, GDPR, HIPAA compliance automation
 */

// Core Compliance Types
export interface ComplianceControl {
  id: string;
  framework: 'SOC2' | 'GDPR' | 'HIPAA';
  controlFamily: string;
  controlNumber: string;
  title: string;
  description: string;
  category: 'preventive' | 'detective' | 'corrective';
  automated: boolean;
  implementation: ControlImplementation;
  evidence: EvidenceRequirement[];
  testingFrequency: string;
  lastTested?: Date;
  status: 'compliant' | 'non-compliant' | 'partial' | 'not-applicable';
}

export interface ControlImplementation {
  type: 'technical' | 'administrative' | 'physical';
  automationLevel: 'full' | 'partial' | 'manual';
  responsibleRole: string;
  implementation: string;
  validation: ValidationRule[];
}

export interface EvidenceRequirement {
  type: string;
  description: string;
  collection: 'automated' | 'manual';
  retention: number; // days
  format: string[];
}

export interface ValidationRule {
  id: string;
  type: 'policy' | 'configuration' | 'activity';
  check: (context: any) => Promise<ValidationResult>;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ValidationResult {
  passed: boolean;
  message: string;
  recommendation: string | null;
  evidence: any;
}

export interface ComplianceAssessment {
  framework: string;
  timestamp: Date;
  controls: ControlAssessmentResult[];
  overallScore: number;
  status: 'compliant' | 'non-compliant' | 'partial';
}

export interface ControlAssessmentResult {
  controlId: string;
  status: 'compliant' | 'non-compliant' | 'partial' | 'not-applicable';
  findings: Finding[];
  evidence: Evidence[];
  score: number;
}

export interface Finding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

export interface Evidence {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  data: any;
  hash: string;
}

// Audit Trail Types
export interface AuditEvent {
  type: string;
  actor: string;
  resource: string;
  action: string;
  result: 'success' | 'failure';
  metadata: Record<string, any>;
  sensitiveData?: any;
  queuedAt?: Date;
}

export interface AuditRecord extends AuditEvent {
  id: string;
  timestamp: number;
  eventType: string;
  hash: string;
  previousHash: string;
  blockIndex: number;
  signature: string;
  encryptedData?: string;
  blockHash?: string;
}

export interface AuditQuery {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: string[];
  actors?: string[];
  resources?: string[];
  compliance?: string;
  limit?: number;
  offset?: number;
  includeAll?: boolean;
  includeEvidence?: boolean;
}

export interface AuditQueryResult {
  records: AuditRecord[];
  total: number;
  page?: number;
  pageSize?: number;
  integrityValid?: boolean;
  chainVerified?: boolean;
  exportFormats?: string[];
}

export interface AuditBlock {
  index: number;
  timestamp: number;
  records: AuditRecord[];
  hash: string;
  previousHash: string;
}

export interface AuditChain {
  blocks: AuditBlock[];
  genesis: AuditBlock;
}

export interface ComplianceViolation {
  framework: string;
  control: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recordId: string;
  timestamp: Date;
  ruleId?: string;
}

// GDPR Types
export interface ProcessingActivity {
  name: string;
  purpose: string;
  dataCategories: string[];
  dataSubjects: string[];
  recipients: string[];
  transfers: string[];
  retention: string;
  lawfulBasis: string;
  documented: boolean;
}

export interface DataSubjectRequest {
  id: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'objection';
  dataSubjectId: string;
  receivedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  data?: any;
  preferredFormat?: string;
  rejectionReason?: string;
  response?: any;
}

export interface ConsentRecord {
  id: string;
  dataSubjectId: string;
  purposes: string[];
  timestamp: Date;
  valid: boolean;
  freelyGiven: boolean;
  specific: boolean;
  informed: boolean;
  unambiguous: boolean;
  collectionMethod: string;
  withdrawn: boolean;
  withdrawnAt?: Date;
  hash: string;
}

export interface DataBreach {
  id: string;
  discoveredAt: Date;
  reportedAt?: Date;
  description: string;
  categoriesAffected: string[];
  recordsAffected: number;
  dataIdentifiable: boolean;
  likelyConsequences: 'low' | 'medium' | 'high';
  cause: string;
  measures: string[];
  unauthorizedAccess: boolean;
  dataAcquired: boolean;
  mitigationMeasures: string[];
}

export interface DPIAResult {
  id: string;
  projectId: string;
  projectName: string;
  timestamp: Date;
  necessityAssessment: any;
  proportionalityAssessment: any;
  riskAssessment: any;
  measures: any[];
  residualRisk: string;
  approval: any;
  dpoConsultation?: any;
}

// HIPAA Types
export interface SafeguardAssessment {
  category: 'administrative' | 'physical' | 'technical';
  compliant: boolean;
  controls: SafeguardControl[];
}

export interface SafeguardControl {
  id: string;
  name: string;
  status: 'compliant' | 'non-compliant' | 'partial';
  evidence: any;
  findings?: string[];
}

export interface PHIBreach {
  id: string;
  discoveredDate: Date;
  reportedAt?: Date;
  breachDate: Date;
  description: string;
  affectedIndividuals: string[];
  phiTypes: string[];
  cause: string;
  location: string;
  unauthorizedAccess: boolean;
  dataAcquired: boolean;
  mitigationMeasures: string[];
}

export interface BreachHandlingResult {
  breachId: string;
  riskAssessment: any;
  notifications: BreachNotification[];
  actions: CorrectiveAction[];
}

export interface BreachNotification {
  type: 'individual' | 'HHS' | 'media';
  method: string;
  count?: number;
  deadline?: Date;
  sentDate?: Date;
  reportNumber?: string;
  submittedDate?: Date;
  outlets?: string[];
  publishDate?: Date;
}

export interface CorrectiveAction {
  action: string;
  description: string;
  responsible: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface PrivacyAssessment {
  compliant: boolean;
  practices: PrivacyPractice[];
}

export interface PrivacyPractice {
  requirement: string;
  status: 'compliant' | 'non-compliant' | 'partial';
  evidence: any;
}

// Reporting Types
export interface ComplianceReport {
  id: string;
  type: string;
  title: string;
  framework: string;
  period: {
    start: Date;
    end: Date;
  };
  sections: ReportSection[];
  appendices?: any[];
  metadata?: any;
  attestation?: ReportAttestation;
  generated: Date;
  format: string;
}

export interface ReportSection {
  title: string;
  content: any;
}

export interface ReportAttestation {
  compliant: boolean;
  officer: string;
  date: Date;
  digitalSignature: string;
}

export interface ReportParams {
  framework?: string;
  startDate: Date;
  endDate: Date;
  eventTypes?: string[];
  format?: string;
  distribute?: boolean;
  recipients?: string[];
}

export interface ReportSchedule {
  id?: string;
  name: string;
  reportType: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  params: ReportParams;
  recipients: string[];
  enabled: boolean;
  createdAt?: Date;
  lastRun?: Date;
  nextRun?: Date;
}

export interface ComplianceDashboard {
  timestamp: Date;
  frameworks: {
    soc2: FrameworkStatus;
    gdpr: FrameworkStatus;
    hipaa: FrameworkStatus;
  };
  overallCompliance: number;
  alerts: ComplianceAlert[];
  upcomingAudits: UpcomingAudit[];
  recentFindings: ComplianceFinding[];
  metrics: ComplianceMetrics;
  trends?: ComplianceTrends;
  riskSummary?: RiskSummary;
}

export interface FrameworkStatus {
  framework: string;
  score: number;
  status: 'compliant' | 'non-compliant' | 'partial';
  lastAssessment: Date;
  nextAudit: Date;
  controlsCovered: number;
  controlsPassed: number;
  lastCertification?: Date;
}

export interface ComplianceAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  framework: string;
  timestamp: Date;
  acknowledged: boolean;
  dueDate?: Date;
  assignee?: string;
}

export interface UpcomingAudit {
  framework: string;
  auditDate: Date;
  auditor: string;
  scope: string[];
  preparationStatus: number; // percentage
}

export interface ComplianceFinding {
  id: string;
  framework: string;
  control: string;
  finding: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'closed';
  discoveredDate: Date;
  dueDate?: Date;
  assignee?: string;
}

export interface ComplianceMetrics {
  controlsCovered: number;
  controlsPassed: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  averageRemediationTime: number; // days
  complianceTrend: 'improving' | 'stable' | 'declining';
}

export interface ComplianceTrends {
  scoreHistory: Array<{ date: Date; score: number }>;
  findingsTrend: 'increasing' | 'stable' | 'decreasing';
  riskTrend: 'improving' | 'stable' | 'deteriorating';
}

export interface RiskSummary {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  riskCategories: Record<string, string>;
}

// Additional Supporting Types
export interface TechnicalControl {
  id: string;
  name: string;
  type: string;
  implementation: string;
  effectiveness: number;
}

export interface AdministrativeControl {
  id: string;
  name: string;
  type: string;
  implementation: string;
  effectiveness: number;
}

export interface PhysicalControl {
  id: string;
  name: string;
  type: string;
  implementation: string;
  effectiveness: number;
}

export interface RemediationPlan {
  id: string;
  controlId: string;
  actions: RemediationAction[];
  timeline: number; // days
  priority: 'critical' | 'high' | 'medium' | 'low';
  owner: string;
  status: 'planned' | 'in_progress' | 'completed';
}

export interface RemediationAction {
  id: string;
  action: string;
  description: string;
  dueDate: Date;
  owner: string;
  status: 'pending' | 'in_progress' | 'completed';
  effort: 'low' | 'medium' | 'high';
}

export interface SystemDesign {
  name: string;
  description: string;
  dataProcessing: any;
  security: {
    endToEnd?: boolean;
    [key: string]: any;
  };
  privacy: any;
  privacyConsiderations?: {
    proactive?: boolean;
    defaultPrivacy?: boolean;
    embedded?: boolean;
    fullFunctionality?: boolean;
    transparency?: boolean;
    userRespect?: boolean;
  };
}

export interface Project {
  id: string;
  name: string;
  description: string;
  dataProcessing: any[];
  risks: any[];
}

export interface ConsentValidation {
  valid: boolean;
  freely_given: boolean;
  specific: boolean;
  informed: boolean;
  unambiguous: boolean;
  withdrawable: boolean;
  timestamp?: Date;
  evidence: any;
}

export interface AccessResponse {
  success: boolean;
  error?: string;
  requestId: string;
  data?: any;
  format?: string;
  generatedAt?: Date;
}

export interface RectificationResponse {
  success: boolean;
  requestId: string;
  corrections: CorrectionResult[];
  completedAt: Date;
}

export interface CorrectionResult {
  field: string;
  success: boolean;
  error?: string;
  oldValue?: any;
  newValue?: any;
  correctedAt?: Date;
}

export interface DataCorrections {
  corrections: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}

export interface ErasureResponse {
  success: boolean;
  requestId: string;
  reason?: string;
  legalGrounds?: string;
  erasedCategories?: string[];
  certificate?: string;
}

export interface BreachResponse {
  breachId: string;
  reportedWithin72Hours: boolean;
  authoritiesNotified: string[];
  dataSubjectsNotified: boolean;
  actions: any[];
}

// Utility Types
export type ComplianceFramework = 'SOC2' | 'GDPR' | 'HIPAA';
export type ReportType = 'executive_summary' | 'detailed_audit' | 'gap_analysis' | 'remediation_plan' | 'compliance_attestation' | 'vulnerability_assessment';
export type ReportFormat = 'pdf' | 'json' | 'csv' | 'xml';
export type ComplianceStatus = 'compliant' | 'non-compliant' | 'partial' | 'not-applicable';
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ControlType = 'preventive' | 'detective' | 'corrective';
export type ImplementationType = 'technical' | 'administrative' | 'physical';
export type AutomationLevel = 'full' | 'partial' | 'manual';

// Health Check Types
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: any;
  lastCheck?: Date;
}

// Event Types
export interface ComplianceEvent {
  type: string;
  data: any;
  timestamp: Date;
  source: string;
}

// Configuration Types
export interface ComplianceConfig {
  frameworks: {
    soc2: boolean;
    gdpr: boolean;
    hipaa: boolean;
  };
  auditTrail: {
    enabled: boolean;
    retention: number; // days
    encryption: boolean;
  };
  reporting: {
    enabled: boolean;
    defaultFormat: ReportFormat;
    autoDistribution: boolean;
  };
  notifications: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
  };
}

// Export all types
export * from './types';