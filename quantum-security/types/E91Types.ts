/**
 * Type definitions for E91 Entanglement-Based Quantum Key Distribution Protocol
 */

export enum E91Basis {
  Zero = 0,           // 0 radians
  PiOverFour = Math.PI/4,    // π/4 radians
  PiOverTwo = Math.PI/2,     // π/2 radians
  ThreePiOverFour = 3*Math.PI/4  // 3π/4 radians
}

export interface E91State {
  entangledPair: [number, number];  // Two-qubit state
  basis: E91Basis;                  // Measurement basis
}

export interface E91Measurement {
  basis: number;     // Measurement angle in radians
  result: number;    // Measurement result (0 or 1)
  timestamp: Date;   // Measurement time
}

export interface BellState {
  type: number;      // Bell state type (0-3)
  isEntangled: boolean;
  fidelity: number;  // State fidelity (0-1)
}

export interface CHSHResult {
  value: number;     // CHSH inequality value
  correlations: {    // Measurement correlations
    [key: string]: number;
  };
  counts: {          // Measurement counts
    [key: string]: number;
  };
  violatesInequality: boolean;
}

export interface E91Session {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'INITIALIZING' | 'GENERATING_PAIRS' | 'MEASURING' | 'RECONCILING' | 'TESTING_CHSH' | 'ERROR_CORRECTION' | 'PRIVACY_AMPLIFICATION' | 'COMPLETED' | 'FAILED';
  participants: {
    alice: string;  // Sender ID
    bob: string;    // Receiver ID
  };
  parameters: {
    pairCount: number;
    errorThreshold: number;
    chshThreshold: number;
    privacyAmplificationConfig: PrivacyAmplificationConfig;
    errorCorrectionConfig: ErrorCorrectionConfig;
  };
}

export interface E91Result {
  sessionId: string;
  success: boolean;
  finalKey: number[];
  keyLength: number;
  chshValue: number;
  quantumBitErrorRate: number;
  bitsLeaked: number;
  entanglementQuality: {
    averageFidelity: number;
    bellInequalityViolation: number;
    localityLoopholeClosed: boolean;
  };
  siftingRatio: number;
  privacyAmplificationRatio: number;
  securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'MAXIMUM';
  timestamp: Date;
}

export interface PrivacyAmplificationConfig {
  hashFunction: string;         // e.g., 'sha3-256'
  sacrificialBits: number;     // Number of bits to sacrifice for privacy
  minEntropyThreshold: number; // Minimum entropy requirement
}

export interface ErrorCorrectionConfig {
  syndrome: 'ldpc' | 'turbo' | 'polar'; // Error correction code type
  cascadeIterations: number;            // Number of CASCADE protocol iterations
  blockSize: number;                    // Initial block size for error correction
}

export interface E91Statistics {
  totalSessions: number;
  successfulSessions: number;
  averageKeyLength: number;
  averageQBER: number;
  averageCHSHValue: number;
  averageSiftingRatio: number;
  averagePrivacyAmplificationRatio: number;
  securityLevelDistribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    MAXIMUM: number;
  };
  timeStats: {
    averageSessionDuration: number;
    minSessionDuration: number;
    maxSessionDuration: number;
  };
}

export interface E91Error extends Error {
  code: 'LOW_CHSH_VALUE' | 'HIGH_ERROR_RATE' | 'INSUFFICIENT_ENTROPY' | 'PROTOCOL_TIMEOUT' | 'SYSTEM_ERROR';
  sessionId: string;
  phase: E91Session['status'];
  details: {
    chshValue?: number;
    errorRate?: number;
    entropy?: number;
    timeoutDuration?: number;
    systemError?: string;
  };
}

export interface E91SecurityProof {
  type: 'UNCONDITIONAL' | 'COMPUTATIONAL';
  assumptions: string[];
  securityParameters: {
    minPairCount: number;
    maxErrorRate: number;
    minCHSHValue: number;
    minEntropy: number;
    statisticalDistance: number;
  };
  proofReference: string;
  validityConditions: string[];
}

export interface E91Channel {
  type: 'OPTICAL_FIBER' | 'FREE_SPACE' | 'SATELLITE';
  characteristics: {
    loss: number;              // dB/km
    errorRate: number;         // Base error rate
    maxDistance: number;       // km
    wavelength: number;        // nm
    coherenceTime: number;     // ns
    entanglementFidelity: number;
  };
  environmentalFactors: {
    temperature: number;       // Kelvin
    humidity: number;         // %
    vibration: number;       // Hz
    backgroundNoise: number; // photons/s
  };
}

export interface E91Hardware {
  entanglementSource: {
    type: 'SPDC' | 'QUANTUM_DOT' | 'ATOMIC_ENSEMBLE';
    pairRate: number;
    fidelity: number;
    wavelength: number;
  };
  detector: {
    type: 'APD' | 'SNSPD' | 'TES';
    efficiency: number;
    darkCount: number;
    deadTime: number;
    timing: number;
  };
  opticalSystem: {
    loss: number;
    stability: number;
    alignment: number;
  };
}

export interface E91Performance {
  keyGenerationRate: number;    // bits/s
  quantumBitErrorRate: number;  // %
  chshViolation: number;       // > 2
  secureKeyRate: number;       // bits/s
  systemEfficiency: number;     // %
  resourceUsage: {
    cpu: number;               // %
    memory: number;           // MB
    bandwidth: number;        // bits/s
  };
  reliability: {
    uptime: number;           // %
    mtbf: number;            // hours
    mttf: number;           // hours
  };
} 