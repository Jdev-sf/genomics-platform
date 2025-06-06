// lib/services/gene-service.ts
import { Gene } from '@prisma/client';
import { BaseService } from './base-service';
import { GeneRepository, GeneCreateInput, GeneUpdateInput, GeneWhereInput, GeneWithStats } from '@/lib/repositories/gene-repository';
import { PaginationParams, PaginationResult } from '@/lib/repositories/base-repository';
import { NotFoundError } from '@/lib/errors';
import { GenomicsValidation } from '@/lib/shared/genomics-validation';
import { SearchParameterMapper, GeneSearchParams } from '@/lib/shared/search-parameter-mapper';
import { BulkOperationProcessor, BulkOperationResult } from '@/lib/shared/bulk-operations';

// Interface moved to shared module

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
    const pagination = SearchParameterMapper.toPaginationParams(params);
    pagination.sortBy = params.sortBy || 'symbol';
    
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

  async bulkCreateGenes(genes: GeneCreateInput[], requestId?: string): Promise<BulkOperationResult<GeneCreateInput>> {
    return this.executeWithErrorHandling(
      async () => {
        return BulkOperationProcessor.processBulkOperation(
          genes,
          async (geneData: GeneCreateInput, index: number) => {
            // Validate gene data
            const validation = GenomicsValidation.validateGeneData({
              symbol: geneData.symbol,
              name: geneData.name,
              chromosome: geneData.chromosome,
              startPosition: geneData.startPosition,
              endPosition: geneData.endPosition
            });
            
            if (!validation.valid) {
              throw new Error(validation.errors.join(', '));
            }
            
            return this.geneRepository.create(geneData, requestId);
          },
          {
            batchSize: 50,
            continueOnError: true,
            maxConcurrency: 3
          }
        );
      },
      'bulk create genes',
      { count: genes.length },
      requestId
    );
  }

  async validateGeneData(data: GeneCreateInput): Promise<{ valid: boolean; errors: string[] }> {
    return GenomicsValidation.validateGeneData({
      symbol: data.symbol,
      name: data.name,
      chromosome: data.chromosome,
      startPosition: data.startPosition,
      endPosition: data.endPosition
    });
  }
}