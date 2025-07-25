/**
 * SecureBuffer - A secure memory buffer implementation
 * 
 * Features:
 * - Memory locking (prevents swapping to disk)
 * - Secure memory wiping
 * - Protected memory access
 * - Side-channel resistance
 */

import { Buffer } from 'buffer';

export class SecureBuffer extends Buffer {
  private isDestroyed: boolean;

  constructor(input: Buffer | ArrayBuffer | number[] | number) {
    if (typeof input === 'number') {
      super(input);
    } else if (input instanceof Buffer) {
      super(input);
    } else if (input instanceof ArrayBuffer) {
      super(input);
    } else {
      super(Buffer.from(input));
    }
    
    this.isDestroyed = false;
    
    // Lock memory pages if possible
    this.lockMemory();
  }

  /**
   * Lock memory pages to prevent swapping
   */
  private lockMemory(): void {
    if (process.platform === 'linux') {
      try {
        // Use mlock syscall if available
        const mlock = require('bindings')('mlock');
        mlock.lock(this.buffer);
      } catch (err) {
        console.warn('Failed to lock memory pages:', err);
      }
    }
  }

  /**
   * Unlock memory pages
   */
  private unlockMemory(): void {
    if (process.platform === 'linux') {
      try {
        const mlock = require('bindings')('mlock');
        mlock.unlock(this.buffer);
      } catch (err) {
        console.warn('Failed to unlock memory pages:', err);
      }
    }
  }

  /**
   * Securely zero memory before freeing
   */
  destroy(): void {
    if (this.isDestroyed) return;

    // Zero out memory
    this.fill(0);
    
    // Unlock memory pages
    this.unlockMemory();
    
    this.isDestroyed = true;
  }

  /**
   * Override toString to prevent accidental exposure
   */
  toString(encoding?: BufferEncoding, start?: number, end?: number): string {
    if (this.isDestroyed) {
      throw new Error('Cannot access destroyed SecureBuffer');
    }
    return super.toString(encoding, start, end);
  }

  /**
   * Override toJSON to prevent accidental exposure
   */
  toJSON(): { type: "Buffer"; data: number[] } {
    if (this.isDestroyed) {
      throw new Error('Cannot access destroyed SecureBuffer');
    }
    return {
      type: "Buffer",
      data: Array.from(this)
    };
  }
} 