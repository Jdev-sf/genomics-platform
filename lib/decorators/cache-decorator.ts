// lib/decorators/cache-decorator.ts
// Method decorator for automatic caching

import { CacheManager, CacheEntry } from '@/lib/cache/cache-manager';
import { createLogger } from '@/lib/logger';

export interface CacheConfig {
  ttl: number;
  keyGenerator?: (...args: any[]) => string;
  enabled?: boolean;
  tags?: string[];
}

export interface CacheableClass {
  cache: CacheManager;
  cachePrefix: string;
}

const logger = createLogger({ component: 'CacheDecorator' });

/**
 * Method decorator for automatic caching
 */
export function Cache(config: CacheConfig) {
  return function <T extends CacheableClass>(
    target: T,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (this: T, ...args: any[]) {
      // Skip caching if disabled
      if (config.enabled === false) {
        return originalMethod.apply(this, args);
      }
      
      // Generate cache key
      const cacheKey = config.keyGenerator 
        ? config.keyGenerator(...args)
        : generateDefaultCacheKey(this.cachePrefix, propertyKey, args);
      
      try {
        // Try to get from cache
        const cached = await this.cache.get<any>(cacheKey);
        if (cached) {
          logger.debug('Cache hit', { key: cacheKey, method: propertyKey });
          return cached.data;
        }
        
        // Execute original method
        logger.debug('Cache miss, executing method', { key: cacheKey, method: propertyKey });
        const result = await originalMethod.apply(this, args);
        
        // Store in cache
        if (result !== null && result !== undefined) {
          await this.cache.set(cacheKey, result, { ttl: config.ttl });
          logger.debug('Result cached', { key: cacheKey, method: propertyKey, ttl: config.ttl });
        }
        
        return result;
        
      } catch (error) {
        logger.error('Cache operation failed', error instanceof Error ? error : new Error(String(error)), {
          key: cacheKey,
          method: propertyKey
        });
        
        // Fallback to original method on cache error
        return originalMethod.apply(this, args);
      }
    };
    
    return descriptor;
  };
}

/**
 * Class decorator to add cache invalidation methods
 */
export function Cacheable(cachePrefix: string) {
  return function <T extends { new(...args: any[]): CacheableClass }>(constructor: T) {
    return class extends constructor {
      cachePrefix = cachePrefix;
      
      async invalidateCache(pattern?: string): Promise<void> {
        const fullPattern = pattern ? `${this.cachePrefix}:${pattern}` : this.cachePrefix;
        await this.cache.clear(fullPattern);
        logger.info('Cache invalidated', { prefix: this.cachePrefix, pattern });
      }
      
      async invalidateCacheKey(key: string): Promise<void> {
        const fullKey = `${this.cachePrefix}:${key}`;
        await this.cache.del(fullKey);
        logger.debug('Cache key invalidated', { key: fullKey });
      }
      
      async warmupCache(warmupMethods: Array<() => Promise<any>>): Promise<void> {
        logger.info('Starting cache warmup', { prefix: this.cachePrefix, methods: warmupMethods.length });
        await Promise.allSettled(warmupMethods.map(method => method()));
        logger.info('Cache warmup completed', { prefix: this.cachePrefix });
      }
    };
  };
}

/**
 * Generate default cache key from method name and arguments
 */
function generateDefaultCacheKey(prefix: string, methodName: string, args: any[]): string {
  // Create a simple hash of arguments
  const argsHash = args.length > 0 ? hashArgs(args) : 'no-args';
  return `${prefix}:${methodName}:${argsHash}`;
}

/**
 * Simple hash function for arguments
 */
function hashArgs(args: any[]): string {
  try {
    const serialized = JSON.stringify(args, (key, value) => {
      // Handle BigInt serialization
      if (typeof value === 'bigint') {
        return `BigInt:${value.toString()}`;
      }
      // Handle Date serialization
      if (value instanceof Date) {
        return `Date:${value.toISOString()}`;
      }
      return value;
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < serialized.length; i++) {
      const char = serialized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  } catch (error) {
    // Fallback to timestamp if serialization fails
    return Date.now().toString(36);
  }
}

/**
 * Cache key generators for common patterns
 */
export const CacheKeyGenerators = {
  /**
   * Generate key for ID-based lookups
   */
  byId: (prefix: string) => (id: string) => `${prefix}:id:${id}`,
  
  /**
   * Generate key for search operations
   */
  bySearch: (prefix: string) => (searchParams: any) => {
    const params = {
      ...searchParams,
      // Normalize pagination for better cache hits
      page: searchParams.page || 1,
      limit: searchParams.limit || 20
    };
    return `${prefix}:search:${hashArgs([params])}`;
  },
  
  /**
   * Generate key for list operations with filters
   */
  byFilter: (prefix: string) => (filters: any, pagination: any) => {
    return `${prefix}:filter:${hashArgs([filters, pagination])}`;
  },
  
  /**
   * Generate key for statistics operations
   */
  byStats: (prefix: string) => (entityId: string, type?: string) => {
    return `${prefix}:stats:${entityId}${type ? `:${type}` : ''}`;
  }
};

/**
 * Common cache configurations
 */
export const CacheConfigs = {
  // Short-lived cache for frequently changing data
  SHORT: { ttl: 300 }, // 5 minutes
  
  // Medium-lived cache for moderately stable data
  MEDIUM: { ttl: 1800 }, // 30 minutes
  
  // Long-lived cache for stable data
  LONG: { ttl: 3600 }, // 1 hour
  
  // Very long-lived cache for rarely changing data
  STABLE: { ttl: 86400 }, // 24 hours
  
  // Custom configurations for specific use cases
  GENE_DETAIL: { 
    ttl: 3600,
    keyGenerator: CacheKeyGenerators.byId('gene')
  },
  
  VARIANT_DETAIL: {
    ttl: 3600,
    keyGenerator: CacheKeyGenerators.byId('variant')
  },
  
  SEARCH_RESULTS: {
    ttl: 900, // 15 minutes
    keyGenerator: CacheKeyGenerators.bySearch('search')
  },
  
  STATISTICS: {
    ttl: 1800, // 30 minutes
    keyGenerator: CacheKeyGenerators.byStats('stats')
  }
};