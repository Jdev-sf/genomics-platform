// app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbTime = Date.now() - dbStart;

    // Check system resources
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Get basic stats
    const [geneCount, variantCount] = await Promise.all([
      prisma.gene.count(),
      prisma.variant.count()
    ]);

    const responseTime = Date.now() - startTime;

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(uptime),
      performance: {
        responseTime: `${responseTime}ms`,
        dbResponseTime: `${dbTime}ms`,
      },
      database: {
        status: 'connected',
        genes: geneCount,
        variants: variantCount,
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      },
      checks: {
        database: dbTime < 1000 ? 'healthy' : 'slow',
        memory: memoryUsage.heapUsed / memoryUsage.heapTotal < 0.9 ? 'healthy' : 'high',
        response: responseTime < 500 ? 'healthy' : 'slow',
      }
    };

    // Determine overall health status
    const hasUnhealthyChecks = Object.values(healthData.checks).some(
      status => status !== 'healthy'
    );

    if (hasUnhealthyChecks) {
      healthData.status = 'degraded';
    }

    return NextResponse.json(healthData, {
      status: hasUnhealthyChecks ? 200 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      performance: {
        responseTime: `${Date.now() - startTime}ms`,
      }
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}