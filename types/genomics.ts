// Types for genomic data

export interface Gene {
  id: string;
  gene_id: string;
  symbol: string;
  name: string;
  chromosome: string;
  start_position: number | null;
  end_position: number | null;
  strand: string | null;
  biotype: string | null;
  description: string | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface GeneWithCounts extends Gene {
  variant_count: number;
  pathogenic_count: number;
}

export interface GeneAlias {
  id: string;
  gene_id: string;
  alias: string;
  alias_type: string | null;
  source: string | null;
}

export interface Variant {
  id: string;
  variant_id: string;
  gene_id: string;
  chromosome: string;
  position: number;
  reference_allele: string;
  alternate_allele: string;
  variant_type: string | null;
  consequence: string | null;
  impact: string | null;
  protein_change: string | null;
  transcript_id: string | null;
  frequency: number | null;
  clinical_significance: string | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Annotation {
  id: string;
  variant_id: string;
  source_id: string;
  annotation_type: string | null;
  content: Record<string, any>;
  confidence_score: number | null;
  evidence_level: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AnnotationSource {
  id: string;
  name: string;
  version: string | null;
  url: string | null;
  description: string | null;
  last_updated: Date | null;
  is_active: boolean;
}

// Clinical significance levels
export const CLINICAL_SIGNIFICANCE = {
  PATHOGENIC: 'Pathogenic',
  LIKELY_PATHOGENIC: 'Likely pathogenic',
  UNCERTAIN_SIGNIFICANCE: 'Uncertain significance',
  LIKELY_BENIGN: 'Likely benign',
  BENIGN: 'Benign',
  NOT_PROVIDED: 'Not provided'
} as const;

export type ClinicalSignificance = typeof CLINICAL_SIGNIFICANCE[keyof typeof CLINICAL_SIGNIFICANCE];

// Variant impact levels
export const VARIANT_IMPACT = {
  HIGH: 'HIGH',
  MODERATE: 'MODERATE',
  LOW: 'LOW',
  MODIFIER: 'MODIFIER'
} as const;

export type VariantImpact = typeof VARIANT_IMPACT[keyof typeof VARIANT_IMPACT];

// API Response types
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  meta?: Record<string, any>;
  error?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface GenesListResponse extends ApiResponse<GeneWithCounts[]> {
  meta: PaginationMeta;
}

export interface GeneDetailData {
  gene: Gene & {
    aliases: GeneAlias[];
    variants: (Variant & {
      annotations: (Annotation & {
        source: AnnotationSource;
      })[];
      annotations_count: number;
    })[];
  };
  stats: {
    total_variants: number;
    pathogenic: number;
    likely_pathogenic: number;
    uncertain_significance: number;
    likely_benign: number;
    benign: number;
    not_provided: number;
  };
  meta: {
    variants_shown: number;
    total_variants: number;
    has_more_variants: boolean;
  };
}

export interface GeneDetailResponse extends ApiResponse<GeneDetailData> {}

// Filter and sort options
export type GeneSortField = 'symbol' | 'name' | 'chromosome' | 'variantCount';
export type SortOrder = 'asc' | 'desc';

export interface GeneFilters {
  search?: string;
  chromosome?: string;
  minVariants?: number;
  maxVariants?: number;
  hasPathogenic?: boolean;
}

export interface VariantFilters {
  gene_id?: string;
  chromosome?: string;
  clinical_significance?: ClinicalSignificance[];
  impact?: VariantImpact[];
  variant_type?: string[];
  minFrequency?: number;
  maxFrequency?: number;
}