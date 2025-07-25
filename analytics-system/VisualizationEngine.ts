import { EventEmitter } from 'events';
import {
  ProcessedDataPoint,
  Visualization,
  VisualizationResult,
  ChartType,
  ColorScheme,
  AnalyticsConfig,
  AnalyticsError
} from './types';

interface ChartOptions {
  type: ChartType;
  title?: string;
  interactive?: boolean;
  dimensions?: '2D' | '3D';
  style?: {
    colorScheme?: ColorScheme;
    fontFamily?: string;
    backgroundColor?: string;
  };
}

export class VisualizationEngine extends EventEmitter {
  private config: AnalyticsConfig['visualization'];
  private activeVisualizations: Map<string, Visualization> = new Map();
  private lastRenderTime: Date = new Date();

  constructor(config: AnalyticsConfig) {
    super();
    this.config = config.visualization;
  }

  async create(data: ProcessedDataPoint[], options: ChartOptions): Promise<VisualizationResult> {
    try {
      // Validate input
      this.validateInput(data, options);

      // Prepare data for visualization
      const preparedData = this.prepareData(data, options);

      // Create visualization
      const visualization = await this.createVisualization(preparedData, options);

      // Store active visualization
      const id = `viz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.activeVisualizations.set(id, visualization);

      this.lastRenderTime = new Date();
      return {
        success: true,
        visualization
      };

    } catch (error) {
      const analyticsError: AnalyticsError = {
        name: 'VisualizationError',
        message: error instanceof Error ? error.message : 'Unknown error during visualization creation',
        code: 'VISUALIZATION_ERROR',
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

  private validateInput(data: ProcessedDataPoint[], options: ChartOptions): void {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }

    if (data.length === 0) {
      throw new Error('Data array cannot be empty');
    }

    if (!options.type) {
      throw new Error('Chart type is required');
    }

    if (options.dimensions === '3D' && !this.supports3D(options.type)) {
      throw new Error(`3D visualization not supported for chart type ${options.type}`);
    }
  }

  private prepareData(data: ProcessedDataPoint[], options: ChartOptions): ProcessedDataPoint[] {
    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Group data if needed
    if (this.requiresGrouping(options.type)) {
      return this.groupData(sortedData);
    }

    // Filter outliers for certain chart types
    if (this.shouldFilterOutliers(options.type)) {
      return this.filterOutliers(sortedData);
    }

    return sortedData;
  }

  private async createVisualization(data: ProcessedDataPoint[], options: ChartOptions): Promise<Visualization> {
    const defaultStyle = {
      colorScheme: this.config.colorScheme,
      fontFamily: 'Arial',
      backgroundColor: '#ffffff'
    };

    const visualization: Visualization = {
      type: options.type,
      data,
      options: {
        title: options.title,
        interactive: options.interactive ?? this.config.interactiveMode,
        dimensions: options.dimensions ?? this.config.dimensions
      },
      style: {
        ...defaultStyle,
        ...options.style
      }
    };

    if (options.interactive) {
      visualization.events = {
        onClick: (point: ProcessedDataPoint) => {
          this.emit('pointClick', { visualization: visualization, point });
        },
        onHover: (point: ProcessedDataPoint) => {
          this.emit('pointHover', { visualization: visualization, point });
        }
      };
    }

    return visualization;
  }

  private supports3D(chartType: ChartType): boolean {
    return ['3D_SURFACE'].includes(chartType);
  }

  private requiresGrouping(chartType: ChartType): boolean {
    return ['BAR', 'PIE'].includes(chartType);
  }

  private shouldFilterOutliers(chartType: ChartType): boolean {
    return ['LINE', 'SCATTER'].includes(chartType);
  }

  private groupData(data: ProcessedDataPoint[]): ProcessedDataPoint[] {
    const groups = new Map<string, ProcessedDataPoint>();

    data.forEach(point => {
      const key = `${point.metric}_${JSON.stringify(point.tags)}`;
      const existing = groups.get(key);

      if (existing) {
        existing.value += point.value;
        existing.metadata = {
          ...existing.metadata,
          count: (existing.metadata?.count || 1) + 1,
          average: existing.value / (existing.metadata?.count || 2)
        };
      } else {
        groups.set(key, {
          ...point,
          metadata: {
            ...point.metadata,
            count: 1,
            average: point.value
          }
        });
      }
    });

    return Array.from(groups.values());
  }

  private filterOutliers(data: ProcessedDataPoint[]): ProcessedDataPoint[] {
    const values = data.map(d => d.value);
    const q1 = this.calculateQuantile(values, 0.25);
    const q3 = this.calculateQuantile(values, 0.75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return data.filter(d => d.value >= lowerBound && d.value <= upperBound);
  }

  private calculateQuantile(values: number[], q: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;

    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
      return sorted[base];
    }
  }

  getStatus(): {
    activeVisualizations: number;
    lastRenderTime: Date;
    supportedTypes: ChartType[];
    memoryUsage: number;
  } {
    return {
      activeVisualizations: this.activeVisualizations.size,
      lastRenderTime: this.lastRenderTime,
      supportedTypes: ['LINE', 'BAR', 'SCATTER', 'HEATMAP', 'PIE', '3D_SURFACE'],
      memoryUsage: process.memoryUsage().heapUsed
    };
  }

  async cleanup(): Promise<void> {
    this.activeVisualizations.clear();
    this.removeAllListeners();
  }
} 