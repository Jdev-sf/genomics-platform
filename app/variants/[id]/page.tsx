// app/variants/[id]/page.tsx - FIXED VERSION
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Download, 
  Activity, 
  Dna,
  AlertCircle,
  Loader2,
  ExternalLink,
  FileText,
  Info,
  Database,
  TrendingUp,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { ModernHeader } from '@/components/layout/modern-header';

interface VariantGene {
  id: string;
  gene_id: string;
  symbol: string;
  name: string;
  chromosome: string;
  description: string;
}

interface Annotation {
  id: string;
  source: {
    id: string;
    name: string;
    version: string;
    url: string;
  };
  annotation_type: string;
  content: any;
  confidence_score: number | null;
  evidence_level: string;
  created_at: string;
  updated_at: string;
}

interface RelatedVariant {
  id: string;
  variant_id: string;
  position: string;
  consequence: string;
  clinical_significance: string;
}

interface VariantData {
  id: string;
  variant_id: string;
  gene: VariantGene;
  chromosome: string;
  position: string;
  reference_allele: string;
  alternate_allele: string;
  variant_type: string;
  consequence: string;
  impact: string;
  protein_change: string | null;
  transcript_id: string | null;
  frequency: number | null;
  clinical_significance: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  annotations: Annotation[];
  related_variants: RelatedVariant[];
}

interface VariantDetailResponse {
  status: string;
  data: VariantData;
}

export default function VariantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [variant, setVariant] = useState<VariantData | null>(null);
  const [variantId, setVariantId] = useState<string>('');

  useEffect(() => {
    async function getParams() {
      try {
        const resolvedParams = await params;
        setVariantId(resolvedParams.id);
      } catch (err) {
        setError('Invalid variant ID parameter');
        setLoading(false);
      }
    }
    getParams();
  }, [params]);

  useEffect(() => {
    if (variantId) {
      fetchVariantDetails();
    }
  }, [variantId]);

  const fetchVariantDetails = async () => {
    if (!variantId) {
      setError('No variant ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/variants/${variantId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Variant not found. The requested variant could not be found in the database.');
          return;
        } else if (response.status === 401) {
          setError('Unauthorized access. Please log in to continue.');
          router.push('/auth/login');
          return;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format. Expected JSON.');
      }

      const data: VariantDetailResponse = await response.json();
      
      // Validazione response data
      if (!data || data.status !== 'success' || !data.data) {
        throw new Error('Invalid response data structure');
      }

      setVariant(data.data);
      
    } catch (err) {
      console.error('Error fetching variant details:', err);
      
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else if (err instanceof Error) {
        setError(`Failed to load variant details: ${err.message}`);
      } else {
        setError('An unexpected error occurred while loading variant details.');
      }
      
      toast({
        title: 'Error',
        description: 'Failed to load variant details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSignificanceBadgeVariant = (significance: string | null) => {
    if (!significance) return 'secondary';
    const lower = significance.toLowerCase();
    if (lower.includes('pathogenic')) return 'destructive';
    if (lower.includes('benign')) return 'default';
    if (lower.includes('uncertain')) return 'secondary';
    return 'secondary';
  };

  const getImpactBadgeVariant = (impact: string | null) => {
    if (!impact) return 'secondary';
    switch (impact.toUpperCase()) {
      case 'HIGH': return 'destructive';
      case 'MODERATE': return 'secondary';
      case 'LOW': return 'secondary';
      case 'MODIFIER': return 'outline';
      default: return 'secondary';
    }
  };

  const getRiskLevel = (significance: string | null) => {
    if (!significance) return { level: 'Unknown', color: 'text-gray-600' };
    const lower = significance.toLowerCase();
    if (lower.includes('pathogenic')) return { level: 'High Risk', color: 'text-red-600' };
    if (lower.includes('benign')) return { level: 'Low Risk', color: 'text-green-600' };
    if (lower.includes('uncertain')) return { level: 'Uncertain', color: 'text-yellow-600' };
    return { level: 'Unknown', color: 'text-gray-600' };
  };

  const handleExport = async () => {
    try {
      toast({
        title: 'Export Started',
        description: 'Your variant data export will be ready shortly.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Unable to export data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRetry = () => {
    if (variantId) {
      fetchVariantDetails();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <ModernHeader />
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Loading variant details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <ModernHeader />
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <CardTitle className="text-xl text-red-900 dark:text-red-100">Error Loading Variant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300 text-center">{error}</p>
                <div className="flex gap-2">
                  <Button onClick={handleRetry} className="flex-1">
                    <Loader2 className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/variants')} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Variants
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!variant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <ModernHeader />
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                  <Info className="w-8 h-8 text-yellow-600" />
                </div>
                <CardTitle className="text-xl">No Data Available</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300 text-center">
                  Variant data is not available or could not be loaded.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleRetry} className="flex-1">
                    <Loader2 className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/variants')} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Variants
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const riskLevel = getRiskLevel(variant.clinical_significance);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <ModernHeader />
      <div className="container mx-auto py-6 space-y-6 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/variants')}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Variants
            </Button>
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-600 to-blue-600 flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{variant.variant_id}</h1>
                <p className="text-muted-foreground">
                  {variant.protein_change || `${variant.reference_allele}>${variant.alternate_allele}`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Information Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gene</CardTitle>
              <Dna className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{variant.gene.symbol}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {variant.gene.name}
              </p>
              <Button
                variant="link"
                className="h-auto p-0 mt-2 text-xs"
                onClick={() => router.push(`/genes/${variant.gene.id}`)}
              >
                View Gene Details
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Location</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Chr{variant.chromosome}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {parseInt(variant.position).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {variant.variant_type} ({variant.reference_allele}&gt;{variant.alternate_allele})
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clinical Significance</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge 
                variant={getSignificanceBadgeVariant(variant.clinical_significance)} 
                className="text-sm px-3 py-1"
              >
                {variant.clinical_significance || 'Not provided'}
              </Badge>
              {variant.frequency && (
                <p className="text-xs text-muted-foreground mt-2">
                  Frequency: {(variant.frequency * 100).toFixed(4)}%
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risk Assessment</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${riskLevel.color}`}>
                {riskLevel.level}
              </div>
              <p className="text-xs text-muted-foreground">
                Based on clinical data
              </p>
              {variant.impact && (
                <Badge variant={getImpactBadgeVariant(variant.impact)} className="mt-2">
                  {variant.impact} Impact
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Variant Details Tabs */}
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="annotations">
              Annotations ({variant.annotations?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="related">
              Related Variants ({variant.related_variants?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Variant Information</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Detailed genomic and functional information
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Variant ID</p>
                    <p className="text-sm font-mono bg-muted/50 p-2 rounded">{variant.variant_id}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <Badge variant="outline">{variant.variant_type}</Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Consequence</p>
                    <p className="text-sm">{variant.consequence || 'Not specified'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Impact</p>
                    {variant.impact ? (
                      <Badge variant={getImpactBadgeVariant(variant.impact)}>
                        {variant.impact}
                      </Badge>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not specified</p>
                    )}
                  </div>
                  {variant.transcript_id && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Transcript</p>
                      <p className="text-sm font-mono bg-muted/50 p-2 rounded">{variant.transcript_id}</p>
                    </div>
                  )}
                  {variant.protein_change && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Protein Change</p>
                      <p className="text-sm font-mono bg-muted/50 p-2 rounded">{variant.protein_change}</p>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">Associated Gene</p>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Symbol:</span>
                      <span className="text-sm font-bold">{variant.gene.symbol}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Gene ID:</span>
                      <span className="text-sm font-mono">{variant.gene.gene_id}</span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium">Description:</span>
                      <span className="text-sm text-right max-w-xs">
                        {variant.gene.description || 'No description available'}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/genes/${variant.gene.id}`)}
                        className="w-full"
                      >
                        <Database className="h-4 w-4 mr-2" />
                        View Full Gene Details
                      </Button>
                    </div>
                  </div>
                </div>

                {variant.metadata && Object.keys(variant.metadata).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Additional Information</p>
                      <div className="bg-muted/30 rounded-lg p-4">
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(variant.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="annotations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Clinical Annotations</CardTitle>
                <p className="text-sm text-muted-foreground">
                  External database annotations and clinical interpretations
                </p>
              </CardHeader>
              <CardContent>
                {!variant.annotations || variant.annotations.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No annotations available</h3>
                    <p className="text-muted-foreground">
                      This variant currently has no clinical annotations in the database.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {variant.annotations.map((annotation) => (
                      <div key={annotation.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{annotation.source.name}</Badge>
                            {annotation.source.version && (
                              <span className="text-xs text-muted-foreground">
                                v{annotation.source.version}
                              </span>
                            )}
                          </div>
                          <Badge variant="secondary">{annotation.annotation_type}</Badge>
                        </div>
                        
                        <div className="space-y-2">
                          {annotation.content && (
                            <div className="text-sm">
                              {Object.entries(annotation.content).map(([key, value]) => (
                                <div key={key} className="flex items-start justify-between py-1 border-b border-border/30 last:border-b-0">
                                  <span className="font-medium capitalize">
                                    {key.replace(/_/g, ' ')}:
                                  </span>
                                  <span className="text-right max-w-xs">
                                    {Array.isArray(value) ? value.join(', ') : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                            <div className="flex items-center space-x-4">
                              {annotation.confidence_score && (
                                <span>Confidence: {(annotation.confidence_score * 100).toFixed(0)}%</span>
                              )}
                              {annotation.evidence_level && (
                                <span>Evidence: {annotation.evidence_level}</span>
                              )}
                            </div>
                            <span>
                              Updated: {new Date(annotation.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        {annotation.source.url && (
                          <div className="pt-2 border-t">
                            <a 
                              href={annotation.source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center"
                            >
                              View External Source
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="related" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Related Variants</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Other variants in {variant.gene.symbol} with similar clinical significance
                </p>
              </CardHeader>
              <CardContent>
                {!variant.related_variants || variant.related_variants.length === 0 ? (
                  <div className="text-center py-12">
                    <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No related variants found</h3>
                    <p className="text-muted-foreground">
                      No other variants with similar clinical significance were found in this gene.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Variant ID</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Consequence</TableHead>
                          <TableHead>Clinical Significance</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {variant.related_variants.map((relatedVariant) => (
                          <TableRow 
                            key={relatedVariant.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => router.push(`/variants/${relatedVariant.id}`)}
                          >
                            <TableCell className="font-medium">
                              <span className="text-blue-600 hover:text-blue-800 font-semibold">
                                {relatedVariant.variant_id}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono">{parseInt(relatedVariant.position).toLocaleString()}</span>
                            </TableCell>
                            <TableCell>{relatedVariant.consequence || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={getSignificanceBadgeVariant(relatedVariant.clinical_significance)}>
                                {relatedVariant.clinical_significance}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/variants/${relatedVariant.id}`);
                                }}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}