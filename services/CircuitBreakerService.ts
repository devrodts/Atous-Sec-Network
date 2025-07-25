import { ICircuitBreaker } from '../common-interfaces/BridgeTypes';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  expectedExceptions: string[];
  slowCallDurationThreshold: number;
  slowCallRateThreshold: number;
  slidingWindowSize: number;
  minimumNumberOfCalls: number;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CallResult {
  success: boolean;
  duration: number;
  timestamp: Date;
  error?: Error;
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureRate: number;
  slowCallRate: number;
  totalCalls: number;
  failedCalls: number;
  slowCalls: number;
  successfulCalls: number;
  lastFailureTime: Date | undefined;
  lastSuccessTime: Date | undefined;
  stateTransitions: number;
  uptime: number;
}

export interface CircuitBreakerOptions {
  name: string;
  config: Partial<CircuitBreakerConfig>;
  onStateChange?: (state: CircuitBreakerState, stats: CircuitBreakerStats) => void;
  onFailure?: (error: Error, stats: CircuitBreakerStats) => void;
  onSuccess?: (duration: number, stats: CircuitBreakerStats) => void;
}

export class CircuitBreakerService implements ICircuitBreaker {
  private name: string;
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private callHistory: CallResult[] = [];
  private lastFailureTime: Date | undefined;
  private lastSuccessTime: Date | undefined;
  private stateTransitions: number = 0;
  private nextAttemptTime: Date | undefined;
  private halfOpenCallsCount: number = 0;
  private startTime: Date = new Date();

  // Event handlers
  private onStateChange: ((state: CircuitBreakerState, stats: CircuitBreakerStats) => void) | undefined;
  private onFailure: ((error: Error, stats: CircuitBreakerStats) => void) | undefined;
  private onSuccess: ((duration: number, stats: CircuitBreakerStats) => void) | undefined;

  // Metrics tracking
  private totalCalls: number = 0;
  private failedCalls: number = 0;
  private slowCalls: number = 0;
  private successfulCalls: number = 0;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.config = {
      failureThreshold: 50, // 50% failure rate
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      expectedExceptions: ['TimeoutError', 'ConnectionError', 'ServiceUnavailableError'],
      slowCallDurationThreshold: 5000, // 5 seconds
      slowCallRateThreshold: 80, // 80% slow calls
      slidingWindowSize: 100, // Last 100 calls
      minimumNumberOfCalls: 10, // Minimum calls before evaluating
      ...options.config
    };

    this.onStateChange = options.onStateChange;
    this.onFailure = options.onFailure;
    this.onSuccess = options.onSuccess;

    console.log(`[CircuitBreaker:${this.name}] Initialized with config:`, this.config);
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      const error = new Error(`Circuit breaker [${this.name}] is OPEN. Operation rejected.`);
      error.name = 'CircuitBreakerOpenError';
      // Record the rejected call as a failure
      const callResult: CallResult = {
        success: false,
        duration: 0,
        timestamp: new Date(),
        error: error
      };
      this.recordCall(callResult);
      this.onFailedCall(error);
      if (this.onFailure) {
        this.onFailure(error, this.getStats());
      }
      throw error;
    }

    const startTime = Date.now();
    let result: T;
    let callResult: CallResult;

    try {
      // Execute the operation
      result = await operation();
      
      const duration = Date.now() - startTime;
      const isSlowCall = duration > this.config.slowCallDurationThreshold;

      callResult = {
        success: true,
        duration,
        timestamp: new Date()
      };

      this.recordCall(callResult);
      this.onSuccessfulCall(duration, isSlowCall);

      if (this.onSuccess) {
        this.onSuccess(duration, this.getStats());
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      callResult = {
        success: false,
        duration,
        timestamp: new Date(),
        error: error as Error
      };

      this.recordCall(callResult);
      this.onFailedCall(error as Error);

      if (this.onFailure) {
        this.onFailure(error as Error, this.getStats());
      }

      throw error;
    }
  }

  private canExecute(): boolean {
    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return true;

      case CircuitBreakerState.OPEN:
        if (this.shouldAttemptReset()) {
          this.transitionTo(CircuitBreakerState.HALF_OPEN);
          return true;
        }
        return false;

      case CircuitBreakerState.HALF_OPEN:
        return this.halfOpenCallsCount < this.config.minimumNumberOfCalls;

      default:
        return false;
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) {
      return true;
    }
    return Date.now() >= this.nextAttemptTime.getTime();
  }

  private recordCall(result: CallResult): void {
    this.totalCalls++;
    this.callHistory.push(result);
    // Maintain sliding window
    if (this.callHistory.length > this.config.slidingWindowSize) {
      this.callHistory.shift();
    }
    // Clean old calls outside monitoring period
    const cutoffTime = new Date(Date.now() - this.config.monitoringPeriod);
    this.callHistory = this.callHistory.filter(call => call.timestamp >= cutoffTime);
  }

  private onSuccessfulCall(_duration: number, isSlowCall: boolean): void {
    this.successfulCalls++;
    this.lastSuccessTime = new Date();

    if (isSlowCall) {
      this.slowCalls++;
    }

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenCallsCount++;
      
      // Check if we can close the circuit
      if (this.shouldCloseCircuit()) {
        this.transitionTo(CircuitBreakerState.CLOSED);
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Check if slow call rate is too high
      if (this.shouldOpenDueToSlowCalls()) {
        this.transitionTo(CircuitBreakerState.OPEN);
      }
    }
  }

  private onFailedCall(_error: Error): void {
    this.failedCalls++;
    this.lastFailureTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.transitionTo(CircuitBreakerState.OPEN);
    } else if (this.state === CircuitBreakerState.CLOSED) {
      if (this.shouldOpenCircuit()) {
        this.transitionTo(CircuitBreakerState.OPEN);
      }
    }
  }

  private shouldOpenCircuit(): boolean {
    if (this.callHistory.length < this.config.minimumNumberOfCalls) {
      return false;
    }

    const failureRate = this.calculateFailureRate();
    return failureRate >= this.config.failureThreshold;
  }

  private shouldOpenDueToSlowCalls(): boolean {
    if (this.callHistory.length < this.config.minimumNumberOfCalls) {
      return false;
    }

    const slowCallRate = this.calculateSlowCallRate();
    return slowCallRate >= this.config.slowCallRateThreshold;
  }

  private shouldCloseCircuit(): boolean {
    if (this.halfOpenCallsCount < this.config.minimumNumberOfCalls) {
      return false;
    }

    const recentCalls = this.callHistory.slice(-this.halfOpenCallsCount);
    const successfulCalls = recentCalls.filter(call => call.success).length;
    const successRate = (successfulCalls / recentCalls.length) * 100;

    return successRate >= (100 - this.config.failureThreshold);
  }

  private calculateFailureRate(): number {
    if (this.callHistory.length === 0) return 0;

    const failedCalls = this.callHistory.filter(call => !call.success).length;
    return (failedCalls / this.callHistory.length) * 100;
  }

  private calculateSlowCallRate(): number {
    if (this.callHistory.length === 0) return 0;

    const slowCalls = this.callHistory.filter(call => 
      call.duration > this.config.slowCallDurationThreshold
    ).length;
    return (slowCalls / this.callHistory.length) * 100;
  }

  private transitionTo(newState: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = newState;
    this.stateTransitions++;

    switch (newState) {
      case CircuitBreakerState.OPEN:
        this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeout);
        console.log(`[CircuitBreaker:${this.name}] State: ${oldState} -> OPEN, next attempt at: ${this.nextAttemptTime}`);
        break;

      case CircuitBreakerState.HALF_OPEN:
        this.halfOpenCallsCount = 0;
        this.nextAttemptTime = undefined;
        console.log(`[CircuitBreaker:${this.name}] State: ${oldState} -> HALF_OPEN, allowing test calls`);
        break;

      case CircuitBreakerState.CLOSED:
        this.nextAttemptTime = undefined;
        this.halfOpenCallsCount = 0;
        console.log(`[CircuitBreaker:${this.name}] State: ${oldState} -> CLOSED, normal operation resumed`);
        break;
    }

    if (this.onStateChange) {
      this.onStateChange(newState, this.getStats());
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  isOpen(): boolean {
    return this.state === CircuitBreakerState.OPEN;
  }

  isClosed(): boolean {
    return this.state === CircuitBreakerState.CLOSED;
  }

  isHalfOpen(): boolean {
    return this.state === CircuitBreakerState.HALF_OPEN;
  }

  getStats(): CircuitBreakerStats {
    const uptime = (Date.now() - this.startTime.getTime()) / 1000;

    return {
      state: this.state,
      failureRate: this.calculateFailureRate(),
      slowCallRate: this.calculateSlowCallRate(),
      totalCalls: this.totalCalls,
      failedCalls: this.failedCalls,
      slowCalls: this.slowCalls,
      successfulCalls: this.successfulCalls,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateTransitions: this.stateTransitions,
      uptime
    };
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.callHistory = [];
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.stateTransitions = 0;
    this.nextAttemptTime = undefined;
    this.halfOpenCallsCount = 0;
    this.totalCalls = 0;
    this.failedCalls = 0;
    this.slowCalls = 0;
    this.successfulCalls = 0;
    this.startTime = new Date();

    console.log(`[CircuitBreaker:${this.name}] Circuit breaker reset to CLOSED state`);
  }

  /**
   * Force the circuit breaker to a specific state (for testing)
   */
  forceState(state: CircuitBreakerState): void {
    console.log(`[CircuitBreaker:${this.name}] Force state change: ${this.state} -> ${state}`);
    this.transitionTo(state);
  }

  /**
   * Get the configuration
   */
  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration
   */
  updateConfig(newConfig: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`[CircuitBreaker:${this.name}] Configuration updated:`, newConfig);
  }

  /**
   * Get call history for analysis
   */
  getCallHistory(): CallResult[] {
    return [...this.callHistory];
  }

  /**
   * Check if an exception should be considered for circuit breaking
   */
  private isExpectedException(_error: Error): boolean {
    return this.config.expectedExceptions.includes(_error.name) || 
           this.config.expectedExceptions.includes(_error.constructor.name);
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    healthy: boolean;
    status: string;
    details: CircuitBreakerStats;
  } {
    const stats = this.getStats();
    const healthy = this.state === CircuitBreakerState.CLOSED && 
                   stats.failureRate < this.config.failureThreshold;

    return {
      healthy,
      status: healthy ? 'healthy' : `unhealthy (${this.state})`,
      details: stats
    };
  }

  /**
   * Create a circuit breaker factory
   */
  static createFactory(defaultConfig: Partial<CircuitBreakerConfig> = {}): {
    create: (name: string, config?: Partial<CircuitBreakerConfig>) => CircuitBreakerService;
    getAll: () => Map<string, CircuitBreakerService>;
    getByName: (name: string) => CircuitBreakerService | undefined;
  } {
    const circuitBreakers = new Map<string, CircuitBreakerService>();

    return {
      create: (name: string, config: Partial<CircuitBreakerConfig> = {}) => {
        if (circuitBreakers.has(name)) {
          throw new Error(`Circuit breaker with name '${name}' already exists`);
        }

        const circuitBreaker = new CircuitBreakerService({
          name,
          config: { ...defaultConfig, ...config }
        });

        circuitBreakers.set(name, circuitBreaker);
        return circuitBreaker;
      },

      getAll: () => new Map(circuitBreakers),

      getByName: (name: string) => circuitBreakers.get(name)
    };
  }
} 