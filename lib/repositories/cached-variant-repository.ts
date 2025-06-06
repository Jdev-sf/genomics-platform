// lib/repositories/optimized-cached-variant-repository.ts
// Optimized version combining caching and variant repository functionality

import { Variant } from '@prisma/client';
import { AbstractCachedRepository } from './abstract-cached-repository';
import { VariantCreateInput, VariantUpdateInput, VariantWhereInput, VariantWithGene } from './variant-repository';
import { PaginationParams, PaginationResult } from './base-repository';
import { CacheManager } from '@/lib/cache/cache-manager';
import { Cache, CacheConfigs } from '@/lib/decorators/cache-decorator';
import { SearchParameterMapper } from '@/lib/shared/search-parameter-mapper';

export class OptimizedCachedVariantRepository extends AbstractCachedRepository<
  Variant,
  VariantCreateInput,
  VariantUpdateInput,
  VariantWhereInput
> {
  constructor(cache: CacheManager) {
    super('variants', cache, {
      cachePrefix: 'variant',
      defaultTtl: 3600,
      enableCaching: true
    });
  }

  // Implement abstract methods
  
  getEntityCacheKey(entity: Variant): string {
    return `${this.cachePrefix}:id:${entity.id}`;
  }

  getSearchCacheKey(where: VariantWhereInput, pagination: PaginationParams): string {
    return `${this.cachePrefix}:search:${JSON.stringify({ where, pagination })}`;
  }

  // Enhanced methods with optimized caching
  
  @Cache({
    ...CacheConfigs.VARIANT_DETAIL,
    keyGenerator: (variantId: string) => `variant:variantId:${variantId}`
  })
  async findByVariantId(variantId: string, requestId?: string): Promise<Variant | null> {
    return this.executeWithErrorHandling(
      async () => {
        const result = await this.prisma.variant.findUnique({
          where: { variantId }
        });
        return result;
      },
      'find variant by variant ID',
      { variantId },
      requestId
    );
  }

  @Cache({
    ...CacheConfigs.SEARCH_RESULTS,
    keyGenerator: (where: VariantWhereInput, pagination: PaginationParams) => 
      `variant:withGene:${JSON.stringify({ where, pagination })}`
  })
  async findManyWithGene(
    where: VariantWhereInput = {},
    pagination: PaginationParams = { page: 1, limit: 20 },
    requestId?: string
  ): Promise<PaginationResult<VariantWithGene>> {
    return this.executeWithErrorHandling(
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
  }

  @Cache({
    ...CacheConfigs.STATISTICS,
    keyGenerator: (chromosome: string, position: bigint) => 
      `variant:genomicPos:${chromosome}:${position.toString()}`
  })
  async findByGenomicPosition(
    chromosome: string, 
    position: bigint, 
    requestId?: string
  ): Promise<Variant[]> {
    return this.executeWithErrorHandling(
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
  }

  @Cache({
    ...CacheConfigs.STATISTICS,
    keyGenerator: (geneId: string) => `variant:stats:gene:${geneId}`
  })
  async getStatsByGene(geneId: string, requestId?: string): Promise<Record<string, number>> {
    return this.executeWithErrorHandling(
      async () => {
        const stats = await this.prisma.variant.groupBy({
          by: ['clinicalSignificance'],
          where: { geneId },
          _count: { clinicalSignificance: true }
        });

        const result: Record<string, number> = {};
        
        stats.forEach(stat => {
          const significance = stat.clinicalSignificance || 'unknown';
          result[significance] = stat._count.clinicalSignificance;
        });

        return result;
      },
      'get variant statistics by gene',
      { geneId },
      requestId
    );
  }

  @Cache({
    ...CacheConfigs.STATISTICS,
    keyGenerator: (geneId?: string) => `variant:clinical:${geneId || 'global'}`
  })
  async getClinicalStatistics(geneId?: string, requestId?: string): Promise<any> {
    return this.executeWithErrorHandling(
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
  }

  // Quick search with caching
  @Cache({
    ...CacheConfigs.SHORT,
    keyGenerator: (searchText: string, limit: number) => `variant:quick:${searchText}:${limit}`
  })
  async searchByText(searchText: string, limit: number = 10, requestId?: string): Promise<Variant[]> {
    return this.executeWithErrorHandling(
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
  }

  // Override cache invalidation for variant-specific patterns
  
  protected async invalidateCreateRelatedCache(entity: Variant): Promise<void> {
    await super.invalidateCreateRelatedCache(entity);
    
    // Invalidate gene-related caches
    await this.cache.del(`variant:stats:gene:${entity.geneId}`);
    await this.cache.del(`variant:clinical:${entity.geneId}`);
    
    // Invalidate genomic position cache
    await this.cache.del(`variant:genomicPos:${entity.chromosome}:${entity.position.toString()}`);
  }

  protected async invalidateUpdateRelatedCache(id: string, entity: Variant): Promise<void> {
    await super.invalidateUpdateRelatedCache(id, entity);
    
    // Invalidate variant ID cache
    await this.cache.del(`variant:variantId:${entity.variantId}`);
    
    // Invalidate gene-related caches
    await this.cache.del(`variant:stats:gene:${entity.geneId}`);
    await this.cache.del(`variant:clinical:${entity.geneId}`);
    
    // Invalidate global clinical stats
    await this.cache.del('variant:clinical:global');
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