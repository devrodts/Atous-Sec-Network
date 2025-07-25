import { E91Protocol } from '../E91Protocol';
import { E91Basis, E91Result, PrivacyAmplificationConfig, ErrorCorrectionConfig } from '../../types/E91Types';

describe('E91Protocol', () => {
  let e91: E91Protocol;
  const sessionId = 'test-session-1';
  const pairCount = 1024;
  const errorThreshold = 0.11;
  const chshThreshold = 2.4;

  const privacyConfig: Partial<PrivacyAmplificationConfig> = {
    hashFunction: 'sha3-256',
    sacrificialBits: 200,
    minEntropyThreshold: 0.8
  };

  const errorConfig: Partial<ErrorCorrectionConfig> = {
    syndrome: 'ldpc',
    cascadeIterations: 4,
    blockSize: 64
  };

  beforeEach(() => {
    e91 = new E91Protocol(
      sessionId,
      pairCount,
      errorThreshold,
      chshThreshold,
      privacyConfig,
      errorConfig
    );
  });

  describe('Protocol Execution', () => {
    it('should successfully execute the E91 protocol', async () => {
      const result = await e91.executeProtocol();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(sessionId);
      expect(result.finalKey).toBeDefined();
      expect(result.finalKey.length).toBeGreaterThan(0);
      expect(result.keyLength).toBe(result.finalKey.length);
      expect(result.quantumBitErrorRate).toBeLessThan(errorThreshold);
      expect(result.chshValue).toBeGreaterThan(chshThreshold);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should maintain key security level above threshold', async () => {
      const result = await e91.executeProtocol();

      expect(['MEDIUM', 'HIGH', 'MAXIMUM']).toContain(result.securityLevel);
      expect(result.siftingRatio).toBeGreaterThan(0.3); // Theoretical minimum is 0.5
      expect(result.privacyAmplificationRatio).toBeGreaterThan(0.5);
    });

    it('should detect low CHSH values', async () => {
      // Create instance with very high CHSH threshold
      const highThresholdE91 = new E91Protocol(
        sessionId,
        pairCount,
        errorThreshold,
        2.8, // Near theoretical maximum of 2√2 ≈ 2.828
        privacyConfig,
        errorConfig
      );

      await expect(highThresholdE91.executeProtocol()).rejects.toThrow(/CHSH value .* does not violate inequality/);
    });
  });

  describe('Entanglement Quality', () => {
    it('should verify Bell inequality violation', async () => {
      const result = await e91.executeProtocol();

      expect(result.chshValue).toBeGreaterThan(2); // Classical limit
      expect(result.chshValue).toBeLessThanOrEqual(2.828); // Quantum limit (2√2)
      expect(result.entanglementQuality.bellInequalityViolation).toBe(result.chshValue);
      expect(result.entanglementQuality.localityLoopholeClosed).toBe(true);
    });

    it('should maintain high entanglement fidelity', async () => {
      const result = await e91.executeProtocol();

      expect(result.entanglementQuality.averageFidelity).toBeGreaterThan(0.9);
      expect(result.entanglementQuality.averageFidelity).toBeLessThanOrEqual(1);
    });
  });

  describe('Key Generation', () => {
    it('should generate keys of correct length', async () => {
      const result = await e91.executeProtocol();
      const expectedMinLength = Math.floor(pairCount * 0.25); // Conservative estimate

      expect(result.finalKey.length).toBeGreaterThanOrEqual(expectedMinLength);
      expect(result.keyLength).toBe(result.finalKey.length);
    });

    it('should generate different keys in different sessions', async () => {
      const result1 = await e91.executeProtocol();
      const result2 = await e91.executeProtocol();

      expect(result1.finalKey).not.toEqual(result2.finalKey);
      expect(result1.sessionId).toBe(result2.sessionId);
    });

    it('should generate keys with good statistical properties', async () => {
      const result = await e91.executeProtocol();
      const key = result.finalKey;

      // Count ones and zeros
      const ones = key.filter(bit => bit === 1).length;
      const zeros = key.filter(bit => bit === 0).length;

      // Check for roughly equal distribution (within 20%)
      const ratio = Math.abs(ones - zeros) / key.length;
      expect(ratio).toBeLessThan(0.2);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid pair counts', () => {
      expect(() => {
        new E91Protocol(sessionId, -1);
      }).toThrow('Pair count must be positive');

      expect(() => {
        new E91Protocol(sessionId, 0);
      }).toThrow('Pair count must be positive');
    });

    it('should handle invalid error thresholds', () => {
      expect(() => {
        new E91Protocol(sessionId, pairCount, -0.1);
      }).toThrow('Error threshold must be between 0 and 1');

      expect(() => {
        new E91Protocol(sessionId, pairCount, 1.1);
      }).toThrow('Error threshold must be between 0 and 1');
    });

    it('should handle invalid CHSH thresholds', () => {
      expect(() => {
        new E91Protocol(sessionId, pairCount, errorThreshold, 1.9);
      }).toThrow('CHSH threshold must be between 2 and 2√2');

      expect(() => {
        new E91Protocol(sessionId, pairCount, errorThreshold, 3.0);
      }).toThrow('CHSH threshold must be between 2 and 2√2');
    });
  });

  describe('Performance', () => {
    it('should complete protocol execution within reasonable time', async () => {
      const startTime = Date.now();
      await e91.executeProtocol();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large pair counts efficiently', async () => {
      const largeE91 = new E91Protocol(
        sessionId,
        10000, // 10x larger pair count
        errorThreshold,
        chshThreshold,
        privacyConfig,
        errorConfig
      );

      const startTime = Date.now();
      const result = await largeE91.executeProtocol();
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    });
  });

  describe('Security Properties', () => {
    it('should detect simulated eavesdropping', async () => {
      // Create instance with very high CHSH threshold to simulate eavesdropping detection
      const secureE91 = new E91Protocol(
        sessionId,
        pairCount,
        errorThreshold,
        2.7, // Very high CHSH requirement
        {
          ...privacyConfig,
          minEntropyThreshold: 0.9 // Higher entropy requirement
        },
        errorConfig
      );

      // Multiple attempts to catch probabilistic nature
      let eavesdroppingDetected = false;
      for (let i = 0; i < 5; i++) {
        try {
          await secureE91.executeProtocol();
        } catch (error) {
          if (error instanceof Error && error.message.includes('CHSH value')) {
            eavesdroppingDetected = true;
            break;
          }
        }
      }

      expect(eavesdroppingDetected).toBe(true);
    });

    it('should maintain minimum entropy in final key', async () => {
      const result = await e91.executeProtocol();
      const key = result.finalKey;

      // Calculate empirical entropy
      const frequencies = key.reduce((acc, bit) => {
        acc[bit] = (acc[bit] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const entropy = Object.values(frequencies).reduce((acc: number, freq: number) => {
        const p = freq / key.length;
        return acc - p * Math.log2(p);
      }, 0);

      expect(entropy).toBeGreaterThan(0.7); // Should be close to 1 for good randomness
    });

    it('should verify locality loophole closure', async () => {
      const result = await e91.executeProtocol();

      expect(result.entanglementQuality.localityLoopholeClosed).toBe(true);
      expect(result.chshValue).toBeGreaterThan(2.3); // Strong violation
      expect(result.quantumBitErrorRate).toBeLessThan(0.08); // Low error rate
    });
  });
}); 