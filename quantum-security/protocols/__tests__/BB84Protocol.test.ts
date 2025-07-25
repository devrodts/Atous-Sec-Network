import { BB84Protocol } from '../BB84Protocol';
import { BB84Basis, BB84Result, PrivacyAmplificationConfig, ErrorCorrectionConfig } from '../../types/BB84Types';

describe('BB84Protocol', () => {
  let bb84: BB84Protocol;
  const sessionId = 'test-session-1';
  const keyLength = 1024;
  const errorThreshold = 0.11;

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
    bb84 = new BB84Protocol(
      sessionId,
      keyLength,
      errorThreshold,
      privacyConfig,
      errorConfig
    );
  });

  describe('Protocol Execution', () => {
    it('should successfully execute the BB84 protocol', async () => {
      const result = await bb84.executeProtocol();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(sessionId);
      expect(result.finalKey).toBeDefined();
      expect(result.finalKey.length).toBeGreaterThan(0);
      expect(result.keyLength).toBe(result.finalKey.length);
      expect(result.quantumBitErrorRate).toBeLessThan(errorThreshold);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should maintain key security level above threshold', async () => {
      const result = await bb84.executeProtocol();

      expect(['MEDIUM', 'HIGH', 'MAXIMUM']).toContain(result.securityLevel);
      expect(result.siftingRatio).toBeGreaterThan(0.3); // Theoretical minimum is 0.5
      expect(result.privacyAmplificationRatio).toBeGreaterThan(0.5);
    });

    it('should handle high error rates appropriately', async () => {
      // Create instance with very low error threshold
      const lowThresholdBB84 = new BB84Protocol(
        sessionId,
        keyLength,
        0.01, // Very low error threshold
        privacyConfig,
        errorConfig
      );

      await expect(lowThresholdBB84.executeProtocol()).rejects.toThrow(/Error rate .* exceeds threshold/);
    });
  });

  describe('Key Generation', () => {
    it('should generate keys of correct length', async () => {
      const result = await bb84.executeProtocol();
      const expectedMinLength = Math.floor(keyLength * 0.25); // Conservative estimate

      expect(result.finalKey.length).toBeGreaterThanOrEqual(expectedMinLength);
      expect(result.keyLength).toBe(result.finalKey.length);
    });

    it('should generate different keys in different sessions', async () => {
      const result1 = await bb84.executeProtocol();
      const result2 = await bb84.executeProtocol();

      expect(result1.finalKey).not.toEqual(result2.finalKey);
      expect(result1.sessionId).toBe(result2.sessionId);
    });

    it('should generate keys with good statistical properties', async () => {
      const result = await bb84.executeProtocol();
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
    it('should handle invalid key lengths', () => {
      expect(() => {
        new BB84Protocol(sessionId, -1);
      }).toThrow();

      expect(() => {
        new BB84Protocol(sessionId, 0);
      }).toThrow();
    });

    it('should handle invalid error thresholds', () => {
      expect(() => {
        new BB84Protocol(sessionId, keyLength, -0.1);
      }).toThrow();

      expect(() => {
        new BB84Protocol(sessionId, keyLength, 1.1);
      }).toThrow();
    });

    it('should handle invalid privacy amplification config', () => {
      const invalidPrivacyConfig = {
        ...privacyConfig,
        sacrificialBits: keyLength + 1 // More than key length
      };

      expect(() => {
        new BB84Protocol(
          sessionId,
          keyLength,
          errorThreshold,
          invalidPrivacyConfig,
          errorConfig
        );
      }).toThrow();
    });
  });

  describe('Performance', () => {
    it('should complete protocol execution within reasonable time', async () => {
      const startTime = Date.now();
      await bb84.executeProtocol();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large key lengths efficiently', async () => {
      const largeBB84 = new BB84Protocol(
        sessionId,
        10000, // 10x larger key
        errorThreshold,
        privacyConfig,
        errorConfig
      );

      const startTime = Date.now();
      const result = await largeBB84.executeProtocol();
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    });
  });

  describe('Security Properties', () => {
    it('should detect simulated eavesdropping', async () => {
      // Create instance with very low error threshold to simulate eavesdropping detection
      const secureBB84 = new BB84Protocol(
        sessionId,
        keyLength,
        0.05, // Very low error threshold
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
          await secureBB84.executeProtocol();
        } catch (error) {
          if (error instanceof Error && error.message.includes('Error rate')) {
            eavesdroppingDetected = true;
            break;
          }
        }
      }

      expect(eavesdroppingDetected).toBe(true);
    });

    it('should maintain minimum entropy in final key', async () => {
      const result = await bb84.executeProtocol();
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
  });
}); 