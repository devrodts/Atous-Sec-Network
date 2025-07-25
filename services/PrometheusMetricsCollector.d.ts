import { IMetricsCollector } from '../common-interfaces/BridgeTypes';
import { BridgeMetrics, ErrorType } from '../common-interfaces/BridgeTypes';
import { Registry } from 'prom-client';
export interface MetricsConfig {
    enableDetailedMetrics: boolean;
    histogramBuckets: number[];
    summaryPercentiles: number[];
    metricPrefix: string;
    labels: Record<string, string>;
}
export interface RequestData {
    requestId: string;
    userId: string;
    type: string;
    timestamp: Date;
    sessionId?: string;
    source?: string;
}
export interface ResponseData {
    requestId: string;
    success: boolean;
    processingTime: number;
    qualityScore?: number;
    fromCache?: boolean;
    timestamp: Date;
    retryAttempts?: number;
}
export interface ErrorData {
    requestId: string;
    errorType: ErrorType | string;
    timestamp: Date;
    message?: string;
    severity?: string;
    source?: string;
}
export declare class PrometheusMetricsCollector implements IMetricsCollector {
    private readonly config;
    private readonly register;
    private readonly counters;
    private readonly gauges;
    private requestCounter;
    private processingTime;
    private qualityScore;
    private errorCounter;
    private qualityGauge;
    private cacheHitRate;
    private concurrentRequests;
    private circuitBreakerState;
    private systemUptime;
    private readonly startTime;
    constructor(config?: Partial<MetricsConfig>);
    increment(metric: string, value?: number): void;
    getMetrics(): Promise<BridgeMetrics>;
    getPrometheusRegistry(): Registry;
    getPrometheusMetrics(): Promise<string>;
    reset(): void;
    recordRequest(data: RequestData): void;
    recordResponse(data: ResponseData): void;
    recordError(data: ErrorData): void;
    getDetailedMetrics(): {
        requests: {
            total: number;
            successful: number;
            failed: number;
        };
        latency: {
            avg: number;
            min: number;
            max: number;
            p95: number;
            p99: number;
        };
        errors: Record<string, number>;
        cache: {
            hits: number;
            misses: number;
            hitRate: number;
        };
        uptime: number;
    };
    startMetricsCollection(intervalMs?: number): NodeJS.Timeout;
    exportMetrics(endpoint?: string): Promise<void>;
}
//# sourceMappingURL=PrometheusMetricsCollector.d.ts.map