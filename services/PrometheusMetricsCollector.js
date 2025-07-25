"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrometheusMetricsCollector = void 0;
const prom_client_1 = require("prom-client");
class PrometheusMetricsCollector {
    constructor(config = {}) {
        this.startTime = new Date();
        this.config = {
            enableDetailedMetrics: true,
            histogramBuckets: config.histogramBuckets || [0.1, 0.5, 1, 2, 5],
            summaryPercentiles: config.summaryPercentiles || [0.5, 0.9, 0.95, 0.99],
            metricPrefix: config.metricPrefix || 'atous_bridge',
            labels: {},
            ...config
        };
        this.register = new prom_client_1.Registry();
        this.counters = new Map();
        this.gauges = new Map();
        const { metricPrefix, histogramBuckets, summaryPercentiles } = this.config;
        // Initialize core metrics
        this.requestCounter = new prom_client_1.Counter({
            name: `${metricPrefix}_requests_total`,
            help: 'Total number of requests processed',
            labelNames: ['type', 'status', 'source'],
            registers: [this.register]
        });
        this.processingTime = new prom_client_1.Histogram({
            name: `${metricPrefix}_processing_time_seconds`,
            help: 'Request processing time in seconds',
            labelNames: ['type', 'status'],
            buckets: histogramBuckets,
            registers: [this.register]
        });
        this.qualityScore = new prom_client_1.Summary({
            name: `${metricPrefix}_quality_score`,
            help: 'Quality score of responses',
            labelNames: ['type'],
            percentiles: summaryPercentiles,
            registers: [this.register]
        });
        this.errorCounter = new prom_client_1.Counter({
            name: `${metricPrefix}_errors_total`,
            help: 'Total number of errors',
            labelNames: ['type', 'severity', 'source'],
            registers: [this.register]
        });
        this.qualityGauge = new prom_client_1.Gauge({
            name: `${metricPrefix}_quality_gauge`,
            help: 'Average quality score of responses',
            labelNames: ['type'],
            registers: [this.register]
        });
        this.cacheHitRate = new prom_client_1.Gauge({
            name: `${metricPrefix}_cache_hit_rate`,
            help: 'Cache hit rate percentage',
            registers: [this.register]
        });
        this.concurrentRequests = new prom_client_1.Gauge({
            name: `${metricPrefix}_concurrent_requests`,
            help: 'Current number of concurrent requests',
            registers: [this.register]
        });
        this.circuitBreakerState = new prom_client_1.Gauge({
            name: `${metricPrefix}_circuit_breaker_state`,
            help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
            labelNames: ['service'],
            registers: [this.register]
        });
        this.systemUptime = new prom_client_1.Gauge({
            name: `${metricPrefix}_uptime_seconds`,
            help: 'System uptime in seconds',
            registers: [this.register]
        });
        // Initialize default counters
        const defaultCounters = [
            'totalAuditEvents',
            'compliantTransactions',
            'nonCompliantTransactions'
        ];
        for (const metric of defaultCounters) {
            this.counters.set(metric, new prom_client_1.Counter({
                name: `${metricPrefix}_${metric}`,
                help: `Counter for ${metric}`,
                registers: [this.register]
            }));
        }
        // Initialize default gauges
        const defaultGauges = [
            'complianceRate',
            'systemHealth'
        ];
        for (const metric of defaultGauges) {
            this.gauges.set(metric, new prom_client_1.Gauge({
                name: `${metricPrefix}_${metric}`,
                help: `Gauge for ${metric}`,
                registers: [this.register]
            }));
        }
        console.log('[PrometheusMetricsCollector] Metrics initialized');
    }
    increment(metric, value = 1) {
        let counter = this.counters.get(metric);
        if (!counter) {
            counter = new prom_client_1.Counter({
                name: `${this.config.metricPrefix}_${metric}`,
                help: `Counter for ${metric}`,
                registers: [this.register]
            });
            this.counters.set(metric, counter);
        }
        counter.inc(value);
    }
    async getMetrics() {
        const metrics = await this.register.getMetricsAsJSON();
        const result = {};
        for (const metric of metrics) {
            result[metric.name] = metric.values[0].value;
        }
        const prefix = this.config.metricPrefix;
        const uptime = (Date.now() - this.startTime.getTime()) / 1000;
        return {
            totalRequests: result[`${prefix}_requests_total`] || 0,
            successfulRequests: result[`${prefix}_successful_requests`] || 0,
            failedRequests: result[`${prefix}_failed_requests`] || 0,
            averageLatency: result[`${prefix}_processing_time_seconds_sum`] / result[`${prefix}_processing_time_seconds_count`] || 0,
            minLatency: result[`${prefix}_processing_time_seconds_min`] || 0,
            maxLatency: result[`${prefix}_processing_time_seconds_max`] || 0,
            p95Latency: result[`${prefix}_processing_time_seconds{quantile="0.95"}`] || 0,
            p99Latency: result[`${prefix}_processing_time_seconds{quantile="0.99"}`] || 0,
            cacheHitRate: result[`${prefix}_cache_hit_rate`] || 0,
            errorRate: (result[`${prefix}_errors_total`] || 0) / (result[`${prefix}_requests_total`] || 1) * 100,
            uptime,
            successRate: (result[`${prefix}_successful_requests`] || 0) / (result[`${prefix}_requests_total`] || 1) * 100,
            concurrentRequests: result[`${prefix}_concurrent_requests`] || 0,
            circuitBreakerState: {
                atous: result[`${prefix}_circuit_breaker_state{service="atous"}`] === 0 ? 'closed' : 'open',
                orch: result[`${prefix}_circuit_breaker_state{service="orch"}`] === 0 ? 'closed' : 'open'
            }
        };
    }
    getPrometheusRegistry() {
        return this.register;
    }
    async getPrometheusMetrics() {
        return this.register.metrics();
    }
    reset() {
        this.register.clear();
        const { metricPrefix, histogramBuckets, summaryPercentiles } = this.config;
        // Re-initialize core metrics
        this.requestCounter = new prom_client_1.Counter({
            name: `${metricPrefix}_requests_total`,
            help: 'Total number of requests processed',
            labelNames: ['type', 'status', 'source'],
            registers: [this.register]
        });
        this.processingTime = new prom_client_1.Histogram({
            name: `${metricPrefix}_processing_time_seconds`,
            help: 'Request processing time in seconds',
            labelNames: ['type', 'status'],
            buckets: histogramBuckets,
            registers: [this.register]
        });
        this.qualityScore = new prom_client_1.Summary({
            name: `${metricPrefix}_quality_score`,
            help: 'Quality score of responses',
            labelNames: ['type'],
            percentiles: summaryPercentiles,
            registers: [this.register]
        });
        this.errorCounter = new prom_client_1.Counter({
            name: `${metricPrefix}_errors_total`,
            help: 'Total number of errors',
            labelNames: ['type', 'severity', 'source'],
            registers: [this.register]
        });
        this.qualityGauge = new prom_client_1.Gauge({
            name: `${metricPrefix}_quality_gauge`,
            help: 'Average quality score of responses',
            labelNames: ['type'],
            registers: [this.register]
        });
        this.cacheHitRate = new prom_client_1.Gauge({
            name: `${metricPrefix}_cache_hit_rate`,
            help: 'Cache hit rate percentage',
            registers: [this.register]
        });
        this.concurrentRequests = new prom_client_1.Gauge({
            name: `${metricPrefix}_concurrent_requests`,
            help: 'Current number of concurrent requests',
            registers: [this.register]
        });
        this.circuitBreakerState = new prom_client_1.Gauge({
            name: `${metricPrefix}_circuit_breaker_state`,
            help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
            labelNames: ['service'],
            registers: [this.register]
        });
        this.systemUptime = new prom_client_1.Gauge({
            name: `${metricPrefix}_uptime_seconds`,
            help: 'System uptime in seconds',
            registers: [this.register]
        });
        // Re-initialize default counters and gauges
        this.counters.clear();
        this.gauges.clear();
        const defaultCounters = [
            'totalAuditEvents',
            'compliantTransactions',
            'nonCompliantTransactions'
        ];
        for (const metric of defaultCounters) {
            this.counters.set(metric, new prom_client_1.Counter({
                name: `${metricPrefix}_${metric}`,
                help: `Counter for ${metric}`,
                registers: [this.register]
            }));
        }
        const defaultGauges = [
            'complianceRate',
            'systemHealth'
        ];
        for (const metric of defaultGauges) {
            this.gauges.set(metric, new prom_client_1.Gauge({
                name: `${metricPrefix}_${metric}`,
                help: `Gauge for ${metric}`,
                registers: [this.register]
            }));
        }
    }
    recordRequest(data) {
        this.requestCounter.inc({
            type: data.type,
            status: 'started',
            source: data.source || 'unknown'
        });
        this.concurrentRequests.inc();
        console.log(`[PrometheusMetricsCollector] Recorded request: ${data.requestId} (${data.type})`);
    }
    recordResponse(data) {
        const processingTimeSeconds = data.processingTime / 1000;
        this.requestCounter.inc({
            type: 'response',
            status: data.success ? 'success' : 'failure',
            source: data.fromCache ? 'cache' : 'processing'
        });
        // Update timing metrics
        this.processingTime.observe({ type: 'cognitive', status: data.success ? 'success' : 'failure' }, processingTimeSeconds);
        // Update internal tracking
        if (data.success) {
            this.counters.set('successful_requests', new prom_client_1.Counter({
                name: `${this.config.metricPrefix}_successful_requests`,
                help: 'Total number of successful requests',
                registers: [this.register]
            }));
        }
        else {
            this.counters.set('failed_requests', new prom_client_1.Counter({
                name: `${this.config.metricPrefix}_failed_requests`,
                help: 'Total number of failed requests',
                registers: [this.register]
            }));
        }
        // Track cache hits/misses
        if (data.fromCache) {
            this.cacheHitRate.set(1);
        }
        else {
            this.cacheHitRate.set(0);
        }
        // Update quality score if available
        if (data.qualityScore !== undefined) {
            this.qualityGauge.set({ type: 'cognitive' }, data.qualityScore);
        }
        this.concurrentRequests.dec();
        console.log(`[PrometheusMetricsCollector] Recorded response: ${data.requestId} (${data.processingTime}ms, success: ${data.success})`);
    }
    recordError(data) {
        this.errorCounter.inc({
            type: data.errorType.toString(),
            severity: data.severity || 'unknown',
            source: data.source || 'bridge'
        });
        console.log(`[PrometheusMetricsCollector] Recorded error: ${data.requestId} (${data.errorType})`);
    }
    getDetailedMetrics() {
        const metrics = this.getMetrics();
        return {
            requests: {
                total: metrics.totalRequests,
                successful: metrics.successfulRequests,
                failed: metrics.failedRequests
            },
            latency: {
                avg: metrics.averageLatency,
                min: metrics.minLatency,
                max: metrics.maxLatency,
                p95: metrics.p95Latency,
                p99: metrics.p99Latency
            },
            errors: {
                total: metrics.failedRequests,
                errorRate: metrics.errorRate
            },
            cache: {
                hits: metrics.successfulRequests,
                misses: metrics.failedRequests,
                hitRate: metrics.cacheHitRate
            },
            uptime: metrics.uptime
        };
    }
    startMetricsCollection(intervalMs = 60000) {
        return setInterval(() => {
            // Update system metrics
            const metrics = this.getMetrics();
            console.log(`[PrometheusMetricsCollector] Metrics update: ${metrics.totalRequests} requests, ${metrics.averageLatency.toFixed(2)}ms avg latency`);
        }, intervalMs);
    }
    async exportMetrics(endpoint) {
        if (!endpoint) {
            console.log('[PrometheusMetricsCollector] No export endpoint configured');
            return;
        }
        try {
            const metricsData = {
                timestamp: new Date().toISOString(),
                service: 'atous-orch-bridge',
                metrics: this.getDetailedMetrics()
            };
            // Here you would send to your monitoring system
            console.log('[PrometheusMetricsCollector] Metrics exported:', JSON.stringify(metricsData, null, 2));
        }
        catch (error) {
            console.error('[PrometheusMetricsCollector] Failed to export metrics:', error);
        }
    }
}
exports.PrometheusMetricsCollector = PrometheusMetricsCollector;
//# sourceMappingURL=PrometheusMetricsCollector.js.map