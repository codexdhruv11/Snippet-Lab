import { PerformanceMonitor } from '../../../src/utils/performance-monitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    // Reset singleton instance before each test
    PerformanceMonitor.resetForTest();
    monitor = PerformanceMonitor.getInstance();
    jest.useRealTimers();
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env.NODE_ENV = 'test'; // Reset to default test environment
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PerformanceMonitor.getInstance();
      const instance2 = PerformanceMonitor.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('trackVirtualFieldUsage()', () => {
    it('should track virtual field usage in non-production environments', () => {
      monitor.trackVirtualFieldUsage('followerCount', { documentCount: 1, isBulk: false });
      const report = monitor.getPerformanceReport();
      expect(report.virtualFieldUsage['followerCount'].count).toBe(1);
    });

    it('should not track virtual field usage in production', () => {
      process.env.NODE_ENV = 'production';
      monitor.trackVirtualFieldUsage('followerCount', { documentCount: 1, isBulk: false });
      const report = monitor.getPerformanceReport();
      expect(report.virtualFieldUsage).toEqual({});
    });

    it('should accumulate metrics over multiple calls', () => {
      monitor.trackVirtualFieldUsage('followerCount', { documentCount: 10, isBulk: true });
      monitor.trackVirtualFieldUsage('followerCount', { documentCount: 5, isBulk: false });
      const usage = monitor.getPerformanceReport().virtualFieldUsage['followerCount'];
      expect(usage.count).toBe(2);
      expect(usage.totalDocuments).toBe(15);
      expect(usage.bulkOperations).toBe(1);
    });

    it('should capture context information', () => {
      monitor.trackVirtualFieldUsage('followerCount', { documentCount: 20, isBulk: true });
      const usage = monitor.getPerformanceReport().virtualFieldUsage['followerCount'];
      expect(usage.contexts[0].documentCount).toBe(20);
      expect(usage.contexts[0].isBulk).toBe(true);
      expect(usage.contexts[0].stackTrace).toBeDefined();
    });
  });

  describe('getPerformanceReport()', () => {
    it('should return the correct metrics structure', () => {
      const report = monitor.getPerformanceReport();
      expect(report).toHaveProperty('virtualFieldUsage');
      expect(report).toHaveProperty('problematicPatterns');
    });

    it('should accumulate total queries and bulk queries', () => {
      monitor.trackVirtualFieldUsage('testField', { documentCount: 1, isBulk: false });
      monitor.trackVirtualFieldUsage('testField', { documentCount: 1, isBulk: true });
      const report = monitor.getPerformanceReport();
      expect(report.virtualFieldUsage.testField.count).toBe(2);
      expect(report.virtualFieldUsage.testField.bulkOperations).toBe(1);
    });

    it('should generate recommendations based on usage patterns', () => {
      // Trigger large document count warning
      monitor.trackVirtualFieldUsage('testField', { documentCount: 60, isBulk: false });
      const report = monitor.getPerformanceReport();
      expect(report.problematicPatterns.testField).toBeDefined();
      expect(report.problematicPatterns.testField.recommendations[0]).toContain('large-document-count');
    });
  });

  describe('Pattern Detection', () => {
    it('should detect repeated-bulk-operations pattern', () => {
      for (let i = 0; i < 4; i++) {
        monitor.trackVirtualFieldUsage('bulkField', { documentCount: 10, isBulk: true });
      }
      const report = monitor.getPerformanceReport();
      expect(report.problematicPatterns.bulkField.patterns).toContain('repeated-bulk-operations');
    });

    it('should detect large-document-count pattern', () => {
      monitor.trackVirtualFieldUsage('largeField', { documentCount: 100, isBulk: false });
      const report = monitor.getPerformanceReport();
      expect(report.problematicPatterns.largeField.patterns).toContain('large-document-count');
    });

    it('should detect loop-access patterns', () => {
      const mockContext = { documentCount: 1, isBulk: false };
      const sameFunction = () => {
        monitor.trackVirtualFieldUsage('loopField', mockContext);
      };
      for (let i = 0; i < 5; i++) {
        sameFunction();
      }
      const report = monitor.getPerformanceReport();
      expect(report.problematicPatterns.loopField.patterns).toContain('loop-access');
    });
  });

  describe('Warning System', () => {
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('should not issue warnings in test environment', () => {
      process.env.NODE_ENV = 'test';
      monitor.trackVirtualFieldUsage('testField', { documentCount: 100, isBulk: false });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should issue warning when threshold is triggered', () => {
      process.env.NODE_ENV = 'development';
      // Trigger warning by large document count
      monitor.trackVirtualFieldUsage('testField', { documentCount: 100, isBulk: false });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Performance Warning'));
    });

    it('should respect warning cooldown mechanism', () => {
      process.env.NODE_ENV = 'development';
      // First warning
      monitor.trackVirtualFieldUsage('testField', { documentCount: 100, isBulk: false });
      expect(warnSpy).toHaveBeenCalledTimes(1);

      // Second event, should be on cooldown
      monitor.trackVirtualFieldUsage('testField', { documentCount: 100, isBulk: false });
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('should include context and recommendations in warning content', () => {
      process.env.NODE_ENV = 'development';
      monitor.trackVirtualFieldUsage('testField', { documentCount: 100, isBulk: false });
      const warningMessage = warnSpy.mock.calls[0][0];
      expect(warningMessage).toContain('Context');
      expect(warningMessage).toContain('Recommendations');
      expect(warningMessage).toContain('large-document-count');
    });
  });

  describe('reset() Functionality', () => {
    it('should clear all metrics and usage history', () => {
      monitor.trackVirtualFieldUsage('testField', { documentCount: 10, isBulk: false });
      monitor.reset();
      const report = monitor.getPerformanceReport();
      expect(report.virtualFieldUsage).toEqual({});
      expect(report.problematicPatterns).toEqual({});
    });

    it('should start metrics fresh after reset', () => {
      monitor.trackVirtualFieldUsage('testField1', { documentCount: 1, isBulk: false });
      monitor.reset();
      monitor.trackVirtualFieldUsage('testField2', { documentCount: 1, isBulk: false });
      const report = monitor.getPerformanceReport();
      expect(report.virtualFieldUsage).toHaveProperty('testField2');
      expect(report.virtualFieldUsage).not.toHaveProperty('testField1');
    });
  });

  describe('Time-based Tests', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('should filter recent usage correctly (5-minute window)', () => {
      monitor.trackVirtualFieldUsage('timedField', { documentCount: 1, isBulk: false });
      jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes
      monitor.trackVirtualFieldUsage('timedField', { documentCount: 1, isBulk: false });

      // This is a bit tricky to test directly without exposing internal state, 
      // but we can infer from the loop-access detection which relies on this filtering
      const mockContext = { documentCount: 1, isBulk: false };
      const sameFunction = () => {
        monitor.trackVirtualFieldUsage('loopField', mockContext);
      };

      sameFunction();
      jest.advanceTimersByTime(6 * 60 * 1000);
      sameFunction();
      const report = monitor.getPerformanceReport();
      expect(report.problematicPatterns.loopField).toBeUndefined(); // No loop detected due to time
    });

    it('should respect warning cooldown timing', () => {
      process.env.NODE_ENV = 'development';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      monitor.trackVirtualFieldUsage('cooldownField', { documentCount: 100, isBulk: false });
      expect(warnSpy).toHaveBeenCalledTimes(1);

      monitor.trackVirtualFieldUsage('cooldownField', { documentCount: 100, isBulk: false });
      expect(warnSpy).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes

      monitor.trackVirtualFieldUsage('cooldownField', { documentCount: 100, isBulk: false });
      expect(warnSpy).toHaveBeenCalledTimes(2);

      warnSpy.mockRestore();
    });
  });
});
