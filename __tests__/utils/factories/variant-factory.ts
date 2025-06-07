// __tests__/utils/factories/variant-factory.ts

interface Variant {
  id: string;
  variant_id: string;
  chromosome: string;
  position: bigint;
  ref: string;
  alt: string;
  gene_symbol?: string;
  consequence?: string;
  clinical_significance?: string;
  allele_frequency?: number;
  created_at: Date;
  updated_at: Date;
}

export const createMockVariant = (overrides: Partial<Variant> = {}): Variant => ({
  id: `variant-${Math.random().toString(36).substr(2, 9)}`,
  variant_id: `rs${Math.floor(Math.random() * 1000000)}`,
  chromosome: '17',
  position: 43045677n,
  ref: 'C',
  alt: 'T',
  gene_symbol: 'BRCA1',
  consequence: 'missense_variant',
  clinical_significance: 'Pathogenic',
  allele_frequency: 0.000123,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  ...overrides,
})

export const createMockVariants = (count: number, overrides: Partial<Variant> = {}): Variant[] =>
  Array.from({ length: count }, (_, i) => createMockVariant({
    id: `variant-${i + 1}`,
    variant_id: `rs${80000000 + i}`,
    position: BigInt(43000000 + i * 1000),
    ...overrides,
  }))

export const mockVariantsWithDifferentSignificance = [
  createMockVariant({
    variant_id: 'rs80357382',
    clinical_significance: 'Pathogenic',
    consequence: 'nonsense_variant',
    allele_frequency: 0.000001,
  }),
  createMockVariant({
    variant_id: 'rs80357383',
    clinical_significance: 'Benign',
    consequence: 'synonymous_variant',
    allele_frequency: 0.05,
  }),
  createMockVariant({
    variant_id: 'rs80357384',
    clinical_significance: 'Uncertain significance',
    consequence: 'missense_variant',
    allele_frequency: 0.001,
  }),
  createMockVariant({
    variant_id: 'rs80357385',
    clinical_significance: 'Likely pathogenic',
    consequence: 'frameshift_variant',
    allele_frequency: 0.0001,
  }),
]