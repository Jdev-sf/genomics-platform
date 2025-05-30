// lib/services/variant-service.ts
import { Variant } from '@prisma/client';
import { BaseService } from './base-service';
import { VariantRepository, VariantCreateInput, VariantUpdateInput, VariantWhereInput, VariantWithGene } from '@/lib/repositories/variant-repository';
import { PaginationParams, PaginationResult } from '@/lib/repositories/base-repository';
import { NotFoundError } from '@/lib/errors';

export interface VariantSearchParams {
  search?: string;
  geneId?: string;
  chromosome?: string;
  clinicalSignificance?: string[];
  impact?: string[];
  variantType?: string[];
  minFrequency?: number;
  maxFrequency?: number;
  consequence?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface VariantDetailResult {
  variant: any;
  relatedVariants: any[];
}

export class VariantService extends BaseService {
  private variantRepository: VariantRepository;

  constructor(variantRepository?: VariantRepository) {
    super('Variant');
    this.variantRepository = variantRepository || new VariantRepository();
  }

  async createVariant(data: VariantCreateInput, requestId?: string): Promise<Variant> {
    return this.executeWithErrorHandling(
      () => this.variantRepository.create(data, requestId),
      'create variant',
      { variantId: data.variantId, geneId: data.geneId },
      requestId
    );
  }

  async getVariantById(id: string, requestId?: string): Promise<Variant> {
    const variant = await this.executeWithErrorHandling(
      () => this.variantRepository.findById(id, requestId),
      'get variant by ID',
      { id },
      requestId
    );

    if (!variant) {
      throw new NotFoundError('Variant', id, undefined, requestId);
    }

    return variant;
  }

  async getVariantByVariantId(variantId: string, requestId?: string): Promise<Variant | null> {
    return this.executeWithErrorHandling(
      () => this.variantRepository.findByVariantId(variantId, requestId),
      'get variant by variant ID',
      { variantId },
      requestId
    );
  }

  async getVariantWithDetails(id: string, requestId?: string): Promise<VariantDetailResult> {
    return this.executeWithErrorHandling(
      async () => {
        // Try by ID first, then by variantId if not found
        let variantWithDetails = await this.variantRepository.findWithDetails(id, requestId);
        
        if (!variantWithDetails) {
          // Try finding by variantId
          const variantByVariantId = await this.variantRepository.findByVariantId(id, requestId);
          if (variantByVariantId) {
            variantWithDetails = await this.variantRepository.findWithDetails(variantByVariantId.id, requestId);
          }
        }

        if (!variantWithDetails) {
          throw new NotFoundError('Variant', id, undefined, requestId);
        }

        // Get related variants
        const relatedVariants = await this.variantRepository.findRelatedVariants(
          variantWithDetails.id,
          variantWithDetails.geneId,
          requestId
        );

        return {
          variant: variantWithDetails,
          relatedVariants
        };
      },
      'get variant with details',
      { id },
      requestId
    );
  }

  async searchVariants(params: VariantSearchParams, requestId?: string): Promise<PaginationResult<VariantWithGene>> {
    const pagination: PaginationParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      sortBy: params.sortBy || 'position',
      sortOrder: params.sortOrder || 'asc'
    };

    const where: VariantWhereInput = {
      search: params.search,
      geneId: params.geneId,
      chromosome: params.chromosome,
      clinicalSignificance: params.clinicalSignificance,
      impact: params.impact,
      variantType: params.variantType,
      minFrequency: params.minFrequency,
      maxFrequency: params.maxFrequency,
      consequence: params.consequence
    };

    return this.executeWithErrorHandling(
      () => this.variantRepository.findManyWithGene(where, pagination, requestId),
      'search variants',
      { params },
      requestId
    );
  }

  async updateVariant(id: string, data: VariantUpdateInput, requestId?: string): Promise<Variant> {
    // Check if variant exists
    await this.getVariantById(id, requestId);

    return this.executeWithErrorHandling(
      () => this.variantRepository.update(id, data, requestId),
      'update variant',
      { id, ...data },
      requestId
    );
  }

  async deleteVariant(id: string, requestId?: string): Promise<void> {
    // Check if variant exists
    await this.getVariantById(id, requestId);

    return this.executeWithErrorHandling(
      () => this.variantRepository.delete(id, requestId),
      'delete variant',
      { id },
      requestId
    );
  }

  async quickSearch(searchText: string, limit: number = 10, requestId?: string): Promise<Variant[]> {
    return this.executeWithErrorHandling(
      () => this.variantRepository.searchByText(searchText, limit, requestId),
      'quick search variants',
      { searchText, limit },
      requestId
    );
  }

  async getVariantsByGene(geneId: string, requestId?: string): Promise<Variant[]> {
    const result = await this.executeWithErrorHandling(
      () => this.variantRepository.findMany({ geneId }, { page: 1, limit: 1000 }, requestId),
      'get variants by gene',
      { geneId },
      requestId
    );

    return result.data;
  }

  async getVariantsByGenomicPosition(
    chromosome: string,
    position: bigint,
    requestId?: string
  ): Promise<Variant[]> {
    return this.executeWithErrorHandling(
      () => this.variantRepository.findByGenomicPosition(chromosome, position, requestId),
      'get variants by genomic position',
      { chromosome, position: position.toString() },
      requestId
    );
  }

  async getVariantStatsByGene(geneId: string, requestId?: string): Promise<Record<string, number>> {
    return this.executeWithErrorHandling(
      () => this.variantRepository.getStatsByGene(geneId, requestId),
      'get variant stats by gene',
      { geneId },
      requestId
    );
  }

  async bulkCreateVariants(variants: VariantCreateInput[], requestId?: string): Promise<number> {
    return this.executeWithErrorHandling(
      () => this.variantRepository.bulkCreate(variants, requestId),
      'bulk create variants',
      { count: variants.length },
      requestId
    );
  }

  async validateVariantData(data: VariantCreateInput): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (!data.variantId || data.variantId.trim().length === 0) {
      errors.push('Variant ID is required');
    }

    if (!data.geneId || data.geneId.trim().length === 0) {
      errors.push('Gene ID is required');
    }

    if (!data.chromosome || data.chromosome.trim().length === 0) {
      errors.push('Chromosome is required');
    }

    if (!data.referenceAllele || data.referenceAllele.trim().length === 0) {
      errors.push('Reference allele is required');
    }

    if (!data.alternateAllele || data.alternateAllele.trim().length === 0) {
      errors.push('Alternate allele is required');
    }

    // Chromosome validation
    const validChromosomes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 
                             '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', 'X', 'Y', 'MT'];
    if (data.chromosome && !validChromosomes.includes(data.chromosome.toUpperCase())) {
      errors.push('Invalid chromosome');
    }

    // Position validation
    if (data.position <= 0) {
      errors.push('Position must be a positive number');
    }

    // Allele validation (basic DNA sequence check)
    const validBases = /^[ATCGN\-]+$/i;
    if (data.referenceAllele && !validBases.test(data.referenceAllele)) {
      errors.push('Reference allele contains invalid characters');
    }

    if (data.alternateAllele && !validBases.test(data.alternateAllele)) {
      errors.push('Alternate allele contains invalid characters');
    }

    // Frequency validation
    if (data.frequency !== undefined && (data.frequency < 0 || data.frequency > 1)) {
      errors.push('Frequency must be between 0 and 1');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async getClinicalSignificanceDistribution(requestId?: string): Promise<Record<string, number>> {
    return this.executeWithErrorHandling(
      async () => {
        // This would need a custom repository method for aggregation
        const result = await this.variantRepository.findMany(
          {},
          { page: 1, limit: 1 }, // We just need the aggregation
          requestId
        );
        
        // For now, return empty - this would be implemented with a proper aggregation query
        return {};
      },
      'get clinical significance distribution',
      {},
      requestId
    );
  }

  async getVariantsByImpact(impact: string, requestId?: string): Promise<Variant[]> {
    const result = await this.executeWithErrorHandling(
      () => this.variantRepository.findMany({ impact: [impact] }, { page: 1, limit: 1000 }, requestId),
      'get variants by impact',
      { impact },
      requestId
    );

    return result.data;
  }
}