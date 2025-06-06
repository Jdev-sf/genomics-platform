// lib/vcf-utils.ts
// Utility functions for VCF validation and processing

import { z } from 'zod';
import { CLINICAL_SIGNIFICANCE, VARIANT_IMPACT } from '@/types/genomics';
import { GenomicsValidation } from '@/lib/shared/genomics-validation';

// VCF validation schemas
export const vcfHeaderLineSchema = z.string().regex(/^##/, 'Header line must start with ##');

export const vcfDataLineSchema = z.string().refine(
  (line) => {
    const fields = line.split('\t');
    return fields.length >= 8; // Minimum required fields
  },
  'VCF data line must have at least 8 tab-separated fields'
);

export const vcfFileSchema = z.object({
  fileformat: z.string().regex(/^VCFv4\.[0-9]+$/, 'Must be VCF version 4.x'),
  headerLines: z.array(vcfHeaderLineSchema),
  columnHeader: z.string().startsWith('#CHROM'),
  dataLines: z.array(vcfDataLineSchema),
});

// Re-export from shared validation
export const VALID_CHROMOSOMES = GenomicsValidation.VALID_CHROMOSOMES;
export const VALID_NUCLEOTIDES = ['A', 'T', 'G', 'C', 'N'];

export const STANDARD_VCF_INFO_FIELDS = {
  // Standard fields from VCF specification
  'AA': { type: 'String', description: 'Ancestral allele' },
  'AC': { type: 'Integer', description: 'Allele count in genotypes' },
  'AD': { type: 'Integer', description: 'Total read depth for each allele' },
  'ADF': { type: 'Integer', description: 'Read depth for each allele on the forward strand' },
  'ADR': { type: 'Integer', description: 'Read depth for each allele on the reverse strand' },
  'AF': { type: 'Float', description: 'Allele frequency for each ALT allele' },
  'AN': { type: 'Integer', description: 'Total number of alleles in called genotypes' },
  'BQ': { type: 'Float', description: 'RMS base quality' },
  'CIGAR': { type: 'String', description: 'Extended CIGAR string for complex variants' },
  'DB': { type: 'Flag', description: 'dbSNP membership' },
  'DP': { type: 'Integer', description: 'Combined depth across samples' },
  'END': { type: 'Integer', description: 'End position of the variant' },
  'H2': { type: 'Flag', description: 'HapMap2 membership' },
  'H3': { type: 'Flag', description: 'HapMap3 membership' },
  'MQ': { type: 'Float', description: 'RMS mapping quality' },
  'MQ0': { type: 'Integer', description: 'Number of MAPQ == 0 reads' },
  'NS': { type: 'Integer', description: 'Number of samples with data' },
  'SB': { type: 'Float', description: 'Strand bias' },
  'SOMATIC': { type: 'Flag', description: 'Somatic mutation' },
  'VALIDATED': { type: 'Flag', description: 'Validated by follow-up experiment' },
  '1000G': { type: 'Flag', description: '1000 Genomes membership' },
  
  // Clinical annotation fields
  'CLNSIG': { type: 'String', description: 'Clinical significance' },
  'CLNDN': { type: 'String', description: 'ClinVar disease name' },
  'CLNHGVS': { type: 'String', description: 'Top-level HGVS expression' },
  'CLNVC': { type: 'String', description: 'Variant type' },
  'CLNVI': { type: 'String', description: 'Clinical sources reporting variant' },
  
  // Functional annotation fields
  'CSQ': { type: 'String', description: 'Consequence annotations from Ensembl VEP' },
  'ANN': { type: 'String', description: 'Functional annotations from SnpEff' },
  'EFF': { type: 'String', description: 'Effect annotations from SnpEff' },
  
  // Quality scores
  'CADD_PHRED': { type: 'Float', description: 'CADD PHRED score' },
  'SIFT_SCORE': { type: 'Float', description: 'SIFT score' },
  'POLYPHEN_SCORE': { type: 'Float', description: 'PolyPhen-2 score' },
  
  // Population frequencies
  'GNOMAD_AF': { type: 'Float', description: 'gnomAD allele frequency' },
  'ESP_AF': { type: 'Float', description: 'ESP allele frequency' },
  'EXAC_AF': { type: 'Float', description: 'ExAC allele frequency' },
};

export const STANDARD_VCF_FORMAT_FIELDS = {
  'GT': { type: 'String', description: 'Genotype' },
  'DP': { type: 'Integer', description: 'Read depth' },
  'AD': { type: 'Integer', description: 'Allelic depths' },
  'GQ': { type: 'Integer', description: 'Genotype quality' },
  'PL': { type: 'Integer', description: 'Phred-scaled genotype likelihoods' },
  'GL': { type: 'Float', description: 'Genotype likelihoods' },
  'GP': { type: 'Float', description: 'Genotype posterior probabilities' },
  'FT': { type: 'String', description: 'Sample genotype filter' },
  'PS': { type: 'Integer', description: 'Phase set' },
  'PID': { type: 'String', description: 'Physical phasing ID' },
  'SB': { type: 'Integer', description: 'Per-sample component statistics' },
};

// Utility functions
export function validateChromosome(chr: string): boolean {
  return GenomicsValidation.validateChromosome(chr).valid;
}

export function normalizeChromosome(chr: string): string {
  return GenomicsValidation.normalizeChromosome(chr);
}

export function validateNucleotideSequence(seq: string): boolean {
  return seq.toUpperCase().split('').every(nt => VALID_NUCLEOTIDES.includes(nt));
}

export function validateVCFPosition(pos: number): boolean {
  return Number.isInteger(pos) && pos > 0 && pos <= 300000000; // Max chromosome length
}

export function parseGenotypeString(gt: string): {
  alleles: number[];
  phased: boolean;
  missing: boolean;
} {
  if (gt === '.' || gt === './.') {
    return { alleles: [], phased: false, missing: true };
  }
  
  const phased = gt.includes('|');
  const separator = phased ? '|' : '/';
  const alleles = gt.split(separator).map(a => a === '.' ? -1 : parseInt(a));
  
  return {
    alleles,
    phased,
    missing: alleles.includes(-1),
  };
}

export function formatGenotype(alleles: number[], phased: boolean = false): string {
  const separator = phased ? '|' : '/';
  return alleles.map(a => a === -1 ? '.' : a.toString()).join(separator);
}

export function calculateAlleleFrequency(
  alleleCounts: number[],
  totalAlleleNumber: number
): number[] {
  return alleleCounts.map(count => totalAlleleNumber > 0 ? count / totalAlleleNumber : 0);
}

export function isTransition(ref: string, alt: string): boolean {
  if (ref.length !== 1 || alt.length !== 1) return false;
  
  const transitions = new Set([
    'A>G', 'G>A', 'C>T', 'T>C'
  ]);
  
  return transitions.has(`${ref}>${alt}`);
}

export function isTransversion(ref: string, alt: string): boolean {
  if (ref.length !== 1 || alt.length !== 1) return false;
  return !isTransition(ref, alt);
}

export function getVariantLength(ref: string, alt: string): number {
  return Math.abs(alt.length - ref.length);
}

export function classifyVariantBySeverity(clinicalSignificance?: string): 'high' | 'medium' | 'low' | 'unknown' {
  if (!clinicalSignificance) return 'unknown';
  
  const normalized = clinicalSignificance.toLowerCase();
  
  if (normalized.includes('pathogenic') && !normalized.includes('likely')) {
    return 'high';
  }
  if (normalized.includes('likely_pathogenic') || normalized.includes('likely pathogenic')) {
    return 'high';
  }
  if (normalized.includes('uncertain') || normalized.includes('vus')) {
    return 'medium';
  }
  if (normalized.includes('likely_benign') || normalized.includes('likely benign')) {
    return 'low';
  }
  if (normalized.includes('benign') && !normalized.includes('likely')) {
    return 'low';
  }
  
  return 'unknown';
}

// VCF template generator
export function generateVCFTemplate(options: {
  reference?: string;
  samples?: string[];
  includeStandardFields?: boolean;
}): string {
  const { reference = 'GRCh38', samples = ['SAMPLE001'], includeStandardFields = true } = options;
  
  let vcf = '##fileformat=VCFv4.3\n';
  vcf += `##fileDate=${new Date().toISOString().split('T')[0].replace(/-/g, '')}\n`;
  vcf += '##source=GenomicsPlatform\n';
  vcf += `##reference=${reference}\n`;
  
  // Add contigs for human chromosomes
  VALID_CHROMOSOMES.slice(0, -1).forEach(chr => { // Exclude 'M' to avoid duplicates
    if (chr !== 'MT') {
      vcf += `##contig=<ID=${chr}>\n`;
    }
  });
  vcf += '##contig=<ID=MT>\n';
  
  if (includeStandardFields) {
    // Add standard INFO fields
    Object.entries(STANDARD_VCF_INFO_FIELDS).forEach(([id, info]) => {
      const number = info.type === 'Flag' ? '0' : '.';
      vcf += `##INFO=<ID=${id},Number=${number},Type=${info.type},Description="${info.description}">\n`;
    });
    
    // Add standard FORMAT fields
    Object.entries(STANDARD_VCF_FORMAT_FIELDS).forEach(([id, info]) => {
      const number = id === 'GT' ? '1' : '.';
      vcf += `##FORMAT=<ID=${id},Number=${number},Type=${info.type},Description="${info.description}">\n`;
    });
    
    // Add FILTER fields
    vcf += '##FILTER=<ID=PASS,Description="All filters passed">\n';
    vcf += '##FILTER=<ID=LowQual,Description="Low quality">\n';
  }
  
  // Add column header
  vcf += '#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO';
  if (samples.length > 0) {
    vcf += '\tFORMAT\t' + samples.join('\t');
  }
  vcf += '\n';
  
  return vcf;
}

export { CLINICAL_SIGNIFICANCE, VARIANT_IMPACT };