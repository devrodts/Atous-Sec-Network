import { RealHardwareMetricsCollector } from '../RealHardwareMetricsCollector';
import os from 'os';

jest.mock('os');

describe('RealHardwareMetricsCollector', () => {
  let collector: RealHardwareMetricsCollector;

  beforeEach(() => {
    collector = new RealHardwareMetricsCollector();
    jest.clearAllMocks();

    // Mock os.cpus() to return a consistent structure
    (os.cpus as jest.Mock).mockReturnValue([
      { model: 'CPU0', speed: 2000, times: { user: 10, nice: 0, sys: 5, idle: 85, irq: 0 } },
      { model: 'CPU1', speed: 2000, times: { user: 12, nice: 0, sys: 6, idle: 82, irq: 0 } },
    ]);

    // Mock os.totalmem() and os.freemem()
    (os.totalmem as jest.Mock).mockReturnValue(16 * 1024 * 1024 * 1024); // 16 GB
    (os.freemem as jest.Mock).mockReturnValue(8 * 1024 * 1024 * 1024); // 8 GB

    // Mock os.networkInterfaces() for consistent network data
    (os.networkInterfaces as jest.Mock).mockReturnValue({
      'lo': [
        { address: '127.0.0.1', netmask: '255.0.0.0', family: 'IPv4', mac: '00:00:00:00:00:00', internal: true, cidr: '127.0.0.1/8' }
      ],
      'eth0': [
        { address: '192.168.1.10', netmask: '255.255.255.0', family: 'IPv4', mac: '00:11:22:33:44:55', internal: false, cidr: '192.168.1.10/24' }
      ]
    });
  });

  it('should collect CPU metrics', async () => {
    const metrics = await collector.collectMetrics();
    expect(metrics.cpu).toBeDefined();
    expect(metrics.cpu.count).toBe(2);
    expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
    expect(metrics.cpu.loadAverage).toBeDefined();
  });

  it('should collect memory metrics', async () => {
    const metrics = await collector.collectMetrics();
    expect(metrics.memory).toBeDefined();
    expect(metrics.memory.total).toBe(16 * 1024 * 1024 * 1024);
    expect(metrics.memory.free).toBe(8 * 1024 * 1024 * 1024);
    expect(metrics.memory.used).toBe(8 * 1024 * 1024 * 1024);
    expect(metrics.memory.usagePercentage).toBe(50);
  });

  it('should collect disk metrics', async () => {
    // Mock child_process.exec for df -h
    jest.spyOn(require('child_process'), 'exec').mockImplementation((command, callback) => {
      if (command === 'df -h') {
        callback(null, 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        100G  50G  50G  50% /', '');
      } else {
        callback(new Error('Unknown command'), '', '');
      }
    });

    const metrics = await collector.collectMetrics();
    expect(metrics.disk).toBeDefined();
    expect(metrics.disk.total).toBe('100G');
    expect(metrics.disk.used).toBe('50G');
    expect(metrics.disk.available).toBe('50G');
    expect(metrics.disk.usagePercentage).toBe('50%');
  });

  it('should collect network metrics', async () => {
    const metrics = await collector.collectMetrics();
    expect(metrics.network).toBeDefined();
    expect(metrics.network.interfaces).toBeDefined();
    expect(metrics.network.interfaces.length).toBeGreaterThan(0);
    expect(metrics.network.interfaces[0].name).toBeDefined();
    expect(metrics.network.interfaces[0].address).toBeDefined();
  });

  it('should start and stop periodic collection', async () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(collector, 'collectMetrics');

    collector.startPeriodicCollection(1000);
    expect(spy).toHaveBeenCalledTimes(1); // Called immediately on start

    jest.advanceTimersByTime(1000);
    expect(spy).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(1000);
    expect(spy).toHaveBeenCalledTimes(3);

    collector.stopPeriodicCollection();
    jest.advanceTimersByTime(1000);
    expect(spy).toHaveBeenCalledTimes(3); // Should not be called again after stop

    jest.useRealTimers();
  });

  it('should handle errors during metric collection', async () => {
    (os.totalmem as jest.Mock).mockImplementation(() => {
      throw new Error('Memory error');
    });

    // Suppress console.error for this test to avoid noise
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const metrics = await collector.collectMetrics();
    expect(metrics.memory).toBeUndefined(); // Memory metrics should be undefined on error
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error collecting memory metrics:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
