import { CrystalsKyber, KyberSecurityLevel, KyberKeyPair, KyberCiphertext } from '../CrystalsKyber';

describe('CrystalsKyber', () => {
  let kyber: CrystalsKyber;

  describe.each(['NIST_1', 'NIST_3', 'NIST_5'] as KyberSecurityLevel[])(
    'Security Level: %s',
    (securityLevel) => {
      beforeEach(() => {
        kyber = new CrystalsKyber(securityLevel);
      });

      describe('Key Generation', () => {
        let keyPair: KyberKeyPair;

        beforeEach(() => {
          keyPair = kyber.generateKeyPair();
        });

        it('should generate valid key pairs', () => {
          expect(keyPair.publicKey).toBeDefined();
          expect(keyPair.privateKey).toBeDefined();
          expect(keyPair.publicKey.t).toBeInstanceOf(Buffer);
          expect(keyPair.publicKey.rho).toBeInstanceOf(Buffer);
          expect(keyPair.publicKey.rho.length).toBe(32);
          expect(keyPair.privateKey.s).toBeInstanceOf(Buffer);
          expect(keyPair.privateKey.hpk).toBeInstanceOf(Buffer);
          expect(keyPair.privateKey.hpk.length).toBe(32);
        });

        it('should generate unique key pairs', () => {
          const keyPair2 = kyber.generateKeyPair();
          expect(keyPair.publicKey.t).not.toEqual(keyPair2.publicKey.t);
          expect(keyPair.publicKey.rho).not.toEqual(keyPair2.publicKey.rho);
          expect(keyPair.privateKey.s).not.toEqual(keyPair2.privateKey.s);
        });

        it('should generate consistent key components', () => {
          expect(keyPair.publicKey.rho).toEqual(keyPair.privateKey.rho);
          expect(keyPair.privateKey.t.length).toBeGreaterThan(0);
          expect(keyPair.privateKey.s.length).toBeGreaterThan(0);
        });

        it('should have correct key sizes based on security level', () => {
          const expectedSizes = {
            [KyberSecurityLevel.NIST_1]: { pk: 800, sk: 1632 },
            [KyberSecurityLevel.NIST_3]: { pk: 1184, sk: 2400 },
            [KyberSecurityLevel.NIST_5]: { pk: 1568, sk: 3168 }
          };

          const pkSize = keyPair.publicKey.t.length + keyPair.publicKey.rho.length;
          const skSize = keyPair.privateKey.s.length + keyPair.privateKey.t.length +
                        keyPair.privateKey.rho.length + keyPair.privateKey.hpk.length;

          expect(pkSize).toBe(expectedSizes[securityLevel].pk);
          expect(skSize).toBe(expectedSizes[securityLevel].sk);
        });
      });

      describe('Encapsulation/Decapsulation', () => {
        let keyPair: KyberKeyPair;
        let encapsulation: {
          ciphertext: KyberCiphertext;
          sharedSecret: Buffer;
        };

        beforeEach(() => {
          keyPair = kyber.generateKeyPair();
          encapsulation = kyber.encapsulate(keyPair.publicKey);
        });

        it('should generate valid encapsulation', () => {
          expect(encapsulation.ciphertext).toBeDefined();
          expect(encapsulation.sharedSecret).toBeDefined();
          expect(encapsulation.ciphertext.u).toBeInstanceOf(Buffer);
          expect(encapsulation.ciphertext.v).toBeInstanceOf(Buffer);
          expect(encapsulation.sharedSecret.length).toBe(32);
        });

        it('should successfully decapsulate to the same shared secret', () => {
          const decapsulated = kyber.decapsulate(
            encapsulation.ciphertext,
            keyPair.privateKey
          );

          expect(decapsulated).toEqual(encapsulation.sharedSecret);
        });

        it('should generate different ciphertexts for the same public key', () => {
          const encapsulation2 = kyber.encapsulate(keyPair.publicKey);
          expect(encapsulation2.ciphertext.u).not.toEqual(encapsulation.ciphertext.u);
          expect(encapsulation2.ciphertext.v).not.toEqual(encapsulation.ciphertext.v);
          expect(encapsulation2.sharedSecret).not.toEqual(encapsulation.sharedSecret);
        });

        it('should fail decapsulation with wrong private key', () => {
          const wrongKeyPair = kyber.generateKeyPair();
          const decapsulated = kyber.decapsulate(
            encapsulation.ciphertext,
            wrongKeyPair.privateKey
          );

          expect(decapsulated).not.toEqual(encapsulation.sharedSecret);
        });

        it('should have correct ciphertext sizes based on security level', () => {
          const expectedSizes = {
            [KyberSecurityLevel.NIST_1]: 736,
            [KyberSecurityLevel.NIST_3]: 1088,
            [KyberSecurityLevel.NIST_5]: 1568
          };

          const ctSize = encapsulation.ciphertext.u.length + encapsulation.ciphertext.v.length;
          expect(ctSize).toBe(expectedSizes[securityLevel]);
        });
      });

      describe('Error Handling', () => {
        it('should handle invalid security level', () => {
          expect(() => {
            new CrystalsKyber('INVALID_LEVEL' as KyberSecurityLevel);
          }).toThrow('Invalid security level');
        });

        it('should handle invalid public key in encapsulation', () => {
          expect(() => {
            kyber.encapsulate({
              t: Buffer.from([]),
              rho: Buffer.from([])
            });
          }).toThrow();
        });

        it('should handle invalid ciphertext in decapsulation', () => {
          const keyPair = kyber.generateKeyPair();
          const invalidCiphertext = {
            u: Buffer.from([]),
            v: Buffer.from([])
          };

          const decapsulated = kyber.decapsulate(invalidCiphertext, keyPair.privateKey);
          expect(decapsulated.length).toBe(32); // Should still return a pseudorandom value
        });

        it('should handle tampered ciphertext', () => {
          const keyPair = kyber.generateKeyPair();
          const { ciphertext, sharedSecret } = kyber.encapsulate(keyPair.publicKey);

          // Tamper with ciphertext
          const tamperedCiphertext = {
            u: Buffer.from(ciphertext.u),
            v: Buffer.from(ciphertext.v)
          };
          tamperedCiphertext.u[0] ^= 1;

          const decapsulated = kyber.decapsulate(tamperedCiphertext, keyPair.privateKey);
          expect(decapsulated).not.toEqual(sharedSecret);
        });
      });

      describe('Performance', () => {
        it('should generate key pairs within reasonable time', () => {
          const startTime = Date.now();
          kyber.generateKeyPair();
          const duration = Date.now() - startTime;

          expect(duration).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should encapsulate within reasonable time', () => {
          const keyPair = kyber.generateKeyPair();
          const startTime = Date.now();
          kyber.encapsulate(keyPair.publicKey);
          const duration = Date.now() - startTime;

          expect(duration).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should decapsulate within reasonable time', () => {
          const keyPair = kyber.generateKeyPair();
          const { ciphertext } = kyber.encapsulate(keyPair.publicKey);
          const startTime = Date.now();
          kyber.decapsulate(ciphertext, keyPair.privateKey);
          const duration = Date.now() - startTime;

          expect(duration).toBeLessThan(500); // Should complete within 0.5 seconds
        });
      });

      describe('Security Properties', () => {
        it('should maintain constant-time operations', () => {
          const keyPair = kyber.generateKeyPair();
          const { ciphertext } = kyber.encapsulate(keyPair.publicKey);

          // Measure timing variations for decapsulation
          const timings: number[] = [];
          for (let i = 0; i < 100; i++) {
            const startTime = process.hrtime.bigint();
            kyber.decapsulate(ciphertext, keyPair.privateKey);
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

        it('should generate unique shared secrets', () => {
          const secrets = new Set<string>();
          const iterations = 100;

          for (let i = 0; i < iterations; i++) {
            const keyPair = kyber.generateKeyPair();
            const { sharedSecret } = kyber.encapsulate(keyPair.publicKey);
            secrets.add(sharedSecret.toString('hex'));
          }

          expect(secrets.size).toBe(iterations);
        });

        it('should fail gracefully with malformed inputs', () => {
          const keyPair = kyber.generateKeyPair();
          const { ciphertext } = kyber.encapsulate(keyPair.publicKey);

          // Test with various malformed inputs
          const malformedCases = [
            { ...ciphertext, u: Buffer.alloc(0) },
            { ...ciphertext, v: Buffer.alloc(0) },
            { u: Buffer.from([1]), v: Buffer.from([1]) },
            { u: Buffer.alloc(1000), v: Buffer.alloc(1000) }
          ];

          for (const malformed of malformedCases) {
            const decapsulated = kyber.decapsulate(malformed, keyPair.privateKey);
            expect(decapsulated.length).toBe(32);
          }
        });
      });
    }
  );
}); 