// Re-export Prisma types
export type { User, Role, Gene, Variant, Annotation, Source } from '@prisma/client';

// Custom types for auth
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: {
    id: string;
    name: string;
    permissions: Record<string, string[]>;
  };
}

// Search and filter types
export interface GeneSearchParams {
  search?: string;
  chromosome?: string;
  page?: number;
  limit?: number;
}

export interface VariantSearchParams {
  geneId?: string;
  chromosome?: string;
  clinicalSignificance?: string;
  minFrequency?: number;
  maxFrequency?: number;
  page?: number;
  limit?: number;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Clinical significance enum
export const ClinicalSignificance = {
  PATHOGENIC: 'Pathogenic',
  LIKELY_PATHOGENIC: 'Likely pathogenic',
  UNCERTAIN: 'Uncertain significance',
  LIKELY_BENIGN: 'Likely benign',
  BENIGN: 'Benign',
} as const;

export type ClinicalSignificanceType = typeof ClinicalSignificance[keyof typeof ClinicalSignificance];

// Variant impact levels
export const VariantImpact = {
  HIGH: 'HIGH',
  MODERATE: 'MODERATE',
  LOW: 'LOW',
  MODIFIER: 'MODIFIER',
} as const;

export type VariantImpactType = typeof VariantImpact[keyof typeof VariantImpact];