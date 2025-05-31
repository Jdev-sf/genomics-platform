// app/api/cache/manage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { CacheUtils } from '@/lib/cache/setup';
import { ServiceCacheManager } from '@/lib/container/service-registry';
import { addSecurityHeaders } from '@/lib/validation';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ requestId: 'cache-manage' });

// Get cache statistics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user?.role?.name;
    if (!['admin', 'researcher'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const stats = CacheUtils.getCacheStats();
    const serviceStats = await ServiceCacheManager.getCacheStatistics();

    const response = NextResponse.json({
      timestamp: new Date().toISOString(),
      system: stats,
      services: serviceStats,
      summary: {
        totalHits: Object.values(stats).reduce((sum, cache) => sum + cache.stats.l1Hits + cache.stats.l2Hits, 0),
        totalMisses: Object.values(stats).reduce((sum, cache) => sum + cache.stats.l1Misses + cache.stats.l2Misses, 0),
        averageHitRate: Object.values(stats).reduce((sum, cache) => sum + cache.stats.hitRate, 0) / Object.keys(stats).length,
      },
    });

    return addSecurityHeaders(response);

  } catch (error) {
    logger.error('Cache stats retrieval failed', error instanceof Error ? error : new Error(String(error)));
    
    const response = NextResponse.json(
      { error: 'Failed to retrieve cache statistics' },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}

// Cache management operations
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can manage cache
    const userRole = session.user?.role?.name;
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { action, pattern } = await request.json();

    let result;
    switch (action) {
      case 'clear':
        if (pattern) {
          // Clear specific pattern
          await Promise.allSettled([
            CacheUtils.invalidateRelated(require('@/lib/cache/setup').geneCache, [pattern]),
            CacheUtils.invalidateRelated(require('@/lib/cache/setup').variantCache, [pattern]),
            CacheUtils.invalidateRelated(require('@/lib/cache/setup').generalCache, [pattern]),
          ]);
          result = { message: `Cache cleared for pattern: ${pattern}` };
        } else {
          // Clear all caches
          await CacheUtils.clearAllCaches();
          result = { message: 'All caches cleared' };
        }
        break;

      case 'warmup':
        await Promise.allSettled([
          CacheUtils.warmupCache(),
          ServiceCacheManager.warmupAllCaches(),
        ]);
        result = { message: 'Cache warmup completed' };
        break;

      case 'invalidate_services':
        await ServiceCacheManager.invalidateAllCaches();
        result = { message: 'Service caches invalidated' };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: clear, warmup, invalidate_services' },
          { status: 400 }
        );
    }

    logger.info('Cache management action executed', {
      action,
      pattern,
      userId: session.user?.id,
    });

    const response = NextResponse.json({
      success: true,
      action,
      pattern,
      timestamp: new Date().toISOString(),
      ...result,
    });

    return addSecurityHeaders(response);

  } catch (error) {
    logger.error('Cache management failed', error instanceof Error ? error : new Error(String(error)));
    
    const response = NextResponse.json(
      { error: 'Cache management operation failed' },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}