// lib/shared/genomics-validation.ts
// Centralized validation utilities for genomics data

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface GenomicPosition {
  start: number | bigint;
  end?: number | bigint;
}

// Standardized chromosome list
export const VALID_CHROMOSOMES = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', 'X', 'Y', 'MT'
] as const;

export type ValidChromosome = typeof VALID_CHROMOSOMES[number];

// Genomics validation utilities
export class GenomicsValidation {
  
  static validateChromosome(chromosome: string): ValidationResult {
    const errors: string[] = [];
    
    if (!chromosome || chromosome.trim().length === 0) {
      errors.push('Chromosome is required');
      return { valid: false, errors };
    }
    
    const normalized = chromosome.replace(/^chr/i, '').toUpperCase();
    if (!VALID_CHROMOSOMES.includes(normalized as ValidChromosome)) {
      errors.push(`Invalid chromosome: ${chromosome}. Valid values: ${VALID_CHROMOSOMES.join(', ')}`);
    }
    
    return { valid: errors.length === 0, errors };
  }

  static normalizeChromosome(chromosome: string): string {
    return chromosome.replace(/^chr/i, '').toUpperCase();
  }

  static validateGenomicPosition(position: GenomicPosition): ValidationResult {
    const errors: string[] = [];
    
    const start = typeof position.start === 'bigint' ? Number(position.start) : position.start;
    const end = position.end ? (typeof position.end === 'bigint' ? Number(position.end) : position.end) : undefined;
    
    if (start <= 0) {
      errors.push('Start position must be greater than 0');
    }
    
    if (start > 300000000) {
      errors.push('Start position exceeds maximum chromosome length');
    }
    
    if (end !== undefined) {
      if (end <= 0) {
        errors.push('End position must be greater than 0');
      }
      
      if (end > 300000000) {
        errors.push('End position exceeds maximum chromosome length');
      }
      
      if (start >= end) {
        errors.push('Start position must be less than end position');
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  static validateRequiredFields<T extends Record<string, any>>(
    data: T,
    requiredFields: (keyof T)[]
  ): ValidationResult {
    const errors: string[] = [];
    
    for (const field of requiredFields) {
      const value = data[field];
      if (value === undefined || value === null || value === '') {
        errors.push(`${String(field)} is required`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  static validateGeneSymbol(symbol: string): ValidationResult {
    const errors: string[] = [];
    
    if (!symbol || symbol.trim().length === 0) {
      errors.push('Gene symbol is required');
      return { valid: false, errors };
    }
    
    if (symbol.length > 20) {
      errors.push('Gene symbol must be 20 characters or less');
    }
    
    if (!/^[A-Z0-9-_.]+$/i.test(symbol)) {
      errors.push('Gene symbol contains invalid characters');
    }
    
    return { valid: errors.length === 0, errors };
  }

  static validateNucleotideSequence(sequence: string): ValidationResult {
    const errors: string[] = [];
    
    if (!sequence || sequence.trim().length === 0) {
      errors.push('Nucleotide sequence is required');
      return { valid: false, errors };
    }
    
    if (sequence.length > 1000) {
      errors.push('Nucleotide sequence is too long (max 1000 characters)');
    }
    
    if (!/^[ATCGN-]+$/i.test(sequence)) {
      errors.push('Invalid nucleotide sequence. Only A, T, C, G, N, and - are allowed');
    }
    
    return { valid: errors.length === 0, errors };
  }

  static validateAlleleFrequency(frequency: number): ValidationResult {
    const errors: string[] = [];
    
    if (frequency < 0 || frequency > 1) {
      errors.push('Allele frequency must be between 0 and 1');
    }
    
    return { valid: errors.length === 0, errors };
  }

  static validateVariantId(variantId: string): ValidationResult {
    const errors: string[] = [];
    
    if (!variantId || variantId.trim().length === 0) {
      errors.push('Variant ID is required');
      return { valid: false, errors };
    }
    
    if (variantId.length > 50) {
      errors.push('Variant ID must be 50 characters or less');
    }
    
    if (!/^[A-Z0-9_.-]+$/i.test(variantId)) {
      errors.push('Variant ID contains invalid characters');
    }
    
    return { valid: errors.length === 0, errors };
  }

  // Combined validation for gene data
  static validateGeneData(data: {
    symbol: string;
    name: string;
    chromosome: string;
    startPosition?: number | bigint;
    endPosition?: number | bigint;
  }): ValidationResult {
    const allErrors: string[] = [];
    
    // Required fields
    const requiredResult = this.validateRequiredFields(data, ['symbol', 'name', 'chromosome']);
    allErrors.push(...requiredResult.errors);
    
    // Gene symbol
    if (data.symbol) {
      const symbolResult = this.validateGeneSymbol(data.symbol);
      allErrors.push(...symbolResult.errors);
    }
    
    // Chromosome
    if (data.chromosome) {
      const chromResult = this.validateChromosome(data.chromosome);
      allErrors.push(...chromResult.errors);
    }
    
    // Positions
    if (data.startPosition || data.endPosition) {
      const posResult = this.validateGenomicPosition({
        start: data.startPosition || 1,
        end: data.endPosition
      });
      allErrors.push(...posResult.errors);
    }
    
    return { valid: allErrors.length === 0, errors: allErrors };
  }

  // Combined validation for variant data
  static validateVariantData(data: {
    variantId: string;
    chromosome: string;
    position: number | bigint;
    referenceAllele: string;
    alternateAllele: string;
    frequency?: number;
  }): ValidationResult {
    const allErrors: string[] = [];
    
    // Required fields
    const requiredResult = this.validateRequiredFields(data, [
      'variantId', 'chromosome', 'position', 'referenceAllele', 'alternateAllele'
    ]);
    allErrors.push(...requiredResult.errors);
    
    // Variant ID
    if (data.variantId) {
      const variantIdResult = this.validateVariantId(data.variantId);
      allErrors.push(...variantIdResult.errors);
    }
    
    // Chromosome
    if (data.chromosome) {
      const chromResult = this.validateChromosome(data.chromosome);
      allErrors.push(...chromResult.errors);
    }
    
    // Position
    if (data.position) {
      const posResult = this.validateGenomicPosition({ start: data.position });
      allErrors.push(...posResult.errors);
    }
    
    // Alleles
    if (data.referenceAllele) {
      const refResult = this.validateNucleotideSequence(data.referenceAllele);
      allErrors.push(...refResult.errors.map(e => `Reference allele: ${e}`));
    }
    
    if (data.alternateAllele) {
      const altResult = this.validateNucleotideSequence(data.alternateAllele);
      allErrors.push(...altResult.errors.map(e => `Alternate allele: ${e}`));
    }
    
    // Frequency
    if (data.frequency !== undefined) {
      const freqResult = this.validateAlleleFrequency(data.frequency);
      allErrors.push(...freqResult.errors);
    }
    
    return { valid: allErrors.length === 0, errors: allErrors };
  }
}