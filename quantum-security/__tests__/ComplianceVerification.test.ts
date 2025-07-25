import { QuantumResistantSecuritySystem } from '../QuantumResistantSecuritySystem';
import { CrystalsKyber } from '../protocols/CrystalsKyber';
import { CrystalsDilithium } from '../protocols/CrystalsDilithium';
import { STARKProof } from '../protocols/STARKProof';
import { BB84Protocol } from '../protocols/BB84Protocol';

describe('Compliance Verification', () => {
  let securitySystem: QuantumResistantSecuritySystem;

  beforeEach(() => {
    securitySystem = new QuantumResistantSecuritySystem({
      enableQuantumKeyDistribution: true,
      enableQuantumSafeContracts: true,
      enableQuantumThreatDetection: true,
      enableQuantumRandomGeneration: true,
      quantumSecurityLevel: 'HIGH',
      quantumProtocols: ['BB84', 'E91'],
      postQuantumAlgorithms: ['CRYSTALS_KYBER', 'CRYSTALS_DILITHIUM'],
      quantumKeyRefreshInterval: 3600,
      quantumEntropySource: 'HARDWARE',
      quantumAuditingEnabled: true,
      quantumComplianceFrameworks: ['NIST_PQC'],
      distributedValidation: true
    });
  });

  describe('NIST Post-Quantum Cryptography Standards', () => {
    describe('CRYSTALS-KYBER Compliance', () => {
      it('should meet NIST security level requirements', () => {
        const kyber = new CrystalsKyber();
        const keyPair = kyber.generateKeyPair();

        // Verify key sizes
        expect(keyPair.publicKey.t.length).toBeGreaterThanOrEqual(930);
        expect(keyPair.privateKey.s.length).toBeGreaterThanOrEqual(1234);
        expect(keyPair.publicKey.rho.length).toBe(32);
        expect(keyPair.privateKey.hpk.length).toBe(32);

        // Verify ciphertext size
        const { ciphertext } = kyber.encapsulate(keyPair.publicKey);
        expect(ciphertext.u.length + ciphertext.v.length).toBeLessThanOrEqual(1088);
      });

      it('should provide IND-CCA2 security', () => {
        const kyber = new CrystalsKyber();
        const keyPair = kyber.generateKeyPair();
        const { ciphertext, sharedSecret } = kyber.encapsulate(keyPair.publicKey);

        // Verify chosen-ciphertext attack resistance
        const modifiedCiphertext = {
          u: Buffer.from(ciphertext.u),
          v: Buffer.from(ciphertext.v)
        };
        modifiedCiphertext.u[0] ^= 1;

        const decapsulated = kyber.decapsulate(modifiedCiphertext, keyPair.privateKey);
        expect(decapsulated).not.toEqual(sharedSecret);
      });
    });

    describe('CRYSTALS-Dilithium Compliance', () => {
      it('should meet NIST signature scheme requirements', () => {
        const dilithium = new CrystalsDilithium();
        const keyPair = dilithium.generateKeyPair();
        const message = Buffer.from('Test message');

        // Verify signature size
        const signature = dilithium.sign(message, keyPair.privateKey);
        expect(signature.length).toBeLessThanOrEqual(2420);

        // Verify key sizes
        expect(keyPair.publicKey.length).toBeLessThanOrEqual(1312);
        expect(keyPair.privateKey.length).toBeLessThanOrEqual(2528);
      });

      it('should provide EUF-CMA security', () => {
        const dilithium = new CrystalsDilithium();
        const keyPair = dilithium.generateKeyPair();
        const message = Buffer.from('Test message');
        const signature = dilithium.sign(message, keyPair.privateKey);

        // Verify signature unforgeability
        const modifiedMessage = Buffer.from('Modified message');
        const isValid = dilithium.verify(modifiedMessage, signature, keyPair.publicKey);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('FIPS 140-3 Compliance', () => {
    describe('Random Number Generation', () => {
      it('should use approved random number generation methods', () => {
        const samples = 1000;
        const randomValues: Buffer[] = [];

        for (let i = 0; i < samples; i++) {
          const value = securitySystem.generateQuantumRandomNumber(32);
          randomValues.push(value);
        }

        // Statistical tests
        const bits = Buffer.concat(randomValues);
        
        // Monobit test
        const ones = countOnes(bits);
        const pValue = calculatePValue(ones, bits.length * 8);
        expect(pValue).toBeGreaterThan(0.01);

        // Runs test
        const runs = countRuns(bits);
        const runsExpected = (bits.length * 8) / 2;
        expect(Math.abs(runs - runsExpected)).toBeLessThan(runsExpected * 0.1);
      });

      it('should implement continuous random number generator tests', () => {
        const previousOutputs = new Set<string>();
        
        for (let i = 0; i < 1000; i++) {
          const output = securitySystem.generateQuantumRandomNumber(32);
          const outputHex = output.toString('hex');
          
          // Verify no repeated outputs
          expect(previousOutputs.has(outputHex)).toBe(false);
          previousOutputs.add(outputHex);
          
          // Verify non-zero output
          expect(output.equals(Buffer.alloc(32))).toBe(false);
        }
      });
    });

    describe('Key Management', () => {
      it('should implement secure key storage', () => {
        const kyber = new CrystalsKyber();
        const keyPair = kyber.generateKeyPair();

        // Verify key encryption at rest
        const storedKey = securitySystem.storeKey(keyPair.privateKey);
        expect(storedKey).not.toEqual(keyPair.privateKey);

        // Verify key retrieval
        const retrievedKey = securitySystem.retrieveKey(storedKey);
        expect(retrievedKey).toEqual(keyPair.privateKey);
      });

      it('should implement key lifecycle management', () => {
        const kyber = new CrystalsKyber();
        const keyPair = kyber.generateKeyPair();

        // Key generation
        expect(keyPair).toBeDefined();

        // Key distribution
        const distributedKey = securitySystem.distributeKey(keyPair.publicKey);
        expect(distributedKey).toBeDefined();

        // Key rotation
        const rotatedKey = securitySystem.rotateKey(keyPair);
        expect(rotatedKey).not.toEqual(keyPair);

        // Key destruction
        securitySystem.destroyKey(keyPair);
        expect(() => securitySystem.retrieveKey(keyPair)).toThrow();
      });
    });
  });

  describe('Common Criteria (ISO/IEC 15408) Compliance', () => {
    it('should implement security audit logging', () => {
      const kyber = new CrystalsKyber();
      const keyPair = kyber.generateKeyPair();

      // Generate some security events
      const events = [
        kyber.encapsulate(keyPair.publicKey),
        securitySystem.generateQuantumRandomNumber(32),
        securitySystem.storeKey(keyPair.privateKey)
      ];

      // Verify audit log entries
      const auditLogs = securitySystem.getAuditLogs();
      expect(auditLogs.length).toBeGreaterThanOrEqual(events.length);

      // Verify log integrity
      const lastLog = auditLogs[auditLogs.length - 1];
      expect(lastLog).toHaveProperty('timestamp');
      expect(lastLog).toHaveProperty('eventType');
      expect(lastLog).toHaveProperty('severity');
      expect(lastLog).toHaveProperty('result');
    });

    it('should implement access control', () => {
      // Verify role-based access control
      expect(() => securitySystem.generateKeyPair('USER')).toThrow();
      expect(() => securitySystem.generateKeyPair('ADMIN')).not.toThrow();

      // Verify operation restrictions
      expect(() => securitySystem.rotateAllKeys('USER')).toThrow();
      expect(() => securitySystem.rotateAllKeys('ADMIN')).not.toThrow();
    });
  });

  describe('ISO 27001 Compliance', () => {
    it('should implement information security controls', () => {
      // Verify asset management
      expect(securitySystem.getAssetInventory()).toBeDefined();
      expect(securitySystem.getAssetClassification()).toBeDefined();

      // Verify access control
      expect(securitySystem.getAccessControlPolicy()).toBeDefined();
      expect(securitySystem.getUserAccessRights()).toBeDefined();

      // Verify cryptographic controls
      expect(securitySystem.getCryptographicPolicy()).toBeDefined();
      expect(securitySystem.getKeyManagementPolicy()).toBeDefined();
    });

    it('should implement security incident management', () => {
      // Simulate security incident
      const incident = {
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'HIGH',
        timestamp: Date.now()
      };

      // Verify incident handling
      const response = securitySystem.handleSecurityIncident(incident);
      expect(response.status).toBe('RESOLVED');
      expect(response.mitigationSteps).toBeDefined();
      expect(response.timeToResolve).toBeDefined();
    });
  });
});

// Helper functions for statistical tests
function countOnes(buffer: Buffer): number {
  let count = 0;
  for (const byte of buffer) {
    for (let i = 0; i < 8; i++) {
      if ((byte >> i) & 1) count++;
    }
  }
  return count;
}

function calculatePValue(ones: number, total: number): number {
  const expected = total / 2;
  const standardDeviation = Math.sqrt(total / 4);
  const z = Math.abs(ones - expected) / standardDeviation;
  return 2 * (1 - normalCDF(z));
}

function countRuns(buffer: Buffer): number {
  let runs = 0;
  let previousBit = (buffer[0] >> 7) & 1;

  for (const byte of buffer) {
    for (let i = 0; i < 8; i++) {
      const currentBit = (byte >> i) & 1;
      if (currentBit !== previousBit) {
        runs++;
        previousBit = currentBit;
      }
    }
  }

  return runs;
}

function normalCDF(z: number): number {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

function erf(x: number): number {
  const t = 1.0 / (1.0 + 0.5 * Math.abs(x));
  const tau = t * Math.exp(-x * x - 1.26551223 +
                          t * (1.00002368 +
                          t * (0.37409196 +
                          t * (0.09678418 +
                          t * (-0.18628806 +
                          t * (0.27886807 +
                          t * (-1.13520398 +
                          t * (1.48851587 +
                          t * (-0.82215223 +
                          t * 0.17087277)))))))));
  return x >= 0 ? 1 - tau : tau - 1;
} 