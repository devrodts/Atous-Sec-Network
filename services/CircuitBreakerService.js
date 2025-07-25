"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerService = exports.CircuitBreakerState = void 0;
var CircuitBreakerState;
(function (CircuitBreakerState) {
    CircuitBreakerState["CLOSED"] = "CLOSED";
    CircuitBreakerState["OPEN"] = "OPEN";
    CircuitBreakerState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitBreakerState || (exports.CircuitBreakerState = CircuitBreakerState = {}));
class CircuitBreakerService {
    constructor(options) {
        this.state = CircuitBreakerState.CLOSED;
        this.callHistory = [];
        this.stateTransitions = 0;
        this.halfOpenCallsCount = 0;
        this.startTime = new Date();
        // Metrics tracking
        this.totalCalls = 0;
        this.failedCalls = 0;
        this.slowCalls = 0;
        this.successfulCalls = 0;
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
    async execute(operation) {
        if (!this.canExecute()) {
            const error = new Error(`Circuit breaker [${this.name}] is OPEN. Operation rejected.`);
            error.name = 'CircuitBreakerOpenError';
            throw error;
        }
        const startTime = Date.now();
        let result;
        let callResult;
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
        }
        catch (error) {
            const duration = Date.now() - startTime;
            callResult = {
                success: false,
                duration,
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
    }
    canExecute() {
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
    shouldAttemptReset() {
        if (!this.nextAttemptTime) {
            return true;
        }
        return Date.now() >= this.nextAttemptTime.getTime();
    }
    recordCall(result) {
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
    onSuccessfulCall(_duration, isSlowCall) {
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
        }
        else if (this.state === CircuitBreakerState.CLOSED) {
            // Check if slow call rate is too high
            if (this.shouldOpenDueToSlowCalls()) {
                this.transitionTo(CircuitBreakerState.OPEN);
            }
        }
    }
    onFailedCall(_error) {
        this.failedCalls++;
        this.lastFailureTime = new Date();
        if (this.state === CircuitBreakerState.HALF_OPEN) {
            this.transitionTo(CircuitBreakerState.OPEN);
        }
        else if (this.state === CircuitBreakerState.CLOSED) {
            if (this.shouldOpenCircuit()) {
                this.transitionTo(CircuitBreakerState.OPEN);
            }
        }
    }
    shouldOpenCircuit() {
        if (this.callHistory.length < this.config.minimumNumberOfCalls) {
            return false;
        }
        const failureRate = this.calculateFailureRate();
        return failureRate >= this.config.failureThreshold;
    }
    shouldOpenDueToSlowCalls() {
        if (this.callHistory.length < this.config.minimumNumberOfCalls) {
            return false;
        }
        const slowCallRate = this.calculateSlowCallRate();
        return slowCallRate >= this.config.slowCallRateThreshold;
    }
    shouldCloseCircuit() {
        if (this.halfOpenCallsCount < this.config.minimumNumberOfCalls) {
            return false;
        }
        const recentCalls = this.callHistory.slice(-this.halfOpenCallsCount);
        const successfulCalls = recentCalls.filter(call => call.success).length;
        const successRate = (successfulCalls / recentCalls.length) * 100;
        return successRate >= (100 - this.config.failureThreshold);
    }
    calculateFailureRate() {
        if (this.callHistory.length === 0)
            return 0;
        const failedCalls = this.callHistory.filter(call => !call.success).length;
        return (failedCalls / this.callHistory.length) * 100;
    }
    calculateSlowCallRate() {
        if (this.callHistory.length === 0)
            return 0;
        const slowCalls = this.callHistory.filter(call => call.duration > this.config.slowCallDurationThreshold).length;
        return (slowCalls / this.callHistory.length) * 100;
    }
    transitionTo(newState) {
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
    getState() {
        return this.state;
    }
    isOpen() {
        return this.state === CircuitBreakerState.OPEN;
    }
    isClosed() {
        return this.state === CircuitBreakerState.CLOSED;
    }
    isHalfOpen() {
        return this.state === CircuitBreakerState.HALF_OPEN;
    }
    getStats() {
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
    reset() {
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
    forceState(state) {
        console.log(`[CircuitBreaker:${this.name}] Force state change: ${this.state} -> ${state}`);
        this.transitionTo(state);
    }
    /**
     * Get the configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update the configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log(`[CircuitBreaker:${this.name}] Configuration updated:`, newConfig);
    }
    /**
     * Get call history for analysis
     */
    getCallHistory() {
        return [...this.callHistory];
    }
    /**
     * Check if an exception should be considered for circuit breaking
     */
    isExpectedException(_error) {
        return this.config.expectedExceptions.includes(_error.name) ||
            this.config.expectedExceptions.includes(_error.constructor.name);
    }
    /**
     * Get health status
     */
    getHealthStatus() {
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
    static createFactory(defaultConfig = {}) {
        const circuitBreakers = new Map();
        return {
            create: (name, config = {}) => {
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
            getByName: (name) => circuitBreakers.get(name)
        };
    }
}
exports.CircuitBreakerService = CircuitBreakerService;
//# sourceMappingURL=CircuitBreakerService.js.map