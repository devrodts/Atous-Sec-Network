import { RealNISEngine, NeuralData, AnomalyDetectionResult } from '../RealNISEngine';

describe('RealNISEngine', () => {
  let engine: RealNISEngine;

  beforeEach(() => {
    engine = new RealNISEngine();
  });

  it('should initialize the NIS engine', () => {
    expect(engine).toBeDefined();
    expect(engine.isInitialized()).toBe(true);
  });

  it('should process neural data and return an anomaly detection result', () => {
    const neuralData: NeuralData = { pattern: [0.1, 0.2, 0.3, 0.4], timestamp: new Date() };
    const result: AnomalyDetectionResult = engine.processNeuralData(neuralData);

    expect(result).toBeDefined();
    expect(result.isAnomaly).toBeDefined();
    expect(result.confidence).toBeDefined();
    expect(result.detectedPattern).toEqual(neuralData.pattern);
  });

  it('should detect a simple anomaly', () => {
    // Simulate normal data first
    engine.processNeuralData({ pattern: [0.1, 0.1, 0.1], timestamp: new Date() });
    engine.processNeuralData({ pattern: [0.2, 0.2, 0.2], timestamp: new Date() });

    // Introduce an anomaly
    const anomalyData: NeuralData = { pattern: [0.9, 0.9, 0.9], timestamp: new Date() };
    const result = engine.processNeuralData(anomalyData);

    expect(result.isAnomaly).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5); // Expect higher confidence for anomaly
  });

  it('should adapt to new normal patterns', () => {
    // Simulate initial normal data
    for (let i = 0; i < 10; i++) {
      engine.processNeuralData({ pattern: [0.1 * i, 0.2 * i], timestamp: new Date() });
    }

    // Introduce a new normal pattern gradually
    for (let i = 0; i < 10; i++) {
      engine.processNeuralData({ pattern: [10 + 0.1 * i, 10 + 0.2 * i], timestamp: new Date() });
    }

    // Test a data point from the new normal pattern
    const newNormalData: NeuralData = { pattern: [10.5, 11], timestamp: new Date() };
    const result = engine.processNeuralData(newNormalData);

    expect(result.isAnomaly).toBe(false); // Should no longer be considered an anomaly
    expect(result.confidence).toBeLessThan(0.5); // Expect lower confidence for normal data
  });

  it('should handle empty neural data gracefully', () => {
    const neuralData: NeuralData = { pattern: [], timestamp: new Date() };
    const result: AnomalyDetectionResult = engine.processNeuralData(neuralData);
    expect(result.isAnomaly).toBe(false); // Empty data is not an anomaly
    expect(result.confidence).toBe(0); // No confidence for empty data
  });

  it('should reset the engine state', () => {
    engine.processNeuralData({ pattern: [0.1, 0.2], timestamp: new Date() });
    engine.reset();
    const result = engine.processNeuralData({ pattern: [0.9, 0.9], timestamp: new Date() });
    expect(result.isAnomaly).toBe(false); // After reset, it should treat new data as normal initially
  });
});
