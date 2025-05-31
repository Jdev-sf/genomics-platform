// lib/repositories/optimized-gene-repository.ts
import { Gene, Prisma } from '@prisma/client';
import { GeneRepository, GeneCreateInput, GeneUpdateInput, GeneWhereInput, GeneWithStats } from './gene-repository';
import { PaginationParams, PaginationResult } from './base-repository';

interface CursorPaginationParams {
  cursor?: string;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CursorPaginationResult<T> {
  data: T[];
  meta: {
    count: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

export class OptimizedGeneRepository extends GeneRepository {
  
  // Ottimizzata: Single query con aggregazioni SQL native
  override async findManyWithStats(
    where?: GeneWhereInput,
    pagination: PaginationParams = { page: 1, limit: 20 },
    requestId?: string
  ): Promise<PaginationResult<GeneWithStats>> {
    return this.executeWithErrorHandling(
      async () => {
        const skip = (pagination.page - 1) * pagination.limit;
        const sortBy = pagination.sortBy || 'symbol';
        const sortOrder = pagination.sortOrder || 'asc';

        // Build WHERE conditions for raw SQL
        const whereConditions = this.buildWhereConditionsSQL(where);
        const orderBySQL = this.buildOrderBySQL(sortBy, sortOrder);

        // Single query con aggregazioni SQL
        const genesWithStats = await this.prisma.$queryRaw<Array<{
          id: string;
          gene_id: string;
          symbol: string;
          name: string;
          chromosome: string | null;
          start_position: bigint | null;
          end_position: bigint | null;
          strand: string | null;
          biotype: string | null;
          description: string | null;
          metadata: any;
          created_at: Date;
          updated_at: Date;
          variant_count: bigint;
          pathogenic_count: bigint;
        }>>`
          SELECT 
            g.*,
            COALESCE(stats.variant_count, 0)::bigint as variant_count,
            COALESCE(stats.pathogenic_count, 0)::bigint as pathogenic_count
          FROM genes g
          LEFT JOIN (
            SELECT 
              gene_id,
              COUNT(*)::bigint as variant_count,
              COUNT(CASE WHEN clinical_significance IN ('Pathogenic', 'Likely pathogenic') THEN 1 END)::bigint as pathogenic_count
            FROM variants 
            GROUP BY gene_id
          ) stats ON g.id = stats.gene_id
          ${whereConditions}
          ${orderBySQL}
          LIMIT ${pagination.limit} OFFSET ${skip}
        `;

        // Get total count separately
        const totalResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint as count FROM genes g ${whereConditions}
        `;

        // Converti BigInt to number per serializzazione
        const data: GeneWithStats[] = genesWithStats.map(gene => ({
          id: gene.id,
          geneId: gene.gene_id,
          symbol: gene.symbol,
          name: gene.name,
          chromosome: gene.chromosome,
          startPosition: gene.start_position,
          endPosition: gene.end_position,
          strand: gene.strand,
          biotype: gene.biotype,
          description: gene.description,
          metadata: gene.metadata,
          createdAt: gene.created_at,
          updatedAt: gene.updated_at,
          variantCount: Number(gene.variant_count),
          pathogenicCount: Number(gene.pathogenic_count),
        }));

        const total = Number(totalResult[0]?.count || 0);

        return {
          data,
          meta: this.buildPaginationMeta(total, pagination.page, pagination.limit),
        };
      },
      'find many genes with stats (optimized)',
      { where, pagination },
      requestId
    );
  }

  // Cursor pagination per dataset molto grandi
  async findManyWithCursor(
    where?: GeneWhereInput,
    pagination: CursorPaginationParams = { limit: 20 },
    requestId?: string
  ): Promise<CursorPaginationResult<Gene>> {
    return this.executeWithErrorHandling(
      async () => {
        const prismaWhere = this.buildPrismaWhereClause(where);
        const orderBy = this.buildOrderBy(pagination.sortBy || 'symbol', pagination.sortOrder);
        
        // Cursor-based pagination
        const cursorCondition = pagination.cursor ? {
          id: { gt: pagination.cursor }
        } : {};

        const genes = await this.prisma.gene.findMany({
          where: { ...prismaWhere, ...cursorCondition },
          orderBy,
          take: pagination.limit + 1, // +1 per determinare hasNextPage
        });

        const hasNextPage = genes.length > pagination.limit;
        const data = hasNextPage ? genes.slice(0, -1) : genes;
        
        return {
          data,
          meta: {
            count: data.length,
            hasNextPage,
            hasPrevPage: !!pagination.cursor,
            nextCursor: hasNextPage ? data[data.length - 1]?.id : undefined,
          },
        };
      },
      'find many genes with cursor',
      { where, pagination },
      requestId
    );
  }

  // Aggregazioni ottimizzate per dashboard
  async getGeneStatistics(requestId?: string) {
    return this.executeWithErrorHandling(
      async () => {
        const stats = await this.prisma.$queryRaw<Array<{
          total_genes: bigint;
          genes_with_variants: bigint;
          avg_variants_per_gene: number;
          top_chromosome: string;
          pathogenic_genes: bigint;
        }>>`
          SELECT 
            COUNT(*)::bigint as total_genes,
            COUNT(CASE WHEN variant_stats.variant_count > 0 THEN 1 END)::bigint as genes_with_variants,
            COALESCE(AVG(variant_stats.variant_count), 0) as avg_variants_per_gene,
            MODE() WITHIN GROUP (ORDER BY chromosome) as top_chromosome,
            COUNT(CASE WHEN variant_stats.pathogenic_count > 0 THEN 1 END)::bigint as pathogenic_genes
          FROM genes g
          LEFT JOIN (
            SELECT 
              gene_id,
              COUNT(*) as variant_count,
              COUNT(CASE WHEN clinical_significance IN ('Pathogenic', 'Likely pathogenic') THEN 1 END) as pathogenic_count
            FROM variants 
            GROUP BY gene_id
          ) variant_stats ON g.id = variant_stats.gene_id
        `;

        return {
          totalGenes: Number(stats[0].total_genes),
          genesWithVariants: Number(stats[0].genes_with_variants),
          avgVariantsPerGene: Math.round(stats[0].avg_variants_per_gene),
          topChromosome: stats[0].top_chromosome,
          pathogenicGenes: Number(stats[0].pathogenic_genes),
        };
      },
      'get gene statistics',
      {},
      requestId
    );
  }

  // Top genes per pathogenic variants
  async getTopPathogenicGenes(limit: number = 10, requestId?: string) {
    return this.executeWithErrorHandling(
      async () => {
        const topGenes = await this.prisma.$queryRaw<Array<{
          id: string;
          symbol: string;
          name: string;
          chromosome: string;
          pathogenic_count: bigint;
          total_variants: bigint;
        }>>`
          SELECT 
            g.id,
            g.symbol,
            g.name,
            g.chromosome,
            COUNT(CASE WHEN v.clinical_significance IN ('Pathogenic', 'Likely pathogenic') THEN 1 END)::bigint as pathogenic_count,
            COUNT(v.id)::bigint as total_variants
          FROM genes g
          INNER JOIN variants v ON g.id = v.gene_id
          GROUP BY g.id, g.symbol, g.name, g.chromosome
          HAVING COUNT(CASE WHEN v.clinical_significance IN ('Pathogenic', 'Likely pathogenic') THEN 1 END) > 0
          ORDER BY pathogenic_count DESC, total_variants DESC
          LIMIT ${limit}
        `;

        return topGenes.map(gene => ({
          ...gene,
          pathogenicCount: Number(gene.pathogenic_count),
          totalVariants: Number(gene.total_variants),
        }));
      },
      'get top pathogenic genes',
      { limit },
      requestId
    );
  }

  // Helper methods per query building
  private buildWhereConditionsSQL(where?: GeneWhereInput): Prisma.Sql {
    if (!where) return Prisma.sql``;
    
    const conditions: string[] = [];
    
    if (where.search) {
      const searchTerm = where.search.replace(/'/g, "''"); // Escape quotes
      conditions.push(`(g.symbol ILIKE '%${searchTerm}%' OR g.name ILIKE '%${searchTerm}%')`);
    }
    
    if (where.chromosome) {
      conditions.push(`g.chromosome = '${where.chromosome}'`);
    }
    
    if (where.biotype) {
      conditions.push(`g.biotype = '${where.biotype}'`);
    }

    return conditions.length > 0 
      ? Prisma.sql`WHERE ${Prisma.raw(conditions.join(' AND '))}`
      : Prisma.sql``;
  }

  private buildOrderBySQL(sortBy: string, sortOrder: 'asc' | 'desc' = 'asc'): Prisma.Sql {
    const validColumns = ['symbol', 'name', 'chromosome', 'variant_count', 'pathogenic_count'];
    const column = validColumns.includes(sortBy) ? sortBy : 'symbol';
    return Prisma.sql`ORDER BY ${Prisma.raw(column)} ${Prisma.raw(sortOrder.toUpperCase())}`;
  }

  // Use parent's buildWhereClause for Prisma queries
  private buildPrismaWhereClause(where?: GeneWhereInput): any {
    if (!where) return {};

    const conditions: any = {};

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

  // Search ottimizzato con full-text search
  override async searchByText(searchText: string, limit: number = 10, requestId?: string): Promise<Gene[]> {
    return this.executeWithErrorHandling(
      async () => {
        const escapedSearch = searchText.replace(/'/g, "''");
        
        // Usa PostgreSQL full-text search
        const genes = await this.prisma.$queryRaw<Gene[]>`
          SELECT g.*
          FROM genes g
          WHERE g.symbol ILIKE ${'%' + escapedSearch + '%'}
             OR g.name ILIKE ${'%' + escapedSearch + '%'}
             OR g.gene_id ILIKE ${'%' + escapedSearch + '%'}
          ORDER BY 
            CASE 
              WHEN g.symbol ILIKE ${escapedSearch + '%'} THEN 1
              WHEN g.symbol ILIKE ${'%' + escapedSearch + '%'} THEN 2
              WHEN g.name ILIKE ${escapedSearch + '%'} THEN 3
              ELSE 4
            END,
            g.symbol ASC
          LIMIT ${limit}
        `;

        return genes;
      },
      'search genes by text (optimized)',
      { searchText, limit },
      requestId
    );
  }
}