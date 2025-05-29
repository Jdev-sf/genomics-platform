// lib/metrics.ts
import { NextRequest } from 'next/dist/server/web/spec-extension/request';
import { createLogger } from './logger';

// Metric types
export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface Counter extends Metric {
  type: 'counter';
}

export interface Gauge extends Metric {
  type: 'gauge';
}

export interface Histogram extends Metric {
  type: 'histogram';
  buckets?: number[];
}

export interface Summary extends Metric {
  type: 'summary';
  quantiles?: number[];
}

// Metrics storage (in-memory for basic implementation)
class MetricsStore {
  private metrics = new Map<string, Metric[]>();
  private readonly maxMetricsPerName = 1000; // Prevent memory issues
  private readonly logger = createLogger({ requestId: 'metrics' });

  add(metric: Metric) {
    const key = this.getMetricKey(metric.name, metric.labels);
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const metrics = this.metrics.get(key)!;
    metrics.push(metric);
    
    // Keep only recent metrics to prevent memory issues
    if (metrics.length > this.maxMetricsPerName) {
      metrics.splice(0, metrics.length - this.maxMetricsPerName);
    }
  }

  get(name: string, labels?: Record<string, string>): Metric[] {
    const key = this.getMetricKey(name, labels);
    return this.metrics.get(key) || [];
  }

  getAll(): Map<string, Metric[]> {
    return new Map(this.metrics);
  }

  clear() {
    this.metrics.clear();
  }

  // Clean old metrics (older than 1 hour)
  cleanup() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [key, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp > oneHourAgo);
      
      if (filteredMetrics.length === 0) {
        this.metrics.delete(key);
      } else {
        this.metrics.set(key, filteredMetrics);
      }
    }
    
    this.logger.debug('Metrics cleanup completed', {
      type: 'metrics_cleanup',
      metricsCount: this.metrics.size,
    });
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    
    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    return `${name}{${labelString}}`;
  }
}

// Singleton metrics store
const metricsStore = new MetricsStore();

// Cleanup metrics every 10 minutes
setInterval(() => {
  metricsStore.cleanup();
}, 10 * 60 * 1000);

// Metrics collector class
export class MetricsCollector {
  private static instance: MetricsCollector;
  private logger = createLogger({ requestId: 'metrics-collector' });

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  // Counter methods
  incrementCounter(name: string, labels?: Record<string, string>, value: number = 1) {
    const metric: Counter = {
      name,
      type: 'counter',
      value,
      timestamp: Date.now(),
      labels,
    };
    
    metricsStore.add(metric);
  }

  // Gauge methods
  setGauge(name: string, value: number, labels?: Record<string, string>) {
    const metric: Gauge = {
      name,
      type: 'gauge',
      value,
      timestamp: Date.now(),
      labels,
    };
    
    metricsStore.add(metric);
  }

  // Histogram methods
  recordHistogram(name: string, value: number, labels?: Record<string, string>, buckets?: number[]) {
    const metric: Histogram = {
      name,
      type: 'histogram',
      value,
      timestamp: Date.now(),
      labels,
      buckets,
    };
    
    metricsStore.add(metric);
  }

  // Summary methods
  recordSummary(name: string, value: number, labels?: Record<string, string>, quantiles?: number[]) {
    const metric: Summary = {
      name,
      type: 'summary',
      value,
      timestamp: Date.now(),
      labels,
      quantiles,
    };
    
    metricsStore.add(metric);
  }

  // Get metrics
  getMetrics(name: string, labels?: Record<string, string>): Metric[] {
    return metricsStore.get(name, labels);
  }

  getAllMetrics(): Map<string, Metric[]> {
    return metricsStore.getAll();
  }

  // Calculate statistics
  getMetricStats(name: string, labels?: Record<string, string>, windowMinutes: number = 5) {
    const windowMs = windowMinutes * 60 * 1000;
    const cutoff = Date.now() - windowMs;
    
    const metrics = this.getMetrics(name, labels).filter(m => m.timestamp > cutoff);
    
    if (metrics.length === 0) {
      return null;
    }

    const values = metrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length;
    const avg = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate percentiles
    const sorted = values.sort((a, b) => a - b);
    const p50 = this.percentile(sorted, 0.5);
    const p90 = this.percentile(sorted, 0.9);
    const p95 = this.percentile(sorted, 0.95);
    const p99 = this.percentile(sorted, 0.99);

    return {
      name,
      labels,
      windowMinutes,
      count,
      sum,
      avg,
      min,
      max,
      percentiles: { p50, p90, p95, p99 },
      rate: count / windowMinutes, // per minute
    };
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
}

// Application-specific metrics
export class ApplicationMetrics {
  private collector = MetricsCollector.getInstance();
  private logger = createLogger({ requestId: 'app-metrics' });

  // API Metrics
  recordApiRequest(method: string, path: string, statusCode: number, duration: number) {
    const labels = { method, path, status: statusCode.toString() };
    
    // Count requests
    this.collector.incrementCounter('http_requests_total', labels);
    
    // Record response time
    this.collector.recordHistogram('http_request_duration_ms', duration, labels);
    
    // Track error rate
    if (statusCode >= 400) {
      this.collector.incrementCounter('http_requests_errors_total', labels);
    }
  }

  // Database Metrics
  recordDatabaseQuery(operation: string, table: string, duration: number, success: boolean) {
    const labels = { operation, table, success: success.toString() };
    
    this.collector.incrementCounter('db_queries_total', labels);
    this.collector.recordHistogram('db_query_duration_ms', duration, labels);
    
    if (!success) {
      this.collector.incrementCounter('db_queries_errors_total', labels);
    }
  }

  // Genomics-specific metrics
  recordGenomicsOperation(operation: string, entityType: 'gene' | 'variant', duration: number, recordCount: number) {
    const labels = { operation, entity_type: entityType };
    
    this.collector.incrementCounter('genomics_operations_total', labels);
    this.collector.recordHistogram('genomics_operation_duration_ms', duration, labels);
    this.collector.recordHistogram('genomics_records_processed', recordCount, labels);
  }

  // Import/Export metrics
  recordImportActivity(fileType: string, status: 'success' | 'failure', recordCount: number, duration: number, fileSize: number) {
    const labels = { file_type: fileType, status };
    
    this.collector.incrementCounter('import_operations_total', labels);
    this.collector.recordHistogram('import_duration_ms', duration, labels);
    this.collector.recordHistogram('import_records_count', recordCount, labels);
    this.collector.recordHistogram('import_file_size_bytes', fileSize, labels);
  }

  // System metrics
  recordSystemMetrics() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Memory metrics
    this.collector.setGauge('nodejs_memory_heap_used_bytes', memUsage.heapUsed);
    this.collector.setGauge('nodejs_memory_heap_total_bytes', memUsage.heapTotal);
    this.collector.setGauge('nodejs_memory_rss_bytes', memUsage.rss);
    this.collector.setGauge('nodejs_memory_external_bytes', memUsage.external);
    
    // Process metrics
    this.collector.setGauge('nodejs_process_uptime_seconds', uptime);
    
    // CPU metrics (if available)
    try {
      const cpuUsage = process.cpuUsage();
      this.collector.setGauge('nodejs_cpu_user_microseconds', cpuUsage.user);
      this.collector.setGauge('nodejs_cpu_system_microseconds', cpuUsage.system);
    } catch (error) {
      // CPU usage not available on all platforms
    }
  }

  // Rate limiting metrics
  recordRateLimit(endpoint: string, blocked: boolean) {
    const labels = { endpoint, blocked: blocked.toString() };
    this.collector.incrementCounter('rate_limit_checks_total', labels);
  }

  // Security metrics
  recordSecurityEvent(eventType: string, severity: 'low' | 'medium' | 'high') {
    const labels = { event_type: eventType, severity };
    this.collector.incrementCounter('security_events_total', labels);
  }

  // Get comprehensive application metrics
  getApplicationMetrics(windowMinutes: number = 5) {
    const metrics = {
      http: {
        requests: this.collector.getMetricStats('http_requests_total', undefined, windowMinutes),
        responseTime: this.collector.getMetricStats('http_request_duration_ms', undefined, windowMinutes),
        errors: this.collector.getMetricStats('http_requests_errors_total', undefined, windowMinutes),
      },
      database: {
        queries: this.collector.getMetricStats('db_queries_total', undefined, windowMinutes),
        queryTime: this.collector.getMetricStats('db_query_duration_ms', undefined, windowMinutes),
        errors: this.collector.getMetricStats('db_queries_errors_total', undefined, windowMinutes),
      },
      genomics: {
        operations: this.collector.getMetricStats('genomics_operations_total', undefined, windowMinutes),
        operationTime: this.collector.getMetricStats('genomics_operation_duration_ms', undefined, windowMinutes),
        recordsProcessed: this.collector.getMetricStats('genomics_records_processed', undefined, windowMinutes),
      },
      imports: {
        operations: this.collector.getMetricStats('import_operations_total', undefined, windowMinutes),
        duration: this.collector.getMetricStats('import_duration_ms', undefined, windowMinutes),
        recordCount: this.collector.getMetricStats('import_records_count', undefined, windowMinutes),
      },
      security: {
        events: this.collector.getMetricStats('security_events_total', undefined, windowMinutes),
        rateLimits: this.collector.getMetricStats('rate_limit_checks_total', undefined, windowMinutes),
      }
    };

    return metrics;
  }
}

// Metrics middleware for automatic collection
export function withMetrics(handler: Function) {
  const appMetrics = new ApplicationMetrics();
  
  return async function(request: NextRequest, context?: any): Promise<Response> {
    const startTime = Date.now();
    const method = request.method;
    const path = new URL(request.url).pathname;

    try {
      const response = context 
        ? await handler(request, context)
        : await handler(request);
      
      const duration = Date.now() - startTime;
      appMetrics.recordApiRequest(method, path, response.status, duration);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      appMetrics.recordApiRequest(method, path, 500, duration);
      throw error;
    }
  };
}

// Database metrics decorator
export function withDatabaseMetrics(operation: string, table: string) {
  const appMetrics = new ApplicationMetrics();
  
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const startTime = Date.now();
      let success = true;
      
      try {
        const result = await method.apply(this, args);
        return result;
      } catch (error) {
        success = false;
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        appMetrics.recordDatabaseQuery(operation, table, duration, success);
      }
    };
  };
}

// Prometheus-style metrics export
export class PrometheusExporter {
  private collector = MetricsCollector.getInstance();

  export(): string {
    const allMetrics = this.collector.getAllMetrics();
    const lines: string[] = [];

    for (const [key, metrics] of allMetrics) {
      if (metrics.length === 0) continue;

      const latestMetric = metrics[metrics.length - 1];
      const metricName = latestMetric.name;
      
      // Add HELP and TYPE comments
      lines.push(`# HELP ${metricName} ${this.getMetricHelp(metricName)}`);
      lines.push(`# TYPE ${metricName} ${this.getMetricType(latestMetric)}`);
      
      // Add metric values
      for (const metric of metrics) {
        const labels = this.formatLabels(metric.labels);
        lines.push(`${metricName}${labels} ${metric.value} ${metric.timestamp}`);
      }
      
      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  private formatLabels(labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }
    
    const labelPairs = Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    return `{${labelPairs}}`;
  }

  private getMetricType(metric: Metric): string {
    return (metric as any).type || 'gauge';
  }

  private getMetricHelp(name: string): string {
    const helpTexts: Record<string, string> = {
      'http_requests_total': 'Total number of HTTP requests',
      'http_request_duration_ms': 'HTTP request duration in milliseconds',
      'http_requests_errors_total': 'Total number of HTTP request errors',
      'db_queries_total': 'Total number of database queries',
      'db_query_duration_ms': 'Database query duration in milliseconds',
      'db_queries_errors_total': 'Total number of database query errors',
      'genomics_operations_total': 'Total number of genomics operations',
      'genomics_operation_duration_ms': 'Genomics operation duration in milliseconds',
      'import_operations_total': 'Total number of import operations',
      'import_duration_ms': 'Import operation duration in milliseconds',
      'security_events_total': 'Total number of security events',
      'rate_limit_checks_total': 'Total number of rate limit checks',
      'nodejs_memory_heap_used_bytes': 'Node.js heap memory used in bytes',
      'nodejs_memory_heap_total_bytes': 'Node.js total heap memory in bytes',
      'nodejs_process_uptime_seconds': 'Node.js process uptime in seconds',
    };
    
    return helpTexts[name] || `Metric: ${name}`;
  }
}

// Periodic system metrics collection
const appMetrics = new ApplicationMetrics();
setInterval(() => {
  appMetrics.recordSystemMetrics();
}, 30000); // Every 30 seconds

// Export singleton instances
export const metrics = MetricsCollector.getInstance();
export const applicationMetrics = new ApplicationMetrics();
export const prometheusExporter = new PrometheusExporter();

export default MetricsCollector;