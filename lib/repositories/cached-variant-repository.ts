// lib/repositories/cached-variant-repository.ts
// Optimized cached variant repository without decorators

import { Variant } from '@prisma/client';
import { VariantRepository, VariantCreateInput, VariantUpdateInput, VariantWhereInput, VariantWithGene } from './variant-repository';
import { PaginationParams, PaginationResult } from './base-repository';
import { CacheManager } from '@/lib/cache/cache-manager';
import { SearchParameterMapper } from '@/lib/shared/search-parameter-mapper';
import { createLogger } from '@/lib/logger';

export class OptimizedCachedVariantRepository extends VariantRepository {
  private cache: CacheManager;
  private logger = createLogger({ component: 'cached-variant-repository' });
  private readonly CACHE_TTL = {
    DETAIL: 3600,    // 1 hour
    LIST: 1800,      // 30 minutes  
    SEARCH: 900,     // 15 minutes
    STATS: 1800,     // 30 minutes
  };

  constructor(cache: CacheManager) {
    super();
    this.cache = cache;
  }

  override async findById(id: string, requestId?: string): Promise<Variant | null> {
    const cacheKey = `variant:id:${id}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit', { key: cacheKey });
        return cached.data as Variant | null;
      }

      const result = await super.findById(id, requestId);
      
      if (result) {
        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL.DETAIL });
        this.logger.debug('Cache set', { key: cacheKey });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findById', error instanceof Error ? error : new Error(String(error)));
      return super.findById(id, requestId);
    }
  }

  async findByVariantId(variantId: string, requestId?: string): Promise<Variant | null> {
    const cacheKey = `variant:variantId:${variantId}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit', { key: cacheKey });
        return cached.data as Variant | null;
      }

      const result = await this.executeWithErrorHandling(
        async () => {
          const variant = await this.prisma.variant.findUnique({
            where: { variantId }
          });
          return variant;
        },
        'find variant by variant ID',
        { variantId },
        requestId
      );
      
      if (result) {
        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL.DETAIL });
        this.logger.debug('Cache set', { key: cacheKey });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findByVariantId', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  override async findManyWithGene(
    where: VariantWhereInput = {},
    pagination: PaginationParams = { page: 1, limit: 20 },
    requestId?: string
  ): Promise<PaginationResult<VariantWithGene>> {
    const cacheKey = `variant:withGene:${JSON.stringify({ where, pagination })}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit', { key: cacheKey });
        return cached.data as PaginationResult<VariantWithGene>;
      }

      const result = await this.executeWithErrorHandling(
        async () => {
          const offset = (pagination.page - 1) * pagination.limit;
          
          // Build where clause using shared mapper
          const searchConditions = where.search 
            ? {
                OR: [
                  { variantId: { contains: where.search, mode: 'insensitive' as const } },
                  { gene: { symbol: { contains: where.search, mode: 'insensitive' as const } } },
                  { gene: { name: { contains: where.search, mode: 'insensitive' as const } } }
                ]
              }
            : {};
          
          const whereClause = {
            ...searchConditions,
            ...(where.geneId && { geneId: where.geneId }),
            ...(where.chromosome && { chromosome: where.chromosome }),
            ...(where.clinicalSignificance && {
              clinicalSignificance: { in: where.clinicalSignificance }
            }),
            ...(where.impact && { impact: { in: where.impact } }),
            ...(where.variantType && { variantType: { in: where.variantType } }),
            ...(where.consequence && { consequence: where.consequence }),
            ...((where.minFrequency !== undefined || where.maxFrequency !== undefined) && {
              frequency: {
                ...(where.minFrequency !== undefined && { gte: where.minFrequency }),
                ...(where.maxFrequency !== undefined && { lte: where.maxFrequency })
              }
            })
          };

          // Execute optimized query with gene data
          const [variants, total] = await Promise.all([
            this.prisma.variant.findMany({
              where: whereClause,
              include: {
                gene: {
                  select: {
                    id: true,
                    symbol: true,
                    name: true,
                    chromosome: true,
                    biotype: true
                  }
                },
                annotations: {
                  include: {
                    source: true
                  },
                  take: 5 // Limit annotations for performance
                },
                _count: {
                  select: { annotations: true }
                }
              },
              orderBy: this.buildOrderBy(pagination.sortBy, pagination.sortOrder),
              skip: offset,
              take: pagination.limit
            }),
            this.prisma.variant.count({ where: whereClause })
          ]);

          const variantsWithGene: VariantWithGene[] = variants.map(variant => ({
            ...variant,
            annotations_count: variant._count.annotations
          } as VariantWithGene));

          return this.createPaginationResult(variantsWithGene, total, pagination);
        },
        'find variants with gene',
        { where, pagination },
        requestId
      );
      
      if (result) {
        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL.SEARCH });
        this.logger.debug('Cache set', { key: cacheKey });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findManyWithGene', error instanceof Error ? error : new Error(String(error)));
      return super.findManyWithGene(where, pagination, requestId);
    }
  }

  async findByGenomicPosition(
    chromosome: string, 
    position: bigint, 
    requestId?: string
  ): Promise<Variant[]> {
    const cacheKey = `variant:genomicPos:${chromosome}:${position.toString()}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit', { key: cacheKey });
        return cached.data as Variant[];
      }

      const result = await this.executeWithErrorHandling(
        async () => {
          const variants = await this.prisma.variant.findMany({
            where: {
              chromosome,
              position
            },
            include: {
              gene: {
                select: {
                  symbol: true,
                  name: true
                }
              }
            },
            orderBy: [
              { clinicalSignificance: 'desc' },
              { variantId: 'asc' }
            ]
          });

          return variants;
        },
        'find variants by genomic position',
        { chromosome, position: position.toString() },
        requestId
      );
      
      if (result) {
        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL.STATS });
        this.logger.debug('Cache set', { key: cacheKey });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findByGenomicPosition', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async getStatsByGene(geneId: string, requestId?: string): Promise<Record<string, number>> {
    const cacheKey = `variant:stats:gene:${geneId}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit', { key: cacheKey });
        return cached.data as Record<string, number>;
      }

      const result = await this.executeWithErrorHandling(
        async () => {
          const stats = await this.prisma.variant.groupBy({
            by: ['clinicalSignificance'],
            where: { geneId },
            _count: { clinicalSignificance: true }
          });

          const statsResult: Record<string, number> = {};
          
          stats.forEach(stat => {
            const significance = stat.clinicalSignificance || 'unknown';
            statsResult[significance] = stat._count.clinicalSignificance;
          });

          return statsResult;
        },
        'get variant statistics by gene',
        { geneId },
        requestId
      );
      
      if (result) {
        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL.STATS });
        this.logger.debug('Cache set', { key: cacheKey });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in getStatsByGene', error instanceof Error ? error : new Error(String(error)));
      return {};
    }
  }

  async getClinicalStatistics(geneId?: string, requestId?: string): Promise<any> {
    const cacheKey = `variant:clinical:${geneId || 'global'}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit', { key: cacheKey });
        return cached.data;
      }

      const result = await this.executeWithErrorHandling(
        async () => {
          const whereClause = geneId ? { geneId } : {};
          
          const [total, bySignificance, byImpact, byType] = await Promise.all([
            this.prisma.variant.count({ where: whereClause }),
            
            this.prisma.variant.groupBy({
              by: ['clinicalSignificance'],
              where: whereClause,
              _count: { clinicalSignificance: true }
            }),
            
            this.prisma.variant.groupBy({
              by: ['impact'],
              where: whereClause,
              _count: { impact: true }
            }),
            
            this.prisma.variant.groupBy({
              by: ['variantType'],
              where: whereClause,
              _count: { variantType: true }
            })
          ]);

          return {
            total,
            bySignificance: bySignificance.reduce((acc, item) => {
              acc[item.clinicalSignificance || 'unknown'] = item._count.clinicalSignificance;
              return acc;
            }, {} as Record<string, number>),
            byImpact: byImpact.reduce((acc, item) => {
              acc[item.impact || 'unknown'] = item._count.impact;
              return acc;
            }, {} as Record<string, number>),
            byType: byType.reduce((acc, item) => {
              acc[item.variantType || 'unknown'] = item._count.variantType;
              return acc;
            }, {} as Record<string, number>)
          };
        },
        'get clinical statistics',
        { geneId },
        requestId
      );
      
      if (result) {
        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL.STATS });
        this.logger.debug('Cache set', { key: cacheKey });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in getClinicalStatistics', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async searchByText(searchText: string, limit: number = 10, requestId?: string): Promise<Variant[]> {
    const cacheKey = `variant:quick:${searchText}:${limit}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit', { key: cacheKey });
        return cached.data as Variant[];
      }

      const result = await this.executeWithErrorHandling(
        async () => {
          const variants = await this.prisma.variant.findMany({
            where: {
              OR: [
                { variantId: { contains: searchText, mode: 'insensitive' } },
                { gene: { symbol: { contains: searchText, mode: 'insensitive' } } },
                { gene: { name: { contains: searchText, mode: 'insensitive' } } }
              ]
            },
            include: {
              gene: {
                select: {
                  symbol: true,
                  name: true
                }
              }
            },
            orderBy: [
              { clinicalSignificance: 'desc' },
              { position: 'asc' }
            ],
            take: limit
          });

          return variants;
        },
        'quick search variants',
        { searchText, limit },
        requestId
      );
      
      if (result) {
        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL.SEARCH });
        this.logger.debug('Cache set', { key: cacheKey });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in searchByText', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  // Override write operations to invalidate cache
  override async create(data: VariantCreateInput, requestId?: string): Promise<Variant> {
    const result = await super.create(data, requestId);
    
    // Invalidate relevant caches
    await this.invalidateCreateRelatedCache(result);
    
    return result;
  }

  override async update(id: string, data: VariantUpdateInput, requestId?: string): Promise<Variant> {
    const result = await super.update(id, data, requestId);
    
    // Invalidate specific cache entries
    await this.invalidateUpdateRelatedCache(id, result);
    
    return result;
  }

  override async delete(id: string, requestId?: string): Promise<void> {
    await super.delete(id, requestId);
    
    // Invalidate specific cache entries
    await this.invalidateDeleteRelatedCache(id);
  }

  // Cache invalidation methods
  private async invalidateCreateRelatedCache(entity: Variant): Promise<void> {
    try {
      // Invalidate list and search caches
      await this.cache.clear('variant:withGene');
      await this.cache.clear('variant:quick');
      
      // Invalidate gene-related caches
      await this.cache.del(`variant:stats:gene:${entity.geneId}`);
      await this.cache.del(`variant:clinical:${entity.geneId}`);
      
      // Invalidate genomic position cache
      await this.cache.del(`variant:genomicPos:${entity.chromosome}:${entity.position.toString()}`);
      
      this.logger.debug('Cache invalidated after create', { variantId: entity.id });
    } catch (error) {
      this.logger.error('Cache invalidation error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async invalidateUpdateRelatedCache(id: string, entity: Variant): Promise<void> {
    try {
      // Invalidate specific entity caches
      await this.cache.del(`variant:id:${id}`);
      await this.cache.del(`variant:variantId:${entity.variantId}`);
      
      // Invalidate gene-related caches
      await this.cache.del(`variant:stats:gene:${entity.geneId}`);
      await this.cache.del(`variant:clinical:${entity.geneId}`);
      
      // Invalidate global clinical stats
      await this.cache.del('variant:clinical:global');
      
      // Invalidate list and search caches
      await this.cache.clear('variant:withGene');
      await this.cache.clear('variant:quick');
      
      this.logger.debug('Cache invalidated after update', { variantId: id });
    } catch (error) {
      this.logger.error('Cache invalidation error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async invalidateDeleteRelatedCache(id: string): Promise<void> {
    try {
      // Invalidate all related caches
      await this.cache.del(`variant:id:${id}`);
      
      // Invalidate list and search caches
      await this.cache.clear('variant:withGene');
      await this.cache.clear('variant:quick');
      
      this.logger.debug('Cache invalidated after delete', { variantId: id });
    } catch (error) {
      this.logger.error('Cache invalidation error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Utility methods
  private buildOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): any {
    if (!sortBy) {
      return { position: sortOrder };
    }

    if (sortBy.includes('.')) {
      const [relation, field] = sortBy.split('.');
      return { [relation]: { [field]: sortOrder } };
    }

    return { [sortBy]: sortOrder };
  }
}