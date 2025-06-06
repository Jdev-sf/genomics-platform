// lib/repositories/cached-gene-repository.ts
// Optimized cached gene repository without decorators

import { Gene } from '@prisma/client';
import { GeneRepository, GeneCreateInput, GeneUpdateInput, GeneWhereInput, GeneWithStats } from './gene-repository';
import { PaginationParams, PaginationResult } from './base-repository';
import { CacheManager } from '@/lib/cache/cache-manager';
import { SearchParameterMapper } from '@/lib/shared/search-parameter-mapper';
import { createLogger } from '@/lib/logger';

export class OptimizedCachedGeneRepository extends GeneRepository {
  private cache: CacheManager;
  private logger = createLogger({ component: 'cached-gene-repository' });
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

  override async findById(id: string, requestId?: string): Promise<Gene | null> {
    const cacheKey = `gene:id:${id}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit', { key: cacheKey });
        return cached.data as Gene | null;
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

  async findBySymbol(symbol: string, requestId?: string): Promise<Gene | null> {
    const cacheKey = `gene:symbol:${symbol}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit', { key: cacheKey });
        return cached.data as Gene | null;
      }

      const result = await this.executeWithErrorHandling(
        async () => {
          const gene = await this.prisma.gene.findFirst({
            where: {
              OR: [
                { symbol: { equals: symbol, mode: 'insensitive' } },
                { aliases: { some: { alias: { equals: symbol, mode: 'insensitive' } } } }
              ]
            }
          });
          return gene;
        },
        'find gene by symbol',
        { symbol },
        requestId
      );
      
      if (result) {
        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL.DETAIL });
        this.logger.debug('Cache set', { key: cacheKey });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findBySymbol', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  override async findManyWithStats(
    where: GeneWhereInput = {},
    pagination: PaginationParams = { page: 1, limit: 20 },
    requestId?: string
  ): Promise<PaginationResult<GeneWithStats>> {
    const cacheKey = `gene:search:${JSON.stringify({ where, pagination })}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit', { key: cacheKey });
        return cached.data as PaginationResult<GeneWithStats>;
      }

      const result = await this.executeWithErrorHandling(
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
      
      if (result) {
        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL.SEARCH });
        this.logger.debug('Cache set', { key: cacheKey });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findManyWithStats', error instanceof Error ? error : new Error(String(error)));
      return super.findManyWithStats(where, pagination, requestId);
    }
  }

  async findWithVariants(id: string, requestId?: string): Promise<any> {
    const cacheKey = `gene:variants:${id}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit', { key: cacheKey });
        return cached.data;
      }

      const result = await this.executeWithErrorHandling(
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
      
      if (result) {
        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL.DETAIL });
        this.logger.debug('Cache set', { key: cacheKey });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in findWithVariants', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async getVariantStats(geneId: string, requestId?: string): Promise<any> {
    const cacheKey = `gene:stats:${geneId}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit', { key: cacheKey });
        return cached.data;
      }

      const result = await this.executeWithErrorHandling(
        async () => {
          const stats = await this.prisma.variant.groupBy({
            by: ['clinicalSignificance'],
            where: { geneId },
            _count: { clinicalSignificance: true }
          });

          const statsResult = {
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
            statsResult.total_variants += count;

            switch (stat.clinicalSignificance?.toLowerCase()) {
              case 'pathogenic':
                statsResult.pathogenic = count;
                break;
              case 'likely pathogenic':
              case 'likely_pathogenic':
                statsResult.likely_pathogenic = count;
                break;
              case 'uncertain significance':
              case 'uncertain_significance':
                statsResult.uncertain_significance = count;
                break;
              case 'likely benign':
              case 'likely_benign':
                statsResult.likely_benign = count;
                break;
              case 'benign':
                statsResult.benign = count;
                break;
              default:
                statsResult.not_provided = count;
            }
          });

          return statsResult;
        },
        'get variant statistics',
        { geneId },
        requestId
      );
      
      if (result) {
        await this.cache.set(cacheKey, result, { ttl: this.CACHE_TTL.STATS });
        this.logger.debug('Cache set', { key: cacheKey });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Cache error in getVariantStats', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async searchByText(searchText: string, limit: number = 10, requestId?: string): Promise<Gene[]> {
    const cacheKey = `gene:quick:${searchText}:${limit}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit', { key: cacheKey });
        return cached.data as Gene[];
      }

      const result = await this.executeWithErrorHandling(
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
  override async create(data: GeneCreateInput, requestId?: string): Promise<Gene> {
    const result = await super.create(data, requestId);
    
    // Invalidate relevant caches
    await this.invalidateCreateRelatedCache(result);
    
    return result;
  }

  override async update(id: string, data: GeneUpdateInput, requestId?: string): Promise<Gene> {
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
  private async invalidateCreateRelatedCache(entity: Gene): Promise<void> {
    try {
      // Invalidate list and search caches
      await this.cache.clear('gene:search');
      await this.cache.clear('gene:quick');
      
      // Invalidate symbol-based cache
      await this.cache.del(`gene:symbol:${entity.symbol}`);
      
      this.logger.debug('Cache invalidated after create', { geneId: entity.id });
    } catch (error) {
      this.logger.error('Cache invalidation error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async invalidateUpdateRelatedCache(id: string, entity: Gene): Promise<void> {
    try {
      // Invalidate specific entity caches
      await this.cache.del(`gene:id:${id}`);
      await this.cache.del(`gene:symbol:${entity.symbol}`);
      await this.cache.del(`gene:variants:${id}`);
      await this.cache.del(`gene:stats:${id}`);
      
      // Invalidate list and search caches
      await this.cache.clear('gene:search');
      await this.cache.clear('gene:quick');
      
      this.logger.debug('Cache invalidated after update', { geneId: id });
    } catch (error) {
      this.logger.error('Cache invalidation error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async invalidateDeleteRelatedCache(id: string): Promise<void> {
    try {
      // Invalidate all related caches
      await this.cache.del(`gene:id:${id}`);
      await this.cache.del(`gene:variants:${id}`);
      await this.cache.del(`gene:stats:${id}`);
      
      // Invalidate list and search caches
      await this.cache.clear('gene:search');
      await this.cache.clear('gene:quick');
      
      this.logger.debug('Cache invalidated after delete', { geneId: id });
    } catch (error) {
      this.logger.error('Cache invalidation error', error instanceof Error ? error : new Error(String(error)));
    }
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