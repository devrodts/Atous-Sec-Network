import { EventEmitter } from 'events';
import {
  AnalyticsConfig,
  DataPoint,
  ProcessedDataPoint,
  CollectionResult,
  ProcessingResult,
  VisualizationResult,
  ReportResult,
  ScheduleResult,
  TimeSeriesAnalysis,
  AnomalyDetectionResult,
  AnalyticsError,
  ChartType
} from './types';
import { DataCollector } from './DataCollector';
import { DataProcessor } from './DataProcessor';
import { VisualizationEngine } from './VisualizationEngine';
import { ReportGenerator } from './ReportGenerator';

export * from './types';

export class AdvancedAnalyticsSystem extends EventEmitter {
  private config: AnalyticsConfig;
  private collector: DataCollector;
  private processor: DataProcessor;
  private visualizer: VisualizationEngine;
  private reporter: ReportGenerator;
  private initialized: boolean = false;

  constructor(config: AnalyticsConfig) {
    super();
    this.validateConfig(config);
    this.config = config;
    
    // Initialize components
    this.collector = new DataCollector(config);
    this.processor = new DataProcessor(config);
    this.visualizer = new VisualizationEngine(config);
    this.reporter = new ReportGenerator(config);

    // Set up event handlers
    this.setupEventHandlers();
    this.initialized = true;
  }

  private validateConfig(config: AnalyticsConfig): void {
    // Validate data collection config
    if (config.dataCollection.interval < 1) {
      throw new Error('Collection interval must be at least 1 second');
    }
    if (config.dataCollection.batchSize < 1) {
      throw new Error('Batch size must be at least 1');
    }
    if (config.dataCollection.retentionPeriod < 1) {
      throw new Error('Retention period must be at least 1 day');
    }

    // Validate processing config
    if (config.processing.aggregationInterval < 1) {
      throw new Error('Aggregation interval must be at least 1 second');
    }
    if (config.processing.windowSize < config.processing.aggregationInterval) {
      throw new Error('Window size must be greater than or equal to aggregation interval');
    }

    // Validate visualization config
    if (!['2D', '3D'].includes(config.visualization.dimensions)) {
      throw new Error('Invalid visualization dimensions');
    }

    // Validate reporting config
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(config.reporting.compressionLevel)) {
      throw new Error('Invalid compression level');
    }
  }

  private setupEventHandlers(): void {
    // Handle collector events
    this.collector.on('data', async (data: DataPoint[]) => {
      try {
        const result = await this.processor.process(data);
        if (result.success && result.processedData) {
          this.emit('dataProcessed', result.processedData);
        }
      } catch (error) {
        this.handleError('Data processing error', error);
      }
    });

    this.collector.on('error', (error: AnalyticsError) => {
      this.handleError('Data collection error', error);
    });

    // Handle processor events
    this.processor.on('error', (error: AnalyticsError) => {
      this.handleError('Data processing error', error);
    });

    // Handle visualizer events
    this.visualizer.on('error', (error: AnalyticsError) => {
      this.handleError('Visualization error', error);
    });

    // Handle reporter events
    this.reporter.on('error', (error: AnalyticsError) => {
      this.handleError('Report generation error', error);
    });

    this.reporter.on('reportGenerated', (data: { reportId: string }) => {
      this.emit('reportGenerated', data);
    });
  }

  private handleError(context: string, error: any): void {
    const analyticsError: AnalyticsError = {
      name: 'AnalyticsSystemError',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: error.code || 'SYSTEM_ERROR',
      severity: error.severity || 'HIGH',
      timestamp: new Date(),
      context,
      stack: error instanceof Error ? error.stack : undefined
    };

    this.emit('error', analyticsError);
    console.error('Analytics System Error:', analyticsError);
  }

  async collectData(dataPoint: DataPoint): Promise<CollectionResult> {
    try {
      if (!this.initialized) {
        throw new Error('Analytics system not initialized');
      }
      return await this.collector.collect(dataPoint);
    } catch (error) {
      this.handleError('Data collection error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async collectBatchData(dataPoints: DataPoint[]): Promise<CollectionResult> {
    try {
      if (!this.initialized) {
        throw new Error('Analytics system not initialized');
      }
      return await this.collector.collectBatch(dataPoints);
    } catch (error) {
      this.handleError('Batch data collection error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async processData(data: DataPoint[]): Promise<ProcessingResult> {
    try {
      if (!this.initialized) {
        throw new Error('Analytics system not initialized');
      }
      return await this.processor.process(data);
    } catch (error) {
      this.handleError('Data processing error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async analyzeTimeSeries(data: DataPoint[]): Promise<TimeSeriesAnalysis> {
    try {
      if (!this.initialized) {
        throw new Error('Analytics system not initialized');
      }
      return await this.processor.analyzeTimeSeries(data);
    } catch (error) {
      this.handleError('Time series analysis error', error);
      throw error;
    }
  }

  async detectAnomalies(data: DataPoint[]): Promise<AnomalyDetectionResult> {
    try {
      if (!this.initialized) {
        throw new Error('Analytics system not initialized');
      }
      return await this.processor.detectAnomalies(data);
    } catch (error) {
      this.handleError('Anomaly detection error', error);
      throw error;
    }
  }

  async createVisualization(
    data: ProcessedDataPoint[],
    options: { type: ChartType; title?: string }
  ): Promise<VisualizationResult> {
    try {
      if (!this.initialized) {
        throw new Error('Analytics system not initialized');
      }
      return await this.visualizer.create(data, options);
    } catch (error) {
      this.handleError('Visualization creation error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async generateReport(options: {
    title: string;
    data: ProcessedDataPoint[];
    period?: { start: Date; end: Date };
  }): Promise<ReportResult> {
    try {
      if (!this.initialized) {
        throw new Error('Analytics system not initialized');
      }
      return await this.reporter.generate(options);
    } catch (error) {
      this.handleError('Report generation error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async scheduleReport(options: {
    title: string;
    metrics: string[];
    schedule: { frequency: string; time?: string; timezone?: string };
  }): Promise<ScheduleResult> {
    try {
      if (!this.initialized) {
        throw new Error('Analytics system not initialized');
      }
      return await this.reporter.scheduleReport(options);
    } catch (error) {
      this.handleError('Report scheduling error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getStatus(): {
    initialized: boolean;
    collector: ReturnType<DataCollector['getStatus']>;
    processor: ReturnType<DataProcessor['getStatus']>;
    visualizer: ReturnType<VisualizationEngine['getStatus']>;
    reporter: ReturnType<ReportGenerator['getStatus']>;
  } {
    return {
      initialized: this.initialized,
      collector: this.collector.getStatus(),
      processor: this.processor.getStatus(),
      visualizer: this.visualizer.getStatus(),
      reporter: this.reporter.getStatus()
    };
  }

  async shutdown(): Promise<void> {
    try {
      // Cleanup all components
      await this.collector.shutdown();
      await this.reporter.cleanup();
      await this.visualizer.cleanup();

      this.removeAllListeners();
      this.initialized = false;

    } catch (error) {
      this.handleError('Shutdown error', error);
      throw error;
    }
  }
} 