/**
 * Performance monitoring utility for tracking virtual field usage patterns
 * Provides context-aware warnings and actionable insights
 */

interface VirtualFieldUsage {
  field: string;
  timestamp: Date;
  stackTrace: string;
  queryContext: {
    isBulkOperation: boolean;
    documentCount?: number;
    originatingFile?: string;
    functionName?: string;
  };
}

interface PerformanceMetrics {
  totalQueries: number;
  bulkQueries: number;
  lastWarningTime?: Date;
  problematicPatterns: string[];
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private usageHistory: VirtualFieldUsage[] = [];
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private warningThreshold = 10; // Warn after N bulk operations
  private warningCooldown = 60000; // 1 minute cooldown between warnings
  
  private constructor() {}
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * Track virtual field usage
   */
  trackVirtualFieldUsage(
    field: string,
    context: {
      isBulkOperation: boolean;
      documentCount?: number;
    }
  ): void {
    if (process.env.NODE_ENV === 'production') return;
    
    // Capture stack trace for context
    const stack = new Error().stack || '';
    const stackLines = stack.split('\n');
    
    // Extract originating file and function from stack trace
    const originatingInfo = this.extractOriginatingInfo(stackLines);
    
    const usage: VirtualFieldUsage = {
      field,
      timestamp: new Date(),
      stackTrace: stack,
      queryContext: {
        ...context,
        ...originatingInfo,
      },
    };
    
    this.usageHistory.push(usage);
    this.updateMetrics(field, usage);
    this.checkForWarnings(field);
  }
  
  /**
   * Extract file and function info from stack trace
   */
  private extractOriginatingInfo(stackLines: string[]): {
    originatingFile?: string;
    functionName?: string;
  } {
    // Skip first 3 lines (Error, this function, trackVirtualFieldUsage)
    for (let i = 3; i < stackLines.length && i < 8; i++) {
      const line = stackLines[i];
      const fileMatch = line.match(/\((.+):(\d+):(\d+)\)/);
      const funcMatch = line.match(/at\s+(\S+)\s+/);
      
      if (fileMatch && funcMatch) {
        const filePath = fileMatch[1];
        // Extract just the filename from the path
        const fileName = filePath.split(/[/\\]/).pop() || filePath;
        
        return {
          originatingFile: fileName,
          functionName: funcMatch[1],
        };
      }
    }
    
    return {};
  }
  
  /**
   * Update performance metrics
   */
  private updateMetrics(field: string, usage: VirtualFieldUsage): void {
    const existing = this.metrics.get(field) || {
      totalQueries: 0,
      bulkQueries: 0,
      problematicPatterns: [],
    };
    
    existing.totalQueries++;
    if (usage.queryContext.isBulkOperation) {
      existing.bulkQueries++;
    }
    
    // Detect problematic patterns
    const patterns = this.detectProblematicPatterns(field);
    existing.problematicPatterns = [...new Set([...existing.problematicPatterns, ...patterns])];
    
    this.metrics.set(field, existing);
  }
  
  /**
   * Detect problematic usage patterns
   */
  private detectProblematicPatterns(field: string): string[] {
    const patterns: string[] = [];
    const recentUsages = this.getRecentUsages(field, 5);
    
    // Pattern 1: Multiple bulk operations in quick succession
    const bulkOps = recentUsages.filter(u => u.queryContext.isBulkOperation);
    if (bulkOps.length >= 3) {
      patterns.push('repeated-bulk-operations');
    }
    
    // Pattern 2: Large document count operations
    const largeOps = recentUsages.filter(
      u => u.queryContext.documentCount && u.queryContext.documentCount > 50
    );
    if (largeOps.length > 0) {
      patterns.push('large-document-count');
    }
    
    // Pattern 3: Loop-based access (same function called multiple times)
    const funcCounts = new Map<string, number>();
    recentUsages.forEach(u => {
      const func = u.queryContext.functionName;
      if (func) {
        funcCounts.set(func, (funcCounts.get(func) || 0) + 1);
      }
    });
    
    for (const [func, count] of funcCounts.entries()) {
      if (count >= 3) {
        patterns.push(`loop-access-in-${func}`);
      }
    }
    
    return patterns;
  }
  
  /**
   * Get recent usages for a field
   */
  private getRecentUsages(field: string, minutes: number = 5): VirtualFieldUsage[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.usageHistory.filter(
      u => u.field === field && u.timestamp > cutoff
    );
  }
  
  /**
   * Check if warnings should be issued
   */
  private checkForWarnings(field: string): void {
    const metrics = this.metrics.get(field);
    if (!metrics) return;
    
    const shouldWarn = this.shouldIssueWarning(metrics);
    if (shouldWarn) {
      this.issueContextualWarning(field, metrics);
      metrics.lastWarningTime = new Date();
    }
  }
  
  /**
   * Determine if a warning should be issued
   */
  private shouldIssueWarning(metrics: PerformanceMetrics): boolean {
    // Don't warn in test environment
    if (process.env.NODE_ENV === 'test') return false;
    
    // Check cooldown
    if (metrics.lastWarningTime) {
      const timeSinceLastWarning = Date.now() - metrics.lastWarningTime.getTime();
      if (timeSinceLastWarning < this.warningCooldown) {
        return false;
      }
    }
    
    // Warn if bulk operations exceed threshold
    if (metrics.bulkQueries >= this.warningThreshold) {
      return true;
    }
    
    // Warn if problematic patterns detected
    if (metrics.problematicPatterns.length >= 2) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Issue a contextual warning with actionable advice
   */
  private issueContextualWarning(field: string, metrics: PerformanceMetrics): void {
    const recentUsages = this.getRecentUsages(field, 5);
    const lastUsage = recentUsages[recentUsages.length - 1];
    
    console.warn('\\n' + '='.repeat(80));
    console.warn(`⚠️  PERFORMANCE WARNING: Virtual field "${field}" inefficient usage detected`);
    console.warn('='.repeat(80));
    
    // Context information
    if (lastUsage?.queryContext.originatingFile) {
      console.warn(`📍 Location: ${lastUsage.queryContext.originatingFile}`);
      if (lastUsage.queryContext.functionName) {
        console.warn(`📍 Function: ${lastUsage.queryContext.functionName}`);
      }
    }
    
    // Metrics summary
    console.warn(`\\n📊 Usage Metrics (last 5 minutes):`);
    console.warn(`   - Total queries: ${metrics.totalQueries}`);
    console.warn(`   - Bulk operations: ${metrics.bulkQueries}`);
    
    // Problematic patterns
    if (metrics.problematicPatterns.length > 0) {
      console.warn(`\\n⚡ Detected Issues:`);
      metrics.problematicPatterns.forEach(pattern => {
        console.warn(`   - ${this.getPatternDescription(pattern)}`);
      });
    }
    
    // Actionable recommendations
    console.warn(`\\n💡 Recommendations:`);
    this.provideActionableAdvice(field, metrics, lastUsage);
    
    // Code examples
    console.warn(`\\n📝 Better Alternatives:`);
    this.provideCodeExamples(field, metrics);
    
    console.warn('\\n' + '='.repeat(80) + '\\n');
  }
  
  /**
   * Get human-readable pattern description
   */
  private getPatternDescription(pattern: string): string {
    if (pattern === 'repeated-bulk-operations') {
      return 'Multiple bulk operations detected (N+1 query pattern)';
    }
    if (pattern === 'large-document-count') {
      return 'Virtual fields populated on large result sets';
    }
    if (pattern.startsWith('loop-access-in-')) {
      const func = pattern.replace('loop-access-in-', '');
      return `Possible loop-based access in ${func}()`;
    }
    return pattern;
  }
  
  /**
   * Provide actionable advice based on usage patterns
   */
  private provideActionableAdvice(
    field: string,
    metrics: PerformanceMetrics,
    lastUsage?: VirtualFieldUsage
  ): void {
    // General advice
    console.warn(`   1. Use User.getUserWithFollows() for single user with counts`);
    console.warn(`   2. Use aggregation pipelines for bulk operations`);
    console.warn(`   3. Consider if counts are really needed for this use case`);
    
    // Pattern-specific advice
    if (metrics.problematicPatterns.includes('repeated-bulk-operations')) {
      console.warn(`   4. ⚠️  Avoid populating virtuals in loops or on multiple documents`);
    }
    
    if (metrics.problematicPatterns.includes('large-document-count')) {
      console.warn(`   4. ⚠️  For lists, omit counts or use a dedicated aggregation endpoint`);
    }
    
    // File-specific advice
    if (lastUsage?.queryContext.originatingFile?.includes('controller')) {
      console.warn(`   5. 🎯 In controllers, use specialized methods instead of populate()`);
    }
  }
  
  /**
   * Provide code examples for better alternatives
   */
  private provideCodeExamples(field: string, metrics: PerformanceMetrics): void {
    if (metrics.problematicPatterns.includes('repeated-bulk-operations')) {
      console.warn(`
   // ❌ BAD: N+1 queries
   const users = await User.find().populate('${field}');
   
   // ✅ GOOD: Custom aggregation
   const users = await User.aggregate([
     { $match: {} },
     {
       $lookup: {
         from: 'follows',
         let: { userId: '$_id' },
         pipeline: [
           { $match: { $expr: { $eq: ['$${field === 'followerCount' ? 'followingId' : 'followerId'}', '$$userId'] } } },
           { $count: 'count' }
         ],
         as: '${field}'
       }
     },
     { $unwind: { path: '$${field}', preserveNullAndEmptyArrays: true } },
     { $addFields: { ${field}: { $ifNull: ['$${field}.count', 0] } } }
   ]);`);
    } else {
      console.warn(`
   // Single user - use the optimized method:
   const userWithCounts = await User.getUserWithFollows(userId);
   
   // Or if you need other populated fields:
   const user = await User.findById(userId)
     .populate('${field}')
     .lean();`);
    }
  }
  
  /**
   * Get performance report
   */
  getPerformanceReport(): {
    summary: Map<string, PerformanceMetrics>;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    
    // Analyze overall patterns
    for (const [field, metrics] of this.metrics.entries()) {
      if (metrics.bulkQueries > metrics.totalQueries * 0.5) {
        recommendations.push(
          `Field "${field}" is primarily used in bulk operations. Consider removing virtual and using aggregation.`
        );
      }
    }
    
    return {
      summary: this.metrics,
      recommendations,
    };
  }
  
  /**
   * Reset metrics (useful for testing)
   */
  reset(): void {
    this.usageHistory = [];
    this.metrics.clear();
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
