// ============================================================================
// QUANTUM-RESISTANT SECURITY SYSTEM - TYPE DEFINITIONS
// ============================================================================

export interface QuantumSecurityConfig {
  enableQuantumKeyDistribution: boolean;
  enableQuantumSafeContracts: boolean;
  enableQuantumThreatDetection: boolean;
  enableQuantumRandomGeneration: boolean;
  quantumSecurityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'MAXIMUM';
  quantumProtocols: string[];
  postQuantumAlgorithms: string[];
  quantumKeyRefreshInterval: number;
  quantumEntropySource: string;
  quantumAuditingEnabled: boolean;
  quantumComplianceFrameworks: string[];
  distributedQuantumNodes: number;
  quantumNetworkTopology: 'POINT_TO_POINT' | 'STAR' | 'MESH' | 'RING';
  quantumErrorCorrection: boolean;
  quantumSecureBootstrap: boolean;
}

// Quantum Key Distribution Types
export interface QuantumKeyDistributionRequest {
  protocol: 'BB84' | 'E91' | 'SARG04' | 'COW' | 'DPS';
  participants: string[];
  keyLength: number;
  securityLevel: string;
  errorCorrectionEnabled?: boolean;
  privacyAmplificationEnabled?: boolean;
  authenticationRequired?: boolean;
  entanglementSource?: string;
  bellTestEnabled?: boolean;
  localityLoopholeClosing?: boolean;
  detectionEfficiency?: number;
}

export interface QuantumKeyDistributionResult {
  sessionId: string;
  protocol: string;
  keyEstablished: boolean;
  keyLength: number;
  securityLevel: string;
  quantumBitErrorRate: number;
  informationLeakage: number;
  privacyAmplificationRatio: number;
  finalKeyRate: number;
  entanglementVerified?: boolean;
  bellViolationS?: number;
  quantumCorrelations?: number;
  eavesdroppingDetected?: boolean;
  localityLoopholeClosed?: boolean;
  securityProof?: string;
  sessionStartTime: Date;
  estimatedSessionDuration: number;
}

export interface QuantumEavesdroppingSimulation {
  protocol: string;
  eavesdropperStrategy: string;
  eavesdropperCapability: string;
  detectionSensitivity: number;
}

export interface QuantumEavesdroppingResult {
  eavesdroppingDetected: boolean;
  securityBreach: boolean;
  estimatedInformationLeakage: number;
  responseAction: string;
  alternativeProtocolSuggested: string;
  quantumAdvantagePreserved: boolean;
  detectionConfidence: number;
}

export interface QuantumKeyLifecycleRequest {
  sessionIds: string[];
  renewalPolicy: 'TIME_BASED' | 'USAGE_BASED' | 'THREAT_BASED';
  renewalInterval: number;
  keyEscrowEnabled: boolean;
  forwardSecrecy: boolean;
  quantumMemoryProtection: boolean;
}

export interface QuantumKeyLifecycleResult {
  activeKeys: number;
  expiredKeys: number;
  renewedKeys: number;
  forwardSecrecyMaintained: boolean;
  quantumMemorySecure: boolean;
  keyEscrowStatus: string;
  nextRenewalTime: Date;
  lifecycleCompliance: boolean;
}

// Quantum-Safe Smart Contracts Types
export interface QuantumSafeContractRequest {
  contractCode: string;
  quantumSignatureScheme: string;
  quantumHashFunction: string;
  quantumProofSystem: string;
  quantumRandomness: string;
  postQuantumEncryption: string;
  upgradeability: string;
  auditRequired: boolean;
}

export interface QuantumSafeContractResult {
  contractAddress: string;
  quantumSafe: boolean;
  signatureScheme: string;
  hashFunction: string;
  proofSystem: string;
  encryptionScheme: string;
  quantumResistanceLevel: string;
  auditCompleted: boolean;
  upgradeabilityVerified: boolean;
  deploymentHash: string;
  gasUsed: number;
}

export interface QuantumSafeTransactionRequest {
  contractAddress: string;
  functionName: string;
  parameters: Record<string, any>;
  quantumAuthentication: boolean;
  quantumNonRepudiation: boolean;
  quantumPrivacy: string;
}

export interface QuantumSafeTransactionResult {
  transactionHash: string;
  quantumAuthenticated: boolean;
  quantumSignatureValid: boolean;
  quantumProofVerified: boolean;
  quantumPrivacyPreserved: boolean;
  postQuantumSecure: boolean;
  executionSuccessful: boolean;
  gasUsed: number;
  quantumGasUsed: number;
}

export interface QuantumSafeStateTransitionRequest {
  contractAddress: string;
  previousState: string;
  newState: string;
  transition: string;
  quantumProof: string;
  witnessData: string;
}

export interface QuantumSafeStateTransitionResult {
  transitionValid: boolean;
  quantumProofValid: boolean;
  stateConsistency: string;
  quantumIntegrity: boolean;
  consensusReached: boolean;
  quantumFinality: boolean;
  rollbackRisk: string;
  finalityTimestamp: Date;
}

export interface QuantumContractUpgradeRequest {
  contractAddress: string;
  newImplementation: string;
  upgradeType: string;
  migrationRequired: boolean;
  quantumCompatibilityCheck: boolean;
  rollbackCapability: boolean;
}

export interface QuantumContractUpgradeResult {
  upgradeSuccessful: boolean;
  quantumCompatibilityVerified: boolean;
  migrationCompleted: boolean;
  rollbackCapabilityPreserved: boolean;
  quantumSecurityMaintained: boolean;
  newContractAddress: string;
  upgradeAuditPassed: boolean;
  migrationGasUsed: number;
}

// Quantum Threat Detection Types
export interface QuantumThreatDetectionRequest {
  scanScope: string;
  threatTypes: string[];
  detectionSensitivity: string;
  realTimeMonitoring: boolean;
  quantumSignatureAnalysis: boolean;
  quantumBehaviorProfiling: boolean;
}

export interface QuantumThreatDetectionResult {
  scanCompleted: boolean;
  threatsDetected: number;
  quantumSignatures: string[];
  riskLevel: string;
  mitigationRecommendations: string[];
  quantumResistanceLevel: number;
  realTimeProtectionActive: boolean;
  scanDuration: number;
}

export interface CryptographicVulnerabilityAnalysisRequest {
  algorithms: string[];
  quantumComputerModels: string[];
  timeHorizon: string;
  includeGroverAnalysis: boolean;
  includeShorAnalysis: boolean;
  includeQuantumMemoryAttacks: boolean;
}

export interface CryptographicVulnerabilityAnalysisResult {
  algorithmsAnalyzed: number;
  quantumVulnerable: string[];
  quantumResistant: string[];
  migrationPriority: Record<string, string>;
  timeToBreak: Record<string, number>;
  recommendedReplacements: Record<string, string>;
  riskScore: number;
}

export interface QuantumSupremacyMonitoringRequest {
  trackingMetrics: string[];
  industryBenchmarks: boolean;
  researchTracking: boolean;
  commercialReadiness: boolean;
  cryptographicImpact: boolean;
}

export interface QuantumSupremacyMonitoringResult {
  currentQuantumCapability: QuantumCapabilityMetrics;
  cryptographicThreatLevel: string;
  industryBenchmarks: QuantumBenchmark[];
  projectedMilestones: QuantumMilestone[];
  preparednessScore: number;
  recommendedActions: string[];
  lastUpdated: Date;
}

export interface QuantumCapabilityMetrics {
  qubitCount: number;
  gateFidelity: number;
  coherenceTime: number;
  errorCorrectionCapability: boolean;
  quantumVolumeScore: number;
  cryptographicallyRelevant: boolean;
}

export interface QuantumBenchmark {
  organization: string;
  qubitCount: number;
  quantumVolumeScore: number;
  achievement: string;
  date: Date;
  cryptographicImplications: string;
}

export interface QuantumMilestone {
  description: string;
  estimatedDate: Date;
  probability: number;
  cryptographicImpact: string;
  recommendedPreparation: string[];
}

// Advanced Quantum Cryptographic Protocols Types
export interface QuantumDigitalSignatureRequest {
  message: string;
  signatureScheme: string;
  securityParameter: number;
  quantumRandomness: boolean;
  nonRepudiation: boolean;
  forwardSecurity: boolean;
}

export interface QuantumDigitalSignatureResult {
  signature: string;
  publicKey: string;
  scheme: string;
  securityLevel: number;
  quantumSecure: boolean;
  nonRepudiable: boolean;
  forwardSecure: boolean;
  signatureSize: number;
  generationTime: number;
}

export interface QuantumDigitalSignatureVerificationRequest {
  message: string;
  signature: string;
  publicKey: string;
  scheme: string;
}

export interface QuantumDigitalSignatureVerificationResult {
  valid: boolean;
  quantumSecure: boolean;
  nonRepudiation: boolean;
  verificationTime: number;
  signatureIntegrity: boolean;
}

export interface QuantumSecureMultiPartyComputationRequest {
  parties: string[];
  computation: string;
  inputs: Record<string, string>;
  protocol: string;
  privacyLevel: string;
  quantumAdvantage: boolean;
}

export interface QuantumSecureMultiPartyComputationResult {
  computationCompleted: boolean;
  result: any;
  privacyPreserved: boolean;
  quantumAdvantageAchieved: boolean;
  participantCount: number;
  securityProof: string;
  protocolCompliance: boolean;
  computationTime: number;
}

export interface QuantumRandomNumberGenerationRequest {
  count: number;
  bitLength: number;
  source: string;
  randomnessExtraction: string;
  entropyValidation: boolean;
  statisticalTesting: boolean;
}

export interface QuantumRandomNumberGenerationResult {
  numbers: string[];
  bitLength: number;
  source: string;
  entropyRate: number;
  statisticalTestsPassed: boolean;
  biasDetected: boolean;
  quantumOriginVerified: boolean;
  randomnessExtracted: boolean;
  generationTime: number;
}

export interface QuantumSecureTunnelRequest {
  source: string;
  destination: string;
  protocol: string;
  keyDistribution: string;
  authentication: string;
  encapsulation: string;
  tunnelType: string;
}

export interface QuantumSecureTunnelResult {
  tunnelId: string;
  established: boolean;
  quantumSecured: boolean;
  keyDistributionActive: boolean;
  authenticationVerified: boolean;
  encapsulationSecure: boolean;
  throughput: number;
  latency: number;
  quantumOverhead: number;
}

// Quantum Security Metrics and Compliance Types
export interface QuantumSecurityMetricsRequest {
  timeRange: number;
  includeQKDMetrics: boolean;
  includeContractSecurity: boolean;
  includeThreatDetection: boolean;
  includeComplianceStatus: boolean;
}

export interface QuantumSecurityMetricsResult {
  overallQuantumSecurityScore: number;
  qkdSessions: number;
  quantumContractsDeployed: number;
  quantumThreatsDetected: number;
  postQuantumMigrationProgress: number;
  quantumReadinessLevel: number;
  complianceFrameworks: string[];
  securityIncidents: number;
  lastUpdated: Date;
}

export interface QuantumSecurityAuditRequest {
  auditScope: string;
  includeQKDAnalysis: boolean;
  includeContractSecurity: boolean;
  includeCryptographicAnalysis: boolean;
  includeComplianceCheck: boolean;
  generateReport: boolean;
}

export interface QuantumSecurityAuditResult {
  auditId: string;
  overallScore: number;
  qkdSecurityScore: number;
  contractSecurityScore: number;
  cryptographicScore: number;
  complianceScore: number;
  findings: QuantumSecurityFinding[];
  recommendations: string[];
  reportGenerated: boolean;
  auditDate: Date;
}

export interface QuantumSecurityFinding {
  id: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  quantumThreatLevel: string;
  recommendation: string;
  affectedComponents: string[];
}

export interface QuantumComplianceValidationRequest {
  frameworks: string[];
  validationLevel: string;
  includeEvidence: boolean;
  generateCertificate: boolean;
}

export interface QuantumComplianceValidationResult {
  frameworksValidated: number;
  overallCompliance: number;
  nistPqcCompliance: number;
  etsiQscCompliance: number;
  isoCompliance: number;
  evidenceCollected: boolean;
  certificateGenerated: boolean;
  validUntil: Date;
  complianceGaps: string[];
}

// Performance and Testing Types
export interface QuantumOperationRequest {
  operation: string;
  data: string;
  algorithm: string;
  securityLevel: string;
}

export interface QuantumOperationResult {
  operationId: string;
  success: boolean;
  result: string;
  executionTime: number;
  quantumResourcesUsed: number;
  securityMaintained: boolean;
}

export interface QuantumStressTestRequest {
  concurrentQKDSessions: number;
  quantumContractTransactions: number;
  quantumThreatSimulations: number;
  testDuration: number;
  maintainSecurityLevel: string;
}

export interface QuantumStressTestResult {
  testCompleted: boolean;
  quantumSecurityMaintained: boolean;
  averageQKDTime: number;
  contractThroughput: number;
  threatDetectionAccuracy: number;
  quantumAdvantagePreserved: boolean;
  resourceUtilization: number;
  errorRate: number;
}

// Base Quantum Security Types
export interface QuantumKeyDistribution {
  sessionId: string;
  protocol: string;
  participants: string[];
  keyMaterial: string;
  securityLevel: string;
  establishedAt: Date;
  expiresAt: Date;
  status: 'ESTABLISHING' | 'ACTIVE' | 'EXPIRED' | 'COMPROMISED';
}

export interface QuantumSafeContract {
  address: string;
  name: string;
  quantumAlgorithms: string[];
  securityLevel: string;
  deployedAt: Date;
  lastAudit: Date;
  quantumSafetyVerified: boolean;
}

export interface QuantumThreatDetection {
  id: string;
  threatType: string;
  severity: string;
  detectedAt: Date;
  source: string;
  mitigated: boolean;
  quantumSignature: string;
}

export interface QuantumCryptographicProtocol {
  name: string;
  type: string;
  securityLevel: string;
  quantumSafe: boolean;
  postQuantumReady: boolean;
  standardized: boolean;
}

export interface QuantumRandomNumberGenerator {
  id: string;
  source: string;
  entropyRate: number;
  quantumSource: boolean;
  certified: boolean;
  lastCalibration: Date;
}

export interface QuantumEntanglementState {
  id: string;
  participants: string[];
  fidelity: number;
  coherenceTime: number;
  bellViolation: number;
  established: boolean;
}

export interface QuantumSignatureScheme {
  name: string;
  algorithm: string;
  keySize: number;
  signatureSize: number;
  quantumSafe: boolean;
  standardized: boolean;
}

export interface QuantumHashFunction {
  name: string;
  outputSize: number;
  quantumResistant: boolean;
  collisionResistant: boolean;
  preimageResistant: boolean;
}

export interface QuantumSecureChannel {
  id: string;
  endpoints: string[];
  encryption: string;
  keyDistribution: string;
  authenticated: boolean;
  quantumSecured: boolean;
}

export interface QuantumIdentityVerification {
  id: string;
  identity: string;
  verificationMethod: string;
  quantumProof: string;
  verified: boolean;
  expiresAt: Date;
}

export interface QuantumProofSystem {
  name: string;
  type: 'SNARK' | 'STARK' | 'PLONK' | 'QUANTUM_PROOF';
  quantumSecure: boolean;
  zeroKnowledge: boolean;
  transparent: boolean;
}

export interface QuantumSecurityMetrics {
  timestamp: Date;
  overallScore: number;
  qkdMetrics: QKDMetrics;
  contractMetrics: ContractMetrics;
  threatMetrics: ThreatMetrics;
  complianceMetrics: ComplianceMetrics;
}

export interface QKDMetrics {
  activeSessions: number;
  keyGenerationRate: number;
  quantumBitErrorRate: number;
  eavesdroppingAttempts: number;
  averageSessionDuration: number;
}

export interface ContractMetrics {
  quantumSafeContracts: number;
  totalTransactions: number;
  quantumSignatureVerifications: number;
  proofVerifications: number;
  upgradeEvents: number;
}

export interface ThreatMetrics {
  threatsDetected: number;
  quantumAttacks: number;
  mitigatedThreats: number;
  averageDetectionTime: number;
  falsePositiveRate: number;
}

export interface ComplianceMetrics {
  frameworksCovered: string[];
  complianceScore: number;
  auditsPassed: number;
  certificationsValid: number;
  lastAssessment: Date;
}

export interface QuantumAuditTrail {
  id: string;
  operation: string;
  timestamp: Date;
  actor: string;
  quantumProof: string;
  integrity: boolean;
  immutable: boolean;
}

export interface QuantumComplianceReport {
  id: string;
  framework: string;
  score: number;
  findings: QuantumSecurityFinding[];
  recommendations: string[];
  validUntil: Date;
  certifiedBy: string;
}

/**
 * CRYSTALS-Kyber key pair type
 */
export interface KyberKeyPair {
  publicKey: SecureBuffer;
  privateKey: SecureBuffer;
  securityLevel: 'NIST1' | 'NIST3' | 'NIST5';
}

/**
 * CRYSTALS-Kyber ciphertext type
 */
export interface KyberCiphertext {
  data: SecureBuffer;
  length: number;
  securityLevel: 'NIST1' | 'NIST3' | 'NIST5';
}

/**
 * Secure buffer type that extends Node's Buffer
 */
export class SecureBuffer extends Buffer {
  constructor(input: Buffer | ArrayBuffer | number[]) {
    super(input instanceof Buffer ? input : Buffer.from(input));
    // Add secure memory protections
    this.protect();
  }

  /**
   * Protect memory from being swapped or dumped
   */
  private protect(): void {
    // Lock memory pages (if available)
    if (process.platform === 'linux') {
      try {
        // Use mlock syscall
        const mlock = require('bindings')('mlock');
        mlock.lock(this.buffer);
      } catch (err) {
        console.warn('Failed to lock memory pages:', err);
      }
    }
  }

  /**
   * Securely zero memory before freeing
   */
  destroy(): void {
    this.fill(0);
    if (process.platform === 'linux') {
      try {
        const mlock = require('bindings')('mlock');
        mlock.unlock(this.buffer);
      } catch (err) {
        console.warn('Failed to unlock memory pages:', err);
      }
    }
  }
}
