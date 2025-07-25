import { PrometheusMetricsCollector } from '../PrometheusMetricsCollector';
import client from 'prom-client';

jest.mock('prom-client', () => {
  const mockRegister = {
    metrics: jest.fn(() => '# HELP test_metric Test metric help\n# TYPE test_metric gauge\ntest_metric 10\n'),
    clear: jest.fn(),
    getSingleMetricAsString: jest.fn(() => '# HELP single_metric Single metric help\n# TYPE single_metric counter\nsingle_metric 1\n'),
  };
  return {
    register: mockRegister,
    Counter: jest.fn().mockImplementation(() => ({
      inc: jest.fn(),
    })),
    Gauge: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
      inc: jest.fn(),
      dec: jest.fn(),
    })),
    Histogram: jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
    })),
    Summary: jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
    })),
  };
});

describe('PrometheusMetricsCollector', () => {
  let collector: PrometheusMetricsCollector;

  beforeEach(() => {
    collector = new PrometheusMetricsCollector();
    client.register.clear(); // Clear the mock register before each test
  });

  it('should register a counter and increment it', () => {
    const counter = collector.registerCounter('test_counter', 'A test counter');
    counter.inc();
    expect(client.Counter).toHaveBeenCalledWith({
      name: 'test_counter',
      help: 'A test counter',
    });
    expect(counter.inc).toHaveBeenCalledTimes(1);
  });

  it('should register a gauge and set its value', () => {
    const gauge = collector.registerGauge('test_gauge', 'A test gauge');
    gauge.set(10);
    expect(client.Gauge).toHaveBeenCalledWith({
      name: 'test_gauge',
      help: 'A test gauge',
    });
    expect(gauge.set).toHaveBeenCalledWith(10);
  });

  it('should register a histogram and observe a value', () => {
    const histogram = collector.registerHistogram('test_histogram', 'A test histogram', [1, 2, 3]);
    histogram.observe(1.5);
    expect(client.Histogram).toHaveBeenCalledWith({
      name: 'test_histogram',
      help: 'A test histogram',
      buckets: [1, 2, 3],
    });
    expect(histogram.observe).toHaveBeenCalledWith(1.5);
  });

  it('should register a summary and observe a value', () => {
    const summary = collector.registerSummary('test_summary', 'A test summary', [0.5, 0.9]);
    summary.observe(0.7);
    expect(client.Summary).toHaveBeenCalledWith({
      name: 'test_summary',
      help: 'A test summary',
      percentiles: [0.5, 0.9],
    });
    expect(summary.observe).toHaveBeenCalledWith(0.7);
  });

  it('should return Prometheus metrics as a string', async () => {
    const metrics = await collector.getMetrics();
    expect(metrics).toBe('# HELP test_metric Test metric help\n# TYPE test_metric gauge\ntest_metric 10\n');
    expect(client.register.metrics).toHaveBeenCalledTimes(1);
  });

  it('should clear all metrics', () => {
    collector.clearMetrics();
    expect(client.register.clear).toHaveBeenCalledTimes(1);
  });
});
