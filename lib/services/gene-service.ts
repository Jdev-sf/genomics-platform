// lib/services/gene-service.ts
import { Gene } from '@prisma/client';
import { BaseService } from './base-service';
import { GeneRepository, GeneCreateInput, GeneUpdateInput, GeneWhereInput, GeneWithStats } from '@/lib/repositories/gene-repository';
import { PaginationParams, PaginationResult } from '@/lib/repositories/base-repository';
import { NotFoundError } from '@/lib/errors';

export interface GeneSearchParams {
  search?: string;
  chromosome?: string;
  biotype?: string;
  hasVariants?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GeneDetailResult {
  gene: any;
  stats: any;
  meta: {
    variants_shown: number;
    total_variants: number;
    has_more_variants: boolean;
  };
}

export class GeneService extends BaseService {
  private geneRepository: GeneRepository;

  constructor(geneRepository?: GeneRepository) {
    super('Gene');
    this.geneRepository = geneRepository || new GeneRepository();
  }

  async createGene(data: GeneCreateInput, requestId?: string): Promise<Gene> {
    return this.executeWithErrorHandling(
      () => this.geneRepository.create(data, requestId),
      'create gene',
      { symbol: data.symbol, geneId: data.geneId },
      requestId
    );
  }

  async getGeneById(id: string, requestId?: string): Promise<Gene> {
    const gene = await this.executeWithErrorHandling(
      () => this.geneRepository.findById(id, requestId),
      'get gene by ID',
      { id },
      requestId
    );

    if (!gene) {
      throw new NotFoundError('Gene', id, undefined, requestId);
    }

    return gene;
  }

  async getGeneBySymbol(symbol: string, requestId?: string): Promise<Gene | null> {
    return this.executeWithErrorHandling(
      () => this.geneRepository.findBySymbol(symbol, requestId),
      'get gene by symbol',
      { symbol },
      requestId
    );
  }

  async getGeneWithDetails(id: string, requestId?: string): Promise<GeneDetailResult> {
    return this.executeWithErrorHandling(
      async () => {
        // Try by ID first, then by symbol if not found
        let geneWithVariants = await this.geneRepository.findWithVariants(id, requestId);
        
        if (!geneWithVariants) {
          // Try finding by symbol
          const geneBySymbol = await this.geneRepository.findBySymbol(id, requestId);
          if (geneBySymbol) {
            geneWithVariants = await this.geneRepository.findWithVariants(geneBySymbol.id, requestId);
          }
        }

        if (!geneWithVariants) {
          throw new NotFoundError('Gene', id, undefined, requestId);
        }

        // Get variant statistics
        const stats = await this.geneRepository.getVariantStats(geneWithVariants.id, requestId);

        return {
          gene: geneWithVariants,
          stats,
          meta: {
            variants_shown: geneWithVariants.variants?.length || 0,
            total_variants: geneWithVariants._count?.variants || 0,
            has_more_variants: (geneWithVariants.variants?.length || 0) < (geneWithVariants._count?.variants || 0)
          }
        };
      },
      'get gene with details',
      { id },
      requestId
    );
  }

  async searchGenes(params: GeneSearchParams, requestId?: string): Promise<PaginationResult<GeneWithStats>> {
    const pagination: PaginationParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      sortBy: params.sortBy || 'symbol',
      sortOrder: params.sortOrder || 'asc'
    };

    const where: GeneWhereInput = {
      search: params.search,
      chromosome: params.chromosome,
      biotype: params.biotype,
      hasVariants: params.hasVariants
    };

    return this.executeWithErrorHandling(
      () => this.geneRepository.findManyWithStats(where, pagination, requestId),
      'search genes',
      { params },
      requestId
    );
  }

  async updateGene(id: string, data: GeneUpdateInput, requestId?: string): Promise<Gene> {
    // Check if gene exists
    await this.getGeneById(id, requestId);

    return this.executeWithErrorHandling(
      () => this.geneRepository.update(id, data, requestId),
      'update gene',
      { id, ...data },
      requestId
    );
  }

  async deleteGene(id: string, requestId?: string): Promise<void> {
    // Check if gene exists
    await this.getGeneById(id, requestId);

    return this.executeWithErrorHandling(
      () => this.geneRepository.delete(id, requestId),
      'delete gene',
      { id },
      requestId
    );
  }

  async quickSearch(searchText: string, limit: number = 10, requestId?: string): Promise<Gene[]> {
    return this.executeWithErrorHandling(
      () => this.geneRepository.searchByText(searchText, limit, requestId),
      'quick search genes',
      { searchText, limit },
      requestId
    );
  }

  async getGenesByChromosome(chromosome: string, requestId?: string): Promise<Gene[]> {
    const result = await this.executeWithErrorHandling(
      () => this.geneRepository.findMany({ chromosome }, { page: 1, limit: 1000 }, requestId),
      'get genes by chromosome',
      { chromosome },
      requestId
    );

    return result.data;
  }

  async bulkCreateGenes(genes: GeneCreateInput[], requestId?: string): Promise<{ created: number; errors: Array<{ gene: GeneCreateInput; error: string }> }> {
    return this.executeWithErrorHandling(
      async () => {
        const results = {
          created: 0,
          errors: [] as Array<{ gene: GeneCreateInput; error: string }>
        };

        for (const geneData of genes) {
          try {
            await this.geneRepository.create(geneData, requestId);
            results.created++;
          } catch (error) {
            results.errors.push({
              gene: geneData,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }

        return results;
      },
      'bulk create genes',
      { count: genes.length },
      requestId
    );
  }

  async validateGeneData(data: GeneCreateInput): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (!data.symbol || data.symbol.trim().length === 0) {
      errors.push('Gene symbol is required');
    }

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Gene name is required');
    }

    if (!data.chromosome || data.chromosome.trim().length === 0) {
      errors.push('Chromosome is required');
    }

    // Chromosome validation
    const validChromosomes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 
                             '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', 'X', 'Y', 'MT'];
    if (data.chromosome && !validChromosomes.includes(data.chromosome.toUpperCase())) {
      errors.push('Invalid chromosome');
    }

    // Position validation
    if (data.startPosition && data.endPosition && data.startPosition >= data.endPosition) {
      errors.push('Start position must be less than end position');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}