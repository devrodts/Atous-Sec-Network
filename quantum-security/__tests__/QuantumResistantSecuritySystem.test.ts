import { QuantumResistantSecuritySystem, EncryptionResult, SignatureResult } from '../QuantumResistantSecuritySystem';
import { KyberKeyPair, KyberCiphertext } from '../protocols/CrystalsKyber';

describe('QuantumResistantSecuritySystem', () => {
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
      distributedQuantumNodes: 3,
      quantumNetworkTopology: 'MESH',
      quantumErrorCorrection: true,
      quantumSecureBootstrap: true
    });
  });

  it('should generate quantum-resistant key pairs', () => {
    const keyPair = securitySystem.generateKeyPair();
    expect(keyPair).toBeDefined();
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    // In a real test, you'd verify the key format/properties for quantum resistance
  });

  it('should encrypt and decrypt data using quantum-resistant algorithms', () => {
    const keyPair = securitySystem.generateKeyPair();
    const originalData = 'Sensitive data to be protected';
    const dataBuffer = Buffer.from(originalData, 'utf-8');

    const encryptionResult: EncryptionResult = securitySystem.encrypt(dataBuffer, keyPair.publicKey);
    expect(encryptionResult).toBeDefined();
    expect(encryptionResult.cipherText).toBeDefined();
    expect(encryptionResult.encapsulatedKey).toBeDefined();

    const decryptedData = securitySystem.decrypt(encryptionResult.cipherText, encryptionResult.encapsulatedKey, keyPair.privateKey);
    expect(decryptedData.toString('utf-8')).toBe(originalData);
  });

  it('should sign and verify data using quantum-resistant signatures', () => {
    const keyPair = securitySystem.generateKeyPair();
    const message = 'Important transaction message';
    const messageBuffer = Buffer.from(message, 'utf-8');

    const signatureResult: SignatureResult = securitySystem.sign(messageBuffer, keyPair.privateKey);
    expect(signatureResult).toBeDefined();
    expect(signatureResult.signature).toBeDefined();

    const isValid = securitySystem.verify(messageBuffer, signatureResult.signature, keyPair.publicKey);
    expect(isValid).toBe(true);
  });

  it('should fail verification with tampered data', () => {
    const keyPair = securitySystem.generateKeyPair();
    const originalMessage = 'Important transaction message';
    const tamperedMessage = 'Tampered transaction message';
    const originalMessageBuffer = Buffer.from(originalMessage, 'utf-8');
    const tamperedMessageBuffer = Buffer.from(tamperedMessage, 'utf-8');

    const signatureResult: SignatureResult = securitySystem.sign(originalMessageBuffer, keyPair.privateKey);

    const isValid = securitySystem.verify(tamperedMessageBuffer, signatureResult.signature, keyPair.publicKey);
    expect(isValid).toBe(false);
  });

  it('should fail decryption with incorrect keys', () => {
    const keyPair1 = securitySystem.generateKeyPair();
    const keyPair2 = securitySystem.generateKeyPair(); // Different key pair
    const originalData = 'Sensitive data';
    const dataBuffer = Buffer.from(originalData, 'utf-8');

    const encryptionResult: EncryptionResult = securitySystem.encrypt(dataBuffer, keyPair1.publicKey);

    // Try to decrypt with keyPair2's private key
    expect(() => securitySystem.decrypt(encryptionResult.cipherText, encryptionResult.encapsulatedKey, keyPair2.privateKey))
      .toThrow('Decryption failed');
  });

  describe('STARK Proof System', () => {
    it('should generate and verify valid STARK proofs', async () => {
      // Test case: Prove computation of squares
      const trace = [BigInt(1), BigInt(4), BigInt(9), BigInt(16)];
      const constraints = (x: BigInt[]) => {
        if (x.length < 2) return true;
        return x[1] === x[0] * x[0];
      };
      const publicInputs = [trace[0], trace[trace.length - 1]];

      const { proof, verificationKey } = await securitySystem.generateSTARKProof(
        trace,
        constraints,
        publicInputs
      );

      expect(proof).toBeDefined();
      expect(proof.length).toBeGreaterThan(0);
      expect(verificationKey).toBeDefined();
      expect(verificationKey.length).toBeGreaterThan(0);

      const isValid = await securitySystem.verifySTARKProof(
        proof,
        verificationKey,
        publicInputs
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid STARK proofs', async () => {
      const trace = [BigInt(1), BigInt(4), BigInt(9), BigInt(16)];
      const constraints = (x: BigInt[]) => {
        if (x.length < 2) return true;
        return x[1] === x[0] * x[0];
      };
      const publicInputs = [trace[0], trace[trace.length - 1]];

      const { proof, verificationKey } = await securitySystem.generateSTARKProof(
        trace,
        constraints,
        publicInputs
      );

      // Tamper with the proof
      const tamperedProof = Buffer.from(proof);
      tamperedProof[10] ^= 0xFF; // Flip some bits

      const isValid = await securitySystem.verifySTARKProof(
        tamperedProof,
        verificationKey,
        publicInputs
      );

      expect(isValid).toBe(false);
    });

    it('should handle large computations', async () => {
      // Generate larger trace
      const trace: BigInt[] = [];
      for (let i = 0; i < 32; i++) {
        trace.push(BigInt(i * i));
      }

      const constraints = (x: BigInt[]) => {
        if (x.length < 2) return true;
        return x[1] === x[0] * x[0];
      };

      const publicInputs = [trace[0], trace[trace.length - 1]];

      const { proof, verificationKey } = await securitySystem.generateSTARKProof(
        trace,
        constraints,
        publicInputs
      );

      const isValid = await securitySystem.verifySTARKProof(
        proof,
        verificationKey,
        publicInputs
      );

      expect(isValid).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Test with invalid inputs
      const emptyTrace: BigInt[] = [];
      const invalidConstraints = (x: BigInt[]) => {
        throw new Error('Invalid constraint');
      };
      const emptyInputs: BigInt[] = [];

      await expect(
        securitySystem.generateSTARKProof(emptyTrace, invalidConstraints, emptyInputs)
      ).rejects.toThrow();

      // Test with malformed proof
      const malformedProof = Buffer.from('invalid proof');
      const malformedKey = Buffer.from('invalid key');
      const dummyInputs = [BigInt(1)];

      const isValid = await securitySystem.verifySTARKProof(
        malformedProof,
        malformedKey,
        dummyInputs
      );

      expect(isValid).toBe(false);
    });

    it('should maintain performance within acceptable bounds', async () => {
      const trace = Array(16).fill(0).map((_, i) => BigInt(i * i));
      const constraints = (x: BigInt[]) => {
        if (x.length < 2) return true;
        return x[1] === x[0] * x[0];
      };
      const publicInputs = [trace[0], trace[trace.length - 1]];

      const startGen = Date.now();
      const { proof, verificationKey } = await securitySystem.generateSTARKProof(
        trace,
        constraints,
        publicInputs
      );
      const genTime = Date.now() - startGen;

      const startVerify = Date.now();
      await securitySystem.verifySTARKProof(proof, verificationKey, publicInputs);
      const verifyTime = Date.now() - startVerify;

      // Proof generation should be under 5 seconds
      expect(genTime).toBeLessThan(5000);
      // Verification should be under 1 second
      expect(verifyTime).toBeLessThan(1000);
    });
  });

  describe('KYBER Encryption', () => {
    let keyPair: KyberKeyPair;
    let encapsulation: {
      ciphertext: KyberCiphertext;
      sharedSecret: Buffer;
    };

    beforeEach(() => {
      keyPair = securitySystem.generateKyberKeyPair();
      encapsulation = securitySystem.encapsulateKyberSecret(keyPair.publicKey);
    });

    it('should generate valid KYBER key pairs', () => {
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.publicKey.t).toBeInstanceOf(Buffer);
      expect(keyPair.publicKey.rho).toBeInstanceOf(Buffer);
      expect(keyPair.privateKey.s).toBeInstanceOf(Buffer);
      expect(keyPair.privateKey.hpk).toBeInstanceOf(Buffer);
    });

    it('should successfully encapsulate and decapsulate shared secrets', () => {
      const decapsulated = securitySystem.decapsulateKyberSecret(
        encapsulation.ciphertext,
        keyPair.privateKey
      );

      expect(decapsulated).toEqual(encapsulation.sharedSecret);
    });

    it('should generate different shared secrets for different key pairs', () => {
      const keyPair2 = securitySystem.generateKyberKeyPair();
      const encapsulation2 = securitySystem.encapsulateKyberSecret(keyPair2.publicKey);

      expect(encapsulation2.sharedSecret).not.toEqual(encapsulation.sharedSecret);
    });

    it('should fail gracefully with invalid inputs', () => {
      const invalidCiphertext = {
        u: Buffer.from([]),
        v: Buffer.from([])
      };

      expect(() => {
        securitySystem.decapsulateKyberSecret(invalidCiphertext, keyPair.privateKey);
      }).toThrow();
    });

    it('should maintain constant-time operations', () => {
      const timings: number[] = [];
      for (let i = 0; i < 100; i++) {
        const startTime = process.hrtime.bigint();
        securitySystem.decapsulateKyberSecret(encapsulation.ciphertext, keyPair.privateKey);
        const endTime = process.hrtime.bigint();
        timings.push(Number(endTime - startTime));
      }

      const average = timings.reduce((a, b) => a + b, 0) / timings.length;
      const variance = timings.reduce((a, b) => a + Math.pow(b - average, 2), 0) / timings.length;
      const stdDev = Math.sqrt(variance);

      const maxDeviation = average + 3 * stdDev;
      const minDeviation = average - 3 * stdDev;
      const hasOutliers = timings.some(t => t > maxDeviation || t < minDeviation);

      expect(hasOutliers).toBe(false);
    });
  });
});
