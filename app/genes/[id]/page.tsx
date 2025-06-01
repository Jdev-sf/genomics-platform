// app/genes/[id]/page.tsx - UI MODERNA ALLINEATA
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Download, 
  Database, 
  Activity, 
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Loader2,
  ExternalLink,
  Dna,
  TrendingUp,
  Info
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
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { ModernHeader } from '@/components/layout/modern-header';

interface Annotation {
  id: string;
  source: {
    name: string;
    version: string;
  };
  content: any;
  created_at: string;
}

interface Variant {
  id: string;
  variant_id: string;
  position: string;
  reference_allele: string;
  alternate_allele: string;
  variant_type: string;
  consequence: string;
  impact: string;
  protein_change: string | null;
  clinical_significance: string;
  frequency: number | null;
  annotations: Annotation[];
  annotations_count: number;
}

interface GeneAlias {
  id: string;
  alias: string;
  alias_type: string;
  source: string;
}

interface GeneData {
  id: string;
  gene_id: string;
  symbol: string;
  name: string;
  chromosome: string;
  start_position: string | null;
  end_position: string | null;
  strand: string;
  biotype: string;
  description: string;
  metadata: any;
  aliases: GeneAlias[];
  variants: Variant[];
}

interface GeneStats {
  total_variants: number;
  pathogenic: number;
  likely_pathogenic: number;
  uncertain_significance: number;
  likely_benign: number;
  benign: number;
  not_provided: number;
}

interface GeneDetailResponse {
  status: string;
  data: {
    gene: GeneData;
    stats: GeneStats;
    meta: {
      variants_shown: number;
      total_variants: number;
      has_more_variants: boolean;
    };
  };
}

export default function GeneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gene, setGene] = useState<GeneData | null>(null);
  const [stats, setStats] = useState<GeneStats | null>(null);
  const [meta, setMeta] = useState<GeneDetailResponse['data']['meta'] | null>(null);
  const [geneId, setGeneId] = useState<string>('');

  useEffect(() => {
    async function getParams() {
      try {
        const resolvedParams = await params;
        setGeneId(resolvedParams.id);
      } catch (err) {
        setError('Invalid gene ID parameter');
        setLoading(false);
      }
    }
    getParams();
  }, [params]);

  useEffect(() => {
    if (geneId) {
      fetchGeneDetails();
    }
  }, [geneId]);

  const fetchGeneDetails = async () => {
    if (!geneId) {
      setError('No gene ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/genes/${geneId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Gene not found. The requested gene could not be found in the database.');
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

      const data: GeneDetailResponse = await response.json();
      
      // Validazione response data
      if (!data || data.status !== 'success' || !data.data) {
        throw new Error('Invalid response data structure');
      }

      if (!data.data.gene) {
        throw new Error('Gene data not found in response');
      }

      setGene(data.data.gene);
      setStats(data.data.stats);
      setMeta(data.data.meta);
      
    } catch (err) {
      console.error('Error fetching gene details:', err);
      
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else if (err instanceof Error) {
        setError(`Failed to load gene details: ${err.message}`);
      } else {
        setError('An unexpected error occurred while loading gene details.');
      }
      
      toast({
        title: 'Error',
        description: 'Failed to load gene details. Please try again.',
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

  const handleExport = async () => {
    try {
      toast({
        title: 'Export Started',
        description: 'Your gene data export will be ready shortly.',
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
    if (geneId) {
      fetchGeneDetails();
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
              <p className="text-muted-foreground">Loading gene details...</p>
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
                <CardTitle className="text-xl text-red-900 dark:text-red-100">Error Loading Gene</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300 text-center">{error}</p>
                <div className="flex gap-2">
                  <Button onClick={handleRetry} className="flex-1">
                    <Loader2 className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/genes')} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Genes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!gene || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <ModernHeader />
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                  <HelpCircle className="w-8 h-8 text-yellow-600" />
                </div>
                <CardTitle className="text-xl">No Data Available</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300 text-center">
                  Gene data is not available or could not be loaded.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleRetry} className="flex-1">
                    <Loader2 className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/genes')} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Genes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      
      <div className="container mx-auto py-6 space-y-6 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/genes')}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Genes
            </Button>
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Dna className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{gene.symbol}</h1>
                <p className="text-muted-foreground">{gene.name}</p>
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
              <CardTitle className="text-sm font-medium">Location</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Chr {gene.chromosome}</div>
              <p className="text-xs text-muted-foreground">
                {gene.start_position ? parseInt(gene.start_position).toLocaleString() : 'N/A'} - {gene.end_position ? parseInt(gene.end_position).toLocaleString() : 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Strand: {gene.strand === '+' ? 'Forward' : 'Reverse'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_variants.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Showing {meta?.variants_shown} variants
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pathogenic</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.pathogenic}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total_variants > 0 ? ((stats.pathogenic / stats.total_variants) * 100).toFixed(1) : 0}% of total
              </p>
              <div className="mt-2">
                <Progress 
                  value={stats.total_variants > 0 ? (stats.pathogenic / stats.total_variants) * 100 : 0}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clinical Risk</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                stats.pathogenic > 10 ? 'text-red-600' :
                stats.pathogenic > 5 ? 'text-orange-600' :
                stats.pathogenic > 0 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {stats.pathogenic > 10 ? 'High' :
                 stats.pathogenic > 5 ? 'Medium' :
                 stats.pathogenic > 0 ? 'Low' : 'Minimal'}
              </div>
              <p className="text-xs text-muted-foreground">
                Based on pathogenic variants
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gene Details Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="variants">Variants ({gene.variants.length})</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gene Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Gene ID</p>
                    <p className="text-sm font-mono">{gene.gene_id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Biotype</p>
                    <p className="text-sm">{gene.biotype || 'Not specified'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm">{gene.description || 'No description available'}</p>
                  </div>
                </div>

                {gene.aliases.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Aliases</p>
                    <div className="flex flex-wrap gap-2">
                      {gene.aliases.map((alias) => (
                        <Badge key={alias.id} variant="secondary">
                          {alias.alias}
                          {alias.alias_type && (
                            <span className="ml-1 text-xs opacity-70">({alias.alias_type})</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {gene.metadata && gene.metadata.externalIds && Object.keys(gene.metadata.externalIds).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">External References</p>
                    <div className="grid gap-2 md:grid-cols-3">
                      {Object.entries(gene.metadata.externalIds).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2 p-2 bg-muted/50 rounded">
                          <span className="text-sm font-medium capitalize">{key}:</span>
                          <span className="text-sm font-mono">{value as string}</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variants" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Associated Variants</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Genetic variants found in this gene
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {gene.variants.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No variants found</h3>
                    <p className="text-muted-foreground">
                      This gene currently has no associated variants in the database.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Variant</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Consequence</TableHead>
                          <TableHead>Impact</TableHead>
                          <TableHead>Clinical Significance</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gene.variants.map((variant) => (
                          <TableRow 
                            key={variant.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => router.push(`/variants/${variant.id}`)}
                          >
                            <TableCell className="font-medium">
                              <div>
                                <span className="text-blue-600 hover:text-blue-800 font-semibold">
                                  {variant.variant_id}
                                </span>
                                {variant.protein_change && (
                                  <p className="text-xs text-muted-foreground font-mono">{variant.protein_change}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono">{parseInt(variant.position).toLocaleString()}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {variant.variant_type}
                              </Badge>
                            </TableCell>
                            <TableCell>{variant.consequence || '-'}</TableCell>
                            <TableCell>
                              {variant.impact && (
                                <Badge variant={getImpactBadgeVariant(variant.impact)} className="text-xs">
                                  {variant.impact}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getSignificanceBadgeVariant(variant.clinical_significance)}>
                                {variant.clinical_significance || 'Not provided'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">
                                {variant.frequency ? 
                                  (variant.frequency * 100).toFixed(4) + '%' : 
                                  '-'
                                }
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/variants/${variant.id}`);
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
                
                {meta?.has_more_variants && (
                  <div className="p-4 text-center border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Showing {meta.variants_shown} of {meta.total_variants} variants
                    </p>
                    <Button variant="outline" size="sm">
                      <Activity className="h-4 w-4 mr-2" />
                      Load More Variants
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Clinical Significance Distribution</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Breakdown of variants by clinical impact
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      { label: 'Pathogenic', value: stats.pathogenic, color: 'bg-red-500', textColor: 'text-red-700' },
                      { label: 'Likely Pathogenic', value: stats.likely_pathogenic, color: 'bg-orange-500', textColor: 'text-orange-700' },
                      { label: 'Uncertain Significance', value: stats.uncertain_significance, color: 'bg-yellow-500', textColor: 'text-yellow-700' },
                      { label: 'Likely Benign', value: stats.likely_benign, color: 'bg-green-500', textColor: 'text-green-700' },
                      { label: 'Benign', value: stats.benign, color: 'bg-green-600', textColor: 'text-green-700' },
                      { label: 'Not Provided', value: stats.not_provided, color: 'bg-gray-400', textColor: 'text-gray-700' },
                    ].map((item) => (
                      <div key={item.label} className="space-y-2 p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{item.label}</span>
                          <div className="flex items-center space-x-2">
                            <span className={`font-bold ${item.textColor}`}>{item.value}</span>
                            <span className="text-sm text-muted-foreground">
                              ({stats.total_variants > 0 ? ((item.value / stats.total_variants) * 100).toFixed(1) : 0}%)
                            </span>
                          </div>
                        </div>
                        <Progress 
                          value={stats.total_variants > 0 ? (item.value / stats.total_variants) * 100 : 0}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Summary</span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Variants:</span>
                        <span className="ml-2 font-bold">{stats.total_variants.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">High Risk:</span>
                        <span className="ml-2 font-bold text-red-600">
                          {(stats.pathogenic + stats.likely_pathogenic).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Low Risk:</span>
                        <span className="ml-2 font-bold text-green-600">
                          {(stats.benign + stats.likely_benign).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}