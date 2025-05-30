// lib/repositories/gene-repository.ts
import { Gene, Prisma } from '@prisma/client';
import { BaseRepository, PaginationParams, PaginationResult } from './base-repository';

export interface GeneCreateInput {
  geneId: string;
  symbol: string;
  name: string;
  chromosome: string;
  startPosition?: bigint;
  endPosition?: bigint;
  strand?: string;
  biotype?: string;
  description?: string;
  metadata?: any;
}

export interface GeneUpdateInput {
  symbol?: string;
  name?: string;
  chromosome?: string;
  startPosition?: bigint;
  endPosition?: bigint;
  strand?: string;
  biotype?: string;
  description?: string;
  metadata?: any;
}

export interface GeneWhereInput {
  search?: string;
  chromosome?: string;
  biotype?: string;
  hasVariants?: boolean;
}

export interface GeneWithStats extends Gene {
  variantCount: number;
  pathogenicCount: number;
}

export class GeneRepository extends BaseRepository<Gene, GeneCreateInput, GeneUpdateInput, GeneWhereInput> {
  constructor() {
    super('Gene');
  }

  async create(data: GeneCreateInput, requestId?: string): Promise<Gene> {
    return this.executeWithErrorHandling(
      () => this.prisma.gene.create({ data }),
      'create gene',
      { geneId: data.geneId, symbol: data.symbol },
      requestId
    );
  }

  async findById(id: string, requestId?: string): Promise<Gene | null> {
    return this.executeWithErrorHandling(
      () => this.prisma.gene.findUnique({ where: { id } }),
      'find gene by id',
      { id },
      requestId
    );
  }

  async findBySymbol(symbol: string, requestId?: string): Promise<Gene | null> {
    return this.executeWithErrorHandling(
      () => this.prisma.gene.findFirst({ where: { symbol } }),
      'find gene by symbol',
      { symbol },
      requestId
    );
  }

  async findByGeneId(geneId: string, requestId?: string): Promise<Gene | null> {
    return this.executeWithErrorHandling(
      () => this.prisma.gene.findUnique({ where: { geneId } }),
      'find gene by gene ID',
      { geneId },
      requestId
    );
  }

  async update(id: string, data: GeneUpdateInput, requestId?: string): Promise<Gene> {
    return this.executeWithErrorHandling(
      () => this.prisma.gene.update({ where: { id }, data }),
      'update gene',
      { id, ...data },
      requestId
    );
  }

  async delete(id: string, requestId?: string): Promise<void> {
    await this.executeWithErrorHandling(
      () => this.prisma.gene.delete({ where: { id } }),
      'delete gene',
      { id },
      requestId
    );
  }

  async findMany(
    where?: GeneWhereInput,
    pagination: PaginationParams = { page: 1, limit: 20 },
    requestId?: string
  ): Promise<PaginationResult<Gene>> {
    return this.executeWithErrorHandling(
      async () => {
        const skip = (pagination.page - 1) * pagination.limit;
        const prismaWhere = this.buildWhereClause(where);
        const orderBy = this.buildOrderBy(pagination.sortBy, pagination.sortOrder);

        const [genes, total] = await Promise.all([
          this.prisma.gene.findMany({
            where: prismaWhere,
            skip,
            take: pagination.limit,
            orderBy,
          }),
          this.prisma.gene.count({ where: prismaWhere }),
        ]);

        return {
          data: genes,
          meta: this.buildPaginationMeta(total, pagination.page, pagination.limit),
        };
      },
      'find many genes',
      { where, pagination },
      requestId
    );
  }

  async findManyWithStats(
    where?: GeneWhereInput,
    pagination: PaginationParams = { page: 1, limit: 20 },
    requestId?: string
  ): Promise<PaginationResult<GeneWithStats>> {
    return this.executeWithErrorHandling(
      async () => {
        const skip = (pagination.page - 1) * pagination.limit;
        const prismaWhere = this.buildWhereClause(where);
        const orderBy = this.buildOrderBy(pagination.sortBy, pagination.sortOrder);

        console.log('Gene repository - executing findManyWithStats query...');

        const [genesWithStats, total] = await Promise.all([
          this.prisma.gene.findMany({
            where: prismaWhere,
            skip,
            take: pagination.limit,
            orderBy,
            include: {
              _count: {
                select: { variants: true }
              },
              variants: {
                where: {
                  clinicalSignificance: { in: ['Pathogenic', 'Likely pathogenic'] }
                },
                select: { id: true }
              }
            },
          }),
          this.prisma.gene.count({ where: prismaWhere }),
        ]);

        console.log('Raw genes from DB:', {
          count: genesWithStats.length,
          total,
          firstGene: genesWithStats[0] ? {
            id: genesWithStats[0].id,
            symbol: genesWithStats[0].symbol,
            startPosition: genesWithStats[0].startPosition,
            startPositionType: typeof genesWithStats[0].startPosition,
            endPosition: genesWithStats[0].endPosition,
            endPositionType: typeof genesWithStats[0].endPosition,
          } : null
        });

        // Explicit conversion of BigInt fields to strings
        const data = genesWithStats.map(gene => {
          const converted = {
            ...gene,
            startPosition: gene.startPosition ? gene.startPosition.toString() : null,
            endPosition: gene.endPosition ? gene.endPosition.toString() : null,
            variantCount: gene._count.variants,
            pathogenicCount: gene.variants.length,
            // Remove the included data to match the interface
            _count: undefined,
            variants: undefined,
          };

          // Remove undefined properties
          delete converted._count;
          delete converted.variants;

          return converted;
        }) as GeneWithStats[];

        console.log('Converted genes data:', {
          count: data.length,
          firstGene: data[0] ? {
            id: data[0].id,
            symbol: data[0].symbol,
            startPosition: data[0].startPosition,
            startPositionType: typeof data[0].startPosition,
            endPosition: data[0].endPosition,
            endPositionType: typeof data[0].endPosition,
            variantCount: data[0].variantCount,
            pathogenicCount: data[0].pathogenicCount,
          } : null
        });

        return {
          data,
          meta: this.buildPaginationMeta(total, pagination.page, pagination.limit),
        };
      },
      'find many genes with stats',
      { where, pagination },
      requestId
    );
  }

  async findWithVariants(id: string, requestId?: string) {
    return this.executeWithErrorHandling(
      async () => {
        console.log('Gene repository - executing findWithVariants query for ID:', id);

        const geneWithVariants = await this.prisma.gene.findUnique({
          where: { id },
          include: {
            aliases: true,
            variants: {
              include: {
                annotations: {
                  include: { source: true },
                  orderBy: { createdAt: 'desc' },
                  take: 5
                }
              },
              orderBy: [
                { clinicalSignificance: 'asc' },
                { position: 'asc' }
              ],
              take: 100
            },
            _count: { select: { variants: true } }
          }
        });

        if (!geneWithVariants) {
          console.log('Gene not found in DB for ID:', id);
          return null;
        }

        console.log('Raw gene with variants from DB:', {
          id: geneWithVariants.id,
          symbol: geneWithVariants.symbol,
          startPosition: geneWithVariants.startPosition,
          startPositionType: typeof geneWithVariants.startPosition,
          endPosition: geneWithVariants.endPosition,
          endPositionType: typeof geneWithVariants.endPosition,
          variantsCount: geneWithVariants.variants.length,
          firstVariant: geneWithVariants.variants[0] ? {
            id: geneWithVariants.variants[0].id,
            position: geneWithVariants.variants[0].position,
            positionType: typeof geneWithVariants.variants[0].position,
          } : null
        });

        // Explicit conversion of BigInt fields
        const convertedGene = {
          ...geneWithVariants,
          startPosition: geneWithVariants.startPosition ? geneWithVariants.startPosition.toString() : null,
          endPosition: geneWithVariants.endPosition ? geneWithVariants.endPosition.toString() : null,
          variants: geneWithVariants.variants.map(variant => ({
            ...variant,
            position: variant.position.toString(), // Convert BigInt to string
            annotations: variant.annotations.map(annotation => ({
              ...annotation,
              createdAt: annotation.createdAt.toISOString(),
              updatedAt: annotation.updatedAt.toISOString(),
              source: {
                ...annotation.source,
                lastUpdated: annotation.source.lastUpdated ? annotation.source.lastUpdated.toISOString() : null
              }
            })),
            createdAt: variant.createdAt.toISOString(),
            updatedAt: variant.updatedAt.toISOString()
          })),
          createdAt: geneWithVariants.createdAt.toISOString(),
          updatedAt: geneWithVariants.updatedAt.toISOString()
        };

        console.log('Converted gene with variants:', {
          id: convertedGene.id,
          symbol: convertedGene.symbol,
          startPosition: convertedGene.startPosition,
          startPositionType: typeof convertedGene.startPosition,
          endPosition: convertedGene.endPosition,
          endPositionType: typeof convertedGene.endPosition,
          variantsCount: convertedGene.variants.length,
          firstVariant: convertedGene.variants[0] ? {
            id: convertedGene.variants[0].id,
            position: convertedGene.variants[0].position,
            positionType: typeof convertedGene.variants[0].position,
          } : null
        });

        return convertedGene;
      },
      'find gene with variants',
      { id },
      requestId
    );
  }

  async getVariantStats(geneId: string, requestId?: string) {
    return this.executeWithErrorHandling(
      async () => {
        const variantStats = await this.prisma.variant.groupBy({
          by: ['clinicalSignificance'],
          where: { geneId },
          _count: true
        });

        const stats = {
          total_variants: 0,
          pathogenic: 0,
          likely_pathogenic: 0,
          uncertain_significance: 0,
          likely_benign: 0,
          benign: 0,
          not_provided: 0
        };

        variantStats.forEach(stat => {
          const significance = stat.clinicalSignificance?.toLowerCase();
          stats.total_variants += stat._count;

          if (significance?.includes('pathogenic') && significance.includes('likely')) {
            stats.likely_pathogenic = stat._count;
          } else if (significance?.includes('pathogenic')) {
            stats.pathogenic = stat._count;
          } else if (significance?.includes('benign') && significance.includes('likely')) {
            stats.likely_benign = stat._count;
          } else if (significance?.includes('benign')) {
            stats.benign = stat._count;
          } else if (significance?.includes('uncertain')) {
            stats.uncertain_significance = stat._count;
          } else {
            stats.not_provided += stat._count;
          }
        });

        return stats;
      },
      'get variant stats for gene',
      { geneId },
      requestId
    );
  }

  async searchByText(searchText: string, limit: number = 10, requestId?: string): Promise<Gene[]> {
    return this.executeWithErrorHandling(
      () => this.prisma.gene.findMany({
        where: {
          OR: [
            { symbol: { contains: searchText, mode: 'insensitive' } },
            { name: { contains: searchText, mode: 'insensitive' } },
            { geneId: { contains: searchText, mode: 'insensitive' } },
          ]
        },
        take: limit,
        orderBy: { symbol: 'asc' }
      }),
      'search genes by text',
      { searchText, limit },
      requestId
    );
  }

  private buildWhereClause(where?: GeneWhereInput): Prisma.GeneWhereInput {
    if (!where) return {};

    const conditions: Prisma.GeneWhereInput = {};

    if (where.search) {
      conditions.OR = [
        { symbol: { contains: where.search, mode: 'insensitive' } },
        { name: { contains: where.search, mode: 'insensitive' } },
        { geneId: { contains: where.search, mode: 'insensitive' } },
      ];
    }

    if (where.chromosome) {
      conditions.chromosome = where.chromosome;
    }

    if (where.biotype) {
      conditions.biotype = where.biotype;
    }

    if (where.hasVariants !== undefined) {
      if (where.hasVariants) {
        conditions.variants = { some: {} };
      } else {
        conditions.variants = { none: {} };
      }
    }

    return conditions;
  }
}