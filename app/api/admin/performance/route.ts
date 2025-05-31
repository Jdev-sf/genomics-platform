// app/api/admin/performance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { OptimizationManager } from '@/lib/container/optimized-service-registry';
import { CacheUtils } from '@/lib/cache/setup';
import { prisma } from '@/lib/prisma-optimized';
import { addSecurityHeaders } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access
    const userRole = session.user?.role?.name;
    if (!['admin', 'researcher'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Gather performance metrics from various sources
    const [
      optimizationReport,
      cacheStats,
      databaseHealth,
      systemMetrics
    ] = await Promise.allSettled([
      OptimizationManager.getPerformanceReport(),
      getCacheStatistics(),
      getDatabaseHealth(),
      getSystemMetrics(),
    ]);

    const baseResponse = {
      generatedAt: new Date().toISOString(),
      status: 'success'
    };

    // Query performance from optimization manager
    const performanceData = optimizationReport.status === 'fulfilled' ? optimizationReport.value : {
      queryReport: { totalQueries: 0, averageDuration: 0, slowQueries: 0, slowQueryPercentage: 0, topSlowOperations: [], performanceTrend: 'stable', timeWindow: 60 },
      slowQueries: [],
      recommendations: []
    };

    const response = {
      ...baseResponse,
      ...performanceData,
      cacheStats: cacheStats.status === 'fulfilled' ? cacheStats.value : null,
      databaseHealth: databaseHealth.status === 'fulfilled' ? databaseHealth.value : null,
      systemMetrics: systemMetrics.status === 'fulfilled' ? systemMetrics.value : null,
    };

    const jsonResponse = NextResponse.json(response);
    return addSecurityHeaders(jsonResponse);

  } catch (error) {
    console.error('Performance API error:', error);
    
    const errorResponse = NextResponse.json(
      { error: 'Failed to retrieve performance metrics' },
      { status: 500 }
    );

    return addSecurityHeaders(errorResponse);
  }
}

// Helper function to get cache statistics
async function getCacheStatistics() {
  try {
    const stats = CacheUtils.getCacheStats();
    
    // Calculate aggregated stats
    let totalHits = 0;
    let totalMisses = 0;
    let totalL1Hits = 0;
    let totalL2Hits = 0;

    Object.values(stats).forEach(cache => {
      totalHits += cache.stats.l1Hits + cache.stats.l2Hits;
      totalMisses += cache.stats.l1Misses + cache.stats.l2Misses;
      totalL1Hits += cache.stats.l1Hits;
      totalL2Hits += cache.stats.l2Hits;
    });

    const totalRequests = totalHits + totalMisses;
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

    return {
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits,
      totalMisses,
      totalRequests,
      l1HitRate: totalRequests > 0 ? (totalL1Hits / totalRequests) * 100 : 0,
      l2HitRate: totalRequests > 0 ? (totalL2Hits / totalRequests) * 100 : 0,
      cacheCount: Object.keys(stats).length,
      detailed: stats,
    };
  } catch (error) {
    console.error('Failed to get cache statistics:', error);
    return null;
  }
}

// Helper function to get database health
async function getDatabaseHealth() {
  try {
    const healthCheck = await prisma.healthCheck();
    const stats = prisma.getStats();

    return {
      ...healthCheck,
      ...stats,
      connectionPool: {
        // These would come from actual connection pool monitoring
        activeConnections: stats.connectionCount || 0,
        idleConnections: 0,
        totalConnections: process.env.DB_CONNECTION_LIMIT || 20,
      }
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      queryCount: 0,
      connectionCount: 0,
    };
  }
}

// Helper function to get system metrics
async function getSystemMetrics() {
  try {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        heapUsagePercentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
      process: {
        uptime: Math.round(uptime),
        uptimeFormatted: formatUptime(uptime),
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        optimizationLevel: process.env.OPTIMIZATION_LEVEL || 'full',
        cacheEnabled: process.env.CACHE_ENABLED !== 'false',
        queryMonitoring: process.env.QUERY_MONITORING !== 'false',
      }
    };
  } catch (error) {
    console.error('Failed to get system metrics:', error);
    return null;
  }
}

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}