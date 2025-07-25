import { MLRoutingEngine, Route, RequestContext } from '../MLRoutingEngine';

describe('MLRoutingEngine', () => {
  let engine: MLRoutingEngine;

  beforeEach(() => {
    engine = new MLRoutingEngine();
  });

  it('should add and retrieve routing rules', () => {
    const rule1: Route = { id: 'rule1', pattern: '/api/v1/users', destination: 'UserService' };
    engine.addRule(rule1);
    expect(engine.getRule('rule1')).toEqual(rule1);
  });

  it('should return undefined for a non-existent rule', () => {
    expect(engine.getRule('nonExistentRule')).toBeUndefined();
  });

  it('should remove a routing rule', () => {
    const rule1: Route = { id: 'rule1', pattern: '/api/v1/users', destination: 'UserService' };
    engine.addRule(rule1);
    expect(engine.removeRule('rule1')).toBe(true);
    expect(engine.getRule('rule1')).toBeUndefined();
  });

  it('should return false when trying to remove a non-existent rule', () => {
    expect(engine.removeRule('nonExistentRule')).toBe(false);
  });

  it('should select the best route based on a simple pattern match', () => {
    engine.addRule({ id: 'rule1', pattern: '/api/v1/users', destination: 'UserService' });
    engine.addRule({ id: 'rule2', pattern: '/api/v1/products', destination: 'ProductService' });

    const context: RequestContext = { path: '/api/v1/users/123', method: 'GET', headers: {} };
    const selectedRoute = engine.selectRoute(context);
    expect(selectedRoute?.destination).toBe('UserService');
  });

  it('should select the best route based on a more specific pattern', () => {
    engine.addRule({ id: 'rule1', pattern: '/api/v1/data', destination: 'GenericDataService' });
    engine.addRule({ id: 'rule2', pattern: '/api/v1/data/sensitive', destination: 'SensitiveDataService' });

    const context: RequestContext = { path: '/api/v1/data/sensitive/user/1', method: 'GET', headers: {} };
    const selectedRoute = engine.selectRoute(context);
    expect(selectedRoute?.destination).toBe('SensitiveDataService');
  });

  it('should return undefined if no route matches', () => {
    engine.addRule({ id: 'rule1', pattern: '/api/v1/users', destination: 'UserService' });
    const context: RequestContext = { path: '/api/v1/orders', method: 'GET', headers: {} };
    const selectedRoute = engine.selectRoute(context);
    expect(selectedRoute).toBeUndefined();
  });

  it('should prioritize rules based on a scoring mechanism (mocked ML model)', () => {
    // Mock a simple ML model that prefers 'high_priority_service'
    jest.spyOn(engine as any, 'predictRouteScore').mockImplementation((rule: Route, context: RequestContext) => {
      if (rule.destination === 'HighPriorityService') return 0.9;
      if (rule.destination === 'LowPriorityService') return 0.1;
      return 0.5;
    });

    engine.addRule({ id: 'rule1', pattern: '/api/v1/tasks', destination: 'LowPriorityService' });
    engine.addRule({ id: 'rule2', pattern: '/api/v1/tasks', destination: 'HighPriorityService' });

    const context: RequestContext = { path: '/api/v1/tasks/urgent', method: 'POST', headers: {} };
    const selectedRoute = engine.selectRoute(context);
    expect(selectedRoute?.destination).toBe('HighPriorityService');
  });

  it('should handle dynamic rule updates and re-evaluate routes', () => {
    engine.addRule({ id: 'rule1', pattern: '/api/v1/data', destination: 'OldService' });
    const context: RequestContext = { path: '/api/v1/data/item', method: 'GET', headers: {} };
    expect(engine.selectRoute(context)?.destination).toBe('OldService');

    // Update rule1 to point to a new service
    engine.addRule({ id: 'rule1', pattern: '/api/v1/data', destination: 'NewService' });
    expect(engine.selectRoute(context)?.destination).toBe('NewService');
  });
});
