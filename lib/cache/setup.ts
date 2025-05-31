// lib/cache/setup.ts
import { CacheManager } from './cache-manager';
import { RedisAdapter } from './redis-adapter';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ requestId: 'cache-setup' });

// Cache instances
let geneCache: CacheManager;
let variantCache: CacheManager;
let generalCache: CacheManager;

// Cache TTL configuration (in seconds)
export const CACHE_TTL = {
  GENE_DETAIL: 60 * 60 * 2, // 2 hours
  GENE_LIST: 60 * 30,       // 30 minutes
  VARIANT_DETAIL: 60 * 60 * 2, // 2 hours
  VARIANT_LIST: 60 * 30,       // 30 minutes
  SEARCH_RESULTS: 60 * 15,     // 15 minutes
  STATS: 60 * 5,               // 5 minutes
  USER_SESSION: 60 * 60 * 24,  // 24 hours
  API_RESPONSE: 60 * 10,       // 10 minutes
} as const;

// Cache key patterns
export const CACHE_KEYS = {
  GENE: {
    DETAIL: (id: string) => `gene:detail:${id}`,
    LIST: (params: string) => `gene:list:${params}`,
    SEARCH: (query: string) => `gene:search:${query}`,
    STATS: (id: string) => `gene:stats:${id}`,
  },
  VARIANT: {
    DETAIL: (id: string) => `variant:detail:${id}`,
    LIST: (params: string) => `variant:list:${params}`,
    SEARCH: (query: string) => `variant:search:${query}`,
    BY_GENE: (geneId: string) => `variant:by_gene:${geneId}`,
  },
  SEARCH: {
    GLOBAL: (query: string) => `search:global:${query}`,
  },
  STATS: {
    DASHBOARD: 'stats:dashboard',
    GENES: 'stats:genes',
    VARIANTS: 'stats:variants',
  },
} as const;

function createRedisAdapter(): RedisAdapter | null {
  try {
    // Only create Redis adapter if Redis is configured
    if (process.env.REDIS_HOST || process.env.REDIS_URL) {
      return new RedisAdapter();
    }
    logger.info('Redis not configured, using memory-only caching');
    return null;
  } catch (error) {
    logger.error('Failed to create Redis adapter', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

function initializeCaches() {
  const redisAdapter = createRedisAdapter();
  
  // Gene cache configuration
  geneCache = new CacheManager({
    l1: {
      stdTTL: CACHE_TTL.GENE_DETAIL,
      checkperiod: 120, // Check for expired keys every 2 minutes
      maxKeys: 1000,    // Max 1000 genes in memory
    },
    l2: redisAdapter,
    defaultTTL: CACHE_TTL.GENE_DETAIL,
    prefix: 'genomics:gene',
  });

  // Variant cache configuration
  variantCache = new CacheManager({
    l1: {
      stdTTL: CACHE_TTL.VARIANT_DETAIL,
      checkperiod: 120,
      maxKeys: 2000,    // Max 2000 variants in memory
    },
    l2: redisAdapter,
    defaultTTL: CACHE_TTL.VARIANT_DETAIL,
    prefix: 'genomics:variant',
  });

  // General cache configuration
  generalCache = new CacheManager({
    l1: {
      stdTTL: CACHE_TTL.API_RESPONSE,
      checkperiod: 60,
      maxKeys: 500,     // Max 500 general items in memory
    },
    l2: redisAdapter,
    defaultTTL: CACHE_TTL.API_RESPONSE,
    prefix: 'genomics:general',
  });

  logger.info('Cache system initialized', {
    hasRedis: !!redisAdapter,
    caches: ['gene', 'variant', 'general'],
  });
}

// Initialize caches on module load
initializeCaches();

// Export cache instances
export { geneCache, variantCache, generalCache };

// Cache utilities
export class CacheUtils {
  // Generate consistent cache key from object parameters
  static generateKey(params: Record<string, any>): string {
    const sorted = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);
    
    return Buffer.from(JSON.stringify(sorted)).toString('base64');
  }

  // Invalidate related cache entries
  static async invalidateRelated(
    cacheManager: CacheManager,
    patterns: string[]
  ): Promise<void> {
    await Promise.allSettled(
      patterns.map(pattern => cacheManager.invalidatePattern(pattern))
    );
  }

  // Get cache statistics
  static getCacheStats() {
    return {
      gene: {
        stats: geneCache.getStats(),
        l1: geneCache.getL1Stats(),
      },
      variant: {
        stats: variantCache.getStats(),
        l1: variantCache.getL1Stats(),
      },
      general: {
        stats: generalCache.getStats(),
        l1: generalCache.getL1Stats(),
      },
    };
  }

  // Warm up cache with common queries
  static async warmupCache(): Promise<void> {
    logger.info('Starting cache warmup...');
    
    try {
      // Import services dynamically to avoid circular dependencies
      const { getGeneService, getVariantService } = await import('@/lib/container/service-registry');
      
      const geneService = await getGeneService();
      const variantService = await getVariantService();
      
      const warmupQueries = [
        // Common gene searches
        () => geneService.searchGenes({ page: 1, limit: 20 }),
        () => geneService.searchGenes({ chromosome: '1', page: 1, limit: 10 }),
        () => geneService.searchGenes({ chromosome: 'X', page: 1, limit: 10 }),
        
        // Common variant searches  
        () => variantService.searchVariants({ page: 1, limit: 20 }),
        () => variantService.searchVariants({ 
          clinicalSignificance: ['Pathogenic'], 
          page: 1, 
          limit: 10 
        }),
      ];

      await Promise.allSettled([
        geneCache.warmup(warmupQueries.slice(0, 3)),
        variantCache.warmup(warmupQueries.slice(3)),
      ]);

      logger.info('Cache warmup completed');
    } catch (error) {
      logger.error('Cache warmup failed', error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Clear all caches
  static async clearAllCaches(): Promise<void> {
    await Promise.allSettled([
      geneCache.clear(),
      variantCache.clear(),
      generalCache.clear(),
    ]);
    
    logger.info('All caches cleared');
  }

  // Health check for cache system
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    try {
      const testKey = 'health:check';
      const testValue = { timestamp: Date.now() };
      
      // Test all cache instances
      await Promise.all([
        geneCache.set(testKey, testValue, { ttl: 60 }),
        variantCache.set(testKey, testValue, { ttl: 60 }),
        generalCache.set(testKey, testValue, { ttl: 60 }),
      ]);
      
      const results = await Promise.all([
        geneCache.get(testKey),
        variantCache.get(testKey),
        generalCache.get(testKey),
      ]);
      
      // Cleanup
      await Promise.all([
        geneCache.del(testKey),
        variantCache.del(testKey),
        generalCache.del(testKey),
      ]);
      
      const allWorking = results.every(result => result !== null);
      
      return {
        status: allWorking ? 'healthy' : 'degraded',
        details: {
          geneCache: results[0] !== null,
          variantCache: results[1] !== null,
          generalCache: results[2] !== null,
          stats: this.getCacheStats(),
        },
      };
      
    } catch (error) {
      logger.error('Cache health check failed', error instanceof Error ? error : new Error(String(error)));
      
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
          stats: this.getCacheStats(),
        },
      };
    }
  }
}

// Export cache initialization for use in startup
export { initializeCaches };