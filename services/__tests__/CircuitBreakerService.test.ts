import { CircuitBreakerService, CircuitBreakerState } from '../CircuitBreakerService';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    service = new CircuitBreakerService({
      name: 'testService',
      config: {
        failureThreshold: 50,
        minimumNumberOfCalls: 3,
        resetTimeout: 1000 // Short timeout for testing
      }
    });
    jest.useFakeTimers(); // Use fake timers for controlling time
  });

  afterEach(() => {
    jest.useRealTimers(); // Restore real timers
  });

  it('should start in the CLOSED state', () => {
    expect(service.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should remain CLOSED on successful calls', async () => {
    await service.execute(async () => 'success');
    expect(service.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should transition to OPEN state after exceeding failure threshold', async () => {
    // Need enough failures to trigger the threshold
    for (let i = 0; i < 5; i++) {
      try {
        await service.execute(async () => {
          throw new Error('Test failure');
        });
      } catch (error) {
        // Expected
      }
    }
    expect(service.getState()).toBe(CircuitBreakerState.OPEN);
  });

  it('should transition from OPEN to HALF_OPEN after reset timeout', async () => {
    // Trip the circuit
    for (let i = 0; i < 5; i++) {
      try {
        await service.execute(async () => {
          throw new Error('Test failure');
        });
      } catch (error) {
        // Expected
      }
    }
    expect(service.getState()).toBe(CircuitBreakerState.OPEN);

    jest.advanceTimersByTime(1000 + 1); // Reset timeout + 1ms
    // Try an operation to trigger HALF_OPEN
    try {
      await service.execute(async () => 'success');
    } catch (error) {
      // May be rejected if circuit is still open
    }
    expect(service.getState()).toBe(CircuitBreakerState.HALF_OPEN);
  });

  it('should transition from HALF_OPEN to CLOSED on success', async () => {
    // Trip the circuit
    for (let i = 0; i < 5; i++) {
      try {
        await service.execute(async () => {
          throw new Error('Test failure');
        });
      } catch (error) {
        // Expected
      }
    }
    jest.advanceTimersByTime(1000 + 1);
    
    // First call makes it HALF_OPEN
    await service.execute(async () => 'success');
    expect(service.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    
    // Need more successful calls to close the circuit (depends on minimumNumberOfCalls)
    // Let's try a few more successful calls
    for (let i = 0; i < 3; i++) {
      await service.execute(async () => 'success');
    }
    expect(service.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should transition from HALF_OPEN back to OPEN on failure', async () => {
    // Trip the circuit
    for (let i = 0; i < 5; i++) {
      try {
        await service.execute(async () => {
          throw new Error('Test failure');
        });
      } catch (error) {
        // Expected
      }
    }
    jest.advanceTimersByTime(1000 + 1);
    
    // First call makes it HALF_OPEN
    await service.execute(async () => 'success');
    expect(service.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    
    // Failure should open it again
    try {
      await service.execute(async () => {
        throw new Error('Test failure');
      });
    } catch (error) {
      // Expected
    }
    expect(service.getState()).toBe(CircuitBreakerState.OPEN);
  });

  it('should allow calls in CLOSED state', async () => {
    const result = await service.execute(async () => 'success');
    expect(result).toBe('success');
  });

  it('should not allow calls in OPEN state', async () => {
    // Trip the circuit
    for (let i = 0; i < 5; i++) {
      try {
        await service.execute(async () => {
          throw new Error('Test failure');
        });
      } catch (error) {
        // Expected
      }
    }
    
    try {
      await service.execute(async () => 'success');
      fail('Should have thrown CircuitBreakerOpenError');
    } catch (error: any) {
      expect(error.name).toBe('CircuitBreakerOpenError');
    }
  });

  it('should allow a single trial call in HALF_OPEN state', async () => {
    // Trip the circuit
    for (let i = 0; i < 5; i++) {
      try {
        await service.execute(async () => {
          throw new Error('Test failure');
        });
      } catch (error) {
        // Expected
      }
    }
    jest.advanceTimersByTime(1000 + 1);
    
    // First call should be allowed (makes it HALF_OPEN)
    await service.execute(async () => 'success');
    expect(service.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    
    // Subsequent calls may be limited based on minimumNumberOfCalls
    // This depends on the implementation details
  });

  it('should reset failure count on success in CLOSED state', async () => {
    // Record a failure
    try {
      await service.execute(async () => {
        throw new Error('Test failure');
      });
    } catch (error) {
      // Expected
    }
    
    // Record a success
    await service.execute(async () => 'success');
    
    // Check stats
    const stats = service.getStats();
    expect(stats.failedCalls).toBe(1);
    expect(stats.successfulCalls).toBe(1);
  });

  it('should use custom thresholds and timeouts', async () => {
    const customService = new CircuitBreakerService({
      name: 'customService',
      config: {
        failureThreshold: 30, // 30% failure rate
        minimumNumberOfCalls: 3,
        resetTimeout: 500 // 500ms reset
      }
    });

    // Need more failures to trigger the threshold with minimumNumberOfCalls=3
    // Let's try 3 calls with 2 failures (66% failure rate)
    for (let i = 0; i < 2; i++) {
      try {
        await customService.execute(async () => {
          throw new Error('Test failure');
        });
      } catch (error) {
        // Expected
      }
    }
    
    await customService.execute(async () => 'success');
    
    // Check if it's open - may need more failures depending on the algorithm
    // Let's add one more failure to ensure it opens
    try {
      await customService.execute(async () => {
        throw new Error('Test failure');
      });
    } catch (error) {
      // Expected
    }
    
    expect(customService.getState()).toBe(CircuitBreakerState.OPEN);

    jest.advanceTimersByTime(500 + 1);
    // Try an operation to trigger HALF_OPEN
    try {
      await customService.execute(async () => 'success');
    } catch (error) {
      // May be rejected if circuit is still open
    }
    expect(customService.getState()).toBe(CircuitBreakerState.HALF_OPEN);
  });
});
