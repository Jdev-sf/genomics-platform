// __tests__/utils/factories/gene-factory.ts

interface Gene {
  id: string;
  symbol: string;
  name: string;
  chromosome: string;
  start_position: bigint;
  end_position: bigint;
  strand: string;
  variant_count?: number;
  clinical_variant_count?: number;
  benign_variant_count?: number;
  pathogenic_variant_count?: number;
  created_at: Date;
  updated_at: Date;
}

export const createMockGene = (overrides: Partial<Gene> = {}): Gene => ({
  id: `gene-${Math.random().toString(36).substr(2, 9)}`,
  symbol: 'BRCA1',
  name: 'Breast cancer type 1 susceptibility protein',
  chromosome: '17',
  start_position: 43044295n,
  end_position: 43170245n,
  strand: '+',
  variant_count: 1247,
  clinical_variant_count: 156,
  benign_variant_count: 891,
  pathogenic_variant_count: 200,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  ...overrides,
})

export const createMockGenes = (count: number, overrides: Partial<Gene> = {}): Gene[] =>
  Array.from({ length: count }, (_, i) => createMockGene({
    id: `gene-${i + 1}`,
    symbol: `GENE${i + 1}`,
    name: `Test Gene ${i + 1}`,
    chromosome: String((i % 22) + 1),
    ...overrides,
  }))

export const mockGenesWithVariants = [
  createMockGene({
    symbol: 'BRCA1',
    name: 'Breast cancer type 1',
    chromosome: '17',
    variant_count: 1500,
    pathogenic_variant_count: 300,
  }),
  createMockGene({
    symbol: 'BRCA2',
    name: 'Breast cancer type 2',
    chromosome: '13',
    variant_count: 1200,
    pathogenic_variant_count: 250,
  }),
  createMockGene({
    symbol: 'TP53',
    name: 'Tumor protein p53',
    chromosome: '17',
    variant_count: 2000,
    pathogenic_variant_count: 500,
  }),
]