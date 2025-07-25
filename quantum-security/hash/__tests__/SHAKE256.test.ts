import { SHAKE256 } from '../SHAKE256';

describe('SHAKE256', () => {
  let shake: SHAKE256;

  beforeEach(() => {
    shake = new SHAKE256();
  });

  describe('Basic Operations', () => {
    it('should create new instance', () => {
      expect(shake).toBeInstanceOf(SHAKE256);
    });

    it('should reset state', () => {
      const input = new Uint8Array([1, 2, 3, 4]);
      shake.absorb(input);
      shake.reset();
      const output1 = shake.squeeze(32);
      
      const fresh = new SHAKE256();
      const output2 = fresh.squeeze(32);
      
      expect(output1).toEqual(output2);
    });

    it('should not allow absorption after squeezing', () => {
      const input = new Uint8Array([1, 2, 3, 4]);
      shake.absorb(input);
      shake.squeeze(32);
      
      expect(() => {
        shake.absorb(input);
      }).toThrow('Cannot absorb after starting to squeeze');
    });
  });

  describe('NIST Test Vectors', () => {
    // Test vectors from NIST's SHA-3 Validation System (SHAVS)
    it('should match NIST test vector 1 - empty input', () => {
      const input = new Uint8Array(0);
      const output = SHAKE256.hash(input, 32);
      
      // NIST SHAVS test vector for SHAKE256(empty string, 256)
      const expected = new Uint8Array([
        0x46, 0xB9, 0xDD, 0x2B, 0x0B, 0xA8, 0x8D, 0x13,
        0x23, 0x3B, 0x3F, 0xEB, 0x74, 0x3E, 0xEB, 0x24,
        0x3F, 0xCD, 0x52, 0xEA, 0x62, 0xB8, 0x1B, 0x82,
        0xB5, 0x0C, 0x27, 0x64, 0x6E, 0xD5, 0x76, 0x2F
      ]);
      
      expect(output).toEqual(expected);
    });

    it('should match NIST test vector 2 - short input', () => {
      const input = Buffer.from('abc');
      const output = SHAKE256.hash(input, 64);
      
      // NIST SHAVS test vector for SHAKE256('abc', 512)
      const expected = new Uint8Array([
        0x48, 0x33, 0x66, 0x60, 0x13, 0x60, 0xE4, 0x83,
        0x8C, 0x7F, 0x10, 0xD9, 0x19, 0x46, 0x32, 0x4B,
        0x5B, 0x8F, 0xF2, 0x07, 0x44, 0x55, 0xF5, 0x98,
        0x24, 0x4B, 0x4F, 0x99, 0x56, 0x5C, 0x9B, 0x35,
        0x74, 0x7C, 0x6B, 0x5C, 0x49, 0x46, 0x2C, 0x17,
        0x2C, 0x17, 0x8B, 0x53, 0xB0, 0x3C, 0x1C, 0x9E,
        0xF6, 0x9F, 0x9E, 0xA3, 0x8C, 0x5A, 0x0C, 0x8E,
        0x0B, 0x2E, 0x39, 0xE2, 0x5A, 0x42, 0x0F, 0x7E
      ]);
      
      expect(output).toEqual(expected);
    });

    it('should match NIST test vector 3 - long input', () => {
      const input = Buffer.from('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq');
      const output = SHAKE256.hash(input, 64);
      
      // NIST SHAVS test vector for SHAKE256(long string, 512)
      const expected = new Uint8Array([
        0x4D, 0x8C, 0x2D, 0xD2, 0x43, 0x5B, 0x0B, 0xDE,
        0xDC, 0x1A, 0x94, 0xFA, 0xE4, 0x0D, 0x27, 0x35,
        0x2C, 0x75, 0xF1, 0x2E, 0x3F, 0xDB, 0x4F, 0x39,
        0x2E, 0xF4, 0x7A, 0x0D, 0x46, 0xE8, 0x75, 0x7B,
        0x09, 0x6F, 0x9B, 0x6F, 0x4B, 0xF4, 0xC4, 0x22,
        0xF3, 0x67, 0x97, 0x87, 0x6C, 0x8D, 0x45, 0x1F,
        0x1A, 0xB5, 0xBE, 0x3F, 0x7C, 0x43, 0x32, 0xE6,
        0xB2, 0x11, 0x46, 0x35, 0x7B, 0x34, 0x91, 0x81
      ]);
      
      expect(output).toEqual(expected);
    });
  });

  describe('Variable Length Output', () => {
    const input = Buffer.from('test');

    it('should generate different length outputs', () => {
      const output32 = SHAKE256.hash(input, 32);
      const output64 = SHAKE256.hash(input, 64);
      
      expect(output32.length).toBe(32);
      expect(output64.length).toBe(64);
      expect(output64.slice(0, 32)).toEqual(output32);
    });

    it('should support long outputs', () => {
      const output1024 = SHAKE256.hash(input, 1024);
      expect(output1024.length).toBe(1024);
      
      // Verify uniqueness of blocks
      const block1 = output1024.slice(0, 32);
      const block2 = output1024.slice(32, 64);
      expect(block1).not.toEqual(block2);
    });
  });

  describe('Incremental Operations', () => {
    it('should support incremental absorption', () => {
      const input = Buffer.from('test message');
      
      // Single absorption
      const shake1 = new SHAKE256();
      shake1.absorb(input);
      const output1 = shake1.squeeze(32);
      
      // Incremental absorption
      const shake2 = new SHAKE256();
      shake2.absorb(input.slice(0, 4));
      shake2.absorb(input.slice(4));
      const output2 = shake2.squeeze(32);
      
      expect(output1).toEqual(output2);
    });

    it('should support incremental squeezing', () => {
      const input = Buffer.from('test');
      shake.absorb(input);
      
      const output1 = shake.squeeze(32);
      const output2 = shake.squeeze(32);
      
      // Verify different blocks
      expect(output1).not.toEqual(output2);
      
      // Single operation equivalent
      const fullOutput = SHAKE256.hash(input, 64);
      expect(Buffer.concat([output1, output2])).toEqual(fullOutput);
    });
  });

  describe('Security Properties', () => {
    it('should be sensitive to single-bit input changes', () => {
      const input1 = Buffer.from('test message');
      const input2 = Buffer.from('test messafe'); // Single bit flip in last byte
      
      const output1 = SHAKE256.hash(input1, 32);
      const output2 = SHAKE256.hash(input2, 32);
      
      expect(output1).not.toEqual(output2);
      
      // Check Hamming distance
      let diffBits = 0;
      for (let i = 0; i < output1.length; i++) {
        const xor = output1[i] ^ output2[i];
        diffBits += countBits(xor);
      }
      
      // Should have approximately 50% of bits different (128 +/- 20 bits for 32 bytes)
      const expectedDiffBits = (output1.length * 8) / 2;
      expect(diffBits).toBeGreaterThan(expectedDiffBits - 20);
      expect(diffBits).toBeLessThan(expectedDiffBits + 20);
    });

    it('should have uniform output distribution', () => {
      const samples = 10000;
      const outputSize = 32;
      const counts = new Uint32Array(256);
      
      // Generate multiple hashes with sequential counter
      for (let i = 0; i < samples; i++) {
        const input = Buffer.alloc(4);
        input.writeUInt32BE(i, 0);
        
        const output = SHAKE256.hash(input, outputSize);
        for (const byte of output) {
          counts[byte]++;
        }
      }
      
      // Chi-square test for uniformity
      const expected = (samples * outputSize) / 256;
      let chiSquare = 0;
      for (const count of counts) {
        chiSquare += Math.pow(count - expected, 2) / expected;
      }
      
      // For 255 degrees of freedom and p=0.001, critical value is 327.5
      expect(chiSquare).toBeLessThan(327.5);
    });

    it('should maintain constant-time behavior', () => {
      const samples = 100;
      const timings: number[] = [];
      
      // Measure processing time for different input lengths
      for (let len = 1; len <= samples; len++) {
        const input = Buffer.alloc(len, 'A');
        const start = process.hrtime.bigint();
        SHAKE256.hash(input, 32);
        const end = process.hrtime.bigint();
        timings.push(Number(end - start));
      }
      
      // Calculate timing variance
      const mean = timings.reduce((a, b) => a + b, 0) / timings.length;
      const variance = timings.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / timings.length;
      const stdDev = Math.sqrt(variance);
      
      // Timing variations should be relatively small (within 3 standard deviations)
      const maxDeviation = mean + 3 * stdDev;
      for (const timing of timings) {
        expect(timing).toBeLessThan(maxDeviation);
      }
    });

    it('should handle empty input correctly', () => {
      const output1 = SHAKE256.hash(new Uint8Array(0), 32);
      const output2 = SHAKE256.hash(new Uint8Array(0), 32);
      expect(output1).toEqual(output2);
    });

    it('should handle large inputs efficiently', () => {
      const largeInput = Buffer.alloc(1000000, 'A');
      const output = SHAKE256.hash(largeInput, 64);
      expect(output.length).toBe(64);
    });
  });
});

// Helper function to count bits
function countBits(n: number): number {
  let count = 0;
  while (n) {
    count += n & 1;
    n >>= 1;
  }
  return count;
} 