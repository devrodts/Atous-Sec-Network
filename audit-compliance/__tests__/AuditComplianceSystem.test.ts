import { AuditComplianceSystem, AuditEvent, ComplianceRule, RuleSeverity } from '../AuditComplianceSystem';

describe('AuditComplianceSystem', () => {
  let system: AuditComplianceSystem;

  beforeEach(() => {
    system = new AuditComplianceSystem();
  });

  it('should log an audit event', () => {
    const event: AuditEvent = {
      timestamp: new Date(),
      userId: 'user123',
      action: 'LOGIN',
      details: { ip: '192.168.1.1' },
      outcome: 'SUCCESS',
    };
    system.logEvent(event);
    expect(system.getAuditLogs().length).toBe(1);
    expect(system.getAuditLogs()[0]).toEqual(expect.objectContaining(event));
  });

  it('should add and enforce a compliance rule', () => {
    const rule: ComplianceRule = {
      id: 'RULE_001',
      description: 'Disallow login from blacklisted IPs',
      severity: RuleSeverity.CRITICAL,
      check: (event: AuditEvent) => {
        const blacklistedIps = ['1.1.1.1', '2.2.2.2'];
        return !blacklistedIps.includes(event.details?.ip);
      },
    };
    system.addRule(rule);

    const compliantEvent: AuditEvent = {
      timestamp: new Date(),
      userId: 'user1',
      action: 'LOGIN',
      details: { ip: '192.168.1.100' },
      outcome: 'SUCCESS',
    };
    system.logEvent(compliantEvent);
    expect(system.getComplianceReport().length).toBe(0); // No violations

    const nonCompliantEvent: AuditEvent = {
      timestamp: new Date(),
      userId: 'user2',
      action: 'LOGIN',
      details: { ip: '1.1.1.1' },
      outcome: 'FAILURE',
    };
    system.logEvent(nonCompliantEvent);

    const report = system.getComplianceReport();
    expect(report.length).toBe(1);
    expect(report[0].ruleId).toBe('RULE_001');
    expect(report[0].severity).toBe(RuleSeverity.CRITICAL);
    expect(report[0].event).toEqual(expect.objectContaining(nonCompliantEvent));
  });

  it('should generate an empty report if no rules are violated', () => {
    const rule: ComplianceRule = {
      id: 'RULE_002',
      description: 'All actions must be successful',
      severity: RuleSeverity.HIGH,
      check: (event: AuditEvent) => event.outcome === 'SUCCESS',
    };
    system.addRule(rule);

    system.logEvent({
      timestamp: new Date(),
      userId: 'user3',
      action: 'LOGOUT',
      outcome: 'SUCCESS',
    });

    expect(system.getComplianceReport().length).toBe(0);
  });

  it('should remove a compliance rule', () => {
    const rule: ComplianceRule = {
      id: 'RULE_003',
      description: 'Test rule',
      severity: RuleSeverity.LOW,
      check: () => false,
    };
    system.addRule(rule);
    expect(system.getRules().length).toBe(1);
    system.removeRule('RULE_003');
    expect(system.getRules().length).toBe(0);
  });

  it('should clear all audit logs and compliance violations', () => {
    system.logEvent({
      timestamp: new Date(),
      userId: 'user4',
      action: 'LOGIN',
      outcome: 'SUCCESS',
    });
    system.addRule({
      id: 'RULE_004',
      description: 'Always fail',
      severity: RuleSeverity.MEDIUM,
      check: () => false,
    });
    system.logEvent({
      timestamp: new Date(),
      userId: 'user5',
      action: 'LOGIN',
      outcome: 'FAILURE',
    });

    expect(system.getAuditLogs().length).toBeGreaterThan(0);
    expect(system.getComplianceReport().length).toBeGreaterThan(0);

    system.clearAll();

    expect(system.getAuditLogs().length).toBe(0);
    expect(system.getComplianceReport().length).toBe(0);
  });
});
