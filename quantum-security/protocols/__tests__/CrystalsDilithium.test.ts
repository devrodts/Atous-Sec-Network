import { CrystalsDilithium } from '../CrystalsDilithium';
import { DilithiumKeyPair, DilithiumSignature, DilithiumSecurityLevel } from '../../types/DilithiumTypes';

describe('CrystalsDilithium', () => {
  let dilithium: CrystalsDilithium;
  const message = Buffer.from('Test message for signing');

  describe.each(['NIST_2', 'NIST_3', 'NIST_5'] as DilithiumSecurityLevel[])(
    'Security Level: %s',
    (securityLevel) => {
      beforeEach(() => {
        dilithium = new CrystalsDilithium(securityLevel);
      });

      describe('Key Generation', () => {
        let keyPair: DilithiumKeyPair;

        beforeEach(() => {
          keyPair = dilithium.generateKeyPair();
        });

        it('should generate valid key pairs', () => {
          expect(keyPair.publicKey).toBeDefined();
          expect(keyPair.privateKey).toBeDefined();
          expect(keyPair.publicKey.rho).toBeInstanceOf(Buffer);
          expect(keyPair.publicKey.rho.length).toBe(32);
          expect(keyPair.privateKey.key).toBeInstanceOf(Buffer);
          expect(keyPair.privateKey.key.length).toBe(32);
        });

        it('should generate unique key pairs', () => {
          const keyPair2 = dilithium.generateKeyPair();
          expect(keyPair.publicKey.rho).not.toEqual(keyPair2.publicKey.rho);
          expect(keyPair.privateKey.key).not.toEqual(keyPair2.privateKey.key);
        });

        it('should generate consistent key components', () => {
          expect(keyPair.publicKey.rho).toEqual(keyPair.privateKey.rho);
          expect(keyPair.publicKey.t1.length).toBeGreaterThan(0);
          expect(keyPair.privateKey.s1.length).toBeGreaterThan(0);
          expect(keyPair.privateKey.s2.length).toBeGreaterThan(0);
          expect(keyPair.privateKey.t0.length).toBeGreaterThan(0);
        });
      });

      describe('Signature Generation', () => {
        let keyPair: DilithiumKeyPair;
        let signature: DilithiumSignature;

        beforeEach(() => {
          keyPair = dilithium.generateKeyPair();
          signature = dilithium.sign(message, keyPair.privateKey);
        });

        it('should generate valid signatures', () => {
          expect(signature).toBeDefined();
          expect(signature.z).toBeDefined();
          expect(signature.h).toBeInstanceOf(Buffer);
          expect(signature.c).toBeDefined();
        });

        it('should generate different signatures for the same message', () => {
          const signature2 = dilithium.sign(message, keyPair.privateKey);
          expect(signature.z).not.toEqual(signature2.z);
          expect(signature.h).not.toEqual(signature2.h);
          expect(signature.c).not.toEqual(signature2.c);
        });

        it('should generate different signatures for different messages', () => {
          const message2 = Buffer.from('Different test message');
          const signature2 = dilithium.sign(message2, keyPair.privateKey);
          expect(signature.z).not.toEqual(signature2.z);
          expect(signature.h).not.toEqual(signature2.h);
          expect(signature.c).not.toEqual(signature2.c);
        });
      });

      describe('Signature Verification', () => {
        let keyPair: DilithiumKeyPair;
        let signature: DilithiumSignature;

        beforeEach(() => {
          keyPair = dilithium.generateKeyPair();
          signature = dilithium.sign(message, keyPair.privateKey);
        });

        it('should verify valid signatures', () => {
          const isValid = dilithium.verify(message, signature, keyPair.publicKey);
          expect(isValid).toBe(true);
        });

        it('should reject signatures with modified messages', () => {
          const modifiedMessage = Buffer.from('Modified test message');
          const isValid = dilithium.verify(modifiedMessage, signature, keyPair.publicKey);
          expect(isValid).toBe(false);
        });

        it('should reject signatures with modified components', () => {
          // Modify z component
          const modifiedSignature1 = {
            ...signature,
            z: signature.z.map(poly => poly.map(coeff => (coeff + 1) % 8380417))
          };
          expect(dilithium.verify(message, modifiedSignature1, keyPair.publicKey)).toBe(false);

          // Modify h component
          const modifiedSignature2 = {
            ...signature,
            h: Buffer.from(signature.h.map(byte => byte ^ 0xFF))
          };
          expect(dilithium.verify(message, modifiedSignature2, keyPair.publicKey)).toBe(false);

          // Modify c component
          const modifiedSignature3 = {
            ...signature,
            c: (signature.c + 1) % 8380417
          };
          expect(dilithium.verify(message, modifiedSignature3, keyPair.publicKey)).toBe(false);
        });

        it('should reject signatures with wrong public keys', () => {
          const wrongKeyPair = dilithium.generateKeyPair();
          const isValid = dilithium.verify(message, signature, wrongKeyPair.publicKey);
          expect(isValid).toBe(false);
        });
      });

      describe('Error Handling', () => {
        it('should handle invalid key pair generation parameters', () => {
          expect(() => {
            new CrystalsDilithium('INVALID_LEVEL' as DilithiumSecurityLevel);
          }).toThrow('Invalid security level');
        });

        it('should handle invalid signing inputs', () => {
          const keyPair = dilithium.generateKeyPair();
          expect(() => {
            dilithium.sign(Buffer.alloc(0), keyPair.privateKey);
          }).toThrow();

          expect(() => {
            dilithium.sign(message, {} as any);
          }).toThrow();
        });

        it('should handle invalid verification inputs', () => {
          const keyPair = dilithium.generateKeyPair();
          const signature = dilithium.sign(message, keyPair.privateKey);

          expect(() => {
            dilithium.verify(Buffer.alloc(0), signature, keyPair.publicKey);
          }).toThrow();

          expect(() => {
            dilithium.verify(message, {} as any, keyPair.publicKey);
          }).toThrow();

          expect(() => {
            dilithium.verify(message, signature, {} as any);
          }).toThrow();
        });
      });

      describe('Performance', () => {
        it('should generate key pairs within reasonable time', () => {
          const startTime = Date.now();
          dilithium.generateKeyPair();
          const duration = Date.now() - startTime;

          expect(duration).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should sign messages within reasonable time', () => {
          const keyPair = dilithium.generateKeyPair();
          const startTime = Date.now();
          dilithium.sign(message, keyPair.privateKey);
          const duration = Date.now() - startTime;

          expect(duration).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should verify signatures within reasonable time', () => {
          const keyPair = dilithium.generateKeyPair();
          const signature = dilithium.sign(message, keyPair.privateKey);
          const startTime = Date.now();
          dilithium.verify(message, signature, keyPair.publicKey);
          const duration = Date.now() - startTime;

          expect(duration).toBeLessThan(500); // Should complete within 0.5 seconds
        });
      });

      describe('Security Properties', () => {
        it('should generate signatures with correct sizes', () => {
          const keyPair = dilithium.generateKeyPair();
          const signature = dilithium.sign(message, keyPair.privateKey);

          // Check signature component sizes based on security level
          switch (securityLevel) {
            case 'NIST_2':
              expect(signature.z.length).toBe(4);
              expect(signature.h.length).toBeLessThanOrEqual(80);
              break;
            case 'NIST_3':
              expect(signature.z.length).toBe(5);
              expect(signature.h.length).toBeLessThanOrEqual(55);
              break;
            case 'NIST_5':
              expect(signature.z.length).toBe(7);
              expect(signature.h.length).toBeLessThanOrEqual(75);
              break;
          }
        });

        it('should maintain constant-time operations', () => {
          const keyPair = dilithium.generateKeyPair();
          const signature = dilithium.sign(message, keyPair.privateKey);

          // Measure timing variations for verification
          const timings: number[] = [];
          for (let i = 0; i < 100; i++) {
            const startTime = process.hrtime.bigint();
            dilithium.verify(message, signature, keyPair.publicKey);
            const endTime = process.hrtime.bigint();
            timings.push(Number(endTime - startTime));
          }

          // Calculate timing statistics
          const average = timings.reduce((a, b) => a + b, 0) / timings.length;
          const variance = timings.reduce((a, b) => a + Math.pow(b - average, 2), 0) / timings.length;
          const stdDev = Math.sqrt(variance);

          // Check for timing consistency (within 3 standard deviations)
          const maxDeviation = average + 3 * stdDev;
          const minDeviation = average - 3 * stdDev;
          const hasOutliers = timings.some(t => t > maxDeviation || t < minDeviation);

          expect(hasOutliers).toBe(false);
        });

        it('should reject weak keys and signatures', () => {
          const keyPair = dilithium.generateKeyPair();
          const signature = dilithium.sign(message, keyPair.privateKey);

          // Check polynomial norms
          for (const poly of keyPair.privateKey.s1) {
            const norm = Math.sqrt(poly.reduce((a, b) => a + b * b, 0));
            expect(norm).toBeLessThan(dilithium['eta'] * Math.sqrt(8380417));
          }

          for (const poly of signature.z) {
            const norm = Math.sqrt(poly.reduce((a, b) => a + b * b, 0));
            expect(norm).toBeLessThan(dilithium['gamma1'] - dilithium['beta']);
          }
        });
      });
    }
  );
}); 