// ============================================================================
// AUDIT & COMPLIANCE SYSTEM - TYPE DEFINITIONS
// ============================================================================

import { EventEmitter } from 'events';

export interface AuditConfig {
  enableAutomatedAuditing: boolean;
  enableRealTimeMonitoring: boolean;
  enableComplianceScoring: boolean;
  auditingFrameworks: string[];
  auditFrequency: 'CONTINUOUS' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  complianceThreshold: number;
  alertingEnabled: boolean;
  evidenceRetention: string;
  encryptAuditLogs: boolean;
  quantumSafeAuditing: boolean;
  regulatoryReporting: boolean;
  automaticRemediation: boolean;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  type: 'SECURITY' | 'PRIVACY' | 'FINANCIAL' | 'OPERATIONAL' | 'INDUSTRY_SPECIFIC';
  controls: ComplianceControl[];
  lastUpdated: Date;
  applicability: string[];
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  category: string;
  requirements: string[];
  evidenceTypes: string[];
  testProcedures: string[];
  maturityLevels: string[];
}

export interface AuditTrail {
  trailId: string;
  entityType: string;
  entityId: string;
  entries: AuditEntry[];
  integrity: string;
  encrypted: boolean;
  tamperProof: boolean;
  blockchainAnchored: boolean;
  merkleRoot: string;
  createdAt: Date;
  retentionUntil: Date;
}

export interface AuditEntry {
  action: string;
  timestamp: number;
  actor: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  signature?: string;
}

export interface SystemAuditRequest {
  auditScope: string;
  frameworks: string[];
  includeSecurityControls: boolean;
  includeDataProtection: boolean;
  includeAccessControls: boolean;
  includeQuantumSafety: boolean;
  generateEvidence: boolean;
  riskAssessment: boolean;
}

export interface SystemAuditResult {
  auditId: string;
  status: string;
  overallScore: number;
  frameworkResults: Record<string, number>;
  findings: AuditFinding[];
  evidenceCollected: boolean;
  quantumSafetyVerified: boolean;
  startTime: Date;
  endTime: Date;
  auditorId: string;
}

export interface AuditTrailRequest {
  entityType: string;
  entityId: string;
  actions: AuditEntryRequest[];
  metadata: {
    importance: string;
    retention: string;
    encrypted: boolean;
  };
}

export interface AuditEntryRequest {
  action: string;
  timestamp: number;
  actor: string;
  details: Record<string, unknown>;
}

export interface ComplianceAssessmentRequest {
  framework: string;
  trustServices?: string[];
  articles?: string[];
  dataProcessingActivities?: string[];
  includeType1?: boolean;
  includeType2?: boolean;
  includeDataProtectionImpactAssessment?: boolean;
  validateConsentMechanisms?: boolean;
  auditDataSubjectRights?: boolean;
  auditPeriod: {
    startDate: Date;
    endDate: Date;
  };
  generateReport: boolean;
  collectEvidence: boolean;
}

export interface ComplianceAssessmentResult {
  framework: string;
  overallCompliance: number;
  trustServiceResults?: Record<string, number>;
  articleCompliance?: Record<string, number>;
  controlsEvaluated: number;
  effectiveControls: number;
  exceptions: ComplianceException[];
  evidenceArtifacts: number;
  reportGenerated: boolean;
  dataSubjectRights?: string;
  consentMechanisms?: string;
  dataMinimizationScore?: number;
  dpiaRequired?: boolean;
  transferMechanisms?: string;
  assessmentDate: Date;
}

export interface ComplianceException {
  id: string;
  controlId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  impact: string;
  remediation: string;
  dueDate: Date;
}

export interface RegulatoryReportRequest {
  reportType: string;
  regulations: string[];
  reportingPeriod: {
    startDate: Date;
    endDate: Date;
  };
  includeExecutiveSummary: boolean;
  includeDetailedFindings: boolean;
  includeEvidence: boolean;
  includeRecommendations: boolean;
  includeMetrics: boolean;
  format: string;
}

export interface RegulatoryReportResult {
  reportId: string;
  reportType: string;
  executiveSummary: string;
  detailedFindings: AuditFinding[];
  complianceMetrics: ComplianceMetrics;
  evidenceReferences: number;
  recommendations: string[];
  signedByAuditor: boolean;
  blockchainVerified: boolean;
  generatedAt: Date;
  validUntil: Date;
}

export interface ComplianceDashboard {
  overallComplianceScore: number;
  frameworkScores: Record<string, number>;
  auditMetrics: AuditMetrics;
  trendAnalysis: TrendAnalysis;
  upcomingAudits: UpcomingAudit[];
  criticalFindings: number;
  remediationProgress: RemediationProgress;
  lastUpdated: Date;
}

export interface AuditMetrics {
  totalAudits: number;
  completedAudits: number;
  averageAuditTime: number;
  findingsRate: number;
  remediationRate: number;
  complianceImprovement: number;
}

export interface TrendAnalysis {
  complianceTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  riskTrend: 'DECREASING' | 'STABLE' | 'INCREASING';
  findingsTrend: 'DECREASING' | 'STABLE' | 'INCREASING';
  timeSeriesData: TimeSeriesPoint[];
}

export interface TimeSeriesPoint {
  timestamp: Date;
  complianceScore: number;
  riskScore: number;
  findingsCount: number;
}

export interface UpcomingAudit {
  auditId: string;
  framework: string;
  scheduledDate: Date;
  auditor: string;
  scope: string;
  estimatedDuration: number;
}

export interface RemediationProgress {
  totalFindings: number;
  remediatedFindings: number;
  inProgressFindings: number;
  overdueFindings: number;
  averageRemediationTime: number;
}

export interface QuickComplianceRequest {
  framework: string;
  controlId: string;
  evidenceRequired: boolean;
}

export interface QuickComplianceResult {
  controlId: string;
  compliant: boolean;
  score: number;
  evidence: string[];
  recommendations: string[];
  lastChecked: Date;
}

// Base Types
export interface ComplianceCheck {
  id: string;
  framework: string;
  controlId: string;
  status: ComplianceStatus;
  score: number;
  evidence: ComplianceEvidence[];
  findings: AuditFinding[];
  lastChecked: Date;
  nextCheck: Date;
}

export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  PARTIALLY_COMPLIANT = 'PARTIALLY_COMPLIANT',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  PENDING_REVIEW = 'PENDING_REVIEW'
}

export interface ComplianceEvidence {
  id: string;
  type: string;
  description: string;
  source: string;
  collectedAt: Date;
  validUntil: Date;
  verified: boolean;
  encrypted: boolean;
  hash: string;
}

export interface AuditFinding {
  id: string;
  type: 'CONTROL_DEFICIENCY' | 'COMPLIANCE_GAP' | 'SECURITY_WEAKNESS' | 'PROCESS_INEFFICIENCY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  framework: string;
  controlId: string;
  evidence: string[];
  discoveredAt: Date;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ACCEPTED_RISK';
}

export interface RegulatoryReport {
  id: string;
  type: string;
  framework: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  content: string;
  attachments: string[];
  signature: string;
  submittedAt: Date;
  status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
}

export interface AuditSchedule {
  id: string;
  name: string;
  framework: string;
  frequency: string;
  nextExecution: Date;
  scope: string;
  auditor: string;
  automated: boolean;
  notifications: string[];
}

export interface RiskAssessment {
  id: string;
  scope: string;
  methodology: string;
  riskAppetite: string;
  timeHorizon: string;
  risks: Risk[];
  overallRiskScore: number;
  recommendations: string[];
  assessedAt: Date;
  assessedBy: string;
}

export interface Risk {
  id: string;
  category: string;
  description: string;
  probability: number;
  impact: number;
  riskScore: number;
  controls: string[];
  mitigations: string[];
  owner: string;
  status: 'OPEN' | 'MITIGATED' | 'ACCEPTED' | 'TRANSFERRED';
}

export interface ComplianceGap {
  id: string;
  framework: string;
  requirement: string;
  currentState: string;
  requiredState: string;
  gap: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedEffort: number;
  estimatedCost: number;
  owner: string;
  targetDate: Date;
}

export interface RemediationPlan {
  id: string;
  name: string;
  findings: AuditFinding[];
  actions: RemediationAction[];
  timeline: number;
  resources: Resource[];
  successMetrics: string[];
  owner: string;
  status: 'DRAFT' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface RemediationAction {
  id: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  owner: string;
  estimatedEffort: number;
  dependencies: string[];
  startDate: Date;
  dueDate: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
}

export interface Resource {
  type: 'HUMAN' | 'FINANCIAL' | 'TECHNICAL' | 'EXTERNAL';
  description: string;
  quantity: number;
  cost: number;
  availability: string;
}

export interface AuditAlert {
  id: string;
  type: 'COMPLIANCE_VIOLATION' | 'AUDIT_DUE' | 'FINDING_OVERDUE' | 'THRESHOLD_BREACH';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  details: Record<string, unknown>;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
}

export interface ComplianceScore {
  framework: string;
  overallScore: number;
  categoryScores: Record<string, number>;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  lastCalculated: Date;
  benchmarkComparison: number;
}

export interface ComplianceMetrics {
  totalControls: number;
  compliantControls: number;
  nonCompliantControls: number;
  partiallyCompliantControls: number;
  compliancePercentage: number;
  riskScore: number;
  findingsCount: number;
  criticalFindings: number;
  remediationRate: number;
}

export interface TrendDataPoint {
  timestamp: Date;
  complianceScore: number;
  riskScore: number;
  findingsCount: number;
}

export interface AuditAction {
  type: string;
  details: unknown;
}

export interface Transaction {
  userId: string;
  amount: number;
  token: string;
  destination: string;
}

export interface SimpleComplianceCheck {
  compliant: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    reason?: string;
  }>;
}

export interface ComplianceReport {
  period: {
    start: Date;
    end: Date;
  };
  statistics: {
    totalTransactions: number;
    compliantTransactions: number;
    nonCompliantTransactions: number;
    complianceRate: number;
  };
  violations: Array<{
    userId: string;
    timestamp: Date;
    details: unknown;
    violations: Array<{
      name: string;
      passed: boolean;
      reason?: string;
    }>;
  }>;
}

export { EventEmitter };
