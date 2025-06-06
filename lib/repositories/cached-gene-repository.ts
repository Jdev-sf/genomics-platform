// lib/repositories/optimized-cached-gene-repository.ts
// Optimized version combining caching and gene repository functionality

import { Gene } from '@prisma/client';
import { AbstractCachedRepository } from './abstract-cached-repository';
import { GeneCreateInput, GeneUpdateInput, GeneWhereInput, GeneWithStats } from './gene-repository';
import { PaginationParams, PaginationResult } from './base-repository';
import { CacheManager } from '@/lib/cache/cache-manager';
import { Cache, CacheConfigs } from '@/lib/decorators/cache-decorator';
import { SearchParameterMapper } from '@/lib/shared/search-parameter-mapper';

export class OptimizedCachedGeneRepository extends AbstractCachedRepository<
  Gene,
  GeneCreateInput,
  GeneUpdateInput,
  GeneWhereInput
> {
  constructor(cache: CacheManager) {
    super('genes', cache, {
      cachePrefix: 'gene',
      defaultTtl: 3600,
      enableCaching: true
    });
  }

  // Implement abstract methods
  
  getEntityCacheKey(entity: Gene): string {
    return `${this.cachePrefix}:id:${entity.id}`;
  }

  getSearchCacheKey(where: GeneWhereInput, pagination: PaginationParams): string {
    return `${this.cachePrefix}:search:${JSON.stringify({ where, pagination })}`;
  }

  // Enhanced methods with optimized caching
  
  @Cache({
    ...CacheConfigs.GENE_DETAIL,
    keyGenerator: (symbol: string) => `gene:symbol:${symbol}`
  })
  async findBySymbol(symbol: string, requestId?: string): Promise<Gene | null> {
    return this.executeWithErrorHandling(
      async () => {
        const result = await this.prisma.gene.findFirst({
          where: {
            OR: [
              { symbol: { equals: symbol, mode: 'insensitive' } },
              { aliases: { some: { alias: { equals: symbol, mode: 'insensitive' } } } }
            ]
          }
        });
        return result;
      },
      'find gene by symbol',
      { symbol },
      requestId
    );
  }

  @Cache({
    ...CacheConfigs.SEARCH_RESULTS,
    keyGenerator: (where: GeneWhereInput, pagination: PaginationParams) => 
      `gene:search:${JSON.stringify({ where, pagination })}`
  })
  async findManyWithStats(
    where: GeneWhereInput = {},
    pagination: PaginationParams = { page: 1, limit: 20 },
    requestId?: string
  ): Promise<PaginationResult<GeneWithStats>> {
    return this.executeWithErrorHandling(
      async () => {
        const offset = (pagination.page - 1) * pagination.limit;
        
        // Build where clause using shared mapper
        const searchConditions = where.search 
          ? SearchParameterMapper.buildTextSearchConditions(where.search, ['symbol', 'name', 'description'])
          : {};
        
        const whereClause = {
          ...searchConditions,
          ...(where.chromosome && { chromosome: where.chromosome }),
          ...(where.biotype && { biotype: where.biotype }),
          ...(where.hasVariants !== undefined && {
            variants: where.hasVariants ? { some: {} } : { none: {} }
          })
        };

        // Execute optimized query with aggregations
        const [genes, total] = await Promise.all([
          this.prisma.gene.findMany({
            where: whereClause,
            include: {
              _count: {
                select: {
                  variants: true,
                  aliases: true
                }
              }
            },
            orderBy: this.buildOrderBy(pagination.sortBy, pagination.sortOrder),
            skip: offset,
            take: pagination.limit
          }),
          this.prisma.gene.count({ where: whereClause })
        ]);

        // Transform to include stats
        const genesWithStats: GeneWithStats[] = await Promise.all(
          genes.map(async (gene) => {
            const pathogenicCount = await this.prisma.variant.count({
              where: {
                geneId: gene.id,
                clinicalSignificance: { in: ['Pathogenic', 'Likely pathogenic'] }
              }
            });

            return {
              ...gene,
              variant_count: gene._count.variants,
              pathogenic_count: pathogenicCount
            } as GeneWithStats;
          })
        );

        return this.createPaginationResult(genesWithStats, total, pagination);
      },
      'find genes with stats',
      { where, pagination },
      requestId
    );
  }

  @Cache({
    ...CacheConfigs.GENE_DETAIL,
    keyGenerator: (id: string) => `gene:variants:${id}`
  })
  async findWithVariants(id: string, requestId?: string): Promise<any> {
    return this.executeWithErrorHandling(
      async () => {
        const gene = await this.prisma.gene.findUnique({
          where: { id },
          include: {
            aliases: true,
            variants: {
              include: {
                annotations: {
                  include: {
                    source: true
                  }
                },
                _count: {
                  select: { annotations: true }
                }
              },
              orderBy: [
                { clinicalSignificance: 'desc' },
                { position: 'asc' }
              ],
              take: 50 // Limit variants for performance
            },
            _count: {
              select: { variants: true }
            }
          }
        });

        return gene;
      },
      'find gene with variants',
      { id },
      requestId
    );
  }

  @Cache({
    ...CacheConfigs.STATISTICS,
    keyGenerator: (geneId: string) => `gene:stats:${geneId}`
  })
  async getVariantStats(geneId: string, requestId?: string): Promise<any> {
    return this.executeWithErrorHandling(
      async () => {
        const stats = await this.prisma.variant.groupBy({
          by: ['clinicalSignificance'],
          where: { geneId },
          _count: { clinicalSignificance: true }
        });

        const result = {
          total_variants: 0,
          pathogenic: 0,
          likely_pathogenic: 0,
          uncertain_significance: 0,
          likely_benign: 0,
          benign: 0,
          not_provided: 0
        };

        stats.forEach(stat => {
          const count = stat._count.clinicalSignificance;
          result.total_variants += count;

          switch (stat.clinicalSignificance?.toLowerCase()) {
            case 'pathogenic':
              result.pathogenic = count;
              break;
            case 'likely pathogenic':
            case 'likely_pathogenic':
              result.likely_pathogenic = count;
              break;
            case 'uncertain significance':
            case 'uncertain_significance':
              result.uncertain_significance = count;
              break;
            case 'likely benign':
            case 'likely_benign':
              result.likely_benign = count;
              break;
            case 'benign':
              result.benign = count;
              break;
            default:
              result.not_provided = count;
          }
        });

        return result;
      },
      'get variant statistics',
      { geneId },
      requestId
    );
  }

  // Quick search with caching
  @Cache({
    ...CacheConfigs.SHORT,
    keyGenerator: (searchText: string, limit: number) => `gene:quick:${searchText}:${limit}`
  })
  async searchByText(searchText: string, limit: number = 10, requestId?: string): Promise<Gene[]> {
    return this.executeWithErrorHandling(
      async () => {
        const searchConditions = SearchParameterMapper.buildTextSearchConditions(
          searchText,
          ['symbol', 'name', 'description']
        );

        const genes = await this.prisma.gene.findMany({
          where: searchConditions,
          orderBy: [
            { symbol: 'asc' },
            { name: 'asc' }
          ],
          take: limit
        });

        return genes;
      },
      'quick search genes',
      { searchText, limit },
      requestId
    );
  }

  // Override cache invalidation for gene-specific patterns
  
  protected async invalidateCreateRelatedCache(entity: Gene): Promise<void> {
    await super.invalidateCreateRelatedCache(entity);
    
    // Invalidate symbol-based cache
    await this.cache.del(`gene:symbol:${entity.symbol}`);
    
    // Invalidate chromosome-based caches
    await this.cache.clear(`gene:search:*"chromosome":"${entity.chromosome}"*`);
  }

  protected async invalidateUpdateRelatedCache(id: string, entity: Gene): Promise<void> {
    await super.invalidateUpdateRelatedCache(id, entity);
    
    // Invalidate symbol-based cache
    await this.cache.del(`gene:symbol:${entity.symbol}`);
    
    // Invalidate variant-related caches
    await this.cache.del(`gene:variants:${id}`);
    await this.cache.del(`gene:stats:${id}`);
  }

  // Utility methods
  
  private buildOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): any {
    if (!sortBy) {
      return { symbol: sortOrder };
    }

    if (sortBy === 'variantCount') {
      return { variants: { _count: sortOrder } };
    }

    return { [sortBy]: sortOrder };
  }
}