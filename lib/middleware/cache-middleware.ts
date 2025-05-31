// lib/middleware/cache-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { withCache, CacheConfigs } from '@/lib/cache/decorators';
import { generalCache, CACHE_TTL } from '@/lib/cache/setup';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ requestId: 'cache-middleware' });

// API-specific cache middleware
export function withApiCache(options: {
  ttl?: number;
  skipMethods?: string[];
  skipPaths?: string[];
  keyGenerator?: (req: NextRequest) => string;
  varyBy?: string[]; // Headers to vary cache by
}) {
  return function (handler: Function) {
    return async function (request: NextRequest, context?: any): Promise<NextResponse> {
      const { pathname } = new URL(request.url);
      const method = request.method;

      // Skip caching for certain methods or paths
      if (options.skipMethods?.includes(method) || 
          options.skipPaths?.some(path => pathname.startsWith(path))) {
        return await handler(request, context);
      }

      // Only cache GET requests by default
      if (method !== 'GET') {
        return await handler(request, context);
      }

      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(request)
        : generateDefaultApiKey(request, options.varyBy);

      try {
        // Try cache first
        const cached = await generalCache.get(cacheKey, { 
          ttl: options.ttl || CACHE_TTL.API_RESPONSE 
        });
        
        if (cached) {
          logger.debug('API cache hit', { 
            path: pathname,
            method,
            key: cacheKey,
            source: cached.source 
          });
          
          // Return cached response with proper headers
          const response = NextResponse.json(cached.data);
          response.headers.set('X-Cache', 'HIT');
          response.headers.set('X-Cache-Source', cached.source);
          response.headers.set('X-Cache-Key', cacheKey.substring(0, 20) + '...');
          return response;
        }

        // Execute handler
        const response = await handler(request, context);
        
        // Cache successful JSON responses
        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          try {
            const responseData = await response.clone().json();
            await generalCache.set(cacheKey, responseData, {
              ttl: options.ttl || CACHE_TTL.API_RESPONSE
            });
            
            logger.debug('API cache set', { 
              path: pathname,
              method,
              key: cacheKey,
              status: response.status 
            });
          } catch (error) {
            logger.warn('Failed to cache API response', { error, path: pathname });
          }
        }

        // Add cache headers
        response.headers.set('X-Cache', 'MISS');
        response.headers.set('X-Cache-Key', cacheKey.substring(0, 20) + '...');
        return response;

      } catch (error) {
        logger.error('API cache middleware error', error instanceof Error ? error : new Error(String(error)), {
          path: pathname,
          method,
        });
        
        // Fallback to handler
        return await handler(request, context);
      }
    };
  };
}

function generateDefaultApiKey(request: NextRequest, varyBy?: string[]): string {
  const url = new URL(request.url);
  const pathParams = url.pathname;
  const queryParams = Array.from(url.searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b));
  
  let keyParts = [
    'api',
    request.method,
    pathParams,
    queryParams.map(([k, v]) => `${k}=${v}`).join('&')
  ];

  // Add varying headers if specified
  if (varyBy) {
    const varyValues = varyBy
      .map(header => `${header}=${request.headers.get(header) || ''}`)
      .join('&');
    keyParts.push(varyValues);
  }

  return keyParts.filter(Boolean).join(':');
}

// Specialized middleware presets
export const ApiCachePresets = {
  // Fast changing data - short TTL
  LIVE_DATA: {
    ttl: CACHE_TTL.STATS,
    skipMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
  },
  
  // Search results - medium TTL
  SEARCH: {
    ttl: CACHE_TTL.SEARCH_RESULTS,
    skipMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
    keyGenerator: (req: NextRequest) => {
      const url = new URL(req.url);
      const query = url.searchParams.get('search') || url.searchParams.get('query') || '';
      return `search:${query}:${Array.from(url.searchParams.entries()).sort().map(([k,v]) => `${k}=${v}`).join('&')}`;
    },
  },
  
  // Detail pages - long TTL
  DETAILS: {
    ttl: CACHE_TTL.GENE_DETAIL,
    skipMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
    keyGenerator: (req: NextRequest) => {
      const url = new URL(req.url);
      return `detail:${url.pathname.split('/').pop()}`;
    },
  },
  
  // Lists with pagination - medium TTL
  LISTS: {
    ttl: CACHE_TTL.GENE_LIST,
    skipMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
    keyGenerator: (req: NextRequest) => {
      const url = new URL(req.url);
      const page = url.searchParams.get('page') || '1';
      const limit = url.searchParams.get('limit') || '20';
      const filters = Array.from(url.searchParams.entries())
        .filter(([k]) => !['page', 'limit'].includes(k))
        .sort()
        .map(([k,v]) => `${k}=${v}`)
        .join('&');
      return `list:${url.pathname}:p${page}:l${limit}:${filters}`;
    },
  },
};

// Cache invalidation middleware
export function withCacheInvalidation(patterns: string[] | ((req: NextRequest) => string[])) {
  return function (handler: Function) {
    return async function (request: NextRequest, context?: any): Promise<NextResponse> {
      const response = await handler(request, context);
      
      // Only invalidate on successful write operations
      if (response.ok && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        try {
          const invalidationPatterns = typeof patterns === 'function' 
            ? patterns(request)
            : patterns;

          await Promise.allSettled(
            invalidationPatterns.map(pattern => generalCache.invalidatePattern(pattern))
          );

          logger.debug('Cache invalidated', {
            method: request.method,
            url: request.url,
            patterns: invalidationPatterns,
          });

          response.headers.set('X-Cache-Invalidated', 'true');
        } catch (error) {
          logger.error('Cache invalidation failed', error instanceof Error ? error : new Error(String(error)));
        }
      }

      return response;
    };
  };
}

// Combined cache middleware with smart invalidation
export function withSmartCache(config: {
  read: typeof ApiCachePresets[keyof typeof ApiCachePresets];
  write: {
    invalidatePatterns: string[] | ((req: NextRequest) => string[]);
  };
}) {
  return function (handler: Function) {
    const cachedHandler = withApiCache(config.read)(handler);
    return withCacheInvalidation(config.write.invalidatePatterns)(cachedHandler);
  };
}