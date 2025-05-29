// lib/health-checks.ts
import { prisma } from './prisma';
import { createLogger } from './logger';

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  message?: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: HealthCheckResult[];
  metrics: {
    responseTime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
  };
}

const logger = createLogger({ requestId: 'health-check' });

// Individual health check functions
export class HealthChecker {
  private static readonly TIMEOUT_MS = 5000; // 5 seconds timeout
  private static readonly HEALTHY_RESPONSE_TIME = 1000; // 1 second
  private static readonly DEGRADED_RESPONSE_TIME = 3000; // 3 seconds

  // Database connectivity check
  static async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const checkName = 'database';

    try {
      // Test basic connectivity
      await Promise.race([
        prisma.$queryRaw`SELECT 1 as health_check`,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), this.TIMEOUT_MS)
        )
      ]);

      // Test more complex operations
      const [geneCount, variantCount] = await Promise.all([
        prisma.gene.count(),
        prisma.variant.count()
      ]);

      const responseTime = Date.now() - startTime;
      const status = this.getStatusFromResponseTime(responseTime);

      return {
        name: checkName,
        status,
        responseTime,
        message: status === 'healthy' ? 'Database is accessible' : 'Database responding slowly',
        details: {
          geneCount,
          variantCount,
          connectionPool: {}
        },
        timestamp: new Date().toISOString(),
      };

    } catch (err) {
      const responseTime = Date.now() - startTime;
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Database health check failed', error);

      return {
        name: checkName,
        status: 'unhealthy',
        responseTime,
        message: error.message,
        details: {
          error: {
            name: error.name,
            message: error.message,
          }
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Memory usage check
  static async checkMemory(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const memoryUsage = process.memoryUsage();
    const responseTime = Date.now() - startTime;

    // Memory thresholds (in bytes)
    const MEMORY_WARNING_THRESHOLD = 1024 * 1024 * 1024; // 1GB
    const MEMORY_CRITICAL_THRESHOLD = 2 * 1024 * 1024 * 1024; // 2GB

    const heapUsed = memoryUsage.heapUsed;
    const heapTotal = memoryUsage.heapTotal;
    const heapUsedPercent = (heapUsed / heapTotal) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = 'Memory usage is normal';

    if (heapUsed > MEMORY_CRITICAL_THRESHOLD || heapUsedPercent > 90) {
      status = 'unhealthy';
      message = 'Memory usage is critically high';
    } else if (heapUsed > MEMORY_WARNING_THRESHOLD || heapUsedPercent > 75) {
      status = 'degraded';
      message = 'Memory usage is elevated';
    }

    return {
      name: 'memory',
      status,
      responseTime,
      message,
      details: {
        heapUsed: `${Math.round(heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(heapTotal / 1024 / 1024)}MB`,
        heapUsedPercent: `${heapUsedPercent.toFixed(1)}%`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
        thresholds: {
          warning: `${MEMORY_WARNING_THRESHOLD / 1024 / 1024}MB`,
          critical: `${MEMORY_CRITICAL_THRESHOLD / 1024 / 1024}MB`,
        }
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Disk space check (if applicable)
  static async checkDiskSpace(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const fs = await import('fs/promises');
      const stats = await fs.statfs('./');
      
      const total = stats.blocks * stats.bsize;
      const free = stats.bavail * stats.bsize;
      const used = total - free;
      const usedPercent = (used / total) * 100;

      const responseTime = Date.now() - startTime;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = 'Disk space is adequate';

      if (usedPercent > 95) {
        status = 'unhealthy';
        message = 'Disk space is critically low';
      } else if (usedPercent > 85) {
        status = 'degraded';
        message = 'Disk space is running low';
      }

      return {
        name: 'disk',
        status,
        responseTime,
        message,
        details: {
          total: `${Math.round(total / 1024 / 1024 / 1024)}GB`,
          free: `${Math.round(free / 1024 / 1024 / 1024)}GB`,
          used: `${Math.round(used / 1024 / 1024 / 1024)}GB`,
          usedPercent: `${usedPercent.toFixed(1)}%`,
        },
        timestamp: new Date().toISOString(),
      };

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return {
        name: 'disk',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        message: 'Unable to check disk space',
        details: { 
          error: error.message 
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // External dependencies check
  static async checkExternalDependencies(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Placeholder for external dependency checks
      const responseTime = Date.now() - startTime;

      return {
        name: 'external-dependencies',
        status: 'healthy',
        responseTime,
        message: 'All external dependencies are accessible',
        details: {
          dependencies: 0,
        },
        timestamp: new Date().toISOString(),
      };

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return {
        name: 'external-dependencies',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        message: 'Some external dependencies may be unavailable',
        details: { 
          error: error.message 
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Application-specific health checks
  static async checkGenomicsData(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Check if essential genomics data is available
      const [recentGenes, recentVariants] = await Promise.all([
        prisma.gene.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { id: true, createdAt: true }
        }),
        prisma.variant.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { id: true, createdAt: true }
        })
      ]);

      const responseTime = Date.now() - startTime;

      // Check data freshness (data older than 30 days might be stale)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = 'Genomics data is up to date';

      if (!recentGenes || !recentVariants) {
        status = 'unhealthy';
        message = 'No genomics data found';
      } else if (
        recentGenes.createdAt < thirtyDaysAgo || 
        recentVariants.createdAt < thirtyDaysAgo
      ) {
        status = 'degraded';
        message = 'Genomics data may be stale';
      }

      return {
        name: 'genomics-data',
        status,
        responseTime,
        message,
        details: {
          lastGeneUpdate: recentGenes?.createdAt,
          lastVariantUpdate: recentVariants?.createdAt,
          hasData: !!(recentGenes && recentVariants),
        },
        timestamp: new Date().toISOString(),
      };

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return {
        name: 'genomics-data',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: 'Unable to verify genomics data status',
        details: {
          error: error.message
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Helper method to determine status from response time
  private static getStatusFromResponseTime(responseTime: number): 'healthy' | 'degraded' | 'unhealthy' {
    if (responseTime <= this.HEALTHY_RESPONSE_TIME) return 'healthy';
    if (responseTime <= this.DEGRADED_RESPONSE_TIME) return 'degraded';
    return 'unhealthy';
  }

  // Comprehensive system health check
  static async getSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      // Run all health checks in parallel
      const healthChecks = await Promise.allSettled([
        this.checkDatabase(),
        this.checkMemory(),
        this.checkDiskSpace(),
        this.checkExternalDependencies(),
        this.checkGenomicsData(),
      ]);

      // Process results
      const checks: HealthCheckResult[] = healthChecks.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          const checkNames = ['database', 'memory', 'disk', 'external-dependencies', 'genomics-data'];
          const error = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
          return {
            name: checkNames[index] || 'unknown',
            status: 'unhealthy' as const,
            responseTime: 0,
            message: error.message,
            timestamp,
          };
        }
      });

      // Determine overall system status
      const hasUnhealthy = checks.some(check => check.status === 'unhealthy');
      const hasDegraded = checks.some(check => check.status === 'degraded');

      let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
      if (hasUnhealthy) {
        overallStatus = 'unhealthy';
      } else if (hasDegraded) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'healthy';
      }

      const responseTime = Date.now() - startTime;
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      // Get CPU usage if available
      let cpuUsage: NodeJS.CpuUsage | undefined;
      try {
        cpuUsage = process.cpuUsage();
      } catch {
        // CPU usage not available on all platforms
      }

      const systemHealth: SystemHealth = {
        status: overallStatus,
        timestamp,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: Math.floor(uptime),
        checks,
        metrics: {
          responseTime,
          memoryUsage,
          ...(cpuUsage && { cpuUsage }),
        },
      };

      logger.info('System health check completed', {
        status: overallStatus,
        responseTime,
        checksCount: checks.length,
        healthyChecks: checks.filter(c => c.status === 'healthy').length,
        degradedChecks: checks.filter(c => c.status === 'degraded').length,
        unhealthyChecks: checks.filter(c => c.status === 'unhealthy').length,
      });

      return systemHealth;

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('System health check failed', error);

      return {
        status: 'unhealthy',
        timestamp,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: Math.floor(process.uptime()),
        checks: [{
          name: 'system',
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          message: error.message,
          timestamp,
        }],
        metrics: {
          responseTime: Date.now() - startTime,
          memoryUsage: process.memoryUsage(),
        },
      };
    }
  }
}

export default HealthChecker;