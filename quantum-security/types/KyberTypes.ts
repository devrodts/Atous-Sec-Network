/**
 * Type definitions for CRYSTALS-Kyber Post-Quantum Key Encapsulation Mechanism
 */

import { SecureBuffer } from '../utils/SecureBuffer';

/**
 * CRYSTALS-Kyber security levels as defined by NIST
 */
export enum KyberSecurityLevel {
  NIST_1 = 'NIST_1', // Kyber-512 (Level 1)
  NIST_3 = 'NIST_3', // Kyber-768 (Level 3)
  NIST_5 = 'NIST_5'  // Kyber-1024 (Level 5)
}

/**
 * CRYSTALS-Kyber key pair
 */
export interface KyberKeyPair {
  publicKey: SecureBuffer;
  privateKey: SecureBuffer;
  securityLevel: KyberSecurityLevel;
}

/**
 * CRYSTALS-Kyber ciphertext
 */
export interface KyberCiphertext {
  data: SecureBuffer;
  length: number;
  securityLevel: KyberSecurityLevel;
}

/**
 * CRYSTALS-Kyber parameters for different security levels
 */
export interface KyberParameters {
  k: number;      // Main parameter
  n: number;      // Ring dimension
  q: number;      // Modulus
  eta: number;    // Noise parameter
  du: number;     // Compression parameter for u
  dv: number;     // Compression parameter for v
  delta: number;  // Rounding parameter
}

/**
 * CRYSTALS-Kyber encapsulation result
 */
export interface KyberEncapsulationResult {
  ciphertext: KyberCiphertext;
  sharedSecret: SecureBuffer;
}

/**
 * CRYSTALS-Kyber decapsulation result
 */
export interface KyberDecapsulationResult {
  sharedSecret: SecureBuffer;
  valid: boolean;
}

/**
 * CRYSTALS-Kyber security proof
 */
export interface KyberSecurityProof {
  type: 'IND-CCA2';  // Indistinguishability under Chosen Ciphertext Attack
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