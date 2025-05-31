// lib/repositories/optimized-variant-repository.ts
import { Variant, Prisma } from '@prisma/client';
import { VariantRepository, VariantCreateInput, VariantUpdateInput, VariantWhereInput, VariantWithGene } from './variant-repository';
import { PaginationParams, PaginationResult } from './base-repository';
import { prisma as optimizedPrisma } from '@/lib/prisma-optimized';

interface GenomicRegion {
  chromosome: string;
  startPosition: bigint;
  endPosition: bigint;
}

interface VariantStatistics {
  totalVariants: number;
  pathogenicCount: number;
  likelyPathogenicCount: number;
  uncertainCount: number;
  likelyBenignCount: number;
  benignCount: number;
  byChromosome: Record<string, number>;
  byImpact: Record<string, number>;
}

export class OptimizedVariantRepository extends VariantRepository {

    protected prisma = optimizedPrisma;

  // Query ottimizzata con joins efficienti
  override async findManyWithGene(
    where?: VariantWhereInput,
    pagination: PaginationParams = { page: 1, limit: 20 },
    requestId?: string
  ): Promise<PaginationResult<VariantWithGene>> {
    return this.executeWithErrorHandling(
      async () => {
        const skip = (pagination.page - 1) * pagination.limit;
        const sortBy = pagination.sortBy || 'position';
        const sortOrder = pagination.sortOrder || 'asc';

        // Build WHERE conditions
        const whereConditions = this.buildVariantWhereConditionsSQL(where);
        const orderBySQL = this.buildVariantOrderBySQL(sortBy, sortOrder);

        // Single query ottimizzata con join
        const variantsWithGene = await this.prisma.$queryRaw<Array<{
          id: string;
          variant_id: string;
          gene_id: string;
          chromosome: string;
          position: bigint;
          reference_allele: string;
          alternate_allele: string;
          variant_type: string | null;
          consequence: string | null;
          impact: string | null;
          protein_change: string | null;
          transcript_id: string | null;
          frequency: Prisma.Decimal | null;
          clinical_significance: string | null;
          metadata: any;
          created_at: Date;
          updated_at: Date;
          gene_symbol: string;
          gene_name: string;
          gene_chromosome: string;
          annotations_count: bigint;
        }>>`
          SELECT 
            v.*,
            g.symbol as gene_symbol,
            g.name as gene_name,
            g.chromosome as gene_chromosome,
            COALESCE(ann_count.count, 0)::bigint as annotations_count
          FROM variants v
          INNER JOIN genes g ON v.gene_id = g.id
          LEFT JOIN (
            SELECT variant_id, COUNT(*)::bigint as count
            FROM annotations
            GROUP BY variant_id
          ) ann_count ON v.id = ann_count.variant_id
          ${whereConditions}
          ${orderBySQL}
          LIMIT ${pagination.limit} OFFSET ${skip}
        `;

        // Get total count
        const totalResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint as count
          FROM variants v
          INNER JOIN genes g ON v.gene_id = g.id
          ${whereConditions}
        `;

        // Converti e normalizza dati
        const data: VariantWithGene[] = variantsWithGene.map(variant => ({
          id: variant.id,
          variantId: variant.variant_id,
          geneId: variant.gene_id,
          chromosome: variant.chromosome,
          position: variant.position, // Keep as bigint, will be serialized
          referenceAllele: variant.reference_allele,
          alternateAllele: variant.alternate_allele,
          variantType: variant.variant_type,
          consequence: variant.consequence,
          impact: variant.impact,
          proteinChange: variant.protein_change,
          transcriptId: variant.transcript_id,
          frequency: variant.frequency,
          clinicalSignificance: variant.clinical_significance,
          metadata: variant.metadata,
          createdAt: variant.created_at,
          updatedAt: variant.updated_at,
          gene: {
            id: variant.gene_id,
            symbol: variant.gene_symbol,
            name: variant.gene_name,
            chromosome: variant.gene_chromosome,
          },
          annotationsCount: Number(variant.annotations_count),
        }));

        const total = Number(totalResult[0]?.count || 0);

        return {
          data,
          meta: this.buildPaginationMeta(total, pagination.page, pagination.limit),
        };
      },
      'find many variants with gene (optimized)',
      { where, pagination },
      requestId
    );
  }

  // Range queries ottimizzate per regioni genomiche
  async findByGenomicRegion(
    region: GenomicRegion,
    filters?: Omit<VariantWhereInput, 'chromosome'>,
    pagination: PaginationParams = { page: 1, limit: 50 },
    requestId?: string
  ): Promise<PaginationResult<VariantWithGene>> {
    return this.executeWithErrorHandling(
      async () => {
        const skip = (pagination.page - 1) * pagination.limit;
        const additionalFilters = this.buildAdditionalFiltersSQL(filters);
        
        const variants = await this.prisma.$queryRaw<Array<{
          id: string;
          variant_id: string;
          gene_id: string;
          chromosome: string;
          position: bigint;
          reference_allele: string;
          alternate_allele: string;
          variant_type: string | null;
          consequence: string | null;
          impact: string | null;
          protein_change: string | null;
          transcript_id: string | null;
          frequency: Prisma.Decimal | null;
          clinical_significance: string | null;
          metadata: any;
          created_at: Date;
          updated_at: Date;
          gene_symbol: string;
          gene_name: string;
          gene_chromosome: string;
        }>>`
          SELECT 
            v.*,
            g.symbol as gene_symbol,
            g.name as gene_name,
            g.chromosome as gene_chromosome
          FROM variants v
          INNER JOIN genes g ON v.gene_id = g.id
          WHERE v.chromosome = ${region.chromosome}
            AND v.position BETWEEN ${region.startPosition} AND ${region.endPosition}
            ${additionalFilters}
          ORDER BY v.position ASC
          LIMIT ${pagination.limit} OFFSET ${skip}
        `;

        const total = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint as count
          FROM variants v
          WHERE v.chromosome = ${region.chromosome}
            AND v.position BETWEEN ${region.startPosition} AND ${region.endPosition}
        `;

        const data: VariantWithGene[] = variants.map(v => ({
          id: v.id,
          variantId: v.variant_id,
          geneId: v.gene_id,
          chromosome: v.chromosome,
          position: v.position,
          referenceAllele: v.reference_allele,
          alternateAllele: v.alternate_allele,
          variantType: v.variant_type,
          consequence: v.consequence,
          impact: v.impact,
          proteinChange: v.protein_change,
          transcriptId: v.transcript_id,
          frequency: v.frequency,
          clinicalSignificance: v.clinical_significance,
          metadata: v.metadata,
          createdAt: v.created_at,
          updatedAt: v.updated_at,
          gene: {
            id: v.gene_id,
            symbol: v.gene_symbol,
            name: v.gene_name,
            chromosome: v.gene_chromosome,
          },
          annotationsCount: 0, // Placeholder
        }));

        return {
          data,
          meta: this.buildPaginationMeta(Number(total[0].count), pagination.page, pagination.limit),
        };
      },
      'find variants by genomic region',
      { region, filters, pagination },
      requestId
    );
  }

  // Aggregazioni cliniche ottimizzate
  async getClinicalStatistics(geneId?: string, requestId?: string): Promise<VariantStatistics> {
    return this.executeWithErrorHandling(
      async () => {
        const whereCondition = geneId ? Prisma.sql`WHERE gene_id = ${geneId}` : Prisma.sql``;
        
        const [clinicalStats, chromosomeStats, impactStats] = await Promise.all([
          // Clinical significance stats
          this.prisma.$queryRaw<Array<{
            clinical_significance: string | null;
            count: bigint;
          }>>`
            SELECT 
              clinical_significance,
              COUNT(*)::bigint as count
            FROM variants 
            ${whereCondition}
            GROUP BY clinical_significance
          `,
          
          // Chromosome distribution
          this.prisma.$queryRaw<Array<{
            chromosome: string;
            count: bigint;
          }>>`
            SELECT 
              chromosome,
              COUNT(*)::bigint as count
            FROM variants 
            ${whereCondition}
            GROUP BY chromosome
            ORDER BY chromosome
          `,
          
          // Impact distribution
          this.prisma.$queryRaw<Array<{
            impact: string | null;
            count: bigint;
          }>>`
            SELECT 
              impact,
              COUNT(*)::bigint as count
            FROM variants 
            ${whereCondition}
            GROUP BY impact
          `
        ]);

        // Process results
        const clinicalCounts = clinicalStats.reduce((acc, stat) => {
          const significance = stat.clinical_significance?.toLowerCase() || 'not_provided';
          if (significance.includes('pathogenic') && !significance.includes('likely')) {
            acc.pathogenic += Number(stat.count);
          } else if (significance.includes('likely') && significance.includes('pathogenic')) {
            acc.likelyPathogenic += Number(stat.count);
          } else if (significance.includes('uncertain')) {
            acc.uncertain += Number(stat.count);
          } else if (significance.includes('likely') && significance.includes('benign')) {
            acc.likelyBenign += Number(stat.count);
          } else if (significance.includes('benign')) {
            acc.benign += Number(stat.count);
          }
          acc.total += Number(stat.count);
          return acc;
        }, {
          pathogenic: 0,
          likelyPathogenic: 0,
          uncertain: 0,
          likelyBenign: 0,
          benign: 0,
          total: 0
        });

        return {
          totalVariants: clinicalCounts.total,
          pathogenicCount: clinicalCounts.pathogenic,
          likelyPathogenicCount: clinicalCounts.likelyPathogenic,
          uncertainCount: clinicalCounts.uncertain,
          likelyBenignCount: clinicalCounts.likelyBenign,
          benignCount: clinicalCounts.benign,
          byChromosome: chromosomeStats.reduce((acc, stat) => {
            acc[stat.chromosome] = Number(stat.count);
            return acc;
          }, {} as Record<string, number>),
          byImpact: impactStats.reduce((acc, stat) => {
            if (stat.impact) {
              acc[stat.impact] = Number(stat.count);
            }
            return acc;
          }, {} as Record<string, number>),
        };
      },
      'get clinical statistics',
      { geneId },
      requestId
    );
  }

  // Helper methods
  private buildVariantWhereConditionsSQL(where?: VariantWhereInput): Prisma.Sql {
    if (!where) return Prisma.sql``;
    
    const conditions: string[] = [];
    
    if (where.search) {
      const searchTerm = where.search.replace(/'/g, "''");
      conditions.push(`(v.variant_id ILIKE '%${searchTerm}%' OR v.protein_change ILIKE '%${searchTerm}%' OR g.symbol ILIKE '%${searchTerm}%')`);
    }
    
    if (where.geneId) {
      conditions.push(`v.gene_id = '${where.geneId}'`);
    }
    
    if (where.chromosome) {
      conditions.push(`v.chromosome = '${where.chromosome}'`);
    }
    
    if (where.clinicalSignificance?.length) {
      const values = where.clinicalSignificance.map(s => `'${s.replace(/'/g, "''")}'`).join(',');
      conditions.push(`v.clinical_significance IN (${values})`);
    }

    if (where.impact?.length) {
      const values = where.impact.map(i => `'${i.replace(/'/g, "''")}'`).join(',');
      conditions.push(`v.impact IN (${values})`);
    }

    if (where.minFrequency !== undefined) {
      conditions.push(`v.frequency >= ${where.minFrequency}`);
    }

    if (where.maxFrequency !== undefined) {
      conditions.push(`v.frequency <= ${where.maxFrequency}`);
    }

    return conditions.length > 0 
      ? Prisma.sql`WHERE ${Prisma.raw(conditions.join(' AND '))}`
      : Prisma.sql``;
  }

  private buildVariantOrderBySQL(sortBy: string, sortOrder: 'asc' | 'desc' = 'asc'): Prisma.Sql {
    const validColumns = ['position', 'variant_id', 'clinical_significance', 'frequency', 'created_at'];
    const column = validColumns.includes(sortBy) ? sortBy : 'position';
    return Prisma.sql`ORDER BY ${Prisma.raw(`v.${column}`)} ${Prisma.raw(sortOrder.toUpperCase())}`;
  }

  private buildAdditionalFiltersSQL(filters?: Omit<VariantWhereInput, 'chromosome'>): Prisma.Sql {
    if (!filters) return Prisma.sql``;
    
    const conditions: string[] = [];
    
    if (filters.clinicalSignificance?.length) {
      const values = filters.clinicalSignificance.map(s => `'${s.replace(/'/g, "''")}'`).join(',');
      conditions.push(`v.clinical_significance IN (${values})`);
    }
    
    if (filters.impact?.length) {
      const values = filters.impact.map(i => `'${i.replace(/'/g, "''")}'`).join(',');
      conditions.push(`v.impact IN (${values})`);
    }

    return conditions.length > 0 
      ? Prisma.sql`AND ${Prisma.raw(conditions.join(' AND '))}`
      : Prisma.sql``;
  }

  // Bulk operations ottimizzate
  override async bulkCreate(variants: VariantCreateInput[], requestId?: string): Promise<number> {
    return this.executeWithErrorHandling(
      async () => {
        const batchSize = 500; // Optimal batch size per PostgreSQL
        let totalCreated = 0;

        // Processa in batches per evitare timeout
        for (let i = 0; i < variants.length; i += batchSize) {
          const batch = variants.slice(i, i + batchSize);
          
          const result = await this.prisma.variant.createMany({
            data: batch,
            skipDuplicates: true,
          });
          
          totalCreated += result.count;
        }

        return totalCreated;
      },
      'bulk create variants (optimized)',
      { count: variants.length },
      requestId
    );
  }
}