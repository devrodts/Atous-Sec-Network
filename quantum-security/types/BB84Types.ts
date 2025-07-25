/**
 * Type definitions for BB84 Quantum Key Distribution Protocol
 */

export enum BB84Basis {
  Rectilinear = 'RECTILINEAR', // |0⟩, |1⟩ basis
  Diagonal = 'DIAGONAL'         // |+⟩, |-⟩ basis
}

export interface BB84State {
  bit: number;        // 0 or 1
  basis: BB84Basis;  // Preparation basis
}

export interface BB84Measurement {
  basis: BB84Basis;  // Measurement basis
  result: number;    // Measured bit value
}

export interface BB84Session {
  sessionId: string;
  aliceStates: BB84State[];
  bobMeasurements: BB84Measurement[];
  siftedKey: number[];
  errorRate: number;
  finalKey: number[];
}

export interface BB84Result {
  sessionId: string;
  success: boolean;
  finalKey: number[];
  keyLength: number;
  quantumBitErrorRate: number;
  bitsLeaked: number;
  siftingRatio: number;
  privacyAmplificationRatio: number;
  securityLevel: string;
  timestamp: Date;
}

export interface PrivacyAmplificationConfig {
  hashFunction: string;         // e.g., 'sha3-256'
  sacrificialBits: number;     // Number of bits to sacrifice for privacy
  minEntropyThreshold: number; // Minimum entropy requirement
}

export interface ErrorCorrectionConfig {
  syndrome: string;
  cascadeIterations: number;
  blockSize: number;
}

export interface BB84Statistics {
  totalSessions: number;
  successfulSessions: number;
  averageKeyLength: number;
  averageQBER: number;
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

export interface BB84Error extends Error {
  code: 'HIGH_ERROR_RATE' | 'INSUFFICIENT_ENTROPY' | 'EAVESDROPPING_DETECTED' | 'PROTOCOL_TIMEOUT' | 'SYSTEM_ERROR';
  sessionId: string;
  phase: BB84Session['status'];
  details: {
    errorRate?: number;
    entropy?: number;
    timeoutDuration?: number;
    systemError?: string;
  };
}

export interface BB84SecurityProof {
  type: 'UNCONDITIONAL' | 'COMPUTATIONAL';
  assumptions: string[];
  securityParameters: {
    minKeyLength: number;
    maxErrorRate: number;
    minEntropy: number;
    statisticalDistance: number;
  };
  proofReference: string;
  validityConditions: string[];
}

export interface BB84Channel {
  type: 'OPTICAL_FIBER' | 'FREE_SPACE' | 'SATELLITE';
  characteristics: {
    loss: number;              // dB/km
    errorRate: number;         // Base error rate
    maxDistance: number;       // km
    wavelength: number;        // nm
    coherenceTime: number;     // ns
    polarizationStability: number;
  };
  environmentalFactors: {
    temperature: number;       // Kelvin
    humidity: number;         // %
    vibration: number;       // Hz
    backgroundNoise: number; // photons/s
  };
}

export interface BB84Hardware {
  photonSource: {
    type: 'LASER' | 'SPDC' | 'QUANTUM_DOT';
    wavelength: number;
    pulseRate: number;
    meanPhotonNumber: number;
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

export interface BB84Performance {
  keyGenerationRate: number;    // bits/s
  quantumBitErrorRate: number;  // %
  secureKeyRate: number;        // bits/s
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