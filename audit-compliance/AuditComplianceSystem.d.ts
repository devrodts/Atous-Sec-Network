/**
 * AUDIT & COMPLIANCE SYSTEM
 * Sistema de auditoria e conformidade para transações e ações do usuário
 */
import { EventEmitter } from './types';
import { RedisCacheService } from '../services/RedisCacheService';
import { PrometheusMetricsCollector } from '../services/PrometheusMetricsCollector';
import { AuditAction, ComplianceCheck, ComplianceReport, Transaction } from './types';
export declare class AuditComplianceSystem extends EventEmitter {
    private readonly cacheService;
    private readonly metricsCollector;
    private readonly TRANSACTION_LIMIT;
    private readonly WHITELIST_DESTINATIONS;
    constructor(cacheService: RedisCacheService, metricsCollector: PrometheusMetricsCollector);
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    recordAuditTrail(userId: string, action: AuditAction): Promise<void>;
    recordBulkAuditTrail(userId: string, actions: AuditAction[]): Promise<void>;
    getAuditTrail(userId: string): Promise<any[]>;
    checkTransactionCompliance(transaction: Transaction): Promise<ComplianceCheck>;
    private checkSuspiciousPatterns;
    generateComplianceReport(startDate: Date, endDate: Date): Promise<ComplianceReport>;
    exportAuditLogs(startDate: Date, endDate: Date, format?: 'csv' | 'json'): Promise<string>;
}
//# sourceMappingURL=AuditComplianceSystem.d.ts.map