// ============================================================================
// ADVANCED SECURITY FRAMEWORK - TYPE DEFINITIONS
// ============================================================================

export interface SecurityConfig {
  enablePostQuantumCrypto: boolean;
  enableBiometricAuth: boolean;
  enableThreatDetection: boolean;
  enableRealTimeMonitoring: boolean;
  encryptionLevel: 'STANDARD' | 'HIGH' | 'MILITARY_GRADE';
  auditingLevel: 'BASIC' | 'STANDARD' | 'COMPREHENSIVE';
  complianceFrameworks: string[];
  quantumResistanceLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'MAXIMUM';
  threatIntelligenceFeeds: string[];
  maxThreatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  incidentResponseEnabled: boolean;

  // Added for AdvancedSecurityFramework compatibility
  passwordPolicy: {
    minLength: number;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    requireUppercase: boolean;
    maxAge: number;
  };
  sessionTimeout: number;
  auditLogRetention: number;
  rateLimiting: {
    maxAttempts: number;
    timeWindow: number;
    blockDuration: number;
  };
  authenticationMethods: string[];
  encryptionAlgorithms: string[];
}

export enum ThreatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum AuthenticationMethod {
  PASSWORD = 'PASSWORD',
  BIOMETRIC_FACIAL = 'BIOMETRIC_FACIAL',
  BIOMETRIC_FINGERPRINT = 'BIOMETRIC_FINGERPRINT',
  HARDWARE_TOKEN = 'HARDWARE_TOKEN',
  BEHAVIORAL_ANALYSIS = 'BEHAVIORAL_ANALYSIS',
  ZERO_KNOWLEDGE_PROOF = 'ZERO_KNOWLEDGE_PROOF',
  QUANTUM_SIGNATURE = 'QUANTUM_SIGNATURE'
}

export enum EncryptionAlgorithm {
  AES_256_GCM = 'AES_256_GCM',
  CRYSTALS_KYBER = 'CRYSTALS_KYBER',
  CRYSTALS_KYBER_AES256 = 'CRYSTALS_KYBER_AES256',
  CRYSTALS_DILITHIUM = 'CRYSTALS_DILITHIUM',
  FALCON = 'FALCON',
  SPHINCS_PLUS = 'SPHINCS_PLUS'
}

// Post-Quantum Cryptography Types
export interface PostQuantumCryptoConfig {
  enabled: boolean;
  algorithms: string[];
  keySize: number;
  quantumResistanceLevel: string;
}

export interface QuantumKeyExchangeRequest {
  algorithm: string;
  keySize: number;
  participantId: string;
  sessionId: string;
}

export interface QuantumKeyExchangeResult {
  success: boolean;
  sessionKey: string;
  algorithm: string;
  quantumResistant: boolean;
  keyStrength: number;
}

export interface EncryptionRequest {
  data: string;
  algorithm: string;
  compressionEnabled: boolean;
  integrityCheckEnabled: boolean;
}

export interface EncryptionResult {
  success: boolean;
  encryptedData: string;
  algorithm: string;
  sessionKey: string;
  integrityHash: string;
}

export interface DecryptionRequest {
  encryptedData: string;
  algorithm: string;
  sessionKey: string;
  integrityHash: string;
}

export interface DecryptionResult {
  success: boolean;
  decryptedData: string;
  integrityVerified: boolean;
}

export interface QuantumSignatureRequest {
  message: string;
  algorithm: string;
  signerIdentity: string;
  timestamp: number;
}

export interface QuantumSignatureResult {
  success: boolean;
  signature: string;
  algorithm: string;
  publicKey: string;
  quantumResistant: boolean;
}

export interface QuantumSignatureVerificationRequest {
  message: string;
  signature: string;
  publicKey: string;
  algorithm: string;
}

export interface QuantumSignatureVerificationResult {
  valid: boolean;
  trusted: boolean;
  quantumSafe: boolean;
}

// Authentication Types
export interface AuthenticationFactor {
  type: string;
  biometricData?: string;
  quality?: number;
  tokenValue?: string;
  deviceId?: string;
  behaviorPattern?: string;
  confidenceScore?: number;
}

export interface SessionContext {
  ipAddress: string;
  userAgent: string;
  geolocation: string;
  riskScore: number;
}

export interface MultiFactorAuthRequest {
  userId: string;
  methods: AuthenticationFactor[];
  sessionContext: SessionContext;
}

export interface MultiFactorAuthResult {
  success: boolean;
  authLevel: string;
  sessionToken: string;
  sessionExpiry: number;
  authFactorsVerified: number;
  biometricConfidence?: number;
}

export interface ZeroKnowledgeAuthRequest {
  userId: string;
  challenge: string;
  proofType: string;
  quantumSafe: boolean;
}

export interface ZeroKnowledgeAuthResult {
  success: boolean;
  proofVerified: boolean;
  quantumResistant: boolean;
  privacyPreserving: boolean;
  sessionEstablished: boolean;
  authToken: string;
}

export interface AccessRequest {
  resource: string;
  operation: string;
  sensitivityLevel: string;
}

export interface ContextFactors {
  timeOfAccess: number;
  locationAnomaly: boolean;
  deviceFingerprint: string;
  networkTrustLevel: number;
  userBehaviorScore: number;
  threatIntelligenceScore: number;
}

export interface RiskBasedAuthRequest {
  userId: string;
  accessRequest: AccessRequest;
  contextFactors: ContextFactors;
}

export interface RiskBasedAuthResult {
  riskScore: number;
  authenticationRequired: string;
  additionalVerificationNeeded: boolean;
  accessGranted: boolean;
  monitoringLevel: string;
}

export interface RoleBasedAccessRequest {
  userId: string;
  roles: string[];
  requestedAction: {
    resource: string;
    operation: string;
    target: string;
  };
  sessionContext: {
    authLevel: string;
    sessionAge: number;
    quantumSecured: boolean;
  };
}

export interface RoleBasedAccessResult {
  accessGranted: boolean;
  permissionLevel: string;
  auditRequired: boolean;
  quantumSecured: boolean;
  roles: string[];
  sessionValid: boolean;
}

// Threat Detection Types
export interface ThreatEventData {
  sourceIP: string;
  targetResource: string;
  requestPattern: string;
  payloadAnalysis: string;
  userAgent: string;
  timestamp: number;
}

export interface ThreatDetectionRequest {
  eventData: ThreatEventData;
  analysisDepth: string;
}

export interface ThreatDetectionResult {
  threatDetected: boolean;
  threatLevel: string;
  threatType: string;
  confidence: number;
  mitigationRecommended: boolean;
  automaticResponseTriggered: boolean;
  affectedSystems: string[];
}

export interface ActivityRecord {
  action: string;
  timestamp: number;
  location: string;
  deviceId: string;
}

export interface BaselineProfile {
  typicalLocations: string[];
  typicalDevices: string[];
  normalActivityPattern: string;
  riskTolerance: number;
}

export interface BehavioralAnalysisRequest {
  userId: string;
  activityWindow: number;
  activities: ActivityRecord[];
  baselineProfile: BaselineProfile;
}

export interface BehavioralAnalysisResult {
  anomaliesDetected: boolean;
  anomalyCount: number;
  riskScore: number;
  recommendedAction: string;
  anomalyTypes: string[];
}

export interface ThreatIntelligenceRequest {
  sources: string[];
  threatTypes: string[];
  timeRange: number;
  severity: string;
}

export interface ThreatIntelligenceResult {
  threats: ThreatIntelligence[];
  lastUpdated: Date;
  sourcesActive: string[];
  quantumThreatsDetected: number;
  recommendedMitigations: string[];
}

export interface SecurityIncident {
  id: string;
  type: string;
  severity: string;
  affectedSystems: string[];
  attackVector: string;
  discoveryTime: number;
  evidence: string[];
}

export interface IncidentResponseRequest {
  incident: SecurityIncident;
  responseLevel: string;
  containmentRequired: boolean;
  forensicsRequired: boolean;
}

export interface IncidentResponseResult {
  responseInitiated: boolean;
  containmentStatus: string;
  forensicsStarted: boolean;
  notificationsSent: boolean;
  systemsIsolated: string[];
  recoveryPlan: string;
  estimatedRecoveryTime: number;
}

// Security Monitoring Types
export interface SecurityDashboard {
  overallSecurityScore: number;
  activeThreats: number;
  criticalVulnerabilities: number;
  complianceStatus: string;
  quantumReadiness: number;
  authenticationMetrics: AuthenticationMetrics;
  encryptionCoverage: number;
  lastSecurityScan: Date;
}

export interface AuthenticationMetrics {
  successRate: number;
  averageAuthTime: number;
  mfaAdoption: number;
  biometricAccuracy: number;
}

export interface VulnerabilityAssessmentRequest {
  scope: string;
  includeQuantumVulnerabilities: boolean;
  scanDepth: string;
  complianceFrameworks: string[];
}

export interface VulnerabilityAssessmentResult {
  scanCompleted: boolean;
  vulnerabilitiesFound: SecurityVulnerability[];
  riskScore: number;
  quantumVulnerabilities: number;
  complianceGaps: string[];
  remediationPlan: string;
  priorityActions: string[];
}

export interface ComplianceReportRequest {
  frameworks: string[];
  reportingPeriod: {
    startDate: Date;
    endDate: Date;
  };
  includeEvidence: boolean;
  includeRecommendations: boolean;
}

export interface ComplianceReportResult {
  reportGenerated: boolean;
  frameworks: string[];
  overallComplianceScore: number;
  criticalFindings: string[];
  evidenceCollected: boolean;
  remediationTimeline: string;
}

export interface SecurityMetricsRequest {
  timeRange: number;
  includeQuantumMetrics: boolean;
  includeBenchmarking: boolean;
}

export interface SecurityMetricsResult {
  timeToDetectThreats: number;
  timeToRespondIncidents: number;
  falsePositiveRate: number;
  quantumReadinessScore: number;
  authenticationSuccessRate: number;
  encryptionEffectiveness: number;
  complianceAdherence: number;
  benchmarkComparison: any;
}

// Performance Testing Types
export interface SecurityLoadTestRequest {
  concurrentUsers: number;
  operationsPerUser: number;
  testDuration: number;
  operations: string[];
}

export interface SecurityLoadTestResult {
  testCompleted: boolean;
  averageResponseTime: number;
  successRate: number;
  throughput: number;
  securityIntegrityMaintained: boolean;
  quantumSafetyPreserved: boolean;
}

// Base Security Types
export interface SecurityEvent {
  id: string;
  type: string;
  severity: ThreatLevel;
  timestamp: Date;
  source: string;
  target: string;
  details: Record<string, any>;
}

export interface SecurityVulnerability {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedComponent: string;
  description: string;
  remediation: string;
  discoveredAt: Date;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityRule[];
  enforcementLevel: 'ADVISORY' | 'MANDATORY';
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityRule {
  condition: string;
  action: 'ALLOW' | 'DENY' | 'MONITOR' | 'ESCALATE';
  parameters: Record<string, any>;
}

export interface BiometricAuthConfig {
  enabled: boolean;
  modalities: string[];
  accuracyThreshold: number;
  antiSpoofingEnabled: boolean;
  templateEncryption: boolean;
}

export interface SecurityAuditResult {
  auditId: string;
  timestamp: Date;
  scope: string;
  findings: SecurityFinding[];
  riskScore: number;
  recommendations: string[];
  nextAuditDate: Date;
}

export interface SecurityFinding {
  category: string;
  severity: ThreatLevel;
  description: string;
  evidence: string[];
  recommendation: string;
}

export interface ThreatIntelligence {
  threatId: string;
  type: string;
  severity: ThreatLevel;
  indicators: string[];
  attribution: string;
  mitigations: string[];
  updatedAt: Date;
}

export interface SecurityMetrics {
  timestamp: Date;
  availability: number;
  confidentiality: number;
  integrity: number;
  authentication: number;
  authorization: number;
  nonRepudiation: number;
  accountability: number;
}

export interface IncidentResponse {
  incidentId: string;
  status: 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED';
  severity: ThreatLevel;
  assignee: string;
  timeline: IncidentTimeline[];
  actions: IncidentAction[];
}

export interface IncidentTimeline {
  timestamp: Date;
  event: string;
  actor: string;
  details: string;
}

export interface IncidentAction {
  action: string;
  timestamp: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  result?: string;
}

export interface SecurityCompliance {
  framework: string;
  version: string;
  compliance: number; // 0-1
  controls: ComplianceControl[];
  lastAssessment: Date;
  nextAssessment: Date;
}

export interface ComplianceControl {
  controlId: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIALLY_COMPLIANT';
  evidence: string[];
  gaps: string[];
  remediation?: string;
}

/**
 * Security Framework Types
 */

export type SecurityRole = 'ADMIN' | 'USER' | 'AUDITOR' | 'OPERATOR';

export type SecurityPermission = 'READ' | 'WRITE' | 'DELETE' | 'EXECUTE' | 'AUDIT';

export interface SecurityContext {
  userId: string;
  roles: SecurityRole[];
  permissions: SecurityPermission[];
  metadata: {
    [key: string]: any;
  };
}

// Rename duplicate SecurityEvent interface to UserSecurityEvent
export interface UserSecurityEvent {
  type: string;
  userId: string;
  success: boolean;
  timestamp?: Date;
  metadata?: {
    ip?: string;
    userAgent?: string;
    location?: string;
    deviceId?: string;
    [key: string]: any;
  };
}

export interface AuditLogFilter {
  type?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
}

export interface EncryptionResult {
  data: string;
  algorithm: string;
  iv?: string;
  tag?: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface SecurityError extends Error {
  code: string;
  context?: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: Date;
  metadata?: {
    [key: string]: any;
  };
}

// Rename duplicate SecurityMetrics interface to AuthenticationSecurityMetrics
export interface AuthenticationSecurityMetrics {
  authenticationAttempts: number;
  successfulLogins: number;
  failedLogins: number;
  activeUsers: number;
  averageResponseTime: number;
  securityIncidents: number;
  lastIncidentDate?: Date;
}

export interface RateLimitInfo {
  attempts: number;
  firstAttempt: Date;
  lastAttempt: Date;
  blocked: boolean;
  blockExpiry?: Date;
}
