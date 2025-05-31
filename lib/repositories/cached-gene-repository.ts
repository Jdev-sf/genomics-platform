// lib/repositories/cached-gene-repository.ts
import { Gene } from '@prisma/client';
import { GeneRepository, GeneCreateInput, GeneUpdateInput, GeneWhereInput, GeneWithStats } from './gene-repository';
import { geneCache, CACHE_KEYS, CACHE_TTL, CacheUtils } from '@/lib/cache/setup';
import { PaginationParams, PaginationResult } from './base-repository';
import { createLogger } from '@/lib/logger';

export class CachedGeneRepository extends GeneRepository {
  protected logger = createLogger({ requestId: 'cached-gene-repo' });

  override async findById(id: string, requestId?: string): ReturnType<GeneRepository['findById']> {
    const cacheKey = CACHE_KEYS.GENE.DETAIL(id);
    
    try {
      const cached = await geneCache.get(cacheKey, { ttl: CACHE_TTL.GENE_DETAIL });
      if (cached) {
        this.logger.debug('Cache hit', { method: 'findById', key: cacheKey });
        return cached.data as Gene | null;
      }

      const result = await super.findById(id, requestId);
      
      if (result) {
        await geneCache.set(cacheKey, result, { ttl: CACHE_TTL.GENE_DETAIL });
        this.logger.debug('Cache set', { method: 'findById', key: cacheKey });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findById', error instanceof Error ? error : new Error(String(error)));
      return super.findById(id, requestId);
    }
  }

  override async findBySymbol(symbol: string, requestId?: string): ReturnType<GeneRepository['findBySymbol']> {
    const cacheKey = `gene:symbol:${symbol}`;
    
    try {
      const cached = await geneCache.get(cacheKey, { ttl: CACHE_TTL.GENE_DETAIL });
      if (cached) {
        return cached.data as Gene | null;
      }

      const result = await super.findBySymbol(symbol, requestId);
      
      if (result) {
        await geneCache.set(cacheKey, result, { ttl: CACHE_TTL.GENE_DETAIL });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findBySymbol', error instanceof Error ? error : new Error(String(error)));
      return super.findBySymbol(symbol, requestId);
    }
  }

  override async findByGeneId(geneId: string, requestId?: string): ReturnType<GeneRepository['findByGeneId']> {
    const cacheKey = `gene:geneId:${geneId}`;
    
    try {
      const cached = await geneCache.get(cacheKey, { ttl: CACHE_TTL.GENE_DETAIL });
      if (cached) {
        return cached.data as Gene | null;
      }

      const result = await super.findByGeneId(geneId, requestId);
      
      if (result) {
        await geneCache.set(cacheKey, result, { ttl: CACHE_TTL.GENE_DETAIL });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findByGeneId', error instanceof Error ? error : new Error(String(error)));
      return super.findByGeneId(geneId, requestId);
    }
  }

  override async findMany(
    where?: GeneWhereInput,
    pagination: PaginationParams = { page: 1, limit: 20 },
    requestId?: string
  ): ReturnType<GeneRepository['findMany']> {
    const params = { where, pagination };
    const cacheKey = CACHE_KEYS.GENE.LIST(JSON.stringify(params));
    
    try {
      const cached = await geneCache.get(cacheKey, { ttl: CACHE_TTL.GENE_LIST });
      if (cached) {
        return cached.data as PaginationResult<Gene>;
      }

      const result = await super.findMany(where, pagination, requestId);
      
      await geneCache.set(cacheKey, result, { ttl: CACHE_TTL.GENE_LIST });
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findMany', error instanceof Error ? error : new Error(String(error)));
      return super.findMany(where, pagination, requestId);
    }
  }

  override async findManyWithStats(
    where?: GeneWhereInput,
    pagination: PaginationParams = { page: 1, limit: 20 },
    requestId?: string
  ): ReturnType<GeneRepository['findManyWithStats']> {
    const params = { where, pagination };
    const cacheKey = `gene:withStats:${CacheUtils.generateKey(params)}`;
    
    try {
      const cached = await geneCache.get(cacheKey, { ttl: CACHE_TTL.GENE_LIST });
      if (cached) {
        return cached.data as PaginationResult<GeneWithStats>;
      }

      const result = await super.findManyWithStats(where, pagination, requestId);
      
      await geneCache.set(cacheKey, result, { ttl: CACHE_TTL.GENE_LIST });
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findManyWithStats', error instanceof Error ? error : new Error(String(error)));
      return super.findManyWithStats(where, pagination, requestId);
    }
  }

  override async findWithVariants(id: string, requestId?: string): ReturnType<GeneRepository['findWithVariants']> {
    const cacheKey = `gene:withVariants:${id}`;
    
    try {
      const cached = await geneCache.get(cacheKey, { ttl: CACHE_TTL.GENE_DETAIL });
      if (cached) {
        return cached.data as any;
      }

      const result = await super.findWithVariants(id, requestId);
      
      if (result) {
        await geneCache.set(cacheKey, result, { ttl: CACHE_TTL.GENE_DETAIL });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findWithVariants', error instanceof Error ? error : new Error(String(error)));
      return super.findWithVariants(id, requestId);
    }
  }

  override async getVariantStats(geneId: string, requestId?: string): ReturnType<GeneRepository['getVariantStats']> {
    const cacheKey = CACHE_KEYS.GENE.STATS(geneId);
    
    try {
      const cached = await geneCache.get(cacheKey, { ttl: CACHE_TTL.STATS });
      if (cached) {
        return cached.data as any;
      }

      const result = await super.getVariantStats(geneId, requestId);
      
      await geneCache.set(cacheKey, result, { ttl: CACHE_TTL.STATS });
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in getVariantStats', error instanceof Error ? error : new Error(String(error)));
      return super.getVariantStats(geneId, requestId);
    }
  }

  override async searchByText(searchText: string, limit: number = 10, requestId?: string): ReturnType<GeneRepository['searchByText']> {
    const cacheKey = CACHE_KEYS.GENE.SEARCH(`${searchText}:${limit}`);
    
    try {
      const cached = await geneCache.get(cacheKey, { ttl: CACHE_TTL.SEARCH_RESULTS });
      if (cached) {
        return cached.data as Gene[];
      }

      const result = await super.searchByText(searchText, limit, requestId);
      
      await geneCache.set(cacheKey, result, { ttl: CACHE_TTL.SEARCH_RESULTS });
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in searchByText', error instanceof Error ? error : new Error(String(error)));
      return super.searchByText(searchText, limit, requestId);
    }
  }

  // Write operations with cache invalidation
  override async create(data: GeneCreateInput, requestId?: string): ReturnType<GeneRepository['create']> {
    const result = await super.create(data, requestId);
    
    try {
      await Promise.allSettled([
        geneCache.invalidatePattern('gene:*'),
        geneCache.invalidatePattern('search:*'),
      ]);
      this.logger.debug('Cache invalidated after create');
    } catch (error) {
      this.logger.error('Cache invalidation failed after create', error instanceof Error ? error : new Error(String(error)));
    }
    
    return result;
  }

  override async update(id: string, data: GeneUpdateInput, requestId?: string): ReturnType<GeneRepository['update']> {
    const result = await super.update(id, data, requestId);
    
    try {
      await Promise.allSettled([
        geneCache.del(CACHE_KEYS.GENE.DETAIL(id)),
        geneCache.del(`gene:withVariants:${id}`),
        geneCache.invalidatePattern('gene:list:*'),
        geneCache.invalidatePattern('search:*'),
      ]);
      this.logger.debug('Cache invalidated after update');
    } catch (error) {
      this.logger.error('Cache invalidation failed after update', error instanceof Error ? error : new Error(String(error)));
    }
    
    return result;
  }

  override async delete(id: string, requestId?: string): ReturnType<GeneRepository['delete']> {
    const result = await super.delete(id, requestId);
    
    try {
      await Promise.allSettled([
        geneCache.del(CACHE_KEYS.GENE.DETAIL(id)),
        geneCache.del(`gene:withVariants:${id}`),
        geneCache.invalidatePattern('gene:list:*'),
        geneCache.invalidatePattern('search:*'),
      ]);
      this.logger.debug('Cache invalidated after delete');
    } catch (error) {
      this.logger.error('Cache invalidation failed after delete', error instanceof Error ? error : new Error(String(error)));
    }
    
    return result;
  }

  // Cache warming methods
  async warmupPopularGenes(): Promise<void> {
    const popularGenes = [
      'BRCA1', 'BRCA2', 'TP53', 'EGFR', 'KRAS',
      'PIK3CA', 'APC', 'PTEN', 'RB1', 'VHL'
    ];

    await Promise.allSettled(
      popularGenes.map(symbol => this.findBySymbol(symbol))
    );
  }

  async warmupCommonSearches(): Promise<void> {
    const commonSearches = [
      'BRCA', 'TP53', 'cancer', 'tumor',
      'oncogene', 'suppressor'
    ];

    await Promise.allSettled(
      commonSearches.map(search => this.searchByText(search, 5))
    );
  }
}