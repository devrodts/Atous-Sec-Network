import { EventEmitter } from 'events';
import { DataPoint, CollectionResult, AnalyticsConfig, AnalyticsError } from './types';

export class DataCollector extends EventEmitter {
  private config: AnalyticsConfig['dataCollection'];
  private buffer: DataPoint[] = [];
  private lastFlush: Date = new Date();
  private collectionInterval: NodeJS.Timeout | null = null;

  constructor(config: AnalyticsConfig) {
    super();
    this.config = config.dataCollection;
    this.startCollection();
  }

  private startCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }

    this.collectionInterval = setInterval(() => {
      this.flushBuffer();
    }, this.config.interval * 1000);
  }

  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return;

    try {
      // Process and store the buffered data
      const dataToFlush = [...this.buffer];
      this.buffer = [];
      this.lastFlush = new Date();

      // Emit the data for processing
      this.emit('data', dataToFlush);

      // Clean up old data based on retention period
      await this.cleanOldData();

    } catch (error) {
      const analyticsError: AnalyticsError = {
        name: 'DataCollectionError',
        message: error instanceof Error ? error.message : 'Unknown error during data flush',
        code: 'FLUSH_ERROR',
        severity: 'HIGH',
        timestamp: new Date(),
        stack: error instanceof Error ? error.stack : undefined
      };
      this.emit('error', analyticsError);
    }
  }

  private async cleanOldData(): Promise<void> {
    const cutoff = new Date(Date.now() - this.config.retentionPeriod * 24 * 60 * 60 * 1000);
    
    try {
      // Emit cleanup event for persistent storage handlers
      this.emit('cleanup', cutoff);
    } catch (error) {
      const analyticsError: AnalyticsError = {
        name: 'DataCleanupError',
        message: error instanceof Error ? error.message : 'Unknown error during data cleanup',
        code: 'CLEANUP_ERROR',
        severity: 'MEDIUM',
        timestamp: new Date(),
        stack: error instanceof Error ? error.stack : undefined
      };
      this.emit('error', analyticsError);
    }
  }

  private validateDataPoint(dataPoint: DataPoint): void {
    if (!dataPoint.timestamp || !(dataPoint.timestamp instanceof Date)) {
      throw new Error('Invalid timestamp');
    }
    if (typeof dataPoint.value !== 'number' || isNaN(dataPoint.value)) {
      throw new Error('Invalid value');
    }
    if (typeof dataPoint.metric !== 'string' || !dataPoint.metric) {
      throw new Error('Invalid metric');
    }
    if (!dataPoint.tags || typeof dataPoint.tags !== 'object') {
      throw new Error('Invalid tags');
    }
  }

  async collect(dataPoint: DataPoint): Promise<CollectionResult> {
    try {
      this.validateDataPoint(dataPoint);

      // Add collection metadata
      const enrichedDataPoint: DataPoint = {
        ...dataPoint,
        tags: {
          ...dataPoint.tags,
          collector_id: process.env.COLLECTOR_ID || 'default',
          collection_timestamp: new Date().toISOString()
        }
      };

      // Add to buffer
      this.buffer.push(enrichedDataPoint);

      // Flush if buffer size exceeds threshold
      if (this.buffer.length >= this.config.batchSize) {
        await this.flushBuffer();
      }

      return {
        success: true,
        dataPoint: enrichedDataPoint
      };

    } catch (error) {
      const analyticsError: AnalyticsError = {
        name: 'DataCollectionError',
        message: error instanceof Error ? error.message : 'Unknown error during data collection',
        code: 'COLLECTION_ERROR',
        severity: 'MEDIUM',
        timestamp: new Date(),
        stack: error instanceof Error ? error.stack : undefined
      };
      this.emit('error', analyticsError);

      return {
        success: false,
        error: analyticsError.message
      };
    }
  }

  async collectBatch(dataPoints: DataPoint[]): Promise<CollectionResult> {
    try {
      const results = await Promise.all(dataPoints.map(point => this.collect(point)));
      const successCount = results.filter(r => r.success).length;

      return {
        success: successCount > 0,
        count: successCount,
        error: successCount < dataPoints.length ? 'Some data points failed validation' : undefined
      };

    } catch (error) {
      const analyticsError: AnalyticsError = {
        name: 'BatchCollectionError',
        message: error instanceof Error ? error.message : 'Unknown error during batch collection',
        code: 'BATCH_ERROR',
        severity: 'HIGH',
        timestamp: new Date(),
        stack: error instanceof Error ? error.stack : undefined
      };
      this.emit('error', analyticsError);

      return {
        success: false,
        error: analyticsError.message
      };
    }
  }

  async shutdown(): Promise<void> {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    // Flush any remaining data
    await this.flushBuffer();

    this.removeAllListeners();
  }

  getStatus(): {
    bufferSize: number;
    lastFlush: Date;
    isCollecting: boolean;
  } {
    return {
      bufferSize: this.buffer.length,
      lastFlush: this.lastFlush,
      isCollecting: this.collectionInterval !== null
    };
  }
} 