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
  ExternalLink
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
  const [gene, setGene] = useState<GeneData | null>(null);
  const [stats, setStats] = useState<GeneStats | null>(null);
  const [meta, setMeta] = useState<GeneDetailResponse['data']['meta'] | null>(null);
  const [geneId, setGeneId] = useState<string>('');

  useEffect(() => {
    async function getParams() {
      const resolvedParams = await params;
      setGeneId(resolvedParams.id);
    }
    getParams();
  }, [params]);

  useEffect(() => {
    if (geneId) {
      fetchGeneDetails();
    }
  }, [geneId]);

  const fetchGeneDetails = async () => {
    try {
      const response = await fetch(`/api/genes/${geneId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: 'Gene not found',
            description: 'The requested gene could not be found.',
            variant: 'destructive',
          });
          router.push('/genes');
          return;
        }
        throw new Error('Failed to fetch gene details');
      }

      const data: GeneDetailResponse = await response.json();
      setGene(data.data.gene);
      setStats(data.data.stats);
      setMeta(data.data.meta);
    } catch (error) {
      console.error('Error fetching gene details:', error);
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
      // TODO: Implementare export
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

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!gene || !stats) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
          <h1 className="text-3xl font-bold">{gene.symbol}</h1>
          <p className="text-muted-foreground">{gene.name}</p>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Gene Data
        </Button>
      </div>

      {/* Key Information Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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
              Showing {meta?.variants_shown} of {meta?.total_variants}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clinical Significance</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.pathogenic}</div>
            <p className="text-xs text-muted-foreground">Pathogenic variants</p>
            <div className="mt-2">
              <Progress 
                value={(stats.pathogenic / stats.total_variants) * 100} 
                className="h-2"
              />
            </div>
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
                  <p className="text-sm">{gene.gene_id}</p>
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
                  <p className="text-sm font-medium text-muted-foreground mb-2">External IDs</p>
                  <div className="grid gap-2 md:grid-cols-3">
                    {Object.entries(gene.metadata.externalIds).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <span className="text-sm font-medium capitalize">{key}:</span>
                        <span className="text-sm">{value as string}</span>
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
            </CardHeader>
            <CardContent className="p-0">
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gene.variants.map((variant) => (
                    <TableRow key={variant.id}>
                      <TableCell className="font-medium">
                        <Button
                          variant="link"
                          className="h-auto p-0 text-left"
                          onClick={() => router.push(`/variants/${variant.id}`)}
                        >
                          {variant.variant_id}
                        </Button>
                        {variant.protein_change && (
                          <p className="text-xs text-muted-foreground">{variant.protein_change}</p>
                        )}
                      </TableCell>
                      <TableCell>{parseInt(variant.position).toLocaleString()}</TableCell>
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
                        {variant.frequency ? 
                          (variant.frequency * 100).toFixed(4) + '%' : 
                          '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {meta?.has_more_variants && (
                <div className="p-4 text-center border-t">
                  <p className="text-sm text-muted-foreground mb-2">
                    Showing {meta.variants_shown} of {meta.total_variants} variants
                  </p>
                  <Button variant="outline" size="sm">
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
              <CardTitle>Variant Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { label: 'Pathogenic', value: stats.pathogenic, color: 'bg-red-500' },
                    { label: 'Likely Pathogenic', value: stats.likely_pathogenic, color: 'bg-orange-500' },
                    { label: 'Uncertain Significance', value: stats.uncertain_significance, color: 'bg-yellow-500' },
                    { label: 'Likely Benign', value: stats.likely_benign, color: 'bg-green-500' },
                    { label: 'Benign', value: stats.benign, color: 'bg-green-600' },
                    { label: 'Not Provided', value: stats.not_provided, color: 'bg-gray-400' },
                  ].map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.label}</span>
                        <span>{item.value} ({((item.value / stats.total_variants) * 100).toFixed(1)}%)</span>
                      </div>
                      <Progress 
                        value={(item.value / stats.total_variants) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}