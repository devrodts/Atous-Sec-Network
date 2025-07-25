import { AdvancedAnalyticsSystem, AnalyticsConfig, DataPoint, AnalyticsReport, Visualization } from '../AdvancedAnalyticsSystem';
import { DataCollector } from '../DataCollector';
import { DataProcessor } from '../DataProcessor';
import { VisualizationEngine } from '../VisualizationEngine';
import { ReportGenerator } from '../ReportGenerator';

jest.mock('../DataCollector');
jest.mock('../DataProcessor');
jest.mock('../VisualizationEngine');
jest.mock('../ReportGenerator');

describe('AdvancedAnalyticsSystem', () => {
  let analytics: AdvancedAnalyticsSystem;
  let defaultConfig: AnalyticsConfig;

  beforeEach(() => {
    defaultConfig = {
      dataCollection: {
        interval: 60, // seconds
        batchSize: 100,
        retentionPeriod: 90 // days
      },
      processing: {
        aggregationInterval: 300, // seconds
        windowSize: 3600, // seconds
        parallelProcessing: true
      },
      visualization: {
        defaultChartType: 'LINE',
        colorScheme: 'QUANTUM',
        interactiveMode: true,
        dimensions: '2D'
      },
      reporting: {
        format: 'HTML',
        autoSchedule: true,
        includeRawData: false,
        compressionLevel: 'HIGH'
      }
    };
    analytics = new AdvancedAnalyticsSystem(defaultConfig);
  });

  describe('Data Collection', () => {
    const testDataPoint: DataPoint = {
      timestamp: new Date(),
      metric: 'CPU_USAGE',
      value: 75.5,
      tags: {
        service: 'consensus-engine',
        node: 'primary'
      }
    };

    it('should collect data points', async () => {
      const result = await analytics.collectData(testDataPoint);
      expect(result.success).toBe(true);
      expect(result.dataPoint).toEqual(testDataPoint);
    });

    it('should handle batch data collection', async () => {
      const dataPoints = Array(5).fill(null).map(() => ({
        ...testDataPoint,
        timestamp: new Date(),
        value: Math.random() * 100
      }));

      const result = await analytics.collectBatchData(dataPoints);
      expect(result.success).toBe(true);
      expect(result.count).toBe(dataPoints.length);
    });

    it('should validate data points', async () => {
      const invalidDataPoint = {
        ...testDataPoint,
        value: 'invalid' as any
      };

      await expect(analytics.collectData(invalidDataPoint)).rejects.toThrow();
    });

    it('should handle collection errors gracefully', async () => {
      jest.spyOn(DataCollector.prototype, 'collect').mockRejectedValue(new Error('Collection failed'));
      
      const result = await analytics.collectData(testDataPoint);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Data Processing', () => {
    const testData = Array(10).fill(null).map((_, i) => ({
      timestamp: new Date(Date.now() - i * 60000),
      metric: 'MEMORY_USAGE',
      value: Math.random() * 100,
      tags: { service: 'cache-system' }
    }));

    it('should process raw data', async () => {
      const result = await analytics.processData(testData);
      expect(result.success).toBe(true);
      expect(result.processedData).toBeDefined();
      expect(result.statistics).toBeDefined();
    });

    it('should calculate accurate statistics', async () => {
      const result = await analytics.processData(testData);
      expect(result.statistics).toEqual(expect.objectContaining({
        count: testData.length,
        average: expect.any(Number),
        min: expect.any(Number),
        max: expect.any(Number)
      }));
    });

    it('should handle time-series analysis', async () => {
      const result = await analytics.analyzeTimeSeries(testData);
      expect(result.trend).toBeDefined();
      expect(result.seasonality).toBeDefined();
      expect(result.forecast).toBeDefined();
    });

    it('should detect anomalies', async () => {
      const anomalousData = [
        ...testData,
        { ...testData[0], value: 999.99 } // Anomalous value
      ];

      const result = await analytics.detectAnomalies(anomalousData);
      expect(result.anomalies).toHaveLength(1);
      expect(result.anomalies[0].confidence).toBeGreaterThan(0.9);
    });
  });

  describe('Visualization', () => {
    const testData = Array(24).fill(null).map((_, i) => ({
      timestamp: new Date(Date.now() - i * 3600000),
      metric: 'NETWORK_LATENCY',
      value: Math.random() * 100,
      tags: { service: 'consensus-engine' }
    }));

    it('should generate visualizations', async () => {
      const result = await analytics.createVisualization(testData, {
        type: 'LINE',
        title: 'Network Latency Over Time'
      });
      expect(result.success).toBe(true);
      expect(result.visualization).toBeDefined();
    });

    it('should support multiple chart types', async () => {
      const chartTypes = ['LINE', 'BAR', 'SCATTER', 'HEATMAP'] as const;
      
      for (const type of chartTypes) {
        const result = await analytics.createVisualization(testData, { type });
        expect(result.success).toBe(true);
        expect(result.visualization.type).toBe(type);
      }
    });

    it('should handle interactive visualizations', async () => {
      const result = await analytics.createVisualization(testData, {
        type: 'LINE',
        interactive: true
      });
      expect(result.visualization.interactive).toBe(true);
      expect(result.visualization.events).toBeDefined();
    });

    it('should apply custom styling', async () => {
      const customStyle = {
        colorScheme: 'QUANTUM',
        fontFamily: 'Arial',
        backgroundColor: '#f0f0f0'
      };

      const result = await analytics.createVisualization(testData, {
        type: 'LINE',
        style: customStyle
      });
      expect(result.visualization.style).toEqual(expect.objectContaining(customStyle));
    });
  });

  describe('Reporting', () => {
    const testData = Array(100).fill(null).map((_, i) => ({
      timestamp: new Date(Date.now() - i * 3600000),
      metric: 'SYSTEM_HEALTH',
      value: Math.random() * 100,
      tags: {
        service: i % 2 ? 'consensus-engine' : 'cache-system'
      }
    }));

    it('should generate comprehensive reports', async () => {
      const result = await analytics.generateReport({
        title: 'System Health Report',
        data: testData,
        period: {
          start: new Date(Date.now() - 24 * 3600000),
          end: new Date()
        }
      });
      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
    });

    it('should include all required sections', async () => {
      const result = await analytics.generateReport({
        title: 'Full System Report',
        data: testData
      });

      const sections = [
        'summary',
        'metrics',
        'trends',
        'anomalies',
        'recommendations'
      ];

      for (const section of sections) {
        expect(result.report.sections).toContainEqual(
          expect.objectContaining({ id: section })
        );
      }
    });

    it('should support different export formats', async () => {
      const formats = ['HTML', 'PDF', 'JSON', 'CSV'] as const;
      
      for (const format of formats) {
        const result = await analytics.generateReport({
          title: 'Export Test',
          data: testData,
          format
        });
        expect(result.success).toBe(true);
        expect(result.report.format).toBe(format);
      }
    });

    it('should handle scheduled reports', async () => {
      const schedule = {
        frequency: 'DAILY',
        time: '00:00',
        timezone: 'UTC'
      };

      const result = await analytics.scheduleReport({
        title: 'Daily System Health',
        metrics: ['SYSTEM_HEALTH'],
        schedule
      });

      expect(result.success).toBe(true);
      expect(result.scheduleId).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid configurations', () => {
      const invalidConfig = {
        ...defaultConfig,
        dataCollection: {
          ...defaultConfig.dataCollection,
          interval: -1 // Invalid interval
        }
      };

      expect(() => new AdvancedAnalyticsSystem(invalidConfig)).toThrow();
    });

    it('should handle processing errors gracefully', async () => {
      jest.spyOn(DataProcessor.prototype, 'process').mockRejectedValue(new Error('Processing failed'));
      
      const result = await analytics.processData([]);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle visualization errors', async () => {
      jest.spyOn(VisualizationEngine.prototype, 'create').mockRejectedValue(new Error('Visualization failed'));
      
      const result = await analytics.createVisualization([], { type: 'LINE' });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle report generation errors', async () => {
      jest.spyOn(ReportGenerator.prototype, 'generate').mockRejectedValue(new Error('Report generation failed'));
      
      const result = await analytics.generateReport({ title: 'Test Report', data: [] });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array(10000).fill(null).map((_, i) => ({
        timestamp: new Date(Date.now() - i * 1000),
        metric: 'PERFORMANCE_TEST',
        value: Math.random() * 100,
        tags: { test: 'performance' }
      }));

      const startTime = Date.now();
      const result = await analytics.processData(largeDataset);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should process in under 5 seconds
    });

    it('should maintain performance under concurrent operations', async () => {
      const operations = Array(10).fill(null).map(() => 
        analytics.collectData({
          timestamp: new Date(),
          metric: 'CONCURRENT_TEST',
          value: Math.random() * 100,
          tags: { test: 'concurrent' }
        })
      );

      const results = await Promise.all(operations);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should integrate collection, processing, and visualization', async () => {
      // Collect data
      const dataPoint = {
        timestamp: new Date(),
        metric: 'INTEGRATION_TEST',
        value: 42,
        tags: { test: 'integration' }
      };
      const collectionResult = await analytics.collectData(dataPoint);
      expect(collectionResult.success).toBe(true);

      // Process collected data
      const processResult = await analytics.processData([dataPoint]);
      expect(processResult.success).toBe(true);

      // Create visualization
      const vizResult = await analytics.createVisualization(processed.processedData, {
        type: 'LINE',
        title: 'Integration Test'
      });
      expect(vizResult.success).toBe(true);

      // Generate report
      const reportResult = await analytics.generateReport({
        title: 'Integration Test Report',
        data: [dataPoint]
      });
      expect(reportResult.success).toBe(true);
    });

    it('should maintain data consistency across operations', async () => {
      const testData = {
        timestamp: new Date(),
        metric: 'CONSISTENCY_TEST',
        value: 100,
        tags: { test: 'consistency' }
      };

      // Full pipeline test
      const collected = await analytics.collectData(testData);
      const processed = await analytics.processData([collected.dataPoint]);
      const visualized = await analytics.createVisualization(processed.processedData, {
        type: 'LINE'
      });
      const reported = await analytics.generateReport({
        title: 'Consistency Test',
        data: processed.processedData
      });

      // Verify data consistency
      expect(collected.dataPoint.value).toBe(testData.value);
      expect(processed.processedData[0].originalValue).toBe(testData.value);
      expect(visualized.visualization.data[0].value).toBe(testData.value);
      expect(reported.report.data[0].value).toBe(testData.value);
    });
  });
}); 