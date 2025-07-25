import { DistributedCognitiveProcessing } from '../DistributedCognitiveProcessing';
import { 
  ProcessorType, 
  JobStatus, 
  CognitiveTaskType,
  CognitiveProcessor,
  CognitiveTask,
  ProcessorPerformance
} from '../DistributedCognitiveProcessing';

describe('DistributedCognitiveProcessing', () => {
  let dcp: DistributedCognitiveProcessing;
  let mockProcessor: Omit<CognitiveProcessor, 'id'>;
  let mockTask: Omit<CognitiveTask, 'id' | 'createdAt'>;

  beforeEach(() => {
    dcp = new DistributedCognitiveProcessing({
      maxProcessingNodes: 5,
      distributionStrategy: 'HYBRID',
      qualityThreshold: 0.8,
      redundancyLevel: 2,
      cognitiveTimeout: 1000,
      enableConsensus: true
    });

    mockProcessor = {
      type: ProcessorType.NEURAL_NETWORK,
      capabilities: {
        supportedTaskTypes: [CognitiveTaskType.PATTERN_RECOGNITION],
        maxComplexity: 'HIGH',
        throughput: 100,
        qualityLevel: 0.9,
        specializations: ['image_processing']
      },
      status: 'AVAILABLE',
      currentLoad: 0,
      reputation: 0.8,
      performance: {
        successRate: 0.95,
        processingTime: 100,
        errorRate: 0.05,
        resourceEfficiency: 0.85
      } as ProcessorPerformance
    };

    mockTask = {
      type: CognitiveTaskType.PATTERN_RECOGNITION,
      complexity: 'SIMPLE',
      priority: 'NORMAL',
      input: {
        parameters: { threshold: 0.5 }
      },
      requirements: {
        qualityLevel: 0.8,
        maxLatency: 5000,
        memoryLimit: 1024,
        confidentialityLevel: 'PUBLIC'
      }
    };
  });

  describe('Processor Management', () => {
    it('should register a new processor', async () => {
      const processorId = await dcp.registerProcessor(mockProcessor);
      expect(processorId).toMatch(/^proc_\d+_[a-z0-9]+$/);

      const stats = await dcp.getProcessingStats();
      expect(stats.totalProcessors).toBe(1);
      expect(stats.availableProcessors).toBe(1);
    });

    it('should track available processors', async () => {
      await dcp.registerProcessor(mockProcessor);
      await dcp.registerProcessor({
        ...mockProcessor,
        status: 'BUSY'
      });

      const availableProcessors = await dcp.getAvailableProcessors();
      expect(availableProcessors.length).toBe(1);
    });
  });

  describe('Task Processing', () => {
    it('should submit and process a cognitive task', async () => {
      // Register processor first
      await dcp.registerProcessor(mockProcessor);

      // Submit task
      const taskId = await dcp.submitCognitiveTask(mockTask);
      expect(taskId).toMatch(/^task_\d+_[a-z0-9]+$/);

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check job status
      const job = await dcp.getJobStatus(taskId);
      expect(job).toBeDefined();
      expect([JobStatus.COMPLETED, JobStatus.PROCESSING]).toContain(job?.status);
    });

    it('should handle task failure when no processors are available', async () => {
      // Submit task without any processors
      const taskId = await dcp.submitCognitiveTask(mockTask);

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check job status
      const job = await dcp.getJobStatus(taskId);
      expect(job?.status).toBe(JobStatus.FAILED);
    });

    it('should distribute task to multiple processors based on redundancy level', async () => {
      // Register multiple processors
      await dcp.registerProcessor(mockProcessor);
      await dcp.registerProcessor(mockProcessor);
      await dcp.registerProcessor(mockProcessor);

      // Submit task
      const taskId = await dcp.submitCognitiveTask(mockTask);

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check job status
      const job = await dcp.getJobStatus(taskId);
      expect(job?.assignedProcessors.length).toBe(2); // Based on redundancyLevel
    });
  });

  describe('Consensus and Results', () => {
    it('should reach consensus with multiple processors', async () => {
      // Register multiple processors
      await dcp.registerProcessor(mockProcessor);
      await dcp.registerProcessor(mockProcessor);

      // Submit task
      const taskId = await dcp.submitCognitiveTask(mockTask);

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check job status and consensus
      const job = await dcp.getJobStatus(taskId);
      expect(job?.consensus).toBeDefined();
      expect(job?.consensus?.consensusReached).toBe(true);
    });

    it('should consolidate results from multiple processors', async () => {
      // Register multiple processors
      await dcp.registerProcessor(mockProcessor);
      await dcp.registerProcessor(mockProcessor);

      // Submit task
      const taskId = await dcp.submitCognitiveTask(mockTask);

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check job status and results
      const job = await dcp.getJobStatus(taskId);
      expect(job?.results.length).toBeGreaterThan(0);
      expect(job?.finalOutput).toBeDefined();
    });
  });

  describe('System Statistics', () => {
    it('should track processing statistics', async () => {
      // Register processor and submit task
      await dcp.registerProcessor(mockProcessor);
      await dcp.submitCognitiveTask(mockTask);

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = await dcp.getProcessingStats();
      expect(stats.totalProcessors).toBe(1);
      expect(stats.completedJobs).toBeGreaterThanOrEqual(0);
      expect(stats.averageProcessingTime).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Shutdown', () => {
    it('should handle graceful shutdown', async () => {
      // Register processor and submit task
      await dcp.registerProcessor(mockProcessor);
      const taskId = await dcp.submitCognitiveTask(mockTask);

      // Shutdown immediately
      await dcp.shutdown();

      // Check system state
      const stats = await dcp.getProcessingStats();
      expect(stats.totalProcessors).toBe(0);
      expect(stats.activeJobs).toBe(0);

      // Check job status
      const job = await dcp.getJobStatus(taskId);
      expect(job?.status).toBe(JobStatus.FAILED);
    });
  });
});
