import { RealABISSEngine, ThreatEvent, ThreatSeverity } from '../RealABISSEngine';

describe('RealABISSEngine', () => {
  let engine: RealABISSEngine;

  beforeEach(() => {
    engine = new RealABISSEngine();
  });

  it('should initialize the ABISS engine', () => {
    expect(engine).toBeDefined();
    expect(engine.isInitialized()).toBe(true);
  });

  it('should analyze a threat event and return a result', () => {
    const event: ThreatEvent = {
      type: 'suspicious_login',
      source: '192.168.1.10',
      timestamp: new Date(),
      details: { userId: 'user1', attempts: 5 },
    };
    const result = engine.analyzeThreatEvent(event);

    expect(result).toBeDefined();
    expect(result.threatId).toBeDefined();
    expect(result.severity).toBeDefined();
    expect(result.description).toBeDefined();
    expect(result.isMitigated).toBe(false);
  });

  it('should detect a high severity threat', () => {
    const event: ThreatEvent = {
      type: 'ddos_attack',
      source: 'external_ip',
      timestamp: new Date(),
      details: { requestsPerSecond: 10000 },
    };
    const result = engine.analyzeThreatEvent(event);
    expect(result.severity).toBe(ThreatSeverity.CRITICAL);
  });

  it('should detect a medium severity threat', () => {
    const event: ThreatEvent = {
      type: 'unauthorized_access',
      source: 'internal_network',
      timestamp: new Date(),
      details: { resource: '/admin', user: 'guest' },
    };
    const result = engine.analyzeThreatEvent(event);
    expect(result.severity).toBe(ThreatSeverity.HIGH);
  });

  it('should detect a low severity threat', () => {
    const event: ThreatEvent = {
      type: 'port_scan',
      source: '10.0.0.5',
      timestamp: new Date(),
      details: { ports: [80, 443] },
    };
    const result = engine.analyzeThreatEvent(event);
    expect(result.severity).toBe(ThreatSeverity.MEDIUM);
  });

  it('should mitigate a detected threat', () => {
    const event: ThreatEvent = {
      type: 'suspicious_login',
      source: '192.168.1.10',
      timestamp: new Date(),
      details: { userId: 'user1', attempts: 5 },
    };
    const result = engine.analyzeThreatEvent(event);
    const mitigatedResult = engine.mitigateThreat(result.threatId);

    expect(mitigatedResult).toBeDefined();
    expect(mitigatedResult?.isMitigated).toBe(true);
  });

  it('should return undefined if trying to mitigate a non-existent threat', () => {
    const mitigatedResult = engine.mitigateThreat('nonExistentThreat');
    expect(mitigatedResult).toBeUndefined();
  });

  it('should get all active threats', () => {
    engine.analyzeThreatEvent({ type: 'ddos_attack', source: '', timestamp: new Date(), details: {} });
    engine.analyzeThreatEvent({ type: 'unauthorized_access', source: '', timestamp: new Date(), details: {} });

    const activeThreats = engine.getActiveThreats();
    expect(activeThreats.length).toBe(2);
  });

  it('should get threats by severity', () => {
    engine.analyzeThreatEvent({ type: 'ddos_attack', source: '', timestamp: new Date(), details: {} });
    engine.analyzeThreatEvent({ type: 'unauthorized_access', source: '', timestamp: new Date(), details: {} });

    const criticalThreats = engine.getThreatsBySeverity(ThreatSeverity.CRITICAL);
    expect(criticalThreats.length).toBe(1);
    expect(criticalThreats[0].description).toContain('ddos_attack');
  });
});
