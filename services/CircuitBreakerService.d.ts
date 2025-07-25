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
export declare enum CircuitBreakerState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN"
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
export declare class CircuitBreakerService implements ICircuitBreaker {
    private name;
    private config;
    private state;
    private callHistory;
    private lastFailureTime;
    private lastSuccessTime;
    private stateTransitions;
    private nextAttemptTime;
    private halfOpenCallsCount;
    private startTime;
    private onStateChange;
    private onFailure;
    private onSuccess;
    private totalCalls;
    private failedCalls;
    private slowCalls;
    private successfulCalls;
    constructor(options: CircuitBreakerOptions);
    execute<T>(operation: () => Promise<T>): Promise<T>;
    private canExecute;
    private shouldAttemptReset;
    private recordCall;
    private onSuccessfulCall;
    private onFailedCall;
    private shouldOpenCircuit;
    private shouldOpenDueToSlowCalls;
    private shouldCloseCircuit;
    private calculateFailureRate;
    private calculateSlowCallRate;
    private transitionTo;
    getState(): CircuitBreakerState;
    isOpen(): boolean;
    isClosed(): boolean;
    isHalfOpen(): boolean;
    getStats(): CircuitBreakerStats;
    reset(): void;
    /**
     * Force the circuit breaker to a specific state (for testing)
     */
    forceState(state: CircuitBreakerState): void;
    /**
     * Get the configuration
     */
    getConfig(): CircuitBreakerConfig;
    /**
     * Update the configuration
     */
    updateConfig(newConfig: Partial<CircuitBreakerConfig>): void;
    /**
     * Get call history for analysis
     */
    getCallHistory(): CallResult[];
    /**
     * Check if an exception should be considered for circuit breaking
     */
    private isExpectedException;
    /**
     * Get health status
     */
    getHealthStatus(): {
        healthy: boolean;
        status: string;
        details: CircuitBreakerStats;
    };
    /**
     * Create a circuit breaker factory
     */
    static createFactory(defaultConfig?: Partial<CircuitBreakerConfig>): {
        create: (name: string, config?: Partial<CircuitBreakerConfig>) => CircuitBreakerService;
        getAll: () => Map<string, CircuitBreakerService>;
        getByName: (name: string) => CircuitBreakerService | undefined;
    };
}
//# sourceMappingURL=CircuitBreakerService.d.ts.map