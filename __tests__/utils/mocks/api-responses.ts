// __tests__/utils/mocks/api-responses.ts

export const mockGene = {
  id: 'gene-1',
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
}

export const mockVariant = {
  id: 'variant-1',
  variant_id: 'rs80357382',
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
}

export const mockSearchResponse = {
  data: {
    query: 'BRCA1',
    total: 2,
    results: {
      genes: [mockGene],
      variants: [mockVariant],
    },
  },
}

export const mockPrediction = {
  id: 'prediction-1',
  variant_id: 'variant-1',
  pathogenicity_score: 0.85,
  pathogenicity_classification: 'Pathogenic' as const,
  confidence: 0.92,
  evidence: ['High CADD score (25.3)', 'ClinVar: Pathogenic'],
  model_version: 'v1.0',
  created_at: new Date('2024-01-01'),
}

export const mockLiteratureSuggestion = {
  pmid: '12345678',
  title: 'BRCA1 variants and breast cancer risk',
  authors: ['Smith J', 'Doe A'],
  journal: 'Nature Genetics',
  publication_date: '2024-01-01',
  relevance_score: 0.95,
  gene_mentions: ['BRCA1'],
  variant_mentions: [],
}

// Mock fetch responses
export const createMockResponse = (data: any, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data),
})

export const mockApiResponses = {
  search: () => createMockResponse(mockSearchResponse),
  genes: () => createMockResponse({ data: [mockGene] }),
  variants: () => createMockResponse({ data: [mockVariant] }),
  prediction: () => createMockResponse({ data: mockPrediction }),
  literature: () => createMockResponse({ data: [mockLiteratureSuggestion] }),
  error: (message = 'Server Error') => createMockResponse({ error: message }, false, 500),
}