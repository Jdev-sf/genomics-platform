'use client';

import { useState, useEffect } from 'react';
import { Brain, Lightbulb, BookOpen, TrendingUp, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { aiService, formatPredictionForDisplay, formatLiteratureForDisplay } from '@/lib/ai-services';
import type { VariantPrediction, LiteratureSuggestion, AIInsight } from '@/lib/ai-services';

interface AIGeneDetailProps {
  gene: {
    id: string;
    symbol: string;
    name: string;
    chromosome: string;
  };
  variants: Array<{
    id: string;
    variant_id: string;
    position: string;
    reference_allele: string;
    alternate_allele: string;
    consequence: string;
    protein_change: string | null;
    clinical_significance: string;
  }>;
}

export function AIGeneDetail({ gene, variants }: AIGeneDetailProps) {
  const [predictions, setPredictions] = useState<VariantPrediction[]>([]);
  const [literature, setLiterature] = useState<LiteratureSuggestion[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState({
    predictions: false,
    literature: false,
    insights: false
  });

  useEffect(() => {
    loadAIFeatures();
  }, [gene.symbol]);

  const loadAIFeatures = async () => {
    // Load all AI features in parallel
    await Promise.all([
      loadVariantPredictions(),
      loadLiteratureSuggestions(),
      loadGeneInsights()
    ]);
  };

  const loadVariantPredictions = async () => {
    setLoading(prev => ({ ...prev, predictions: true }));
    
    try {
      const predictionPromises = variants
        .filter(v => !v.clinical_significance || v.clinical_significance === 'Uncertain significance')
        .slice(0, 5) // Limit to 5 most uncertain variants
        .map(variant => 
          aiService.predictVariantPathogenicity({
            chromosome: gene.chromosome,
            position: parseInt(variant.position),
            ref: variant.reference_allele,
            alt: variant.alternate_allele,
            gene_symbol: gene.symbol,
            protein_change: variant.protein_change || undefined,
            consequence: variant.consequence
          })
        );

      const results = await Promise.all(predictionPromises);
      setPredictions(results);
    } catch (error) {
      console.error('Error loading variant predictions:', error);
    } finally {
      setLoading(prev => ({ ...prev, predictions: false }));
    }
  };

  const loadLiteratureSuggestions = async () => {
    setLoading(prev => ({ ...prev, literature: true }));
    
    try {
      const suggestions = await aiService.suggestLiterature(gene.symbol, undefined, 8);
      setLiterature(suggestions);
    } catch (error) {
      console.error('Error loading literature suggestions:', error);
    } finally {
      setLoading(prev => ({ ...prev, literature: false }));
    }
  };

  const loadGeneInsights = async () => {
    setLoading(prev => ({ ...prev, insights: true }));
    
    try {
      const geneInsights = await aiService.generateInsights(
        gene.symbol, 
        variants.map(v => ({
          id: v.id,
          clinical_significance: v.clinical_significance,
          consequence: v.consequence
        }))
      );
      setInsights(geneInsights);
    } catch (error) {
      console.error('Error loading gene insights:', error);
    } finally {
      setLoading(prev => ({ ...prev, insights: false }));
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'variant_interpretation': return AlertTriangle;
      case 'gene_function': return Brain;
      case 'pathway_analysis': return TrendingUp;
      default: return Lightbulb;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* AI Insights Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI-Powered Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="insights" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="insights">
                Insights ({insights.length})
              </TabsTrigger>
              <TabsTrigger value="predictions">
                Predictions ({predictions.length})
              </TabsTrigger>
              <TabsTrigger value="literature">
                Literature ({literature.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="insights" className="space-y-4">
              {loading.insights ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Generating insights...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.map((insight, index) => {
                    const Icon = getInsightIcon(insight.type);
                    return (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Icon className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{insight.title}</h4>
                              <Badge variant="outline" className={getConfidenceColor(insight.confidence)}>
                                {(insight.confidence * 100).toFixed(0)}% confidence
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                            
                            {insight.evidence.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-medium text-gray-500 mb-1">Evidence:</p>
                                <ul className="text-xs text-gray-600 space-y-1">
                                  {insight.evidence.map((evidence, i) => (
                                    <li key={i} className="flex items-start gap-1">
                                      <span className="text-blue-500">•</span>
                                      <span>{evidence}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {insight.references.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {insight.references.map((ref, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {ref}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="predictions" className="space-y-4">
              {loading.predictions ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Analyzing variants...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {predictions.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">
                      <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No uncertain variants found for AI prediction</p>
                    </div>
                  ) : (
                    predictions.map((prediction, index) => {
                      const formatted = formatPredictionForDisplay(prediction);
                      return (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold font-mono text-sm">
                              {prediction.variant_id}
                            </h4>
                            <Badge 
                              variant={
                                prediction.pathogenicity_classification.includes('Pathogenic') 
                                  ? 'destructive' 
                                  : 'secondary'
                              }
                            >
                              {prediction.pathogenicity_classification}
                            </Badge>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Pathogenicity Score</span>
                                <span className="font-medium">{formatted.score}%</span>
                              </div>
                              <Progress value={prediction.pathogenicity_score * 100} className="h-2" />
                            </div>

                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Confidence</span>
                                <span className="font-medium">{formatted.confidence}%</span>
                              </div>
                              <Progress value={prediction.confidence * 100} className="h-2" />
                            </div>

                            <div>
                              <p className="text-sm text-gray-600 mb-2">{formatted.interpretation}</p>
                              
                              {prediction.evidence.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-1">Evidence:</p>
                                  <ul className="text-xs text-gray-600 space-y-1">
                                    {prediction.evidence.map((evidence, i) => (
                                      <li key={i} className="flex items-start gap-1">
                                        <span className="text-blue-500">•</span>
                                        <span>{evidence}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>Model: {prediction.model_version}</span>
                              <span>{prediction.created_at.toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="literature" className="space-y-4">
              {loading.literature ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Finding relevant literature...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {literature.map((paper, index) => {
                    const formatted = formatLiteratureForDisplay([paper])[0];
                    return (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm flex-1 mr-4">{paper.title}</h4>
                          <Badge variant="outline">
                            {formatted.relevance_percentage}% relevant
                          </Badge>
                        </div>

                        <div className="text-sm text-gray-600 mb-3">
                          <p className="mb-2">{paper.abstract}</p>
                          <div className="flex items-center gap-4 text-xs">
                            <span><strong>Authors:</strong> {formatted.author_string}</span>
                            <span><strong>Journal:</strong> {paper.journal}</span>
                            <span><strong>Year:</strong> {formatted.pub_year}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {paper.keywords.slice(0, 4).map((keyword, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <a 
                              href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1"
                            >
                              <BookOpen className="h-3 w-3" />
                              PubMed
                            </a>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Consider functional analysis</p>
                <p className="text-xs text-gray-600">
                  Several variants of uncertain significance could benefit from functional studies
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <BookOpen className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Review recent literature</p>
                <p className="text-xs text-gray-600">
                  {literature.length} new publications may provide additional evidence
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}