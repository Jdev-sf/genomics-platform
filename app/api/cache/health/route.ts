// app/api/cache/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { CacheUtils } from '@/lib/cache/setup';
import { ServiceCacheManager } from '@/lib/container/service-registry';
import { addSecurityHeaders } from '@/lib/validation';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ requestId: 'cache-health' });

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin or researcher role
    const userRole = session.user?.role?.name;
    if (!['admin', 'researcher'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const startTime = Date.now();

    // Perform comprehensive cache health check
    const [cacheHealth, serviceStats] = await Promise.allSettled([
      CacheUtils.healthCheck(),
      ServiceCacheManager.getCacheStatistics(),
    ]);

    const duration = Date.now() - startTime;

    const healthData = {
      timestamp: new Date().toISOString(),
      duration,
      cache: cacheHealth.status === 'fulfilled' ? cacheHealth.value : {
        status: 'unhealthy',
        error: cacheHealth.reason,
      },
      services: serviceStats.status === 'fulfilled' ? serviceStats.value : null,
      overall: determineOverallHealth(cacheHealth, serviceStats),
    };

    const statusCode = healthData.overall === 'healthy' ? 200 : 
                      healthData.overall === 'degraded' ? 200 : 503;

    const response = NextResponse.json(healthData, { status: statusCode });
    return addSecurityHeaders(response);

  } catch (error) {
    logger.error('Cache health check failed', error instanceof Error ? error : new Error(String(error)));
    
    const response = NextResponse.json({
      timestamp: new Date().toISOString(),
      cache: { status: 'unhealthy' },
      services: null,
      overall: 'unhealthy',
      error: error instanceof Error ? error.message : 'Health check failed',
    }, { status: 503 });

    return addSecurityHeaders(response);
  }
}

function determineOverallHealth(
  cacheHealth: PromiseSettledResult<any>,
  serviceStats: PromiseSettledResult<any>
): 'healthy' | 'degraded' | 'unhealthy' {
  if (cacheHealth.status === 'rejected') {
    return 'unhealthy';
  }

  const cacheStatus = cacheHealth.value?.status;
  
  if (cacheStatus === 'unhealthy') {
    return 'unhealthy';
  } else if (cacheStatus === 'degraded' || serviceStats.status === 'rejected') {
    return 'degraded';
  } else {
    return 'healthy';
  }
}