/**
 * Type definitions for CRYSTALS-Dilithium Post-Quantum Digital Signature Scheme
 */

/**
 * CRYSTALS-Dilithium security levels as defined by NIST
 */
export enum DilithiumSecurityLevel {
  NIST_2 = 'NIST_2', // Level 2 (128-bit classical security)
  NIST_3 = 'NIST_3', // Level 3 (192-bit classical security)
  NIST_5 = 'NIST_5'  // Level 5 (256-bit classical security)
}

export interface DilithiumParameters {
  k: number;           // Vector/matrix dimension
  l: number;           // Vector/matrix dimension
  eta: number;         // Coefficient sampling range
  gamma1: number;      // Parameter γ₁
  gamma2: number;      // Parameter γ₂
  tau: number;         // Number of ones in challenge
  beta: number;        // Rejection threshold
  omega: number;       // Number of ones in hint vector
}

/**
 * Public key components
 */
export interface DilithiumPublicKey {
  rho: Buffer;      // Seed for matrix A
  t1: Buffer;       // High bits of t
}

/**
 * Private key components
 */
export interface DilithiumPrivateKey {
  rho: Buffer;      // Seed for matrix A
  key: Buffer;      // Secret key for randomness generation
  tr: Buffer;       // Hash of (rho, t1)
  s1: Buffer;       // First secret vector
  s2: Buffer;       // Second secret vector
  t0: Buffer;       // Low bits of t
}

/**
 * Key pair containing both public and private components
 */
export interface DilithiumKeyPair {
  publicKey: DilithiumPublicKey;
  privateKey: DilithiumPrivateKey;
}

/**
 * Signature components
 */
export interface DilithiumSignature {
  z: Buffer;        // First signature component
  h: Buffer;        // Second signature component
  c: Buffer;        // Challenge
}

// Polynomial types
export type Polynomial = number[];  // Array of coefficients

export type PolynomialVector = Polynomial[];  // Vector of polynomials

export type PolynomialMatrix = PolynomialVector[];  // Matrix of polynomials

export type NTTForm = PolynomialVector;  // Polynomial vector in NTT domain

export interface DilithiumStats {
  totalSignatures: number;
  validSignatures: number;
  averageSignTime: number;
  averageVerifyTime: number;
  signatureSizeStats: {
    min: number;
    max: number;
    average: number;
  };
  securityMetrics: {
    estimatedClassicalBits: number;
    estimatedQuantumBits: number;
    nistLevel: number;
  };
  performanceMetrics: {
    keyGenTime: number;
    signatureSize: number;
    publicKeySize: number;
    privateKeySize: number;
    memoryUsage: number;
  };
}

export interface DilithiumError extends Error {
  code: 'INVALID_SIGNATURE' | 'INVALID_KEY' | 'PARAMETER_ERROR' | 'SYSTEM_ERROR';
  details: {
    operation: 'KEYGEN' | 'SIGN' | 'VERIFY';
    securityLevel: DilithiumSecurityLevel;
    errorData?: any;
  };
}

export interface DilithiumSecurityProof {
  type: 'EUF-CMA';  // Existential Unforgeability under Chosen Message Attack
  assumptions: string[];
  reductionCost: {
    time: number;
    space: number;
    queries: number;
  };
  securityBits: {
    classical: number;
    quantum: number;
  };
  proofReference: string;
}

export interface DilithiumBenchmark {
  implementation: string;
  platform: {
    cpu: string;
    memory: string;
    compiler: string;
    optimizations: string[];
  };
  measurements: {
    keyGen: {
      averageTime: number;
      standardDeviation: number;
      samples: number;
    };
    sign: {
      averageTime: number;
      standardDeviation: number;
      samples: number;
    };
    verify: {
      averageTime: number;
      standardDeviation: number;
      samples: number;
    };
  };
  memoryUsage: {
    keyGen: number;
    sign: number;
    verify: number;
  };
}

export interface DilithiumValidationResult {
  valid: boolean;
  signatureSize: number;
  publicKeySize: number;
  privateKeySize: number;
  securityLevel: DilithiumSecurityLevel;
  validationChecks: {
    parameterSet: boolean;
    keyPairConsistency: boolean;
    signatureVerification: boolean;
    sizeRequirements: boolean;
    securityRequirements: boolean;
  };
  recommendations?: string[];
}

export interface DilithiumTestVector {
  seed: Buffer;
  message: Buffer;
  securityLevel: DilithiumSecurityLevel;
  keyPair: DilithiumKeyPair;
  signature: DilithiumSignature;
  intermediateValues: {
    expandedA: PolynomialMatrix;
    y: PolynomialVector;
    w: PolynomialVector;
    w1: PolynomialVector;
    c: number;
    z: PolynomialVector;
    h: Buffer;
  };
} 