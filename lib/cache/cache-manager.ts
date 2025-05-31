// lib/cache/cache-manager.ts
import { createLogger } from '@/lib/logger';
import NodeCache from 'node-cache';

export interface CacheOptions {
  ttl?: number; // seconds
  enableL1?: boolean;
  enableL2?: boolean;
  prefix?: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  source: 'L1' | 'L2' | 'DB';
}

export interface CacheStats {
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  totalRequests: number;
  hitRate: number;
}

export abstract class CacheAdapter {
  abstract get<T>(key: string): Promise<T | null>;
  abstract set<T>(key: string, value: T, ttl?: number): Promise<void>;
  abstract del(key: string): Promise<void>;
  abstract clear(pattern?: string): Promise<void>;
  abstract has(key: string): Promise<boolean>;
  abstract keys(pattern?: string): Promise<string[]>;
}

export class CacheManager {
  private l1Cache: NodeCache;
  private l2Cache: CacheAdapter | null = null;
  private logger = createLogger({ requestId: 'cache-manager' });
  private stats: CacheStats = {
    l1Hits: 0,
    l1Misses: 0,
    l2Hits: 0,
    l2Misses: 0,
    totalRequests: 0,
    hitRate: 0,
  };

  constructor(
    private options: {
      l1: { stdTTL: number; checkperiod: number; maxKeys: number };
      l2?: CacheAdapter | null;
      defaultTTL: number;
      prefix: string;
    }
  ) {
    // Initialize L1 (Memory) Cache
    this.l1Cache = new NodeCache({
      stdTTL: options.l1.stdTTL,
      checkperiod: options.l1.checkperiod,
      maxKeys: options.l1.maxKeys,
      useClones: false, // Better performance for genomic data
    });

    // Initialize L2 (Redis) Cache
    this.l2Cache = options.l2 || null;

    // Setup L1 cache events
    this.l1Cache.on('set', (key, value) => {
      this.logger.debug('L1 cache set', { key, size: this.getObjectSize(value) });
    });

    this.l1Cache.on('del', (key, value) => {
      this.logger.debug('L1 cache delete', { key });
    });

    this.l1Cache.on('expired', (key, value) => {
      this.logger.debug('L1 cache expired', { key });
    });
  }

  private getKey(key: string): string {
    return `${this.options.prefix}:${key}`;
  }

  private updateStats(source: 'L1' | 'L2' | 'MISS') {
    this.stats.totalRequests++;
    
    switch (source) {
      case 'L1':
        this.stats.l1Hits++;
        break;
      case 'L2':
        this.stats.l2Hits++;
        this.stats.l1Misses++;
        break;
      case 'MISS':
        this.stats.l1Misses++;
        this.stats.l2Misses++;
        break;
    }

    const totalHits = this.stats.l1Hits + this.stats.l2Hits;
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? (totalHits / this.stats.totalRequests) * 100 
      : 0;
  }

  async get<T>(key: string, options?: CacheOptions): Promise<CacheEntry<T> | null> {
    const fullKey = this.getKey(key);
    const enableL1 = options?.enableL1 !== false;
    const enableL2 = options?.enableL2 !== false && this.l2Cache !== null;

    try {
      // Try L1 cache first
      if (enableL1) {
        const l1Value = this.l1Cache.get<CacheEntry<T>>(fullKey);
        if (l1Value) {
          this.updateStats('L1');
          this.logger.debug('Cache hit L1', { key, ttl: l1Value.ttl });
          return l1Value;
        }
      }

      // Try L2 cache
      if (enableL2 && this.l2Cache) {
        const l2Value = await this.l2Cache.get<CacheEntry<T>>(fullKey);
        if (l2Value) {
          this.updateStats('L2');
          this.logger.debug('Cache hit L2', { key });
          
          // Populate L1 cache
          if (enableL1) {
            const ttl = l2Value.ttl - Math.floor((Date.now() - l2Value.timestamp) / 1000);
            if (ttl > 0) {
              this.l1Cache.set(fullKey, l2Value, ttl);
            }
          }
          
          return l2Value;
        }
      }

      this.updateStats('MISS');
      this.logger.debug('Cache miss', { key });
      return null;

    } catch (error) {
      this.logger.error('Cache get error', error instanceof Error ? error : new Error(String(error)), { key });
      return null;
    }
  }

  async set<T>(
    key: string, 
    value: T, 
    options?: CacheOptions
  ): Promise<void> {
    const fullKey = this.getKey(key);
    const ttl = options?.ttl || this.options.defaultTTL;
    const enableL1 = options?.enableL1 !== false;
    const enableL2 = options?.enableL2 !== false && this.l2Cache !== null;

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl,
      source: 'DB' as any, // Will be overridden when retrieved
    };

    try {
      // Set in L1 cache
      if (enableL1) {
        this.l1Cache.set(fullKey, entry, ttl);
        this.logger.debug('Cache set L1', { 
          key, 
          ttl, 
          size: this.getObjectSize(value) 
        });
      }

      // Set in L2 cache
      if (enableL2 && this.l2Cache) {
        await this.l2Cache.set(fullKey, entry, ttl);
        this.logger.debug('Cache set L2', { key, ttl });
      }

    } catch (error) {
      this.logger.error('Cache set error', error instanceof Error ? error : new Error(String(error)), { key, ttl });
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    const fullKey = this.getKey(key);

    try {
      // Delete from L1
      this.l1Cache.del(fullKey);

      // Delete from L2
      if (this.l2Cache) {
        await this.l2Cache.del(fullKey);
      }

      this.logger.debug('Cache delete', { key });

    } catch (error) {
      this.logger.error('Cache delete error', error instanceof Error ? error : new Error(String(error)), { key });
      throw error;
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        // Clear specific pattern
        const fullPattern = this.getKey(pattern);
        
        // Clear L1 keys matching pattern
        const l1Keys = this.l1Cache.keys().filter(k => k.includes(fullPattern));
        for (const key of l1Keys) {
          this.l1Cache.del(key);
        }

        // Clear L2 keys matching pattern
        if (this.l2Cache) {
          await this.l2Cache.clear(fullPattern);
        }
      } else {
        // Clear all
        this.l1Cache.flushAll();
        if (this.l2Cache) {
          await this.l2Cache.clear();
        }
      }

      this.logger.info('Cache cleared', { pattern });

    } catch (error) {
      this.logger.error('Cache clear error', error instanceof Error ? error : new Error(String(error)), { pattern });
      throw error;
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    await this.clear(pattern);
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getL1Stats() {
    return {
      keys: this.l1Cache.keys().length,
      stats: this.l1Cache.getStats(),
    };
  }

  private getObjectSize(obj: any): number {
    try {
      return JSON.stringify(obj).length;
    } catch {
      return 0;
    }
  }

  // Warmup cache with common queries
  async warmup(warmupQueries: Array<() => Promise<any>>): Promise<void> {
    this.logger.info('Starting cache warmup', { queries: warmupQueries.length });
    
    try {
      await Promise.allSettled(warmupQueries.map(query => query()));
      this.logger.info('Cache warmup completed');
    } catch (error) {
      this.logger.error('Cache warmup error', error instanceof Error ? error : new Error(String(error)));
    }
  }
}