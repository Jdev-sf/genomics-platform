// scripts/init-cache.ts
import { CacheUtils } from '@/lib/cache/setup';
import { ServiceCacheManager } from '@/lib/container/service-registry';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ requestId: 'cache-init' });

async function initializeCache() {
  logger.info('Starting cache initialization...');
  
  try {
    // Test cache connectivity
    logger.info('Testing cache connectivity...');
    const healthCheck = await CacheUtils.healthCheck();
    
    if (healthCheck.status === 'unhealthy') {
      logger.error('Cache system is unhealthy', healthCheck.details);
      process.exit(1);
    }
    
    logger.info('Cache system is healthy', { status: healthCheck.status });

    // Warm up caches
    logger.info('Warming up caches...');
    await Promise.allSettled([
      CacheUtils.warmupCache(),
      ServiceCacheManager.warmupAllCaches(),
    ]);
    
    logger.info('Cache warmup completed');

    // Show final statistics
    const stats = CacheUtils.getCacheStats();
    logger.info('Cache initialization completed', {
      caches: Object.keys(stats),
      totalL1Keys: Object.values(stats).reduce((sum, cache) => sum + cache.l1.keys, 0),
    });

  } catch (error) {
    logger.error('Cache initialization failed', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeCache()
    .then(() => {
      logger.info('Cache initialization successful');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Cache initialization failed', error);
      process.exit(1);
    });
}

export { initializeCache };