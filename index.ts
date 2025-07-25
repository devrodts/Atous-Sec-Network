#!/usr/bin/env node

/**
 * Atous-Orch Integration Bridge
 * Main entry point for the bridge service
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { RealAtousOrchBridgeService } from './atous-orch-bridge/RealAtousOrchBridgeService';
import { RealHardwareMetricsCollector } from './hardware-metrics/RealHardwareMetricsCollector';
import { RealP2PNetworkManager } from './p2p-network/RealP2PNetworkManager';
import { RealRWABFTConsensus } from './consensus-engine/RealRWABFTConsensus';
import { RealABISSEngine } from './threat-detection/RealABISSEngine';
import { PrometheusMetricsCollector } from './services/PrometheusMetricsCollector';
import { RedisCacheService } from './services/RedisCacheService';
import { CircuitBreakerService } from './services/CircuitBreakerService';

const PORT = process.env.BRIDGE_PORT || 3001;
const ATOUS_URL = process.env.ATOUS_URL || 'http://localhost:8080';
const ORCH_URL = process.env.ORCH_URL || 'http://localhost:3000';

class AtousOrchBridge {
    private app: express.Application;
    private bridgeService!: RealAtousOrchBridgeService;
    private hardwareCollector!: RealHardwareMetricsCollector;
    private p2pManager!: RealP2PNetworkManager;
    private consensus!: RealRWABFTConsensus;
    private abissEngine!: RealABISSEngine;
    private metricsCollector!: PrometheusMetricsCollector;
    private cacheService!: RedisCacheService;
    private atousCircuitBreaker!: CircuitBreakerService;
    private orchCircuitBreaker!: CircuitBreakerService;

    constructor() {
        this.app = express();
        this.initializeServices();
        this.setupMiddleware();
        this.setupRoutes();
    }

    private initializeServices(): void {
        console.log('🚀 Initializing Atous-Orch Bridge Services...');
        
        try {
            // Initialize dependencies first
            this.metricsCollector = new PrometheusMetricsCollector();
            this.cacheService = new RedisCacheService({
                host: 'localhost',
                port: 6379
            });
            this.atousCircuitBreaker = new CircuitBreakerService({
                name: 'atous',
                config: {}
            });
            this.orchCircuitBreaker = new CircuitBreakerService({
                name: 'orch',
                config: {}
            });
            
            // Initialize core services
            this.bridgeService = new RealAtousOrchBridgeService(
                this.cacheService,
                this.atousCircuitBreaker,
                this.orchCircuitBreaker,
                this.metricsCollector
            );
            this.hardwareCollector = new RealHardwareMetricsCollector();
            this.p2pManager = new RealP2PNetworkManager();
            this.consensus = new RealRWABFTConsensus();
            this.abissEngine = new RealABISSEngine();

            console.log('✅ Bridge services initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize bridge services:', error);
            process.exit(1);
        }
    }

    private setupMiddleware(): void {
        // CORS configuration
        this.app.use(cors({
            origin: ['http://localhost:3000', 'http://localhost:8080'],
            credentials: true
        }));

        // JSON parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    private setupRoutes(): void {
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'UP',
                service: 'Atous-Orch Bridge',
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                services: {
                    bridge: 'ACTIVE',
                    hardware: 'COLLECTING',
                    p2p: 'CONNECTED',
                    consensus: 'OPERATIONAL',
                    abiss: 'MONITORING',
                    metrics: 'COLLECTING'
                }
            });
        });

        // Bridge status
        this.app.get('/api/v1/bridge/status', async (req, res) => {
            try {
                const status = this.bridgeService.getConnectionStatus();
                res.json(status);
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to get bridge status',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Hardware metrics
        this.app.get('/api/v1/hardware/metrics', async (req, res) => {
            try {
                const metrics = await this.hardwareCollector.collectMetrics();
                res.json(metrics);
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to collect hardware metrics',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // P2P network status
        this.app.get('/api/v1/p2p/status', (req, res) => {
            try {
                const status = this.p2pManager.getNetworkStats();
                res.json(status);
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to get P2P status',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Consensus engine status
        this.app.get('/api/v1/consensus/status', (req, res) => {
            try {
                const status = this.consensus.getConsensusStats();
                res.json(status);
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to get consensus status',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // ABISS threat analysis
        this.app.post('/api/v1/abiss/analyze', async (req, res) => {
            try {
                const source = req.ip || req.connection.remoteAddress || 'unknown';
                const context = req.body.context || 'transaction';
                const analysis = await this.abissEngine.analyzeThreat(req.body, source, context);
                res.json(analysis);
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to analyze threat',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Metrics endpoint (Prometheus format)
        this.app.get('/metrics', async (req, res) => {
            try {
                const metrics = await this.metricsCollector.getMetrics();
                res.set('Content-Type', 'text/plain');
                res.send(metrics);
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to get metrics',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Bridge operations
        this.app.post('/api/v1/bridge/transaction', async (req, res) => {
            try {
                const result = await this.bridgeService.processCognitiveRequest(req.body);
                res.json(result);
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to process transaction',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Error handling
        this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
            console.error('Bridge Error:', error);
            res.status(500).json({
                error: 'Internal Bridge Error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Endpoint not found',
                path: req.originalUrl,
                timestamp: new Date().toISOString()
            });
        });
    }

    public async start(): Promise<void> {
        try {
            // Start background services
            await this.startBackgroundServices();

            // Start HTTP server
            const server = createServer(this.app);
            
            server.listen(PORT, () => {
                console.log(`🌉 Atous-Orch Bridge running on port ${PORT}`);
                console.log(`📊 Health check: http://localhost:${PORT}/health`);
                console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
                console.log(`🔗 Atous URL: ${ATOUS_URL}`);
                console.log(`🎯 Orch URL: ${ORCH_URL}`);
            });

            // Graceful shutdown
            process.on('SIGTERM', () => this.shutdown());
            process.on('SIGINT', () => this.shutdown());

        } catch (error) {
            console.error('❌ Failed to start bridge:', error);
            process.exit(1);
        }
    }

    private async startBackgroundServices(): Promise<void> {
        console.log('🔄 Starting background services...');
        
        try {
            // Start hardware metrics collection
            this.hardwareCollector.startPeriodicCollection(30000); // Every 30 seconds
            
            // Start P2P network
            await this.p2pManager.startNetwork();
            
            // Initialize consensus
            await this.consensus.initialize();
            
            // Start ABISS monitoring
            await this.abissEngine.startMonitoring();
            
            console.log('✅ All background services started');
        } catch (error) {
            console.error('❌ Failed to start background services:', error);
            throw error;
        }
    }

    private async shutdown(): Promise<void> {
        console.log('🛑 Shutting down Atous-Orch Bridge...');
        
        try {
            // Stop background services
            this.hardwareCollector.stopPeriodicCollection();
            await this.p2pManager.stopNetwork();
            await this.consensus.shutdown();
            await this.abissEngine.stopMonitoring();
            
            console.log('✅ Bridge shut down gracefully');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    }
}

// Main entry point
async function main(): Promise<void> {
    try {
        console.log('🚀 Starting Atous-Orch Integration Bridge...');
        console.log('📅 Version: 1.0.0');
        console.log('🕐 Started at:', new Date().toISOString());
        
        const bridge = new AtousOrchBridge();
        await bridge.start();
        
    } catch (error) {
        console.error('💥 Fatal error starting bridge:', error);
        process.exit(1);
    }
}

// Start the bridge if this file is run directly
if (require.main === module) {
    main().catch(console.error);
}

export { AtousOrchBridge };
export default main; 