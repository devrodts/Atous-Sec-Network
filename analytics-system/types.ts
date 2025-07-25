/**
 * Analytics System Types
 */

export interface DataPoint {
  timestamp: Date;
  metric: string;
  value: number;
  tags: Record<string, string>;
}

export interface ProcessedDataPoint extends DataPoint {
  originalValue: number;
  normalizedValue: number;
  trend?: number;
  seasonality?: number;
  metadata?: Record<string, any>;
}

export interface AnalyticsConfig {
  dataCollection: {
    interval: number; // seconds
    batchSize: number;
    retentionPeriod: number; // days
  };
  processing: {
    aggregationInterval: number; // seconds
    windowSize: number; // seconds
    parallelProcessing: boolean;
  };
  visualization: {
    defaultChartType: ChartType;
    colorScheme: ColorScheme;
    interactiveMode: boolean;
    dimensions: '2D' | '3D';
  };
  reporting: {
    format: ReportFormat;
    autoSchedule: boolean;
    includeRawData: boolean;
    compressionLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

export type ChartType = 'LINE' | 'BAR' | 'SCATTER' | 'HEATMAP' | 'PIE' | '3D_SURFACE';
export type ColorScheme = 'QUANTUM' | 'CLASSIC' | 'MONOCHROME' | 'CUSTOM';
export type ReportFormat = 'HTML' | 'PDF' | 'JSON' | 'CSV';

export interface TimeSeriesAnalysis {
  trend: number[];
  seasonality: number[];
  forecast: number[];
  confidence: number;
}

export interface Anomaly {
  timestamp: Date;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  confidence: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface Visualization {
  type: ChartType;
  data: ProcessedDataPoint[];
  options: {
    title?: string;
    interactive?: boolean;
    dimensions?: '2D' | '3D';
  };
  style?: {
    colorScheme?: ColorScheme;
    fontFamily?: string;
    backgroundColor?: string;
  };
  events?: {
    onClick?: (point: ProcessedDataPoint) => void;
    onHover?: (point: ProcessedDataPoint) => void;
  };
}

export interface ReportSection {
  id: string;
  title: string;
  content: any;
  visualizations?: Visualization[];
  metrics?: Record<string, number>;
}

export interface Report {
  id: string;
  title: string;
  timestamp: Date;
  format: ReportFormat;
  sections: ReportSection[];
  data: ProcessedDataPoint[];
  metadata: {
    generatedBy: string;
    version: string;
    [key: string]: any;
  };
}

export interface ReportSchedule {
  frequency: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  time?: string; // HH:mm format
  timezone?: string;
  recipients?: string[];
}

export interface AnalyticsError extends Error {
  code: string;
  context?: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: Date;
}

export interface CollectionResult {
  success: boolean;
  dataPoint?: DataPoint;
  count?: number;
  error?: string;
}

export interface ProcessingResult {
  success: boolean;
  processedData?: ProcessedDataPoint[];
  statistics?: {
    count: number;
    average: number;
    min: number;
    max: number;
    [key: string]: any;
  };
  error?: string;
}

export interface VisualizationResult {
  success: boolean;
  visualization?: Visualization;
  error?: string;
}

export interface ReportResult {
  success: boolean;
  report?: Report;
  error?: string;
}

export interface ScheduleResult {
  success: boolean;
  scheduleId?: string;
  error?: string;
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  confidence: number;
  metadata?: Record<string, any>;
} 