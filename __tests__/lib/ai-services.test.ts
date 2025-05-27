// __tests__/lib/ai-services.test.ts
import { aiService, formatPredictionForDisplay } from '@/lib/ai-services'

describe('AI Services', () => {
  describe('predictVariantPathogenicity', () => {
    it('returns prediction for variant', async () => {
      const variant = {
        chromosome: '17',
        position: 43044295,
        ref: 'A',
        alt: 'G',
        gene_symbol: 'BRCA1',
        consequence: 'missense_variant'
      }

      const prediction = await aiService.predictVariantPathogenicity(variant)

      expect(prediction).toHaveProperty('pathogenicity_score')
      expect(prediction).toHaveProperty('pathogenicity_classification')
      expect(prediction).toHaveProperty('confidence')
      expect(prediction.pathogenicity_score).toBeGreaterThanOrEqual(0)
      expect(prediction.pathogenicity_score).toBeLessThanOrEqual(1)
    })

    it('adjusts score for high-impact variants', async () => {
      const nonsenseVariant = {
        chromosome: '17',
        position: 43044295,
        ref: 'A',
        alt: 'G',
        gene_symbol: 'BRCA1',
        consequence: 'nonsense_variant'
      }

      const prediction = await aiService.predictVariantPathogenicity(nonsenseVariant)
      expect(prediction.pathogenicity_score).toBeGreaterThan(0.6)
    })
  })

  describe('formatPredictionForDisplay', () => {
    it('formats prediction correctly', () => {
      const prediction = {
        id: 'test',
        variant_id: 'test_variant',
        pathogenicity_score: 0.85,
        pathogenicity_classification: 'Pathogenic' as const,
        confidence: 0.92,
        evidence: ['Test evidence'],
        model_version: 'test-v1',
        created_at: new Date()
      }

      const formatted = formatPredictionForDisplay(prediction)
      
      expect(formatted.score).toBe('85.0')
      expect(formatted.confidence).toBe('92.0')
      expect(formatted.classification).toBe('Pathogenic')
      expect(formatted.interpretation).toContain('High confidence pathogenic')
    })
  })

  describe('suggestLiterature', () => {
    it('returns literature suggestions', async () => {
      const suggestions = await aiService.suggestLiterature('BRCA1', undefined, 5)
      
      expect(suggestions).toHaveLength(5)
      expect(suggestions[0]).toHaveProperty('pmid')
      expect(suggestions[0]).toHaveProperty('title')
      expect(suggestions[0]).toHaveProperty('relevance_score')
      expect(suggestions[0].gene_mentions).toContain('BRCA1')
    })
  })
})