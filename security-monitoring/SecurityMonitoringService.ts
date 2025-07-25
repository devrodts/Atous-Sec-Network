export class SecurityMonitoringService {
    private alerts: any[] = [];
    private monitoringRules: Map<string, (event: any) => boolean> = new Map();

    constructor() {
        // Example: Add a default rule for suspicious login attempts
        this.addMonitoringRule('suspiciousLogin', (event: any) => {
            return event.type === 'login' && event.status === 'failed' && event.attempts > 5;
        });
    }

    /**
     * Adds a new security monitoring rule.
     * @param ruleId A unique ID for the rule.
     * @param checkFunction A function that takes an event and returns true if the rule is violated.
     */
    public addMonitoringRule(ruleId: string, checkFunction: (event: any) => boolean): void {
        this.monitoringRules.set(ruleId, checkFunction);
    }

    /**
     * Removes a security monitoring rule.
     * @param ruleId The ID of the rule to remove.
     * @returns True if the rule was removed, false otherwise.
     */
    public removeMonitoringRule(ruleId: string): boolean {
        return this.monitoringRules.delete(ruleId);
    }

    /**
     * Processes a security event and checks against all monitoring rules.
     * If any rule is violated, an alert is generated.
     * @param event The security event to process.
     */
    public processSecurityEvent(event: any): void {
        this.monitoringRules.forEach((checkFunction, ruleId) => {
            if (checkFunction(event)) {
                this.generateAlert(ruleId, event);
            }
        });
    }

    /**
     * Retrieves all generated security alerts.
     * @returns An array of security alerts.
     */
    public getAlerts(): any[] {
        return [...this.alerts];
    }

    /**
     * Clears all generated security alerts.
     */
    public clearAlerts(): void {
        this.alerts = [];
    }

    private generateAlert(ruleId: string, event: any): void {
        const alert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            ruleId: ruleId,
            timestamp: new Date(),
            event: event,
            severity: 'HIGH', // Simplified: always HIGH for now
            status: 'NEW',
        };
        this.alerts.push(alert);
        console.warn(`SECURITY ALERT: Rule '${ruleId}' violated by event:`, event);
    }
}
