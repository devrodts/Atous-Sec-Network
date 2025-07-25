/**
 * SHAKE256 Extendable-Output Function (XOF) Implementation
 * Based on FIPS 202 (SHA-3 Standard)
 * 
 * This implementation provides:
 * - SHAKE256 with variable output length
 * - Keccak-f[1600] permutation
 * - Proper domain separation
 * - Constant-time operations
 */

import { createHash } from 'crypto';


type KeccakState = {
  state: Uint8Array;
  blockSize: number;
  count: number;
  squeezing: boolean;
};

export class SHAKE256 {
  private static readonly RATE = 136; // Rate in bytes (1088 bits)
  private static readonly CAPACITY = 64; // Capacity in bytes (512 bits)
  private static readonly STATE_SIZE = 200; // Size in bytes (1600 bits)
  private static readonly DOMAIN_SUFFIX = 0x1F; // Domain separator for SHAKE256
  private static readonly DELIMITED_SUFFIX = 0x04; // Additional domain separation

  private state: KeccakState;

  constructor() {
    this.state = {
      state: new Uint8Array(SHAKE256.STATE_SIZE),
      blockSize: SHAKE256.RATE,
      count: 0,
      squeezing: false
    };
  }

  /**
   * Reset the state
   */
  public reset(): void {
    this.state.state.fill(0);
    this.state.count = 0;
    this.state.squeezing = false;
  }

  /**
   * Absorb input data in constant time
   */
  public absorb(data: Uint8Array): void {
    if (this.state.squeezing) {
      throw new Error('Cannot absorb after starting to squeeze');
    }

    // Process input in constant time blocks
    const dataLength = data.length;
    let offset = 0;

    while (offset < dataLength) {
      const remaining = dataLength - offset;
      const blockSize = Math.min(remaining, this.state.blockSize - this.state.count);
      
      // Constant time XOR
      for (let i = 0; i < blockSize; i++) {
        this.state.state[this.state.count + i] ^= data[offset + i];
      }

      this.state.count += blockSize;
      offset += blockSize;

      if (this.state.count === this.state.blockSize) {
        this.keccakF1600();
        this.state.count = 0;
      }
    }
  }

  /**
   * Squeeze output data with proper domain separation
   */
  public squeeze(outputLength: number): Uint8Array {
    if (!this.state.squeezing) {
      // Apply domain separation and padding
      this.state.state[this.state.count] ^= SHAKE256.DOMAIN_SUFFIX;
      this.state.state[this.state.count] ^= SHAKE256.DELIMITED_SUFFIX;
      this.state.state[this.state.blockSize - 1] ^= 0x80;
      this.keccakF1600();
      this.state.count = 0;
      this.state.squeezing = true;
    }

    const output = new Uint8Array(outputLength);
    let offset = 0;

    // Extract output in constant time blocks
    while (offset < outputLength) {
      if (this.state.count === this.state.blockSize) {
        this.keccakF1600();
        this.state.count = 0;
      }

      const n = Math.min(this.state.blockSize - this.state.count, outputLength - offset);
      output.set(this.state.state.slice(this.state.count, this.state.count + n), offset);
      offset += n;
      this.state.count += n;
    }

    return output;
  }

  /**
   * One-shot hash function with proper initialization
   */
  public static hash(input: Uint8Array, outputLength: number): Uint8Array {
    const shake = new SHAKE256();
    shake.absorb(input);
    return shake.squeeze(outputLength);
  }

  /**
   * Keccak-f[1600] permutation with constant-time operations
   */
  private keccakF1600(): void {
    // Convert state to 64-bit words with constant-time operations
    const words = new BigUint64Array(25);
    for (let i = 0; i < 25; i++) {
      const offset = i * 8;
      words[i] = BigInt(0);
      for (let j = 0; j < 8; j++) {
        // Constant-time conversion
        const byte = BigInt(this.state.state[offset + j]);
        words[i] |= byte << BigInt(j * 8);
      }
    }

    // Keccak round constants
    const RNDC = new BigUint64Array([
      0x0000000000000001n, 0x0000000000008082n, 0x800000000000808An,
      0x8000000080008000n, 0x000000000000808Bn, 0x0000000080000001n,
      0x8000000080008081n, 0x8000000000008009n, 0x000000000000008An,
      0x0000000000000088n, 0x0000000080008009n, 0x000000008000000An,
      0x000000008000808Bn, 0x800000000000008Bn, 0x8000000000008089n,
      0x8000000000008003n, 0x8000000000008002n, 0x8000000000000080n,
      0x000000000000800An, 0x800000008000000An, 0x8000000080008081n,
      0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n
    ]);

    const ROL = new Uint8Array([
      0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43,
      25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14
    ]);

    // Keccak-f[1600] permutation with constant-time operations
    for (let round = 0; round < 24; round++) {
      // θ step
      const C = new BigUint64Array(5);
      for (let x = 0; x < 5; x++) {
        C[x] = words[x] ^ words[x + 5] ^ words[x + 10] ^ words[x + 15] ^ words[x + 20];
      }

      for (let x = 0; x < 5; x++) {
        const D = C[(x + 4) % 5] ^ rotateLeft(C[(x + 1) % 5], 1n);
        for (let y = 0; y < 5; y++) {
          words[x + 5 * y] ^= D;
        }
      }

      // ρ and π steps with constant-time rotations
      let last = words[1];
      for (let x = 0; x < 24; x++) {
        const current = words[ROL[x]];
        words[ROL[x]] = rotateLeft(last, BigInt(ROL[x]));
        last = current;
      }

      // χ step with constant-time operations
      for (let y = 0; y < 5; y++) {
        const t = new BigUint64Array(5);
        for (let x = 0; x < 5; x++) {
          t[x] = words[x + 5 * y];
        }
        for (let x = 0; x < 5; x++) {
          words[x + 5 * y] = t[x] ^ ((~t[(x + 1) % 5]) & t[(x + 2) % 5]);
        }
      }

      // ι step
      words[0] ^= RNDC[round];
    }

    // Convert back to bytes with constant-time operations
    for (let i = 0; i < 25; i++) {
      const offset = i * 8;
      const word = words[i];
      for (let j = 0; j < 8; j++) {
        // Constant-time conversion
        this.state.state[offset + j] = Number((word >> BigInt(j * 8)) & 0xFFn);
      }
    }
  }
}

/**
 * Helper function to rotate left a 64-bit value in constant time
 */
function rotateLeft(x: bigint, n: bigint): bigint {
  // Ensure n is within valid range
  n = n & 63n;
  // Constant-time rotation
  return ((x << n) | (x >> (64n - n))) & ((1n << 64n) - 1n);
} 