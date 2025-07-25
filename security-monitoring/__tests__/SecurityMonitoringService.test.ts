import { SecurityMonitoringService } from '../SecurityMonitoringService';

describe('SecurityMonitoringService', () => {
  let service: SecurityMonitoringService;

  beforeEach(() => {
    service = new SecurityMonitoringService();
    service.clearAlerts(); // Clear alerts before each test
  });

  it('should add and remove a monitoring rule', () => {
    const customRule = jest.fn(() => false);
    service.addMonitoringRule('customRule1', customRule);
    expect(service.monitoringRules.has('customRule1')).toBe(true);

    service.removeMonitoringRule('customRule1');
    expect(service.monitoringRules.has('customRule1')).toBe(false);
  });

  it('should process a security event and generate an alert if a rule is violated', () => {
    const alertSpy = jest.spyOn(service as any, 'generateAlert');
    const event = { type: 'login', status: 'failed', attempts: 6 };

    service.processSecurityEvent(event);

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith('suspiciousLogin', event);
    expect(service.getAlerts().length).toBe(1);
    expect(service.getAlerts()[0].ruleId).toBe('suspiciousLogin');
  });

  it('should not generate an alert if no rule is violated', () => {
    const alertSpy = jest.spyOn(service as any, 'generateAlert');
    const event = { type: 'login', status: 'success', attempts: 1 };

    service.processSecurityEvent(event);

    expect(alertSpy).not.toHaveBeenCalled();
    expect(service.getAlerts().length).toBe(0);
  });

  it('should clear all alerts', () => {
    service.processSecurityEvent({ type: 'login', status: 'failed', attempts: 6 });
    expect(service.getAlerts().length).toBe(1);

    service.clearAlerts();
    expect(service.getAlerts().length).toBe(0);
  });

  it('should generate unique alert IDs', () => {
    const event = { type: 'test', status: 'test', attempts: 10 };
    service.processSecurityEvent(event);
    service.processSecurityEvent(event);

    const alerts = service.getAlerts();
    expect(alerts[0].id).not.toBe(alerts[1].id);
  });

  it('should handle multiple rules and generate alerts for all violations', () => {
    const customRule2 = jest.fn((event) => event.type === 'data_breach');
    service.addMonitoringRule('dataBreachRule', customRule2);

    const event1 = { type: 'login', status: 'failed', attempts: 6 };
    const event2 = { type: 'data_breach', details: 'sensitive data exposed' };

    service.processSecurityEvent(event1);
    service.processSecurityEvent(event2);

    const alerts = service.getAlerts();
    expect(alerts.length).toBe(2);
    expect(alerts.some(alert => alert.ruleId === 'suspiciousLogin')).toBe(true);
    expect(alerts.some(alert => alert.ruleId === 'dataBreachRule')).toBe(true);
  });
});
