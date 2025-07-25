import { CognitiveRequest, RoutingDecision, RoutingTarget, ContentAnalysis } from '../common-interfaces/BridgeTypes';

export interface MLRoutingConfig {
  enableLearning: boolean;
  modelUpdateInterval: number; // milliseconds
  confidenceThreshold: number; // 0-1
  fallbackToRuleBased: boolean;
  maxTrainingDataSize: number;
  featureWeights: FeatureWeights;
}

export interface FeatureWeights {
  contentComplexity: number;
  userHistory: number;
  systemLoad: number;
  timeOfDay: number;
  requestType: number;
  qualityRequirements: number;
}

export interface MLFeatures {
  contentComplexity: number;
  sentimentScore: number;
  intentClassification: string[];
  userActivityPattern: number;
  systemLoadOrch: number;
  systemLoadAtous: number;
  timeOfDay: number;
  dayOfWeek: number;
  requestTypeEmbedding: number[];
  qualityThreshold: number;
  historicalPerformance: number;
}

export interface TrainingData {
  features: MLFeatures;
  actualTarget: RoutingTarget;
  actualLatency: number;
  actualQuality: number;
  timestamp: Date;
  success: boolean;
}

export interface MLPrediction {
  recommendedTarget: RoutingTarget;
  confidence: number;
  estimatedLatency: number;
  estimatedQuality: number;
  featureImportance: Record<string, number>;
  reasoning: string[];
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  averageLatencyError: number;
  averageQualityError: number;
  lastUpdated: Date;
  trainingDataSize: number;
}

export class MLRoutingEngine {
  private config: MLRoutingConfig;
  private trainingData: TrainingData[] = [];
  private modelWeights: Map<string, number> = new Map();
  private performanceMetrics: ModelPerformance;
  private lastModelUpdate: Date = new Date();
  private requestHistory: Map<string, TrainingData[]> = new Map();

  // Simple neural network weights (simulated for demonstration)
  private neuralWeights!: {
    inputToHidden: number[][];
    hiddenToOutput: number[][];
    hiddenBias: number[];
    outputBias: number[];
  };

  constructor(config: Partial<MLRoutingConfig> = {}) {
    this.config = {
      enableLearning: true,
      modelUpdateInterval: 300000, // 5 minutes
      confidenceThreshold: 0.7,
      fallbackToRuleBased: true,
      maxTrainingDataSize: 10000,
      featureWeights: {
        contentComplexity: 0.3,
        userHistory: 0.2,
        systemLoad: 0.2,
        timeOfDay: 0.1,
        requestType: 0.15,
        qualityRequirements: 0.05
      },
      ...config
    };

    this.performanceMetrics = {
      accuracy: 0.8, // Start with baseline
      precision: 0.8,
      recall: 0.8,
      f1Score: 0.8,
      averageLatencyError: 50,
      averageQualityError: 0.1,
      lastUpdated: new Date(),
      trainingDataSize: 0
    };

    this.initializeNeuralNetwork();
    console.log('[MLRoutingEngine] Initialized with ML-based routing');
  }

  private initializeNeuralNetwork(): void {
    // Simple 3-layer neural network: 10 inputs -> 8 hidden -> 3 outputs
    const inputSize = 10;
    const hiddenSize = 8;
    const outputSize = 3; // ORCH, ATOUS, BOTH

    this.neuralWeights = {
      inputToHidden: this.randomMatrix(inputSize, hiddenSize),
      hiddenToOutput: this.randomMatrix(hiddenSize, outputSize),
      hiddenBias: this.randomArray(hiddenSize),
      outputBias: this.randomArray(outputSize)
    };
  }

  private randomMatrix(rows: number, cols: number): number[][] {
    return Array(rows).fill(0).map(() => 
      Array(cols).fill(0).map(() => (Math.random() - 0.5) * 0.1)
    );
  }

  private randomArray(size: number): number[] {
    return Array(size).fill(0).map(() => (Math.random() - 0.5) * 0.1);
  }

  async predictRouting(request: CognitiveRequest): Promise<MLPrediction> {
    try {
      // 1. Extract features from request
      const features = await this.extractFeatures(request);
      
      // 2. Get prediction from ML model
      const prediction = this.config.enableLearning 
        ? await this.neuralNetworkPredict(features)
        : await this.ruleBasedPredict(features);

      // 3. Add reasoning
      const reasoning = this.generateReasoning(features, prediction);

      console.log(`[MLRoutingEngine] Predicted routing: ${prediction.recommendedTarget} (confidence: ${prediction.confidence.toFixed(2)})`);

      return {
        ...prediction,
        reasoning
      };

    } catch (error) {
      console.error('[MLRoutingEngine] Prediction error:', error);
      
      // Fallback to rule-based routing
      if (this.config.fallbackToRuleBased) {
        return this.fallbackRouting(request);
      }
      
      throw error;
    }
  }

  private async extractFeatures(request: CognitiveRequest): Promise<MLFeatures> {
    // Analyze content complexity
    const contentComplexity = this.analyzeContentComplexity(request.input);
    
    // Sentiment analysis (simplified)
    const sentimentScore = this.analyzeSentiment(request.input);
    
    // Intent classification
    const intentClassification = this.classifyIntent(request.input);
    
    // User activity pattern
    const userActivityPattern = this.analyzeUserActivity(request.metadata?.userId || 'unknown');
    
    // System load (simulated)
    const systemLoadOrch = Math.random() * 100;
    const systemLoadAtous = Math.random() * 100;
    
    // Time features
    const now = new Date();
    const timeOfDay = now.getHours() + now.getMinutes() / 60;
    const dayOfWeek = now.getDay();
    
    // Request type embedding (simplified)
    const requestTypeEmbedding = this.generateRequestEmbedding(request);
    
    // Quality requirements (default to 0.8 if not specified)
    const qualityThreshold = 0.8;
    
    // Historical performance for this user
    const historicalPerformance = this.getUserHistoricalPerformance(request.metadata?.userId || 'unknown');

    return {
      contentComplexity,
      sentimentScore,
      intentClassification,
      userActivityPattern,
      systemLoadOrch,
      systemLoadAtous,
      timeOfDay,
      dayOfWeek,
      requestTypeEmbedding,
      qualityThreshold,
      historicalPerformance
    };
  }

  private analyzeContentComplexity(content: string): number {
    // Analyze text complexity using various metrics
    const wordCount = content.split(/\s+/).length;
    const avgWordLength = content.replace(/\s+/g, '').length / wordCount;
    const sentenceCount = content.split(/[.!?]+/).length;
    const avgSentenceLength = wordCount / sentenceCount;
    
    // Technical terms detection
    const technicalTerms = ['blockchain', 'quantum', 'neural', 'algorithm', 'cryptocurrency', 'analysis'];
    const technicalScore = technicalTerms.filter(term => 
      content.toLowerCase().includes(term)
    ).length / technicalTerms.length;
    
    // Combine metrics (0-1 scale)
    const complexity = Math.min(1, (
      (avgWordLength - 3) / 10 + // Word complexity
      (avgSentenceLength - 10) / 20 + // Sentence complexity  
      technicalScore + // Technical content
      Math.min(wordCount / 100, 1) // Length factor
    ) / 4);
    
    return Math.max(0, complexity);
  }

  private analyzeSentiment(content: string): number {
    // Simple sentiment analysis (positive words vs negative words)
    const positiveWords = ['good', 'great', 'excellent', 'profit', 'gain', 'success', 'positive', 'buy', 'invest'];
    const negativeWords = ['bad', 'poor', 'loss', 'decline', 'negative', 'sell', 'risk', 'danger', 'fear'];
    
    const words = content.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount + negativeCount === 0) return 0.5; // Neutral
    
    return positiveCount / (positiveCount + negativeCount);
  }

  private classifyIntent(content: string): string[] {
    const intents: string[] = [];
    const contentLower = content.toLowerCase();
    
    // Investment-related intents
    if (/invest|portfolio|stock|crypto|trading/.test(contentLower)) {
      intents.push('investment');
    }
    
    // Analysis intents
    if (/analy[sz]e|examine|study|research/.test(contentLower)) {
      intents.push('analysis');
    }
    
    // Prediction intents
    if (/predict|forecast|future|trend/.test(contentLower)) {
      intents.push('prediction');
    }
    
    // Question intents
    if (/\?|what|how|when|where|why/.test(contentLower)) {
      intents.push('question');
    }
    
    // Action intents
    if (/buy|sell|execute|perform|do/.test(contentLower)) {
      intents.push('action');
    }
    
    return intents.length > 0 ? intents : ['general'];
  }

  private analyzeUserActivity(userId: string): number {
    // Analyze user's historical activity pattern
    const userHistory = this.requestHistory.get(userId) || [];
    
    if (userHistory.length === 0) return 0.5; // New user
    
    // Calculate activity metrics
    const recentRequests = userHistory.filter(
      data => Date.now() - data.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24h
    );
    
    const activityScore = Math.min(1, recentRequests.length / 10); // Normalize to 0-1
    return activityScore;
  }

  private generateRequestEmbedding(request: CognitiveRequest): number[] {
    // Simple embedding based on request characteristics
    const embedding = new Array(5).fill(0);
    
    // Dimension 0: Cognitive complexity (based on input length and type)
    embedding[0] = request.input.length > 100 ? 1 : 0;
    
    // Dimension 1: Quantum processing (default to false)
    embedding[1] = 0;
    
    // Dimension 2: Financial analysis (based on request type)
    embedding[2] = request.type === 'blockchain_analysis' ? 1 : 0;
    
    // Dimension 3: Blockchain interaction (based on request type)
    embedding[3] = request.type === 'blockchain_analysis' ? 1 : 0;
    
    // Dimension 4: Privacy level (default to public)
    embedding[4] = 0;
    
    return embedding;
  }

  private getUserHistoricalPerformance(userId: string): number {
    const userHistory = this.requestHistory.get(userId) || [];
    
    if (userHistory.length === 0) return 0.8; // Default for new users
    
    const successfulRequests = userHistory.filter(data => data.success);
    const successRate = successfulRequests.length / userHistory.length;
    
    const avgQuality = userHistory.reduce((sum, data) => sum + data.actualQuality, 0) / userHistory.length;
    
    return (successRate + avgQuality) / 2;
  }

  private async neuralNetworkPredict(features: MLFeatures): Promise<MLPrediction> {
    // Convert features to input vector
    const inputVector = [
      features.contentComplexity,
      features.sentimentScore,
      features.userActivityPattern,
      features.systemLoadOrch / 100,
      features.systemLoadAtous / 100,
      features.timeOfDay / 24,
      features.dayOfWeek / 7,
      features.qualityThreshold,
      features.historicalPerformance,
      features.requestTypeEmbedding.reduce((sum, val) => sum + val, 0) / features.requestTypeEmbedding.length
    ];

    // Forward pass through neural network
    const hiddenLayer = this.activateLayer(
      inputVector,
      this.neuralWeights.inputToHidden,
      this.neuralWeights.hiddenBias
    );

    const outputLayer = this.activateLayer(
      hiddenLayer,
      this.neuralWeights.hiddenToOutput,
      this.neuralWeights.outputBias
    );

    // Convert output to routing decision
    const routingTargets = [RoutingTarget.ORCH, RoutingTarget.ATOUS, RoutingTarget.BOTH];
    const maxIndex = outputLayer.indexOf(Math.max(...outputLayer));
    
    const confidence = Math.max(...outputLayer);
    const recommendedTarget = routingTargets[maxIndex];

    // Estimate performance metrics
    const estimatedLatency = this.estimateLatency(features, recommendedTarget);
    const estimatedQuality = this.estimateQuality(features, recommendedTarget);

    // Feature importance (simplified)
    const featureImportance = this.calculateFeatureImportance(features);

    return {
      recommendedTarget,
      confidence,
      estimatedLatency,
      estimatedQuality,
      featureImportance
    } as MLPrediction;
  }

  private activateLayer(input: number[], weights: number[][], bias: number[]): number[] {
    const output: number[] = [];
    
    for (let i = 0; i < weights[0].length; i++) {
      let sum = bias[i];
      for (let j = 0; j < input.length; j++) {
        sum += input[j] * weights[j][i];
      }
      output.push(this.sigmoid(sum));
    }
    
    return output;
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private async ruleBasedPredict(features: MLFeatures): Promise<MLPrediction> {
    let recommendedTarget: RoutingTarget;
    let confidence = 0.8;

    // Enhanced rule-based decision logic
    if (features.contentComplexity > 0.6 && features.qualityThreshold > 0.7) {
      recommendedTarget = RoutingTarget.ORCH; // Complex cognitive processing
      confidence = 0.9;
    } else if (features.intentClassification.includes('action') || 
               features.intentClassification.includes('investment') ||
               features.intentClassification.includes('prediction')) {
      recommendedTarget = RoutingTarget.BOTH; // Requires both analysis and action
      confidence = 0.85;
    } else if (features.systemLoadOrch > 80) {
      recommendedTarget = RoutingTarget.ATOUS; // Orch overloaded
      confidence = 0.7;
    } else if (features.contentComplexity > 0.5) {
      recommendedTarget = RoutingTarget.ORCH; // Moderate complexity to cognitive
      confidence = 0.8;
    } else {
      recommendedTarget = RoutingTarget.ORCH; // Default to cognitive processing
      confidence = 0.75;
    }

    const estimatedLatency = this.estimateLatency(features, recommendedTarget);
    const estimatedQuality = this.estimateQuality(features, recommendedTarget);
    const featureImportance = this.calculateFeatureImportance(features);

    return {
      recommendedTarget,
      confidence,
      estimatedLatency,
      estimatedQuality,
      featureImportance
    } as MLPrediction;
  }

  private estimateLatency(features: MLFeatures, target: RoutingTarget): number {
    let baseLatency = 150; // Base latency in ms

    // Stronger adjustment based on complexity
    baseLatency += features.contentComplexity * 500;
    
    // Adjust based on quality requirements
    baseLatency += features.qualityThreshold * 200;
    
    // Adjust based on system load
    if (target === RoutingTarget.ORCH || target === RoutingTarget.BOTH) {
      baseLatency += features.systemLoadOrch * 3;
    }
    if (target === RoutingTarget.ATOUS || target === RoutingTarget.BOTH) {
      baseLatency += features.systemLoadAtous * 2;
    }
    
    // Both systems take significantly longer
    if (target === RoutingTarget.BOTH) {
      baseLatency *= 1.8;
    }
    
    return Math.round(baseLatency);
  }

  private estimateQuality(features: MLFeatures, target: RoutingTarget): number {
    let baseQuality = 0.8;
    
    // Orch provides higher quality for complex requests
    if (target === RoutingTarget.ORCH && features.contentComplexity > 0.5) {
      baseQuality += 0.15;
    }
    
    // Both systems provide highest quality
    if (target === RoutingTarget.BOTH) {
      baseQuality += 0.1;
    }
    
    // User history affects quality
    baseQuality = (baseQuality + features.historicalPerformance) / 2;
    
    return Math.min(1, Math.max(0, baseQuality));
  }

  private calculateFeatureImportance(features: MLFeatures): Record<string, number> {
    return {
      contentComplexity: this.config.featureWeights.contentComplexity,
      userHistory: this.config.featureWeights.userHistory,
      systemLoad: this.config.featureWeights.systemLoad,
      timeOfDay: this.config.featureWeights.timeOfDay,
      requestType: this.config.featureWeights.requestType,
      qualityRequirements: this.config.featureWeights.qualityRequirements
    };
  }

  private fallbackRouting(request: CognitiveRequest): MLPrediction {
    // Simple fallback logic with null safety
    let target = RoutingTarget.ORCH;
    
    // Check request type for routing decision
    if (request.type === 'blockchain_analysis') {
      target = RoutingTarget.BOTH;
    } else if (request.type === 'consensus_query') {
      target = RoutingTarget.ATOUS;
    }

    return {
      recommendedTarget: target,
      confidence: 0.6,
      estimatedLatency: 500,
      estimatedQuality: 0.7,
      featureImportance: {},
      reasoning: ['Fallback routing due to ML engine error']
    };
  }

  private generateReasoning(features: MLFeatures, prediction: MLPrediction): string[] {
    const reasoning: string[] = [];
    
    if (features.contentComplexity > 0.7) {
      reasoning.push(`High content complexity (${features.contentComplexity.toFixed(2)}) suggests cognitive processing`);
    }
    
    if (features.systemLoadOrch > 80) {
      reasoning.push(`Orch system load high (${features.systemLoadOrch.toFixed(0)}%), considering alternatives`);
    }
    
    if (features.qualityThreshold > 0.8) {
      reasoning.push(`High quality requirements (${features.qualityThreshold}) favor comprehensive analysis`);
    }
    
    if (features.intentClassification.includes('action')) {
      reasoning.push('Action intent detected, blockchain interaction likely needed');
    }
    
    reasoning.push(`Confidence: ${prediction.confidence.toFixed(2)} based on ML model`);
    
    return reasoning;
  }

  async learnFromResult(
    request: CognitiveRequest,
    actualTarget: RoutingTarget,
    actualLatency: number,
    actualQuality: number,
    success: boolean
  ): Promise<void> {
    if (!this.config.enableLearning) return;

    try {
      const features = await this.extractFeatures(request);
      
      const trainingSample: TrainingData = {
        features,
        actualTarget,
        actualLatency,
        actualQuality,
        timestamp: new Date(),
        success
      };

      // Add to training data
      this.trainingData.push(trainingSample);
      
      // Maintain training data size limit
      if (this.trainingData.length > this.config.maxTrainingDataSize) {
        this.trainingData.shift();
      }

      // Update user history
      const userId = request.metadata?.userId || 'unknown';
      const userHistory = this.requestHistory.get(userId) || [];
      userHistory.push(trainingSample);
      if (userHistory.length > 100) { // Limit per user
        userHistory.shift();
      }
      this.requestHistory.set(userId, userHistory);

      // Update model if enough time has passed
      const timeSinceUpdate = Date.now() - this.lastModelUpdate.getTime();
      if (timeSinceUpdate > this.config.modelUpdateInterval) {
        await this.updateModel();
      }

      console.log(`[MLRoutingEngine] Learned from result: ${actualTarget} (success: ${success}, quality: ${actualQuality.toFixed(2)})`);

    } catch (error) {
      console.error('[MLRoutingEngine] Learning error:', error);
    }
  }

  private async updateModel(): Promise<void> {
    if (this.trainingData.length < 10) {
      console.log('[MLRoutingEngine] Insufficient training data for model update');
      return;
    }

    console.log(`[MLRoutingEngine] Updating model with ${this.trainingData.length} training samples`);

    // Simple gradient descent update (simplified for demonstration)
    const learningRate = 0.01;
    const batchSize = Math.min(32, this.trainingData.length);
    
    // Sample random batch
    const batch = this.trainingData
      .sort(() => Math.random() - 0.5)
      .slice(0, batchSize);

    // Update neural network weights
    await this.updateNeuralWeights(batch, learningRate);

    // Update performance metrics
    await this.updatePerformanceMetrics();

    this.lastModelUpdate = new Date();
    console.log('[MLRoutingEngine] Model updated successfully');
  }

  private async updateNeuralWeights(batch: TrainingData[], learningRate: number): Promise<void> {
    // Simplified weight update (in real implementation, would use proper backpropagation)
    for (const sample of batch) {
      const features = sample.features;
      
      // Convert features to input vector
      const inputVector = [
        features.contentComplexity,
        features.sentimentScore,
        features.userActivityPattern,
        features.systemLoadOrch / 100,
        features.systemLoadAtous / 100,
        features.timeOfDay / 24,
        features.dayOfWeek / 7,
        features.qualityThreshold,
        features.historicalPerformance,
        features.requestTypeEmbedding.reduce((sum, val) => sum + val, 0) / features.requestTypeEmbedding.length
      ];

      // Simple weight adjustment based on success/failure
      const adjustment = sample.success ? learningRate : -learningRate;
      
      // Update weights (simplified)
      for (let i = 0; i < this.neuralWeights.inputToHidden.length; i++) {
        for (let j = 0; j < this.neuralWeights.inputToHidden[i].length; j++) {
          this.neuralWeights.inputToHidden[i][j] += adjustment * inputVector[i] * 0.1;
        }
      }
    }
  }

  private async updatePerformanceMetrics(): Promise<void> {
    if (this.trainingData.length === 0) return;

    const recent = this.trainingData.slice(-1000); // Last 1000 samples
    
    const successfulPredictions = recent.filter(data => data.success);
    const accuracy = successfulPredictions.length / recent.length;

    const latencyErrors = recent.map(data => 
      Math.abs(data.actualLatency - this.estimateLatency(data.features, data.actualTarget))
    );
    const avgLatencyError = latencyErrors.reduce((sum, err) => sum + err, 0) / latencyErrors.length;

    const qualityErrors = recent.map(data =>
      Math.abs(data.actualQuality - this.estimateQuality(data.features, data.actualTarget))
    );
    const avgQualityError = qualityErrors.reduce((sum, err) => sum + err, 0) / qualityErrors.length;

    this.performanceMetrics = {
      accuracy,
      precision: accuracy * 0.95, // Simplified
      recall: accuracy * 0.9,
      f1Score: accuracy * 0.92,
      averageLatencyError: avgLatencyError,
      averageQualityError: avgQualityError,
      lastUpdated: new Date(),
      trainingDataSize: this.trainingData.length
    };

    console.log('[MLRoutingEngine] Performance metrics updated:', {
      accuracy: accuracy.toFixed(3),
      avgLatencyError: avgLatencyError.toFixed(1) + 'ms',
      avgQualityError: avgQualityError.toFixed(3)
    });
  }

  getPerformanceMetrics(): ModelPerformance {
    return { ...this.performanceMetrics };
  }

  getTrainingDataStats(): {
    totalSamples: number;
    successRate: number;
    averageLatency: number;
    averageQuality: number;
    targetDistribution: Record<string, number>;
  } {
    if (this.trainingData.length === 0) {
      return {
        totalSamples: 0,
        successRate: 0,
        averageLatency: 0,
        averageQuality: 0,
        targetDistribution: {}
      };
    }

    const successful = this.trainingData.filter(d => d.success);
    const successRate = successful.length / this.trainingData.length;
    
    const avgLatency = this.trainingData.reduce((sum, d) => sum + d.actualLatency, 0) / this.trainingData.length;
    const avgQuality = this.trainingData.reduce((sum, d) => sum + d.actualQuality, 0) / this.trainingData.length;

    const targetDistribution: Record<string, number> = {};
    for (const data of this.trainingData) {
      targetDistribution[data.actualTarget] = (targetDistribution[data.actualTarget] || 0) + 1;
    }

    return {
      totalSamples: this.trainingData.length,
      successRate,
      averageLatency: avgLatency,
      averageQuality: avgQuality,
      targetDistribution
    };
  }

  /**
   * Export model for backup/transfer
   */
  exportModel(): {
    weights: {
      inputToHidden: number[][];
      hiddenToOutput: number[][];
      hiddenBias: number[];
      outputBias: number[];
    };
    trainingData: TrainingData[];
    performance: ModelPerformance;
    config: MLRoutingConfig;
  } {
    return {
      weights: JSON.parse(JSON.stringify(this.neuralWeights)),
      trainingData: [...this.trainingData],
      performance: { ...this.performanceMetrics },
      config: { ...this.config }
    };
  }

  /**
   * Import model from backup
   */
  importModel(modelData: {
    weights: {
      inputToHidden: number[][];
      hiddenToOutput: number[][];
      hiddenBias: number[];
      outputBias: number[];
    };
    trainingData: TrainingData[];
    performance: ModelPerformance;
    config: MLRoutingConfig;
  }): void {
    this.neuralWeights = modelData.weights;
    this.trainingData = modelData.trainingData;
    this.performanceMetrics = modelData.performance;
    this.config = { ...this.config, ...modelData.config };
    
    console.log('[MLRoutingEngine] Model imported successfully');
  }

  /**
   * Reset model to initial state
   */
  resetModel(): void {
    this.trainingData = [];
    this.requestHistory.clear();
    this.initializeNeuralNetwork();
    this.performanceMetrics.accuracy = 0.8;
    this.performanceMetrics.trainingDataSize = 0;
    this.lastModelUpdate = new Date();
    
    console.log('[MLRoutingEngine] Model reset to initial state');
  }
} 