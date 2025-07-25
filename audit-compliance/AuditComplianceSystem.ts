/**
 * AUDIT & COMPLIANCE SYSTEM
 * Sistema de auditoria e conformidade para transações e ações do usuário
 */

import {
  AuditConfig,
  SystemAuditRequest,
  SystemAuditResult,
  AuditTrailRequest,
  AuditTrail,
  ComplianceAssessmentRequest,
  ComplianceAssessmentResult,
  RegulatoryReportRequest,
  RegulatoryReportResult,
  ComplianceDashboard,
  QuickComplianceRequest,
  QuickComplianceResult,
  AuditFinding,
  ComplianceException,
  AuditMetrics,
  TrendAnalysis,
  UpcomingAudit,
  RemediationProgress,
  ComplianceMetrics,
  AuditEntry,
  EventEmitter
} from './types';

import { RedisCacheService } from '../services/RedisCacheService';
import { PrometheusMetricsCollector } from '../services/PrometheusMetricsCollector';
import { AuditAction, SimpleComplianceCheck, ComplianceReport, Transaction } from './types';

export class AuditComplianceSystem extends EventEmitter {
  private readonly cacheService: RedisCacheService;
  private readonly metricsCollector: PrometheusMetricsCollector;
  private readonly TRANSACTION_LIMIT = 100000; // 100k ORCH
  private readonly WHITELIST_DESTINATIONS = new Set(['0x456...', '0x789...']);

  constructor(cacheService: RedisCacheService, metricsCollector: PrometheusMetricsCollector) {
    super();
    this.cacheService = cacheService;
    this.metricsCollector = metricsCollector;
    console.log('📋 Audit & Compliance System initialized');
  }

  async initialize(): Promise<void> {
    // Initialize any required resources
    await this.cacheService.connect();
  }

  async shutdown(): Promise<void> {
    // Cleanup resources
    await this.cacheService.disconnect();
  }

  async recordAuditTrail(userId: string, action: AuditAction): Promise<void> {
    const auditEntry = {
      userId,
      action: action.type,
      details: action.details,
      timestamp: new Date()
    };

    const key = `audit:${userId}`;
    const existingTrail = await this.cacheService.get<any[]>(key) || [];
    existingTrail.push(auditEntry);
    await this.cacheService.set(key, existingTrail);

    this.metricsCollector.increment('totalAuditEvents');
  }

  async recordBulkAuditTrail(userId: string, actions: AuditAction[]): Promise<void> {
    for (const action of actions) {
      await this.recordAuditTrail(userId, action);
    }
  }

  async getAuditTrail(userId: string): Promise<any[]> {
    const key = `audit:${userId}`;
    return await this.cacheService.get<any[]>(key) || [];
  }

  async checkTransactionCompliance(transaction: Transaction): Promise<SimpleComplianceCheck> {
    const checks = [];
    let isCompliant = true;

    // Check transaction amount
    const amountCheck: { name: string; passed: boolean; reason?: string } = {
      name: 'amount_limit',
      passed: transaction.amount <= this.TRANSACTION_LIMIT
    };
    if (!amountCheck.passed) {
      amountCheck.reason = `Transaction amount ${transaction.amount} exceeds limit of ${this.TRANSACTION_LIMIT}`;
      isCompliant = false;
    }
    checks.push(amountCheck);

    // Check destination whitelist
    const destinationCheck: { name: string; passed: boolean; reason?: string } = {
      name: 'destination_whitelist',
      passed: this.WHITELIST_DESTINATIONS.has(transaction.destination)
    };
    if (!destinationCheck.passed) {
      destinationCheck.reason = `Destination ${transaction.destination} not in whitelist`;
      isCompliant = false;
    }
    checks.push(destinationCheck);

    // Record metrics
    this.metricsCollector.increment(isCompliant ? 'compliantTransactions' : 'nonCompliantTransactions');

    // Check for suspicious patterns
    await this.checkSuspiciousPatterns(transaction);

    return { compliant: isCompliant, checks };
  }

  private async checkSuspiciousPatterns(transaction: Transaction): Promise<void> {
    const key = `transactions:${transaction.userId}:recent`;
    const recentTransactions = await this.cacheService.get<Transaction[]>(key) || [];
    recentTransactions.push(transaction);

    // Keep only last 10 transactions
    if (recentTransactions.length > 10) {
      recentTransactions.shift();
    }

    await this.cacheService.set(key, recentTransactions, 3600); // 1 hour TTL

    // Check for rapid large transactions
    const largeTransactions = recentTransactions.filter(tx => tx.amount >= 10000);
    if (largeTransactions.length >= 5) {
      this.emit('suspicious_activity', {
        type: 'rapid_large_transactions',
        userId: transaction.userId,
        severity: 'high',
        transactions: largeTransactions
      });
    }
  }

  async generateComplianceReport(startDate: Date, endDate: Date): Promise<ComplianceReport> {
    const allUsers = await this.cacheService.keys('audit:*');
    let totalTransactions = 0;
    let compliantTransactions = 0;
    let nonCompliantTransactions = 0;
    const violations = [];

    for (const userKey of allUsers) {
      const userId = userKey.replace('audit:', '');
      const auditTrail = await this.getAuditTrail(userId);
      
      const periodAudit = auditTrail.filter(entry => {
        const timestamp = new Date(entry.timestamp);
        return timestamp >= startDate && timestamp <= endDate;
      });

      for (const entry of periodAudit) {
        if (entry.action === 'blockchain_transaction') {
          totalTransactions++;
          const check = await this.checkTransactionCompliance(entry.details);
          if (check.compliant) {
            compliantTransactions++;
          } else {
            nonCompliantTransactions++;
            violations.push({
              userId,
              timestamp: entry.timestamp,
              details: entry.details,
              violations: check.checks.filter(c => !c.passed)
            });
          }
        }
      }
    }

    return {
      period: { start: startDate, end: endDate },
      statistics: {
        totalTransactions,
        compliantTransactions,
        nonCompliantTransactions,
        complianceRate: totalTransactions > 0 
          ? (compliantTransactions / totalTransactions) * 100 
          : 100
      },
      violations
    };
  }

  async exportAuditLogs(startDate: Date, endDate: Date, format: 'csv' | 'json' = 'csv'): Promise<string> {
    const allUsers = await this.cacheService.keys('audit:*');
    const allEntries = [];

    for (const userKey of allUsers) {
      const userId = userKey.replace('audit:', '');
      const auditTrail = await this.getAuditTrail(userId);
      
      const periodAudit = auditTrail.filter(entry => {
        const timestamp = new Date(entry.timestamp);
        return timestamp >= startDate && timestamp <= endDate;
      });

      allEntries.push(...periodAudit);
    }

    if (format === 'csv') {
      const header = 'timestamp,userId,action,details\n';
      const rows = allEntries.map(entry => 
        `${entry.timestamp},${entry.userId},${entry.action},${JSON.stringify(entry.details)}`
      );
      return header + rows.join('\n');
    }

    return JSON.stringify(allEntries, null, 2);
  }
}
