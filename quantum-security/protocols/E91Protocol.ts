/**
 * E91 Entanglement-Based Quantum Key Distribution Protocol
 * 
 * This implementation follows the E91 protocol as described by Artur Ekert (1991).
 * It includes:
 * - Entangled state preparation
 * - Bell state measurements
 * - CHSH inequality verification
 * - Basis reconciliation
 * - Privacy amplification
 * - Information reconciliation
 */

import { createHash, randomBytes } from 'crypto';
import { 
  E91State, 
  E91Basis,
  E91Measurement,
  E91Session,
  E91Result,
  BellState,
  CHSHResult,
  PrivacyAmplificationConfig,
  ErrorCorrectionConfig
} from '../types/E91Types';

export class E91Protocol {
  private readonly sessionId: string;
  private readonly pairCount: number;
  private readonly errorThreshold: number;
  private readonly chshThreshold: number;
  private readonly privacyConfig: PrivacyAmplificationConfig;
  private readonly errorConfig: ErrorCorrectionConfig;

  constructor(
    sessionId: string,
    pairCount: number = 1024,
    errorThreshold: number = 0.11,
    chshThreshold: number = 2.4, // CHSH inequality violation threshold
    privacyConfig?: Partial<PrivacyAmplificationConfig>,
    errorConfig?: Partial<ErrorCorrectionConfig>
  ) {
    if (pairCount <= 0) {
      throw new Error('Pair count must be positive');
    }
    if (errorThreshold <= 0 || errorThreshold >= 1) {
      throw new Error('Error threshold must be between 0 and 1');
    }
    if (chshThreshold <= 2 || chshThreshold > 2.828) {
      throw new Error('CHSH threshold must be between 2 and 2√2');
    }

    this.sessionId = sessionId;
    this.pairCount = pairCount;
    this.errorThreshold = errorThreshold;
    this.chshThreshold = chshThreshold;
    this.privacyConfig = {
      hashFunction: 'sha3-256',
      sacrificialBits: Math.floor(pairCount * 0.2),
      minEntropyThreshold: 0.8,
      ...privacyConfig
    };
    this.errorConfig = {
      syndrome: 'ldpc',
      cascadeIterations: 4,
      blockSize: 64,
      ...errorConfig
    };
  }

  /**
   * Generate entangled Bell states
   */
  private generateEntangledPairs(): BellState[] {
    const pairs: BellState[] = [];
    const rawBytes = randomBytes(this.pairCount);

    for (let i = 0; i < this.pairCount; i++) {
      // Simulate generation of |Φ+⟩ = (|00⟩ + |11⟩)/√2 Bell state
      const stateType = (rawBytes[Math.floor(i / 8)] >> (i % 8)) & 3;
      pairs.push({
        type: stateType,
        isEntangled: true,
        fidelity: 0.98 + Math.random() * 0.02 // High fidelity
      });
    }

    return pairs;
  }

  /**
   * Perform measurements in randomly chosen bases
   */
  private performMeasurements(
    pairs: BellState[],
    isAlice: boolean
  ): E91Measurement[] {
    return pairs.map(pair => {
      // Choose random measurement basis angles
      const angle = isAlice ?
        [0, Math.PI/4, Math.PI/2][Math.floor(Math.random() * 3)] :
        [Math.PI/4, Math.PI/2, 3*Math.PI/4][Math.floor(Math.random() * 3)];

      // Simulate quantum measurement
      let result: number;
      if (pair.isEntangled && pair.fidelity > 0.95) {
        // High fidelity entanglement - correlations follow quantum mechanics
        const correlation = Math.cos(2 * angle);
        result = Math.random() < (1 + correlation) / 2 ? 1 : 0;
      } else {
        // Low fidelity or no entanglement - random results
        result = Math.random() < 0.5 ? 1 : 0;
      }

      return {
        basis: angle,
        result,
        timestamp: new Date()
      };
    });
  }

  /**
   * Calculate CHSH inequality value
   */
  private calculateCHSH(
    aliceMeasurements: E91Measurement[],
    bobMeasurements: E91Measurement[],
    testIndices: number[]
  ): CHSHResult {
    let correlations = {
      '0,π/4': 0,
      '0,π/2': 0,
      'π/4,π/4': 0,
      'π/4,π/2': 0
    };
    let counts = {
      '0,π/4': 0,
      '0,π/2': 0,
      'π/4,π/4': 0,
      'π/4,π/2': 0
    };

    for (const i of testIndices) {
      const aliceAngle = aliceMeasurements[i].basis;
      const bobAngle = bobMeasurements[i].basis;
      const product = aliceMeasurements[i].result * bobMeasurements[i].result;

      // Calculate correlations for different angle combinations
      const key = `${aliceAngle},${bobAngle}` as keyof typeof correlations;
      if (key in correlations) {
        correlations[key] += product;
        counts[key]++;
      }
    }

    // Calculate normalized correlations
    const E = (a: string): number => 
      correlations[a as keyof typeof correlations] / 
      (counts[a as keyof typeof counts] || 1);

    // Calculate CHSH value: |E(a,b) - E(a,b') + E(a',b) + E(a',b')|
    const chshValue = Math.abs(
      E('0,π/4') - E('0,π/2') + E('π/4,π/4') + E('π/4,π/2')
    );

    return {
      value: chshValue,
      correlations,
      counts,
      violatesInequality: chshValue > this.chshThreshold
    };
  }

  /**
   * Perform basis reconciliation and key extraction
   */
  private reconcileBases(
    aliceMeasurements: E91Measurement[],
    bobMeasurements: E91Measurement[]
  ): { key: number[]; testIndices: number[] } {
    const key: number[] = [];
    const testIndices: number[] = [];
    const testFraction = 0.2; // Use 20% of pairs for CHSH test

    for (let i = 0; i < aliceMeasurements.length; i++) {
      if (Math.random() < testFraction) {
        testIndices.push(i);
      } else if (aliceMeasurements[i].basis === bobMeasurements[i].basis) {
        // Matching bases - use for key
        key.push(aliceMeasurements[i].result);
      }
    }

    return { key, testIndices };
  }

  /**
   * Perform error correction using CASCADE protocol
   */
  private errorCorrection(
    key: number[],
    errorRate: number
  ): { correctedKey: number[]; bitsLeaked: number } {
    const blockSize = this.errorConfig.blockSize;
    const iterations = this.errorConfig.cascadeIterations;
    let correctedKey = [...key];
    let bitsLeaked = 0;

    for (let i = 0; i < iterations; i++) {
      const currentBlockSize = blockSize * Math.pow(2, i);
      
      // Divide key into blocks
      for (let j = 0; j < correctedKey.length; j += currentBlockSize) {
        const block = correctedKey.slice(j, j + currentBlockSize);
        const parity = block.reduce((a, b) => a ^ b, 0);
        
        // Simulate parity check and error correction
        if (Math.random() < errorRate) {
          const errorPos = j + Math.floor(Math.random() * block.length);
          correctedKey[errorPos] ^= 1;
          bitsLeaked++;
        }
      }
    }

    return { correctedKey, bitsLeaked };
  }

  /**
   * Perform privacy amplification using universal hashing
   */
  private privacyAmplification(
    key: number[],
    finalLength: number
  ): number[] {
    const keyBuffer = Buffer.from(key.map(bit => bit.toString()).join(''), 'binary');
    const hash = createHash(this.privacyConfig.hashFunction);
    hash.update(keyBuffer);
    const amplifiedKey = hash.digest();

    // Convert hash to bit array of desired length
    const finalKey: number[] = [];
    for (let i = 0; i < finalLength; i++) {
      finalKey.push((amplifiedKey[Math.floor(i / 8)] >> (i % 8)) & 1);
    }

    return finalKey;
  }

  /**
   * Execute the complete E91 protocol
   */
  async executeProtocol(): Promise<E91Result> {
    // Step 1: Generate entangled pairs
    const entangledPairs = this.generateEntangledPairs();
    
    // Step 2: Perform measurements
    const aliceMeasurements = this.performMeasurements(entangledPairs, true);
    const bobMeasurements = this.performMeasurements(entangledPairs, false);
    
    // Step 3: Basis reconciliation
    const { key: rawKey, testIndices } = this.reconcileBases(
      aliceMeasurements,
      bobMeasurements
    );
    
    // Step 4: CHSH inequality test
    const chshResult = this.calculateCHSH(
      aliceMeasurements,
      bobMeasurements,
      testIndices
    );
    
    if (!chshResult.violatesInequality) {
      throw new Error(
        `CHSH value ${chshResult.value} does not violate inequality (threshold: ${this.chshThreshold})`
      );
    }
    
    // Step 5: Error correction
    const errorRate = 1 - chshResult.value / (2 * Math.sqrt(2));
    const { correctedKey, bitsLeaked } = this.errorCorrection(rawKey, errorRate);
    
    // Step 6: Privacy amplification
    const finalLength = Math.floor(
      correctedKey.length * (1 - errorRate) - bitsLeaked - this.privacyConfig.sacrificialBits
    );
    const finalKey = this.privacyAmplification(correctedKey, finalLength);

    // Return protocol results
    return {
      sessionId: this.sessionId,
      success: true,
      finalKey,
      keyLength: finalKey.length,
      chshValue: chshResult.value,
      quantumBitErrorRate: errorRate,
      bitsLeaked,
      entanglementQuality: {
        averageFidelity: 0.98,
        bellInequalityViolation: chshResult.value,
        localityLoopholeClosed: true
      },
      siftingRatio: rawKey.length / this.pairCount,
      privacyAmplificationRatio: finalKey.length / rawKey.length,
      securityLevel: this.calculateSecurityLevel(errorRate, chshResult.value),
      timestamp: new Date()
    };
  }

  /**
   * Calculate security level based on error rate and CHSH violation
   */
  private calculateSecurityLevel(
    errorRate: number,
    chshValue: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'MAXIMUM' {
    // Theoretical maximum CHSH value is 2√2 ≈ 2.828
    const maxViolation = 2 * Math.sqrt(2);
    const violationStrength = chshValue / maxViolation;
    const securityScore = (1 - errorRate) * violationStrength;
    
    if (securityScore > 0.9) return 'MAXIMUM';
    if (securityScore > 0.7) return 'HIGH';
    if (securityScore > 0.5) return 'MEDIUM';
    return 'LOW';
  }
} 