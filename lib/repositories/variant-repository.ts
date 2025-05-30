// lib/repositories/variant-repository.ts
import { Variant, Prisma } from '@prisma/client';
import { BaseRepository, PaginationParams, PaginationResult } from './base-repository';

export interface VariantCreateInput {
  variantId: string;
  geneId: string;
  chromosome: string;
  position: bigint;
  referenceAllele: string;
  alternateAllele: string;
  variantType?: string;
  consequence?: string;
  impact?: string;
  proteinChange?: string;
  transcriptId?: string;
  frequency?: number;
  clinicalSignificance?: string;
  metadata?: any;
}

export interface VariantUpdateInput {
  variantId?: string;
  geneId?: string;
  chromosome?: string;
  position?: bigint;
  referenceAllele?: string;
  alternateAllele?: string;
  variantType?: string;
  consequence?: string;
  impact?: string;
  proteinChange?: string;
  transcriptId?: string;
  frequency?: number;
  clinicalSignificance?: string;
  metadata?: any;
}

export interface VariantWhereInput {
  search?: string;
  geneId?: string;
  chromosome?: string;
  clinicalSignificance?: string[];
  impact?: string[];
  variantType?: string[];
  minFrequency?: number;
  maxFrequency?: number;
  consequence?: string;
}

export interface VariantWithGene extends Variant {
  gene: {
    id: string;
    symbol: string;
    name: string;
    chromosome: string;
  };
  annotationsCount: number;
}

export class VariantRepository extends BaseRepository<Variant, VariantCreateInput, VariantUpdateInput, VariantWhereInput> {
  constructor() {
    super('Variant');
  }

  async create(data: VariantCreateInput, requestId?: string): Promise<Variant> {
    return this.executeWithErrorHandling(
      () => this.prisma.variant.create({ data }),
      'create variant',
      { variantId: data.variantId, geneId: data.geneId },
      requestId
    );
  }

  async findById(id: string, requestId?: string): Promise<Variant | null> {
    return this.executeWithErrorHandling(
      () => this.prisma.variant.findUnique({ where: { id } }),
      'find variant by id',
      { id },
      requestId
    );
  }

  async findByVariantId(variantId: string, requestId?: string): Promise<Variant | null> {
    return this.executeWithErrorHandling(
      () => this.prisma.variant.findFirst({ where: { variantId } }),
      'find variant by variant ID',
      { variantId },
      requestId
    );
  }

  async update(id: string, data: VariantUpdateInput, requestId?: string): Promise<Variant> {
    return this.executeWithErrorHandling(
      () => this.prisma.variant.update({ where: { id }, data }),
      'update variant',
      { id, ...data },
      requestId
    );
  }

  async delete(id: string, requestId?: string): Promise<void> {
    await this.executeWithErrorHandling(
      () => this.prisma.variant.delete({ where: { id } }),
      'delete variant',
      { id },
      requestId
    );
  }

  async findMany(
    where?: VariantWhereInput,
    pagination: PaginationParams = { page: 1, limit: 20 },
    requestId?: string
  ): Promise<PaginationResult<Variant>> {
    return this.executeWithErrorHandling(
      async () => {
        const skip = (pagination.page - 1) * pagination.limit;
        const prismaWhere = this.buildWhereClause(where);
        const orderBy = this.buildOrderBy(pagination.sortBy, pagination.sortOrder);

        const [variants, total] = await Promise.all([
          this.prisma.variant.findMany({
            where: prismaWhere,
            skip,
            take: pagination.limit,
            orderBy,
          }),
          this.prisma.variant.count({ where: prismaWhere }),
        ]);

        return {
          data: variants,
          meta: this.buildPaginationMeta(total, pagination.page, pagination.limit),
        };
      },
      'find many variants',
      { where, pagination },
      requestId
    );
  }

  async findManyWithGene(
    where?: VariantWhereInput,
    pagination: PaginationParams = { page: 1, limit: 20 },
    requestId?: string
  ): Promise<PaginationResult<VariantWithGene>> {
    return this.executeWithErrorHandling(
      async () => {
        const skip = (pagination.page - 1) * pagination.limit;
        const prismaWhere = this.buildWhereClause(where);
        const orderBy = this.buildOrderBy(pagination.sortBy, pagination.sortOrder);

        const [variantsWithGene, total] = await Promise.all([
          this.prisma.variant.findMany({
            where: prismaWhere,
            skip,
            take: pagination.limit,
            orderBy,
            include: {
              gene: {
                select: {
                  id: true,
                  symbol: true,
                  name: true,
                  chromosome: true,
                }
              },
              _count: {
                select: { annotations: true }
              }
            },
          }),
          this.prisma.variant.count({ where: prismaWhere }),
        ]);

        const data = variantsWithGene.map(variant => ({
          ...variant,
          annotationsCount: variant._count.annotations,
          // Remove the _count to match interface
          _count: undefined,
        })) as VariantWithGene[];

        return {
          data,
          meta: this.buildPaginationMeta(total, pagination.page, pagination.limit),
        };
      },
      'find many variants with gene',
      { where, pagination },
      requestId
    );
  }

  async findWithDetails(id: string, requestId?: string) {
    return this.executeWithErrorHandling(
      () => this.prisma.variant.findUnique({
        where: { id },
        include: {
          gene: {
            select: {
              id: true,
              geneId: true,
              symbol: true,
              name: true,
              chromosome: true,
              description: true,
            }
          },
          annotations: {
            include: { source: true },
            orderBy: { createdAt: 'desc' }
          }
        }
      }),
      'find variant with details',
      { id },
      requestId
    );
  }

  async findRelatedVariants(variantId: string, geneId: string, requestId?: string) {
    return this.executeWithErrorHandling(
      () => this.prisma.variant.findMany({
        where: {
          geneId,
          id: { not: variantId },
        },
        select: {
          id: true,
          variantId: true,
          position: true,
          consequence: true,
          clinicalSignificance: true,
        },
        take: 5,
        orderBy: { position: 'asc' }
      }),
      'find related variants',
      { variantId, geneId },
      requestId
    );
  }

  async findByGenomicPosition(
    chromosome: string,
    position: bigint,
    requestId?: string
  ): Promise<Variant[]> {
    return this.executeWithErrorHandling(
      () => this.prisma.variant.findMany({
        where: {
          chromosome,
          position
        },
        include: {
          gene: {
            select: { symbol: true, name: true }
          }
        }
      }),
      'find variants by genomic position',
      { chromosome, position: position.toString() },
      requestId
    );
  }

  async searchByText(searchText: string, limit: number = 10, requestId?: string): Promise<Variant[]> {
    return this.executeWithErrorHandling(
      () => this.prisma.variant.findMany({
        where: {
          OR: [
            { variantId: { contains: searchText, mode: 'insensitive' } },
            { proteinChange: { contains: searchText, mode: 'insensitive' } },
            { gene: { symbol: { contains: searchText, mode: 'insensitive' } } },
          ]
        },
        include: {
          gene: { select: { symbol: true } }
        },
        take: limit,
        orderBy: { position: 'asc' }
      }),
      'search variants by text',
      { searchText, limit },
      requestId
    );
  }

  async getStatsByGene(geneId: string, requestId?: string) {
    return this.executeWithErrorHandling(
      async () => {
        const stats = await this.prisma.variant.groupBy({
          by: ['clinicalSignificance'],
          where: { geneId },
          _count: true
        });

        return stats.reduce((acc, stat) => {
          const significance = stat.clinicalSignificance || 'not_provided';
          acc[significance] = stat._count;
          return acc;
        }, {} as Record<string, number>);
      },
      'get variant stats by gene',
      { geneId },
      requestId
    );
  }

  async bulkCreate(variants: VariantCreateInput[], requestId?: string): Promise<number> {
    return this.executeWithErrorHandling(
      async () => {
        const result = await this.prisma.variant.createMany({
          data: variants,
          skipDuplicates: true
        });
        return result.count;
      },
      'bulk create variants',
      { count: variants.length },
      requestId
    );
  }

  private buildWhereClause(where?: VariantWhereInput): Prisma.VariantWhereInput {
    if (!where) return {};

    const conditions: Prisma.VariantWhereInput = {};

    if (where.search) {
      conditions.OR = [
        { variantId: { contains: where.search, mode: 'insensitive' } },
        { proteinChange: { contains: where.search, mode: 'insensitive' } },
        { gene: { symbol: { contains: where.search, mode: 'insensitive' } } },
      ];
    }

    if (where.geneId) {
      conditions.geneId = where.geneId;
    }

    if (where.chromosome) {
      conditions.chromosome = where.chromosome;
    }

    if (where.clinicalSignificance && where.clinicalSignificance.length > 0) {
      conditions.clinicalSignificance = { in: where.clinicalSignificance };
    }

    if (where.impact && where.impact.length > 0) {
      conditions.impact = { in: where.impact };
    }

    if (where.variantType && where.variantType.length > 0) {
      conditions.variantType = { in: where.variantType };
    }

    if (where.consequence) {
      conditions.consequence = where.consequence;
    }

    if (where.minFrequency !== undefined || where.maxFrequency !== undefined) {
      conditions.frequency = {};
      if (where.minFrequency !== undefined) {
        conditions.frequency.gte = where.minFrequency;
      }
      if (where.maxFrequency !== undefined) {
        conditions.frequency.lte = where.maxFrequency;
      }
    }

    return conditions;
  }
}