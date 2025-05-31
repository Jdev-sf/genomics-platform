// lib/cache/decorators.ts
import { CacheManager, CacheOptions } from './cache-manager';
import { geneCache, variantCache, generalCache, CACHE_TTL, CacheUtils } from './setup';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ requestId: 'cache-decorators' });

export interface CacheDecoratorOptions extends CacheOptions {
  keyGenerator?: (...args: any[]) => string;
  invalidatePatterns?: string[];
  skipIf?: (...args: any[]) => boolean;
  cacheType?: 'gene' | 'variant' | 'general';
}

// Method decorator for caching
export function Cacheable(options: CacheDecoratorOptions = {}) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const cacheType = options.cacheType || 'general';
    
    descriptor.value = async function (...args: any[]) {
      const cacheManager = getCacheManager(cacheType);
      
      // Skip caching if condition is met
      if (options.skipIf && options.skipIf(...args)) {
        return await originalMethod.apply(this, args);
      }

      // Generate cache key
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(...args)
        : generateDefaultKey(target.constructor.name, propertyName, args);

      try {
        // Try to get from cache
        const cached = await cacheManager.get(cacheKey, options);
        if (cached) {
          logger.debug('Cache hit', { 
            method: `${target.constructor.name}.${propertyName}`,
            key: cacheKey,
            source: cached.source 
          });
          return cached.data;
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);
        
        // Cache the result
        if (result !== null && result !== undefined) {
          await cacheManager.set(cacheKey, result, options);
          logger.debug('Cache set', { 
            method: `${target.constructor.name}.${propertyName}`,
            key: cacheKey 
          });
        }

        return result;

      } catch (error) {
        logger.error('Cache decorator error', error instanceof Error ? error : new Error(String(error)), {
          method: `${target.constructor.name}.${propertyName}`,
          key: cacheKey,
        });
        
        // Fallback to original method
        return await originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

// Method decorator for cache invalidation
export function CacheInvalidate(options: {
  patterns: string[] | ((...args: any[]) => string[]);
  cacheTypes?: Array<'gene' | 'variant' | 'general'>;
}) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      try {
        const patterns = typeof options.patterns === 'function' 
          ? options.patterns(...args)
          : options.patterns;

        const cacheTypes = options.cacheTypes || ['gene', 'variant', 'general'];
        
        await Promise.allSettled(
          cacheTypes.map(type => {
            const cacheManager = getCacheManager(type);
            return CacheUtils.invalidateRelated(cacheManager, patterns);
          })
        );

        logger.debug('Cache invalidated', {
          method: `${target.constructor.name}.${propertyName}`,
          patterns,
          cacheTypes,
        });

      } catch (error) {
        logger.error('Cache invalidation error', error instanceof Error ? error : new Error(String(error)), {
          method: `${target.constructor.name}.${propertyName}`,
        });
      }

      return result;
    };

    return descriptor;
  };
}

// Class decorator for automatic caching configuration
export function CacheEnabled(defaultOptions: CacheDecoratorOptions = {}) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);
        
        // Apply default cache options to methods
        const prototype = constructor.prototype;
        const methodNames = Object.getOwnPropertyNames(prototype)
          .filter(name => name !== 'constructor' && typeof prototype[name] === 'function');

        methodNames.forEach(methodName => {
          if (methodName.startsWith('find') || methodName.startsWith('get')) {
            const originalMethod = prototype[methodName];
            if (originalMethod && !originalMethod._cached) {
              const cachedMethod = Cacheable({
                ...defaultOptions,
                keyGenerator: (...args: any[]) => 
                  `${constructor.name}:${methodName}:${CacheUtils.generateKey(args[0] || {})}`,
              });
              
              const descriptor = {
                value: originalMethod,
                writable: true,
                enumerable: false,
                configurable: true,
              };
              
              cachedMethod(this, methodName, descriptor);
              prototype[methodName] = descriptor.value;
              prototype[methodName]._cached = true;
            }
          }
        });
      }
    };
  };
}

// Cache warming decorator
export function CacheWarm(options: {
  priority?: number;
  warmupArgs?: any[];
}) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    // Register method for warmup
    if (!target.constructor._warmupMethods) {
      target.constructor._warmupMethods = [];
    }
    
    target.constructor._warmupMethods.push({
      method: propertyName,
      priority: options.priority || 0,
      args: options.warmupArgs || [],
    });

    return descriptor;
  };
}

// Utility functions
function getCacheManager(type: 'gene' | 'variant' | 'general'): CacheManager {
  switch (type) {
    case 'gene': return geneCache;
    case 'variant': return variantCache;
    case 'general': return generalCache;
    default: return generalCache;
  }
}

function generateDefaultKey(className: string, methodName: string, args: any[]): string {
  const params = args.length > 0 ? args[0] : {};
  return `${className}:${methodName}:${CacheUtils.generateKey(params)}`;
}

// Cache middleware for API routes
export function withCache(options: {
  ttl?: number;
  keyGenerator?: (req: any) => string;
  skipIf?: (req: any) => boolean;
  cacheType?: 'gene' | 'variant' | 'general';
}) {
  return function (handler: Function) {
    return async function (request: any, context?: any) {
      const cacheManager = getCacheManager(options.cacheType || 'general');
      
      // Skip caching if condition is met
      if (options.skipIf && options.skipIf(request)) {
        return await handler(request, context);
      }

      // Generate cache key from request
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(request)
        : generateRequestKey(request);

      try {
        // Try cache first
        const cached = await cacheManager.get(cacheKey, { 
          ttl: options.ttl 
        });
        
        if (cached) {
          logger.debug('API cache hit', { 
            url: request.url,
            method: request.method,
            key: cacheKey 
          });
          
          // Return cached response
          return new Response(JSON.stringify(cached.data), {
            headers: {
              'Content-Type': 'application/json',
              'X-Cache': 'HIT',
              'X-Cache-Source': cached.source,
            },
          });
        }

        // Execute handler
        const response = await handler(request, context);
        
        // Cache successful responses
        if (response.ok) {
          const responseData = await response.clone().json();
          await cacheManager.set(cacheKey, responseData, {
            ttl: options.ttl || CACHE_TTL.API_RESPONSE
          });
          
          logger.debug('API cache set', { 
            url: request.url,
            method: request.method,
            key: cacheKey 
          });
        }

        // Add cache headers
        response.headers.set('X-Cache', 'MISS');
        return response;

      } catch (error) {
        logger.error('API cache error', error instanceof Error ? error : new Error(String(error)), {
          url: request.url,
          method: request.method,
        });
        
        // Fallback to handler
        return await handler(request, context);
      }
    };
  };
}

function generateRequestKey(request: any): string {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  
  return `api:${request.method}:${url.pathname}:${CacheUtils.generateKey(params)}`;
}

// Cache configuration helper
export const CacheConfigs = {
  // Repository caching
  GENE_REPOSITORY: {
    cacheType: 'gene' as const,
    ttl: CACHE_TTL.GENE_DETAIL,
    keyGenerator: (id: string) => `gene:${id}`,
  },
  
  VARIANT_REPOSITORY: {
    cacheType: 'variant' as const,
    ttl: CACHE_TTL.VARIANT_DETAIL,
    keyGenerator: (id: string) => `variant:${id}`,
  },

  // Service caching
  GENE_SERVICE: {
    cacheType: 'gene' as const,
    ttl: CACHE_TTL.GENE_LIST,
  },
  
  VARIANT_SERVICE: {
    cacheType: 'variant' as const,
    ttl: CACHE_TTL.VARIANT_LIST,
  },

  // API caching
  API_SEARCH: {
    cacheType: 'general' as const,
    ttl: CACHE_TTL.SEARCH_RESULTS,
    keyGenerator: (req: any) => {
      const url = new URL(req.url);
      return `search:${url.searchParams.get('query')}`;
    },
  },
};