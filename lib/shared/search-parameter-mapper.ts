// lib/shared/search-parameter-mapper.ts
// Centralized search parameter mapping utilities

import { PaginationParams } from '@/lib/repositories/base-repository';

export interface SearchParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GeneSearchParams extends SearchParams {
  chromosome?: string;
  biotype?: string;
  hasVariants?: boolean;
}

export interface VariantSearchParams extends SearchParams {
  geneId?: string;
  chromosome?: string;
  clinicalSignificance?: string[];
  impact?: string[];
  variantType?: string[];
  minFrequency?: number;
  maxFrequency?: number;
}

export class SearchParameterMapper {
  
  /**
   * Convert search parameters to pagination parameters
   */
  static toPaginationParams(params: SearchParams): PaginationParams {
    return {
      page: params.page || 1,
      limit: Math.min(params.limit || 20, 100), // Cap at 100
      sortBy: params.sortBy || 'id',
      sortOrder: params.sortOrder || 'asc'
    };
  }

  /**
   * Build text search conditions for multiple fields
   */
  static buildTextSearchConditions(
    searchText: string,
    fields: string[]
  ): any {
    if (!searchText || searchText.trim().length === 0) {
      return {};
    }

    const trimmedSearch = searchText.trim();
    
    return {
      OR: fields.map(field => ({
        [field]: {
          contains: trimmedSearch,
          mode: 'insensitive' as const
        }
      }))
    };
  }

  /**
   * Convert gene search parameters to where clause
   */
  static geneSearchToWhereClause(params: GeneSearchParams): any {
    const conditions: any = {};
    
    // Text search
    if (params.search) {
      Object.assign(conditions, this.buildTextSearchConditions(
        params.search,
        ['symbol', 'name', 'description']
      ));
    }
    
    // Chromosome filter
    if (params.chromosome) {
      conditions.chromosome = params.chromosome;
    }
    
    // Biotype filter
    if (params.biotype) {
      conditions.biotype = params.biotype;
    }
    
    // Has variants filter
    if (params.hasVariants !== undefined) {
      if (params.hasVariants) {
        conditions.variants = {
          some: {}
        };
      } else {
        conditions.variants = {
          none: {}
        };
      }
    }
    
    return conditions;
  }

  /**
   * Convert variant search parameters to where clause
   */
  static variantSearchToWhereClause(params: VariantSearchParams): any {
    const conditions: any = {};
    
    // Text search (search in variant ID, gene symbol)
    if (params.search) {
      conditions.OR = [
        { variantId: { contains: params.search, mode: 'insensitive' } },
        { gene: { symbol: { contains: params.search, mode: 'insensitive' } } },
        { gene: { name: { contains: params.search, mode: 'insensitive' } } }
      ];
    }
    
    // Gene ID filter
    if (params.geneId) {
      conditions.geneId = params.geneId;
    }
    
    // Chromosome filter
    if (params.chromosome) {
      conditions.chromosome = params.chromosome;
    }
    
    // Clinical significance filter
    if (params.clinicalSignificance && params.clinicalSignificance.length > 0) {
      conditions.clinicalSignificance = {
        in: params.clinicalSignificance
      };
    }
    
    // Impact filter
    if (params.impact && params.impact.length > 0) {
      conditions.impact = {
        in: params.impact
      };
    }
    
    // Variant type filter
    if (params.variantType && params.variantType.length > 0) {
      conditions.variantType = {
        in: params.variantType
      };
    }
    
    // Frequency range filter
    if (params.minFrequency !== undefined || params.maxFrequency !== undefined) {
      const frequencyConditions: any = {};
      
      if (params.minFrequency !== undefined) {
        frequencyConditions.gte = params.minFrequency;
      }
      
      if (params.maxFrequency !== undefined) {
        frequencyConditions.lte = params.maxFrequency;
      }
      
      conditions.frequency = frequencyConditions;
    }
    
    return conditions;
  }

  /**
   * Convert sort parameters to Prisma orderBy
   */
  static buildSortConditions(
    sortBy: string,
    sortOrder: 'asc' | 'desc' = 'asc',
    entityType: 'gene' | 'variant' = 'gene'
  ): any {
    const order = sortOrder === 'desc' ? 'desc' : 'asc';
    
    // Handle nested sorts (e.g., 'gene.symbol' for variants)
    if (sortBy.includes('.')) {
      const [relation, field] = sortBy.split('.');
      return {
        [relation]: {
          [field]: order
        }
      };
    }
    
    // Handle computed fields
    if (entityType === 'gene' && sortBy === 'variantCount') {
      return {
        variants: {
          _count: order
        }
      };
    }
    
    // Default field sort
    return {
      [sortBy]: order
    };
  }

  /**
   * Parse and validate search parameters from request
   */
  static parseSearchParams(searchParams: URLSearchParams): SearchParams {
    const parsed: SearchParams = {};
    
    // Text search
    const search = searchParams.get('search');
    if (search && search.trim().length > 0) {
      parsed.search = search.trim();
    }
    
    // Pagination
    const page = searchParams.get('page');
    if (page) {
      const pageNum = parseInt(page, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        parsed.page = pageNum;
      }
    }
    
    const limit = searchParams.get('limit');
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0 && limitNum <= 100) {
        parsed.limit = limitNum;
      }
    }
    
    // Sorting
    const sortBy = searchParams.get('sortBy');
    if (sortBy && sortBy.trim().length > 0) {
      parsed.sortBy = sortBy.trim();
    }
    
    const sortOrder = searchParams.get('sortOrder');
    if (sortOrder === 'asc' || sortOrder === 'desc') {
      parsed.sortOrder = sortOrder;
    }
    
    return parsed;
  }

  /**
   * Parse gene-specific search parameters
   */
  static parseGeneSearchParams(searchParams: URLSearchParams): GeneSearchParams {
    const base = this.parseSearchParams(searchParams);
    const geneParams: GeneSearchParams = { ...base };
    
    const chromosome = searchParams.get('chromosome');
    if (chromosome && chromosome.trim().length > 0) {
      geneParams.chromosome = chromosome.trim();
    }
    
    const biotype = searchParams.get('biotype');
    if (biotype && biotype.trim().length > 0) {
      geneParams.biotype = biotype.trim();
    }
    
    const hasVariants = searchParams.get('hasVariants');
    if (hasVariants === 'true' || hasVariants === 'false') {
      geneParams.hasVariants = hasVariants === 'true';
    }
    
    return geneParams;
  }

  /**
   * Parse variant-specific search parameters
   */
  static parseVariantSearchParams(searchParams: URLSearchParams): VariantSearchParams {
    const base = this.parseSearchParams(searchParams);
    const variantParams: VariantSearchParams = { ...base };
    
    const geneId = searchParams.get('geneId');
    if (geneId && geneId.trim().length > 0) {
      variantParams.geneId = geneId.trim();
    }
    
    const chromosome = searchParams.get('chromosome');
    if (chromosome && chromosome.trim().length > 0) {
      variantParams.chromosome = chromosome.trim();
    }
    
    // Array parameters
    const clinicalSignificance = searchParams.getAll('clinicalSignificance');
    if (clinicalSignificance.length > 0) {
      variantParams.clinicalSignificance = clinicalSignificance;
    }
    
    const impact = searchParams.getAll('impact');
    if (impact.length > 0) {
      variantParams.impact = impact;
    }
    
    const variantType = searchParams.getAll('variantType');
    if (variantType.length > 0) {
      variantParams.variantType = variantType;
    }
    
    // Frequency range
    const minFrequency = searchParams.get('minFrequency');
    if (minFrequency) {
      const freq = parseFloat(minFrequency);
      if (!isNaN(freq) && freq >= 0 && freq <= 1) {
        variantParams.minFrequency = freq;
      }
    }
    
    const maxFrequency = searchParams.get('maxFrequency');
    if (maxFrequency) {
      const freq = parseFloat(maxFrequency);
      if (!isNaN(freq) && freq >= 0 && freq <= 1) {
        variantParams.maxFrequency = freq;
      }
    }
    
    return variantParams;
  }
}