// lib/repositories/cached-variant-repository.ts
import { Variant } from '@prisma/client';
import { VariantRepository, VariantCreateInput, VariantUpdateInput, VariantWhereInput, VariantWithGene } from './variant-repository';
import { variantCache, CACHE_KEYS, CACHE_TTL, CacheUtils } from '@/lib/cache/setup';
import { PaginationParams, PaginationResult } from './base-repository';
import { createLogger } from '@/lib/logger';

export class CachedVariantRepository extends VariantRepository {
  protected logger = createLogger({ requestId: 'cached-variant-repo' });

  override async findById(id: string, requestId?: string): ReturnType<VariantRepository['findById']> {
    const cacheKey = CACHE_KEYS.VARIANT.DETAIL(id);
    
    try {
      const cached = await variantCache.get(cacheKey, { ttl: CACHE_TTL.VARIANT_DETAIL });
      if (cached) {
        this.logger.debug('Cache hit', { method: 'findById', key: cacheKey });
        return cached.data as Variant | null;
      }

      const result = await super.findById(id, requestId);
      
      if (result) {
        await variantCache.set(cacheKey, result, { ttl: CACHE_TTL.VARIANT_DETAIL });
        this.logger.debug('Cache set', { method: 'findById', key: cacheKey });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findById', error instanceof Error ? error : new Error(String(error)));
      return super.findById(id, requestId);
    }
  }

  override async findByVariantId(variantId: string, requestId?: string): ReturnType<VariantRepository['findByVariantId']> {
    const cacheKey = `variant:variantId:${variantId}`;
    
    try {
      const cached = await variantCache.get(cacheKey, { ttl: CACHE_TTL.VARIANT_DETAIL });
      if (cached) {
        return cached.data as Variant | null;
      }

      const result = await super.findByVariantId(variantId, requestId);
      
      if (result) {
        await variantCache.set(cacheKey, result, { ttl: CACHE_TTL.VARIANT_DETAIL });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findByVariantId', error instanceof Error ? error : new Error(String(error)));
      return super.findByVariantId(variantId, requestId);
    }
  }

  override async findMany(
    where?: VariantWhereInput,
    pagination: PaginationParams = { page: 1, limit: 20 },
    requestId?: string
  ): ReturnType<VariantRepository['findMany']> {
    const params = { where, pagination };
    const cacheKey = CACHE_KEYS.VARIANT.LIST(JSON.stringify(params));
    
    try {
      const cached = await variantCache.get(cacheKey, { ttl: CACHE_TTL.VARIANT_LIST });
      if (cached) {
        return cached.data as PaginationResult<Variant>;
      }

      const result = await super.findMany(where, pagination, requestId);
      
      await variantCache.set(cacheKey, result, { ttl: CACHE_TTL.VARIANT_LIST });
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findMany', error instanceof Error ? error : new Error(String(error)));
      return super.findMany(where, pagination, requestId);
    }
  }

  override async findManyWithGene(
    where?: VariantWhereInput,
    pagination: PaginationParams = { page: 1, limit: 20 },
    requestId?: string
  ): ReturnType<VariantRepository['findManyWithGene']> {
    const params = { where, pagination };
    const cacheKey = `variant:withGene:${CacheUtils.generateKey(params)}`;
    
    try {
      const cached = await variantCache.get(cacheKey, { ttl: CACHE_TTL.VARIANT_LIST });
      if (cached) {
        return cached.data as PaginationResult<VariantWithGene>;
      }

      const result = await super.findManyWithGene(where, pagination, requestId);
      
      await variantCache.set(cacheKey, result, { ttl: CACHE_TTL.VARIANT_LIST });
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findManyWithGene', error instanceof Error ? error : new Error(String(error)));
      return super.findManyWithGene(where, pagination, requestId);
    }
  }

  override async findWithDetails(id: string, requestId?: string): ReturnType<VariantRepository['findWithDetails']> {
    const cacheKey = `variant:withDetails:${id}`;
    
    try {
      const cached = await variantCache.get(cacheKey, { ttl: CACHE_TTL.VARIANT_DETAIL });
      if (cached) {
        return cached.data as any;
      }

      const result = await super.findWithDetails(id, requestId);
      
      if (result) {
        await variantCache.set(cacheKey, result, { ttl: CACHE_TTL.VARIANT_DETAIL });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findWithDetails', error instanceof Error ? error : new Error(String(error)));
      return super.findWithDetails(id, requestId);
    }
  }

  override async findRelatedVariants(variantId: string, geneId: string, requestId?: string): ReturnType<VariantRepository['findRelatedVariants']> {
    const cacheKey = `variant:related:${variantId}:${geneId}`;
    
    try {
      const cached = await variantCache.get(cacheKey, { ttl: CACHE_TTL.VARIANT_LIST });
      if (cached) {
        return cached.data as any;
      }

      const result = await super.findRelatedVariants(variantId, geneId, requestId);
      
      await variantCache.set(cacheKey, result, { ttl: CACHE_TTL.VARIANT_LIST });
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findRelatedVariants', error instanceof Error ? error : new Error(String(error)));
      return super.findRelatedVariants(variantId, geneId, requestId);
    }
  }

  override async findByGenomicPosition(
    chromosome: string,
    position: bigint,
    requestId?: string
  ): ReturnType<VariantRepository['findByGenomicPosition']> {
    const cacheKey = `variant:position:${chromosome}:${position.toString()}`;
    
    try {
      const cached = await variantCache.get(cacheKey, { ttl: CACHE_TTL.VARIANT_LIST });
      if (cached) {
        return cached.data as Variant[];
      }

      const result = await super.findByGenomicPosition(chromosome, position, requestId);
      
      await variantCache.set(cacheKey, result, { ttl: CACHE_TTL.VARIANT_LIST });
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findByGenomicPosition', error instanceof Error ? error : new Error(String(error)));
      return super.findByGenomicPosition(chromosome, position, requestId);
    }
  }

  override async searchByText(searchText: string, limit: number = 10, requestId?: string): ReturnType<VariantRepository['searchByText']> {
    const cacheKey = CACHE_KEYS.VARIANT.SEARCH(`${searchText}:${limit}`);
    
    try {
      const cached = await variantCache.get(cacheKey, { ttl: CACHE_TTL.SEARCH_RESULTS });
      if (cached) {
        return cached.data as Variant[];
      }

      const result = await super.searchByText(searchText, limit, requestId);
      
      await variantCache.set(cacheKey, result, { ttl: CACHE_TTL.SEARCH_RESULTS });
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in searchByText', error instanceof Error ? error : new Error(String(error)));
      return super.searchByText(searchText, limit, requestId);
    }
  }

  override async getStatsByGene(geneId: string, requestId?: string): ReturnType<VariantRepository['getStatsByGene']> {
    const cacheKey = `variant:statsByGene:${geneId}`;
    
    try {
      const cached = await variantCache.get(cacheKey, { ttl: CACHE_TTL.STATS });
      if (cached) {
        return cached.data as Record<string, number>;
      }

      const result = await super.getStatsByGene(geneId, requestId);
      
      await variantCache.set(cacheKey, result, { ttl: CACHE_TTL.STATS });
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in getStatsByGene', error instanceof Error ? error : new Error(String(error)));
      return super.getStatsByGene(geneId, requestId);
    }
  }

  // Write operations with cache invalidation
  override async create(data: VariantCreateInput, requestId?: string): ReturnType<VariantRepository['create']> {
    const result = await super.create(data, requestId);
    
    try {
      await Promise.allSettled([
        variantCache.invalidatePattern('variant:*'),
        variantCache.invalidatePattern('search:*'),
      ]);
      this.logger.debug('Cache invalidated after create');
    } catch (error) {
      this.logger.error('Cache invalidation failed after create', error instanceof Error ? error : new Error(String(error)));
    }
    
    return result;
  }

  override async update(id: string, data: VariantUpdateInput, requestId?: string): ReturnType<VariantRepository['update']> {
    const result = await super.update(id, data, requestId);
    
    try {
      await Promise.allSettled([
        variantCache.del(CACHE_KEYS.VARIANT.DETAIL(id)),
        variantCache.del(`variant:withDetails:${id}`),
        variantCache.invalidatePattern('variant:list:*'),
        variantCache.invalidatePattern('search:*'),
      ]);
      this.logger.debug('Cache invalidated after update');
    } catch (error) {
      this.logger.error('Cache invalidation failed after update', error instanceof Error ? error : new Error(String(error)));
    }
    
    return result;
  }

  override async delete(id: string, requestId?: string): ReturnType<VariantRepository['delete']> {
    const result = await super.delete(id, requestId);
    
    try {
      await Promise.allSettled([
        variantCache.del(CACHE_KEYS.VARIANT.DETAIL(id)),
        variantCache.del(`variant:withDetails:${id}`),
        variantCache.invalidatePattern('variant:list:*'),
        variantCache.invalidatePattern('search:*'),
      ]);
      this.logger.debug('Cache invalidated after delete');
    } catch (error) {
      this.logger.error('Cache invalidation failed after delete', error instanceof Error ? error : new Error(String(error)));
    }
    
    return result;
  }

  override async bulkCreate(variants: VariantCreateInput[], requestId?: string): ReturnType<VariantRepository['bulkCreate']> {
    const result = await super.bulkCreate(variants, requestId);
    
    try {
      await Promise.allSettled([
        variantCache.invalidatePattern('variant:*'),
        variantCache.invalidatePattern('search:*'),
      ]);
      this.logger.debug('Cache invalidated after bulk create');
    } catch (error) {
      this.logger.error('Cache invalidation failed after bulk create', error instanceof Error ? error : new Error(String(error)));
    }
    
    return result;
  }

  // Cache warming methods
  async warmupPathogenicVariants(): Promise<void> {
    await this.findManyWithGene(
      { clinicalSignificance: ['Pathogenic', 'Likely pathogenic'] },
      { page: 1, limit: 50 }
    );
  }

  async warmupCommonSearches(): Promise<void> {
    const commonSearches = [
      'rs', 'c.', 'p.', 'pathogenic', 'benign'
    ];

    await Promise.allSettled(
      commonSearches.map(search => this.searchByText(search, 5))
    );
  }
}