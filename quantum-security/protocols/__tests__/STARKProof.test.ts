import { STARKProof } from '../STARKProof';

describe('STARKProof', () => {
  let starkProof: STARKProof;

  beforeEach(() => {
    starkProof = new STARKProof();
  });

  describe('System Properties', () => {
    it('should have correct system properties', () => {
      expect(starkProof.name).toBe('STARK');
      expect(starkProof.type).toBe('STARK');
      expect(starkProof.quantumSecure).toBe(true);
      expect(starkProof.zeroKnowledge).toBe(true);
      expect(starkProof.transparent).toBe(true);
    });
  });

  describe('Proof Generation and Verification', () => {
    it('should generate and verify valid proof for simple computation', async () => {
      // Simple computation: f(x) = x^2
      const trace = [BigInt(1), BigInt(4), BigInt(9), BigInt(16)];
      const constraints = (x: BigInt[]) => {
        if (x.length < 2) return true;
        return x[1] === x[0] * x[0];
      };
      const publicInputs = [BigInt(1), BigInt(16)]; // First and last values

      const { proof, verificationKey } = await starkProof.generateProof(
        trace,
        constraints,
        publicInputs
      );

      expect(proof).toBeDefined();
      expect(verificationKey).toBeDefined();

      const isValid = await starkProof.verifyProof(
        proof,
        verificationKey,
        publicInputs
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid proofs', async () => {
      // Generate valid proof first
      const trace = [BigInt(1), BigInt(4), BigInt(9), BigInt(16)];
      const constraints = (x: BigInt[]) => {
        if (x.length < 2) return true;
        return x[1] === x[0] * x[0];
      };
      const publicInputs = [BigInt(1), BigInt(16)];

      const { proof, verificationKey } = await starkProof.generateProof(
        trace,
        constraints,
        publicInputs
      );

      // Tamper with the proof
      const tamperedProof = Buffer.from(proof);
      tamperedProof[10] ^= 0xFF; // Flip some bits

      const isValid = await starkProof.verifyProof(
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

      const { proof, verificationKey } = await starkProof.generateProof(
        trace,
        constraints,
        publicInputs
      );

      const isValid = await starkProof.verifyProof(
        proof,
        verificationKey,
        publicInputs
      );

      expect(isValid).toBe(true);
    });

    it('should reject proofs with mismatched public inputs', async () => {
      const trace = [BigInt(1), BigInt(4), BigInt(9), BigInt(16)];
      const constraints = (x: BigInt[]) => {
        if (x.length < 2) return true;
        return x[1] === x[0] * x[0];
      };
      const publicInputs = [BigInt(1), BigInt(16)];

      const { proof, verificationKey } = await starkProof.generateProof(
        trace,
        constraints,
        publicInputs
      );

      // Try to verify with different public inputs
      const wrongInputs = [BigInt(2), BigInt(15)];
      const isValid = await starkProof.verifyProof(
        proof,
        verificationKey,
        wrongInputs
      );

      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty trace gracefully', async () => {
      const trace: BigInt[] = [];
      const constraints = (x: BigInt[]) => true;
      const publicInputs: BigInt[] = [];

      await expect(
        starkProof.generateProof(trace, constraints, publicInputs)
      ).rejects.toThrow();
    });

    it('should handle invalid constraint functions', async () => {
      const trace = [BigInt(1), BigInt(4)];
      const constraints = (x: BigInt[]) => {
        throw new Error('Invalid constraint');
      };
      const publicInputs = [BigInt(1), BigInt(4)];

      await expect(
        starkProof.generateProof(trace, constraints, publicInputs)
      ).rejects.toThrow();
    });

    it('should handle malformed proofs', async () => {
      const malformedProof = Buffer.from('invalid proof');
      const verificationKey = Buffer.from('invalid key');
      const publicInputs = [BigInt(1)];

      const isValid = await starkProof.verifyProof(
        malformedProof,
        verificationKey,
        publicInputs
      );

      expect(isValid).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should generate and verify proofs within reasonable time', async () => {
      const trace = Array(16).fill(0).map((_, i) => BigInt(i * i));
      const constraints = (x: BigInt[]) => {
        if (x.length < 2) return true;
        return x[1] === x[0] * x[0];
      };
      const publicInputs = [trace[0], trace[trace.length - 1]];

      const startGen = Date.now();
      const { proof, verificationKey } = await starkProof.generateProof(
        trace,
        constraints,
        publicInputs
      );
      const genTime = Date.now() - startGen;

      const startVerify = Date.now();
      await starkProof.verifyProof(proof, verificationKey, publicInputs);
      const verifyTime = Date.now() - startVerify;

      // Proof generation should be under 5 seconds
      expect(genTime).toBeLessThan(5000);
      // Verification should be under 1 second
      expect(verifyTime).toBeLessThan(1000);
    });
  });
}); 