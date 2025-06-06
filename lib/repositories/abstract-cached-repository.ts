// lib/repositories/abstract-cached-repository.ts
// Abstract base class for cached repositories

import { BaseRepository, PaginationParams, PaginationResult } from './base-repository';
import { CacheManager } from '@/lib/cache/cache-manager';
import { Cache, Cacheable, CacheConfigs, CacheableClass } from '@/lib/decorators/cache-decorator';

export interface CachedRepositoryConfig {
  cachePrefix: string;
  defaultTtl: number;
  enableCaching: boolean;
}

@Cacheable('cached-repo')
export abstract class AbstractCachedRepository<
  TEntity,
  TCreateInput,
  TUpdateInput,
  TWhereInput
> extends BaseRepository<TEntity, TCreateInput, TUpdateInput, TWhereInput> 
  implements CacheableClass {
  
  public cache: CacheManager;
  public cachePrefix: string;
  protected config: CachedRepositoryConfig;

  constructor(
    tableName: string,
    cache: CacheManager,
    config: Partial<CachedRepositoryConfig> = {}
  ) {
    super(tableName);
    this.cache = cache;
    this.config = {
      cachePrefix: config.cachePrefix || tableName.toLowerCase(),
      defaultTtl: config.defaultTtl || 3600,
      enableCaching: config.enableCaching !== false,
      ...config
    };
    this.cachePrefix = this.config.cachePrefix;
  }

  // Override base methods with caching
  
  @Cache({
    ...CacheConfigs.MEDIUM,
    keyGenerator: (id: string) => `${this.cachePrefix}:id:${id}`
  })
  async findById(id: string, requestId?: string): Promise<TEntity | null> {
    return super.findById(id, requestId);
  }

  @Cache({
    ...CacheConfigs.SHORT,
    keyGenerator: (where: TWhereInput, pagination: PaginationParams) => 
      `${this.cachePrefix}:find:${JSON.stringify({ where, pagination })}`
  })
  async findMany(
    where: TWhereInput = {} as TWhereInput,
    pagination: PaginationParams = { page: 1, limit: 20 },
    requestId?: string
  ): Promise<PaginationResult<TEntity>> {
    return super.findMany(where, pagination, requestId);
  }

  // Non-cached write operations that invalidate cache
  
  async create(data: TCreateInput, requestId?: string): Promise<TEntity> {
    const result = await super.create(data, requestId);
    
    // Invalidate relevant cache patterns
    await this.invalidateCreateRelatedCache(result);
    
    return result;
  }

  async update(id: string, data: TUpdateInput, requestId?: string): Promise<TEntity> {
    const result = await super.update(id, data, requestId);
    
    // Invalidate specific cache entries
    await this.invalidateUpdateRelatedCache(id, result);
    
    return result;
  }

  async delete(id: string, requestId?: string): Promise<void> {
    await super.delete(id, requestId);
    
    // Invalidate specific cache entries
    await this.invalidateDeleteRelatedCache(id);
  }

  // Cache invalidation hooks - can be overridden by subclasses
  
  protected async invalidateCreateRelatedCache(entity: TEntity): Promise<void> {
    // Invalidate list caches as new entity might appear in queries
    await this.cache.clear(`${this.cachePrefix}:find`);
    await this.cache.clear(`${this.cachePrefix}:search`);
  }

  protected async invalidateUpdateRelatedCache(id: string, entity: TEntity): Promise<void> {
    // Invalidate specific entity cache
    await this.cache.del(`${this.cachePrefix}:id:${id}`);
    
    // Invalidate list caches as entity data changed
    await this.cache.clear(`${this.cachePrefix}:find`);
    await this.cache.clear(`${this.cachePrefix}:search`);
  }

  protected async invalidateDeleteRelatedCache(id: string): Promise<void> {
    // Invalidate specific entity cache
    await this.cache.del(`${this.cachePrefix}:id:${id}`);
    
    // Invalidate list caches as entity no longer exists
    await this.cache.clear(`${this.cachePrefix}:find`);
    await this.cache.clear(`${this.cachePrefix}:search`);
  }

  // Bulk operations with optimized cache handling
  
  async bulkCreate(items: TCreateInput[], requestId?: string): Promise<TEntity[]> {
    const results = await super.bulkCreateTransaction(items, requestId);
    
    // Invalidate all list caches after bulk operation
    await this.cache.clear(`${this.cachePrefix}:find`);
    await this.cache.clear(`${this.cachePrefix}:search`);
    
    return results;
  }

  async bulkUpdate(updates: Array<{ id: string; data: TUpdateInput }>, requestId?: string): Promise<TEntity[]> {
    const results = await super.bulkUpdateTransaction(updates, requestId);
    
    // Invalidate affected entity caches
    for (const update of updates) {
      await this.cache.del(`${this.cachePrefix}:id:${update.id}`);
    }
    
    // Invalidate list caches
    await this.cache.clear(`${this.cachePrefix}:find`);
    await this.cache.clear(`${this.cachePrefix}:search`);
    
    return results;
  }

  async bulkDelete(ids: string[], requestId?: string): Promise<void> {
    await super.bulkDeleteTransaction(ids, requestId);
    
    // Invalidate affected entity caches
    for (const id of ids) {
      await this.cache.del(`${this.cachePrefix}:id:${id}`);
    }
    
    // Invalidate list caches
    await this.cache.clear(`${this.cachePrefix}:find`);
    await this.cache.clear(`${this.cachePrefix}:search`);
  }

  // Cache management utilities
  
  async getCacheStats(): Promise<any> {
    const stats = this.cache.getStats();
    const l1Stats = this.cache.getL1Stats();
    
    return {
      prefix: this.cachePrefix,
      globalStats: stats,
      l1Stats: l1Stats,
      config: this.config
    };
  }

  async prewarmCache(commonQueries: Array<() => Promise<any>>): Promise<void> {
    await this.warmupCache(commonQueries);
  }

  // Abstract methods for entity-specific caching logic
  
  abstract getEntityCacheKey(entity: TEntity): string;
  abstract getSearchCacheKey(where: TWhereInput, pagination: PaginationParams): string;
}