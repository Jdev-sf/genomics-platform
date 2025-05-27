// lib/ai-services.ts
import { z } from 'zod';

// Types for AI predictions
export interface VariantPrediction {
  id: string;
  variant_id: string;
  pathogenicity_score: number;
  pathogenicity_classification: 'Pathogenic' | 'Likely Pathogenic' | 'Uncertain' | 'Likely Benign' | 'Benign';
  confidence: number;
  evidence: string[];
  model_version: string;
  created_at: Date;
}

export interface LiteratureSuggestion {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  publication_date: string;
  relevance_score: number;
  keywords: string[];
  gene_mentions: string[];
  variant_mentions: string[];
}

export interface AIInsight {
  type: 'variant_interpretation' | 'gene_function' | 'pathway_analysis';
  title: string;
  description: string;
  confidence: number;
  evidence: string[];
  references: string[];
}

// Mock AI service - replace with actual ML models
export class AIService {
  private static instance: AIService;
  private cache = new Map<string, any>();
  
  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async predictVariantPathogenicity(
    variant: {
      chromosome: string;
      position: number;
      ref: string;
      alt: string;
      gene_symbol: string;
      protein_change?: string;
      consequence?: string;
    }
  ): Promise<VariantPrediction> {
    const cacheKey = `pathogenicity_${variant.chromosome}_${variant.position}_${variant.ref}_${variant.alt}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Simulate AI prediction with realistic logic
    const prediction = this.simulatePathogenicityPrediction(variant);
    
    this.cache.set(cacheKey, prediction);
    return prediction;
  }

  async suggestLiterature(
    gene_symbol: string,
    variant_id?: string,
    limit: number = 10
  ): Promise<LiteratureSuggestion[]> {
    const cacheKey = `literature_${gene_symbol}_${variant_id || 'all'}_${limit}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const suggestions = this.simulateLiteratureSuggestions(gene_symbol, variant_id, limit);
    
    this.cache.set(cacheKey, suggestions);
    return suggestions;
  }

  async generateInsights(
    gene_symbol: string,
    variants?: Array<{ id: string; clinical_significance: string; consequence: string }>
  ): Promise<AIInsight[]> {
    const cacheKey = `insights_${gene_symbol}_${variants?.length || 0}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const insights = this.simulateAIInsights(gene_symbol, variants);
    
    this.cache.set(cacheKey, insights);
    return insights;
  }

  async searchSimilarVariants(
    variant: {
      gene_symbol: string;
      consequence: string;
      protein_change?: string;
    },
    limit: number = 5
  ): Promise<Array<{ variant_id: string; similarity_score: number; clinical_significance: string }>> {
    // Simulate finding similar variants based on gene, consequence, and protein change
    const similarVariants = [];
    
    for (let i = 1; i <= limit; i++) {
      similarVariants.push({
        variant_id: `${variant.gene_symbol}_similar_${i}`,
        similarity_score: Math.random() * 0.4 + 0.6, // 0.6-1.0
        clinical_significance: ['Pathogenic', 'Likely Pathogenic', 'Uncertain significance'][Math.floor(Math.random() * 3)]
      });
    }

    return similarVariants.sort((a, b) => b.similarity_score - a.similarity_score);
  }

  private simulatePathogenicityPrediction(variant: any): VariantPrediction {
    // Simulate realistic pathogenicity prediction
    let baseScore = Math.random();
    
    // Adjust score based on consequence
    if (variant.consequence?.includes('nonsense') || variant.consequence?.includes('frameshift')) {
      baseScore = Math.max(baseScore, 0.7);
    } else if (variant.consequence?.includes('missense')) {
      baseScore = 0.3 + (Math.random() * 0.6);
    } else if (variant.consequence?.includes('synonymous')) {
      baseScore = Math.random() * 0.3;
    }

    // Adjust for known cancer genes
    const cancerGenes = ['BRCA1', 'BRCA2', 'TP53', 'PTEN', 'APC'];
    if (cancerGenes.includes(variant.gene_symbol)) {
      baseScore = Math.max(baseScore, 0.4);
    }

    const score = Math.min(baseScore, 1.0);
    
    let classification: VariantPrediction['pathogenicity_classification'];
    if (score >= 0.8) classification = 'Pathogenic';
    else if (score >= 0.6) classification = 'Likely Pathogenic';
    else if (score >= 0.4) classification = 'Uncertain';
    else if (score >= 0.2) classification = 'Likely Benign';
    else classification = 'Benign';

    const evidence = [];
    if (variant.consequence?.includes('nonsense')) evidence.push('PVS1: Null variant in gene with established LOF mechanism');
    if (score > 0.7) evidence.push('PM2: Extremely rare in population databases');
    if (variant.protein_change) evidence.push('PM5: Novel missense change at amino acid residue');

    return {
      id: `pred_${Date.now()}`,
      variant_id: `${variant.chromosome}_${variant.position}_${variant.ref}_${variant.alt}`,
      pathogenicity_score: score,
      pathogenicity_classification: classification,
      confidence: 0.7 + Math.random() * 0.3,
      evidence,
      model_version: 'GenoAI-v2.1',
      created_at: new Date()
    };
  }

  private simulateLiteratureSuggestions(
    gene_symbol: string,
    variant_id?: string,
    limit: number = 10
  ): LiteratureSuggestion[] {
    const suggestions: LiteratureSuggestion[] = [];
    
    const sampleTitles = [
      `Functional characterization of ${gene_symbol} variants in cancer predisposition`,
      `Clinical interpretation of ${gene_symbol} mutations: current evidence and guidelines`,
      `Structural analysis of ${gene_symbol} protein domains and pathogenic variants`,
      `Population frequency and clinical significance of ${gene_symbol} variants`,
      `Therapeutic implications of ${gene_symbol} mutations in precision medicine`
    ];

    for (let i = 0; i < Math.min(limit, sampleTitles.length); i++) {
      suggestions.push({
        pmid: `${30000000 + Math.floor(Math.random() * 5000000)}`,
        title: sampleTitles[i],
        abstract: `This study investigates the clinical and functional implications of genetic variants in ${gene_symbol}. Our findings provide new insights into the pathogenic mechanisms and clinical management strategies.`,
        authors: [
          'Smith J', 'Johnson A', 'Williams M', 'Brown K', 'Davis L'
        ].slice(0, 3 + Math.floor(Math.random() * 3)),
        journal: ['Nature Genetics', 'NEJM', 'Cell', 'Science', 'JAMA'][Math.floor(Math.random() * 5)],
        publication_date: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        relevance_score: 0.6 + Math.random() * 0.4,
        keywords: [`${gene_symbol}`, 'genetic variant', 'pathogenicity', 'clinical significance'],
        gene_mentions: [gene_symbol],
        variant_mentions: variant_id ? [variant_id] : []
      });
    }

    return suggestions.sort((a, b) => b.relevance_score - a.relevance_score);
  }

  private simulateAIInsights(
    gene_symbol: string,
    variants?: Array<{ id: string; clinical_significance: string; consequence: string }>
  ): AIInsight[] {
    const insights: AIInsight[] = [];

    // Gene function insight
    insights.push({
      type: 'gene_function',
      title: `${gene_symbol} Function Analysis`,
      description: `${gene_symbol} encodes a critical protein involved in DNA repair mechanisms. Loss-of-function variants typically result in increased cancer susceptibility.`,
      confidence: 0.85,
      evidence: [
        'Multiple functional studies demonstrate protein function',
        'Established role in DNA damage response pathway',
        'Strong genotype-phenotype correlation'
      ],
      references: ['PMID:12345678', 'PMID:23456789']
    });

    if (variants && variants.length > 0) {
      const pathogenicCount = variants.filter(v => 
        v.clinical_significance?.toLowerCase().includes('pathogenic')
      ).length;

      if (pathogenicCount > variants.length * 0.3) {
        insights.push({
          type: 'variant_interpretation',
          title: 'High Pathogenic Variant Density',
          description: `This gene shows a high proportion of pathogenic variants (${pathogenicCount}/${variants.length}), suggesting strong clinical relevance for genetic testing.`,
          confidence: 0.78,
          evidence: [
            'Multiple validated pathogenic variants',
            'Consistent with established disease mechanism',
            'Clinical testing guidelines recommend screening'
          ],
          references: ['PMID:34567890']
        });
      }
    }

    // Pathway analysis
    insights.push({
      type: 'pathway_analysis',
      title: 'Pathway Impact Assessment',
      description: `Variants in ${gene_symbol} primarily affect DNA repair pathways, with downstream effects on cell cycle regulation and apoptosis. Consider co-occurring variants in related pathway genes.`,
      confidence: 0.72,
      evidence: [
        'Pathway enrichment analysis shows DNA repair involvement',
        'Protein-protein interaction networks confirm pathway membership',
        'Functional studies demonstrate pathway disruption'
      ],
      references: ['PMID:45678901', 'PMID:56789012']
    });

    return insights;
  }

  // Clear cache periodically to prevent memory issues
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats for monitoring
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Validation schemas for AI service inputs
export const variantPredictionSchema = z.object({
  chromosome: z.string(),
  position: z.number(),
  ref: z.string(),
  alt: z.string(),
  gene_symbol: z.string(),
  protein_change: z.string().optional(),
  consequence: z.string().optional(),
});

export const literatureSearchSchema = z.object({
  gene_symbol: z.string().min(1),
  variant_id: z.string().optional(),
  limit: z.number().min(1).max(50).default(10),
});

// Helper functions for AI feature integration
export function formatPredictionForDisplay(prediction: VariantPrediction) {
  return {
    score: (prediction.pathogenicity_score * 100).toFixed(1),
    classification: prediction.pathogenicity_classification,
    confidence: (prediction.confidence * 100).toFixed(1),
    evidence: prediction.evidence,
    interpretation: getPredictionInterpretation(prediction.pathogenicity_score)
  };
}

export function getPredictionInterpretation(score: number): string {
  if (score >= 0.8) return 'High confidence pathogenic prediction';
  if (score >= 0.6) return 'Likely pathogenic with moderate confidence';
  if (score >= 0.4) return 'Uncertain significance - additional evidence needed';
  if (score >= 0.2) return 'Likely benign variant';
  return 'High confidence benign prediction';
}

export function formatLiteratureForDisplay(literature: LiteratureSuggestion[]) {
  return literature.map(paper => ({
    ...paper,
    relevance_percentage: (paper.relevance_score * 100).toFixed(1),
    author_string: paper.authors.slice(0, 3).join(', ') + 
                   (paper.authors.length > 3 ? ' et al.' : ''),
    pub_year: paper.publication_date.split('-')[0]
  }));
}

// Export singleton instance
export const aiService = AIService.getInstance();