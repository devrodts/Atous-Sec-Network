/**
 * SHAKE256 Extendable-Output Function (XOF)
 * 
 * This implementation follows the FIPS 202 specification for the SHAKE256
 * variant of the Keccak sponge function family.
 * 
 * Features:
 * - Variable-length output
 * - Cryptographic security
 * - Constant-time operations
 * - Sponge construction
 */

import { Buffer } from 'buffer';

export class SHAKE256 {
  private static readonly RATE = 136;  // Rate in bytes (1088 bits)
  private static readonly CAPACITY = 64;  // Capacity in bytes (512 bits)
  private static readonly DELIMITED_SUFFIX = 0x1F;  // Domain separation
  private static readonly STATE_SIZE = 200;  // State size in bytes (1600 bits)
  private static readonly ROUNDS = 24;  // Number of Keccak-f rounds

  // Keccak-f round constants
  private static readonly RC = [
    0x0000000000000001n, 0x0000000000008082n, 0x800000000000808An,
    0x8000000080008000n, 0x000000000000808Bn, 0x0000000080000001n,
    0x8000000080008081n, 0x8000000000008009n, 0x000000000000008An,
    0x0000000000000088n, 0x0000000080008009n, 0x000000008000000An,
    0x000000008000808Bn, 0x800000000000008Bn, 0x8000000000008089n,
    0x8000000000008003n, 0x8000000000008002n, 0x8000000000000080n,
    0x000000000000800An, 0x800000008000000An, 0x8000000080008081n,
    0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n
  ];

  // Keccak-f rotation offsets
  private static readonly R = [
    [0, 36, 3, 41, 18],
    [1, 44, 10, 45, 2],
    [62, 6, 43, 15, 61],
    [28, 55, 25, 21, 56],
    [27, 20, 39, 8, 14]
  ];

  private state: BigUint64Array;
  private blockSize: number;
  private count: number;

  constructor() {
    this.state = new BigUint64Array(25);  // 1600 bits = 25 * 64 bits
    this.blockSize = SHAKE256.RATE;
    this.count = 0;
  }

  /**
   * Initialize the state
   */
  private init(): void {
    this.state.fill(0n);
    this.count = 0;
  }

  /**
   * Absorb input data into the sponge state
   */
  private absorb(data: Buffer): void {
    let offset = 0;
    while (offset < data.length) {
      const remaining = Math.min(this.blockSize - this.count, data.length - offset);
      for (let i = 0; i < remaining; i++) {
        const wordIndex = Math.floor((this.count + i) / 8);
        const bitOffset = ((this.count + i) % 8) * 8;
        this.state[wordIndex] ^= BigInt(data[offset + i]) << BigInt(bitOffset);
      }
      offset += remaining;
      this.count += remaining;

      if (this.count === this.blockSize) {
        this.keccakF1600();
        this.count = 0;
      }
    }
  }

  /**
   * Squeeze output data from the sponge state
   */
  private squeeze(output: Buffer, offset: number, length: number): void {
    let outOffset = offset;
    let remaining = length;

    // First block may be partial
    if (this.count > 0) {
      const available = this.blockSize - this.count;
      const bytes = Math.min(available, remaining);
      for (let i = 0; i < bytes; i++) {
        const wordIndex = Math.floor((this.count + i) / 8);
        const bitOffset = ((this.count + i) % 8) * 8;
        output[outOffset + i] = Number((this.state[wordIndex] >> BigInt(bitOffset)) & 0xFFn);
      }
      this.count += bytes;
      outOffset += bytes;
      remaining -= bytes;

      if (this.count === this.blockSize) {
        this.keccakF1600();
        this.count = 0;
      }
    }

    // Process full blocks
    while (remaining >= this.blockSize) {
      for (let i = 0; i < this.blockSize; i++) {
        const wordIndex = Math.floor(i / 8);
        const bitOffset = (i % 8) * 8;
        output[outOffset + i] = Number((this.state[wordIndex] >> BigInt(bitOffset)) & 0xFFn);
      }
      this.keccakF1600();
      outOffset += this.blockSize;
      remaining -= this.blockSize;
    }

    // Process final partial block
    if (remaining > 0) {
      for (let i = 0; i < remaining; i++) {
        const wordIndex = Math.floor(i / 8);
        const bitOffset = (i % 8) * 8;
        output[outOffset + i] = Number((this.state[wordIndex] >> BigInt(bitOffset)) & 0xFFn);
      }
      this.count = remaining;
    }
  }

  /**
   * Keccak-f[1600] permutation
   */
  private keccakF1600(): void {
    let lanes = Array(5).fill(0).map(() => Array(5).fill(0n));

    // Extract lanes
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        lanes[x][y] = this.state[x + 5 * y];
      }
    }

    // Execute rounds
    for (let round = 0; round < SHAKE256.ROUNDS; round++) {
      // θ step
      const C = Array(5).fill(0n);
      const D = Array(5).fill(0n);

      for (let x = 0; x < 5; x++) {
        C[x] = lanes[x][0] ^ lanes[x][1] ^ lanes[x][2] ^ lanes[x][3] ^ lanes[x][4];
      }

      for (let x = 0; x < 5; x++) {
        D[x] = C[(x + 4) % 5] ^ this.rotateLeft(C[(x + 1) % 5], 1n);
      }

      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          lanes[x][y] ^= D[x];
        }
      }

      // ρ and π steps
      let [x, y] = [1, 0];
      let current = lanes[x][y];
      for (let t = 0; t < 24; t++) {
        const [X, Y] = [y, (2 * x + 3 * y) % 5];
        const temp = lanes[X][Y];
        lanes[X][Y] = this.rotateLeft(current, BigInt(SHAKE256.R[x][y]));
        current = temp;
        [x, y] = [X, Y];
      }

      // χ step
      const B = Array(5).fill(0).map(() => Array(5).fill(0n));
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          B[x][y] = lanes[x][y];
        }
      }

      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          lanes[x][y] = B[x][y] ^ ((~B[(x + 1) % 5][y]) & B[(x + 2) % 5][y]);
        }
      }

      // ι step
      lanes[0][0] ^= SHAKE256.RC[round];
    }

    // Store lanes back
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        this.state[x + 5 * y] = lanes[x][y];
      }
    }
  }

  /**
   * Rotate a 64-bit value left by n bits
   */
  private rotateLeft(x: bigint, n: bigint): bigint {
    return ((x << n) | (x >> (64n - n))) & 0xFFFFFFFFFFFFFFFFn;
  }

  /**
   * Hash input data and produce output of specified length
   */
  public hash(input: Buffer, outputLength: number): Buffer {
    if (outputLength <= 0) {
      throw new Error('Output length must be positive');
    }

    this.init();
    this.absorb(input);

    // Pad and domain separation
    const padding = Buffer.alloc(this.blockSize - this.count);
    padding[0] = SHAKE256.DELIMITED_SUFFIX;
    padding[padding.length - 1] |= 0x80;
    this.absorb(padding);

    // Squeeze output
    const output = Buffer.alloc(outputLength);
    this.squeeze(output, 0, outputLength);

    return output;
  }

  /**
   * Create a SHAKE256 instance and hash input data
   */
  public static hash(input: Buffer, outputLength: number): Buffer {
    const shake = new SHAKE256();
    return shake.hash(input, outputLength);
  }
} 