// lib/performance/query-monitor.ts
import { PrismaClient } from '@prisma/client';
import { createLogger } from '@/lib/logger';

interface QueryMetrics {
  operation: string;
  duration: number;
  query: string;
  params?: any;
  rowCount?: number;
  timestamp: Date;
  source: 'repository' | 'service' | 'api';
}

interface SlowQueryAlert {
  query: string;
  duration: number;
  threshold: number;
  frequency: number;
  lastOccurrence: Date;
}

export class QueryPerformanceMonitor {
  private static instance: QueryPerformanceMonitor;
  private metrics: QueryMetrics[] = [];
  private slowQueries = new Map<string, SlowQueryAlert>();
  private logger = createLogger({ requestId: 'query-monitor' });
  
  // Thresholds in milliseconds
  private readonly SLOW_QUERY_THRESHOLD = 1000;
  private readonly VERY_SLOW_THRESHOLD = 5000;
  private readonly MAX_METRICS_RETENTION = 1000;

  static getInstance(): QueryPerformanceMonitor {
    if (!QueryPerformanceMonitor.instance) {
      QueryPerformanceMonitor.instance = new QueryPerformanceMonitor();
    }
    return QueryPerformanceMonitor.instance;
  }

  // Decorator per monitoraggio automatico
  static withQueryMonitoring(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const monitor = QueryPerformanceMonitor.getInstance();

    descriptor.value = async function(...args: any[]) {
      const startTime = Date.now();
      const operation = `${target.constructor.name}.${propertyKey}`;
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        monitor.recordQuery({
          operation,
          duration,
          query: operation, // In production, extract actual SQL
          params: args[0],
          timestamp: new Date(),
          source: 'repository',
          rowCount: Array.isArray(result?.data) ? result.data.length : undefined,
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        monitor.recordFailedQuery(operation, duration, error);
        throw error;
      }
    };

    return descriptor;
  }

  recordQuery(metrics: QueryMetrics) {
    this.metrics.push(metrics);
    this.maintainMetricsSize();
    
    // Check for slow queries
    if (metrics.duration > this.SLOW_QUERY_THRESHOLD) {
      this.recordSlowQuery(metrics);
    }

    // Log very slow queries immediately
    if (metrics.duration > this.VERY_SLOW_THRESHOLD) {
      this.logger.warn('Very slow query detected', {
        operation: metrics.operation,
        duration: metrics.duration,
        threshold: this.VERY_SLOW_THRESHOLD,
      });
    }
  }

  private recordSlowQuery(metrics: QueryMetrics) {
    const queryKey = this.getQueryKey(metrics.operation);
    const existing = this.slowQueries.get(queryKey);
    
    if (existing) {
      existing.frequency++;
      existing.lastOccurrence = metrics.timestamp;
      if (metrics.duration > existing.duration) {
        existing.duration = metrics.duration;
      }
    } else {
      this.slowQueries.set(queryKey, {
        query: metrics.operation,
        duration: metrics.duration,
        threshold: this.SLOW_QUERY_THRESHOLD,
        frequency: 1,
        lastOccurrence: metrics.timestamp,
      });
    }
  }

  recordFailedQuery(operation: string, duration: number, error: any) {
    this.logger.error('Query failed', error instanceof Error ? error : new Error(String(error)), {
      operation,
      duration,
      type: 'query_failure',
    });
  }

  // Analytics methods
  getPerformanceReport(timeWindowMinutes: number = 60) {
    const cutoff = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    if (recentMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        topSlowOperations: [],
        performanceTrend: 'stable',
      };
    }

    const durations = recentMetrics.map(m => m.duration);
    const slowCount = recentMetrics.filter(m => m.duration > this.SLOW_QUERY_THRESHOLD).length;
    
    // Group by operation
    const operationStats = recentMetrics.reduce((acc, metric) => {
      if (!acc[metric.operation]) {
        acc[metric.operation] = {
          count: 0,
          totalDuration: 0,
          maxDuration: 0,
          avgRowCount: 0,
        };
      }
      
      acc[metric.operation].count++;
      acc[metric.operation].totalDuration += metric.duration;
      acc[metric.operation].maxDuration = Math.max(acc[metric.operation].maxDuration, metric.duration);
      if (metric.rowCount) {
        acc[metric.operation].avgRowCount += metric.rowCount;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages and sort by performance
    const topSlowOperations = Object.entries(operationStats)
      .map(([operation, stats]) => ({
        operation,
        count: stats.count,
        averageDuration: Math.round(stats.totalDuration / stats.count),
        maxDuration: stats.maxDuration,
        avgRowCount: Math.round(stats.avgRowCount / stats.count),
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 10);

    return {
      totalQueries: recentMetrics.length,
      averageDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      slowQueries: slowCount,
      slowQueryPercentage: Math.round((slowCount / recentMetrics.length) * 100),
      topSlowOperations,
      performanceTrend: this.calculatePerformanceTrend(recentMetrics),
      timeWindow: timeWindowMinutes,
    };
  }

  getSlowQueriesReport() {
    return Array.from(this.slowQueries.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);
  }

  // Get recommendations for optimization
  getOptimizationRecommendations() {
    const slowQueries = this.getSlowQueriesReport();
    const recommendations: Array<{
      priority: 'high' | 'medium' | 'low';
      type: string;
      description: string;
      query?: string;
    }> = [];

    slowQueries.forEach(slow => {
      if (slow.frequency > 10 && slow.duration > this.VERY_SLOW_THRESHOLD) {
        recommendations.push({
          priority: 'high',
          type: 'index_optimization',
          description: `Query "${slow.query}" is frequently slow (${slow.frequency} times, avg ${slow.duration}ms). Consider adding database indices.`,
          query: slow.query,
        });
      } else if (slow.frequency > 5) {
        recommendations.push({
          priority: 'medium',
          type: 'caching_opportunity',
          description: `Query "${slow.query}" runs frequently (${slow.frequency} times). Consider caching results.`,
          query: slow.query,
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Database-specific analysis
  async analyzePgStatStatements(prisma: PrismaClient) {
    try {
      // Requires pg_stat_statements extension
      const slowQueries = await prisma.$queryRaw<Array<{
        query: string;
        calls: bigint;
        total_time: number;
        mean_time: number;
        max_time: number;
      }>>`
        SELECT 
          left(query, 100) as query,
          calls,
          total_time,
          mean_time,
          max_time
        FROM pg_stat_statements 
        WHERE mean_time > 100
        ORDER BY mean_time DESC 
        LIMIT 20
      `;

      return slowQueries.map(q => ({
        query: q.query,
        calls: Number(q.calls),
        totalTime: q.total_time,
        meanTime: q.mean_time,
        maxTime: q.max_time,
      }));
    } catch (error) {
      this.logger.warn('pg_stat_statements not available', { error });
      return [];
    }
  }

  // Real-time monitoring
  startRealTimeMonitoring() {
    // Clean up old metrics every 5 minutes
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 5 * 60 * 1000);

    // Report performance summary every hour
    setInterval(() => {
      const report = this.getPerformanceReport(60);
      this.logger.info('Query performance report', report);
    }, 60 * 60 * 1000);

    this.logger.info('Query performance monitoring started');
  }

  private calculatePerformanceTrend(metrics: QueryMetrics[]): 'improving' | 'degrading' | 'stable' {
    if (metrics.length < 10) return 'stable';
    
    const half = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, half);
    const secondHalf = metrics.slice(half);
    
    const firstAvg = firstHalf.reduce((sum, m) => sum + m.duration, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.duration, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 20) return 'degrading';
    if (change < -20) return 'improving';
    return 'stable';
  }

  private maintainMetricsSize() {
    if (this.metrics.length > this.MAX_METRICS_RETENTION) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_RETENTION);
    }
  }

  private cleanupOldMetrics() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
    
    // Clean slow queries older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const [key, slow] of this.slowQueries.entries()) {
      if (slow.lastOccurrence < oneDayAgo) {
        this.slowQueries.delete(key);
      }
    }
  }

  private getQueryKey(operation: string): string {
    // Normalize operation names for grouping
    return operation.replace(/\d+/g, 'N').replace(/['"]/g, '');
  }
}