import { AdvancedSecurityFramework, AuthenticationResult, AuthorizationResult, AuditLogEntry } from '../AdvancedSecurityFramework';
import { SecurityRole, SecurityPermission, SecurityContext, SecurityConfig } from '../types';

describe('AdvancedSecurityFramework', () => {
  let framework: AdvancedSecurityFramework;
  let defaultConfig: SecurityConfig;

  beforeEach(() => {
    jest.useFakeTimers();
    defaultConfig = {
      enablePostQuantumCrypto: true,
      enableBiometricAuth: false,
      enableThreatDetection: true,
      enableRealTimeMonitoring: true,
      encryptionLevel: 'HIGH',
      auditingLevel: 'STANDARD',
      complianceFrameworks: ['ISO27001'],
      quantumResistanceLevel: 'HIGH',
      threatIntelligenceFeeds: ['default'],
      maxThreatLevel: 'HIGH',
      incidentResponseEnabled: true,
      authenticationMethods: ['JWT', 'QUANTUM_RESISTANT'],
      encryptionAlgorithms: ['AES-256-GCM', 'KYBER-1024'],
      auditLogRetention: 90, // days
      passwordPolicy: {
        minLength: 12,
        requireNumbers: true,
        requireSpecialChars: true,
        requireUppercase: true,
        maxAge: 90 // days
      },
      sessionTimeout: 3600, // seconds
      rateLimiting: {
        maxAttempts: 5,
        timeWindow: 300, // seconds
        blockDuration: 900 // seconds
      }
    };
    framework = new AdvancedSecurityFramework(defaultConfig);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const validCredentials = {
    username: 'testuser',
    password: 'Test@12345!A', // Now 12 characters
    mfaToken: '123456'
  };

  describe('Authentication', () => {
    it('should authenticate valid credentials', async () => {
      const result = await framework.authenticate(validCredentials);
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const invalidCredentials = { ...validCredentials, password: 'wrong' };
      const result = await framework.authenticate(invalidCredentials);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should enforce password policy', async () => {
      const weakCredentials = {
        username: 'testuser',
        password: 'weak',
        mfaToken: '123456'
      };
      const result = await framework.authenticate(weakCredentials);
      expect(result.success).toBe(false);
      expect(result.error).toContain('password policy');
    });

    it('should handle MFA validation', async () => {
      const noMfaCredentials = {
        username: 'testuser',
        password: 'Test@12345!'
      };
      const result = await framework.authenticate(noMfaCredentials);
      expect(result.success).toBe(false);
      expect(result.error).toContain('MFA');
    });

    it('should implement rate limiting', async () => {
      const invalidCredentials = {
        username: 'testuser',
        password: 'wrong',
        mfaToken: '123456'
      };

      for (let i = 0; i < defaultConfig.rateLimiting.maxAttempts; i++) {
        await framework.authenticate(invalidCredentials);
      }

      const result = await framework.authenticate(validCredentials);
      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });
  });

  describe('Authorization', () => {
    const validToken = 'valid_jwt_token';
    const adminContext: SecurityContext = {
      userId: 'admin1',
      roles: ['ADMIN'],
      permissions: ['READ', 'WRITE', 'DELETE'],
      metadata: {
        department: 'IT',
        clearanceLevel: 'HIGH',
        lastLogin: new Date()
      }
    };

    beforeEach(async () => {
      await framework.setSecurityContext(validToken, adminContext);
    });

    it('should authorize valid permissions', async () => {
      const result = await framework.authorize(validToken, 'READ');
      expect(result.granted).toBe(true);
    });

    it('should reject invalid permissions', async () => {
      const result = await framework.authorize(validToken, 'EXECUTE');
      expect(result.granted).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should handle role-based access control', async () => {
      const result = await framework.checkRole(validToken, 'ADMIN');
      expect(result.hasRole).toBe(true);
    });

    it('should validate token expiration', async () => {
      // Fast forward time past session timeout
      jest.advanceTimersByTime(defaultConfig.sessionTimeout * 1000 + 1000);
      
      const result = await framework.authorize(validToken, 'READ');
      expect(result.granted).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('should handle hierarchical permissions', async () => {
      const writeResult = await framework.authorize(validToken, 'WRITE');
      const deleteResult = await framework.authorize(validToken, 'DELETE');
      
      expect(writeResult.granted).toBe(true);
      expect(deleteResult.granted).toBe(true);
    });
  });

  describe('Encryption', () => {
    const sensitiveData = 'sensitive information';
    let encryptedData: string;

    it('should encrypt data', async () => {
      encryptedData = await framework.encrypt(sensitiveData);
      expect(encryptedData).not.toBe(sensitiveData);
      expect(typeof encryptedData).toBe('string');
    });

    it('should decrypt data', async () => {
      const decryptedData = await framework.decrypt(encryptedData);
      expect(decryptedData).toBe(sensitiveData);
    });

    it('should use quantum-resistant encryption when configured', async () => {
      const qrConfig = {
        ...defaultConfig,
        encryptionAlgorithms: ['KYBER-1024']
      };
      const qrFramework = new AdvancedSecurityFramework(qrConfig);
      
      const encrypted = await qrFramework.encrypt(sensitiveData);
      const decrypted = await qrFramework.decrypt(encrypted);
      
      expect(decrypted).toBe(sensitiveData);
    });

    it('should handle encryption errors gracefully', async () => {
      await expect(framework.decrypt('invalid_data')).rejects.toThrow();
    });
  });

  describe('Audit Logging', () => {
    it('should log security events', async () => {
      const event = {
        type: 'AUTH_ATTEMPT',
        userId: 'testuser',
        success: true,
        metadata: { ip: '127.0.0.1' }
      };

      await framework.logSecurityEvent(event);
      const logs = await framework.getAuditLogs();
      
      expect(logs).toContainEqual(expect.objectContaining({
        type: event.type,
        userId: event.userId
      }));
    });

    it('should enforce log retention policy', async () => {
      const oldEvent = {
        type: 'AUTH_ATTEMPT',
        userId: 'testuser',
        success: true,
        timestamp: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000), // 91 days old
        metadata: { ip: '127.0.0.1' }
      };

      await framework.logSecurityEvent(oldEvent);
      
      // Manually trigger log cleanup since the interval might not have run
      (framework as any).cleanOldAuditLogs();
      
      const logs = await framework.getAuditLogs();
      
      expect(logs).not.toContainEqual(expect.objectContaining({
        type: oldEvent.type,
        userId: oldEvent.userId
      }));
    });

    it('should support log filtering', async () => {
      const events = [
        { type: 'AUTH_ATTEMPT', userId: 'user1', success: true },
        { type: 'AUTH_ATTEMPT', userId: 'user2', success: false },
        { type: 'PERMISSION_CHANGE', userId: 'user1', success: true }
      ];

      for (const event of events) {
        await framework.logSecurityEvent(event);
      }

      const authLogs = await framework.getAuditLogs({ type: 'AUTH_ATTEMPT' });
      expect(authLogs).toHaveLength(2);

      const userLogs = await framework.getAuditLogs({ userId: 'user1' });
      expect(userLogs).toHaveLength(2);
    });

    it('should include detailed metadata in logs', async () => {
      const event = {
        type: 'AUTH_ATTEMPT',
        userId: 'testuser',
        success: true,
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          location: 'US',
          deviceId: 'device123'
        }
      };

      await framework.logSecurityEvent(event);
      const logs = await framework.getAuditLogs();
      const log = logs.find(l => l.userId === event.userId);
      
      expect(log?.metadata).toEqual(event.metadata);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid tokens gracefully', async () => {
      const result = await framework.authorize('invalid_token', 'READ');
      expect(result.granted).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should handle encryption failures gracefully', async () => {
      const invalidData = { 
        circular: null as any,
        toString: () => { throw new Error('Invalid data'); } 
      };
      invalidData.circular = invalidData; // Create circular reference
      
      await expect(framework.encrypt(invalidData)).rejects.toThrow();
    });

    it('should handle concurrent authentication attempts', async () => {
      const attempts = Array(10).fill(null).map(() => 
        framework.authenticate(validCredentials)
      );
      
      const results = await Promise.all(attempts);
      expect(results.some(r => r.success)).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should validate security configuration', () => {
      const invalidConfig = {
        ...defaultConfig,
        passwordPolicy: {
          ...defaultConfig.passwordPolicy,
          minLength: 4 // Too short
        }
      };

      expect(() => new AdvancedSecurityFramework(invalidConfig)).toThrow();
    });

    it('should allow runtime configuration updates', async () => {
      const newConfig = {
        ...defaultConfig,
        sessionTimeout: 7200 // 2 hours
      };

      await framework.updateConfig(newConfig);
      const token = (await framework.authenticate(validCredentials)).token;
      
      // Fast forward 1.5 hours
      jest.advanceTimersByTime(5400 * 1000);
      
      const result = await framework.authorize(token!, 'READ');
      expect(result.granted).toBe(true);
    });
  });
});
