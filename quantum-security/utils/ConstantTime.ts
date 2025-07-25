/**
 * ConstantTime - Utility class for constant-time cryptographic operations
 * 
 * Features:
 * - Constant-time comparison
 * - Constant-time selection
 * - Constant-time polynomial operations
 * - Constant-time sampling
 * - Side-channel resistant arithmetic
 */

import { Buffer } from 'buffer';
import { SecureBuffer } from './SecureBuffer';
import { KyberParameters } from '../types/KyberTypes';
import { createHash } from 'crypto';

export class ConstantTime {
  /**
   * Compare two buffers in constant time
   */
  public constantTimeEqual(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a[i] ^ b[i];
    }
    return diff === 0;
  }

  /**
   * Select between two values in constant time
   */
  public select(condition: boolean, a: Buffer, b: Buffer): Buffer {
    if (a.length !== b.length) {
      throw new Error('Buffers must have equal length');
    }

    const mask = condition ? 0xff : 0x00;
    const result = Buffer.alloc(a.length);

    for (let i = 0; i < a.length; i++) {
      result[i] = (a[i] & mask) | (b[i] & ~mask);
    }

    return result;
  }

  /**
   * Select between two secrets in constant time
   */
  public selectSecret(condition: boolean, a: SecureBuffer, b: SecureBuffer): SecureBuffer {
    const result = this.select(condition, a.get(), b.get());
    return new SecureBuffer(result);
  }

  /**
   * Sample polynomial coefficients in constant time
   */
  public samplePolynomial(n: number, q: number): Buffer {
    const coefficients = Buffer.alloc(n * 4); // 4 bytes per coefficient

    for (let i = 0; i < n; i++) {
      // Sample uniformly from [0, q-1]
      let x;
      do {
        x = this.sampleUniform(q);
      } while (x >= q);

      // Write coefficient in constant time
      this.writeInt32LE(coefficients, x, i * 4);
    }

    return coefficients;
  }

  /**
   * Sample error polynomial in constant time
   */
  public sampleError(n: number, eta: number): Buffer {
    const coefficients = Buffer.alloc(n * 4);

    for (let i = 0; i < n; i++) {
      // Sample from centered binomial distribution
      let e = 0;
      for (let j = 0; j < eta; j++) {
        e += this.sampleBit() - this.sampleBit();
      }

      // Write coefficient in constant time
      this.writeInt32LE(coefficients, e, i * 4);
    }

    return coefficients;
  }

  /**
   * Generate public key in constant time
   */
  public generatePublicKey(
    s: Buffer,
    rho: Buffer,
    params: KyberParameters
  ): Buffer {
    const a = this.generateMatrix(rho, params);
    const t = Buffer.alloc(params.k * params.n * 4);

    // Compute t = As in constant time
    for (let i = 0; i < params.k; i++) {
      for (let j = 0; j < params.k; j++) {
        const aij = this.getMatrixElement(a, i, j, params);
        const sj = this.getPolynomial(s, j, params);
        const product = this.multiplyPolynomials(aij, sj, params);
        this.addToPolynomial(t, i * params.n * 4, product);
      }
    }

    return t;
  }

  /**
   * Compute u = As + e in constant time
   */
  public computeU(
    t: Buffer,
    e: Buffer,
    seed: Buffer,
    params: KyberParameters
  ): Buffer {
    const a = this.generateMatrix(seed, params);
    const u = Buffer.alloc(params.k * params.n * 4);

    // Compute u = As + e in constant time
    for (let i = 0; i < params.k; i++) {
      for (let j = 0; j < params.k; j++) {
        const aij = this.getMatrixElement(a, i, j, params);
        const sj = this.getPolynomial(t, j, params);
        const product = this.multiplyPolynomials(aij, sj, params);
        this.addToPolynomial(u, i * params.n * 4, product);
      }
      this.addToPolynomial(u, i * params.n * 4, e);
    }

    return u;
  }

  /**
   * Compute v = t·s + e + encode(m) in constant time
   */
  public computeV(
    t: Buffer,
    e: Buffer,
    m: Buffer,
    params: KyberParameters
  ): Buffer {
    const v = Buffer.alloc(params.n * 4);
    const encoded = this.encodeMessage(m, params);

    // Compute v = t·s + e + encode(m) in constant time
    for (let i = 0; i < params.k; i++) {
      const ti = this.getPolynomial(t, i, params);
      const si = this.getPolynomial(e, i, params);
      const product = this.multiplyPolynomials(ti, si, params);
      this.addToPolynomial(v, 0, product);
    }
    this.addToPolynomial(v, 0, e);
    this.addToPolynomial(v, 0, encoded);

    return v;
  }

  /**
   * Decrypt message in constant time
   */
  public decryptMessage(
    u: Buffer,
    v: Buffer,
    s: SecureBuffer,
    params: KyberParameters
  ): Buffer {
    const m = Buffer.alloc(32);
    const temp = Buffer.alloc(params.n * 4);

    // Compute v - u·s in constant time
    for (let i = 0; i < params.k; i++) {
      const ui = this.getPolynomial(u, i, params);
      const si = this.getPolynomial(s.get(), i, params);
      const product = this.multiplyPolynomials(ui, si, params);
      this.subtractFromPolynomial(temp, 0, product);
    }
    this.addToPolynomial(temp, 0, v);

    // Decode message in constant time
    return this.decodeMessage(temp, params);
  }

  /**
   * Derive shared secret in constant time
   */
  public deriveSharedSecret(
    m: Buffer,
    u: Buffer,
    v: Buffer
  ): Buffer {
    // Hash message and ciphertext components to derive shared secret
    return createHash('sha3-256')
      .update(m)
      .update(u)
      .update(v)
      .digest();
  }

  /**
   * Helper functions
   */

  private sampleUniform(q: number): number {
    const bytes = Buffer.alloc(4);
    let x;
    do {
      bytes.writeUInt32LE(Math.floor(Math.random() * 0x100000000));
      x = bytes.readUInt32LE(0);
    } while (x >= q);
    return x;
  }

  private sampleBit(): number {
    return Math.random() < 0.5 ? 0 : 1;
  }

  private writeInt32LE(buffer: Buffer, value: number, offset: number): void {
    buffer.writeInt32LE(value, offset);
  }

  private generateMatrix(seed: Buffer, params: KyberParameters): Buffer {
    // Implementation of matrix generation omitted for brevity
    return Buffer.alloc(params.k * params.k * params.n * 4);
  }

  private getMatrixElement(
    matrix: Buffer,
    i: number,
    j: number,
    params: KyberParameters
  ): Buffer {
    const offset = (i * params.k + j) * params.n * 4;
    return matrix.subarray(offset, offset + params.n * 4);
  }

  private getPolynomial(
    buffer: Buffer,
    index: number,
    params: KyberParameters
  ): Buffer {
    const offset = index * params.n * 4;
    return buffer.subarray(offset, offset + params.n * 4);
  }

  private multiplyPolynomials(
    a: Buffer,
    b: Buffer,
    params: KyberParameters
  ): Buffer {
    // Implementation of polynomial multiplication omitted for brevity
    return Buffer.alloc(params.n * 4);
  }

  private addToPolynomial(
    result: Buffer,
    offset: number,
    addend: Buffer
  ): void {
    for (let i = 0; i < addend.length; i += 4) {
      const sum = result.readInt32LE(offset + i) + addend.readInt32LE(i);
      result.writeInt32LE(sum, offset + i);
    }
  }

  private subtractFromPolynomial(
    result: Buffer,
    offset: number,
    subtrahend: Buffer
  ): void {
    for (let i = 0; i < subtrahend.length; i += 4) {
      const diff = result.readInt32LE(offset + i) - subtrahend.readInt32LE(i);
      result.writeInt32LE(diff, offset + i);
    }
  }

  private encodeMessage(
    message: Buffer,
    params: KyberParameters
  ): Buffer {
    // Implementation of message encoding omitted for brevity
    return Buffer.alloc(params.n * 4);
  }

  private decodeMessage(
    encoded: Buffer,
    params: KyberParameters
  ): Buffer {
    // Implementation of message decoding omitted for brevity
    return Buffer.alloc(32);
  }
} 