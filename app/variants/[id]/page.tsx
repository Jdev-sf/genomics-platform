'use client';

import { useState, useEffect, use } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

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
  const { id } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [variant, setVariant] = useState<VariantData | null>(null);

  useEffect(() => {
    fetchVariantDetails();
  }, [id]);

  const fetchVariantDetails = async () => {
    try {
      const response = await fetch(`/api/variants/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: 'Variant not found',
            description: 'The requested variant could not be found.',
            variant: 'destructive',
          });
          router.push('/variants');
          return;
        }
        throw new Error('Failed to fetch variant details');
      }

      const data: VariantDetailResponse = await response.json();
      setVariant(data.data);
    } catch (error) {
      console.error('Error fetching variant details:', error);
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

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!variant) {
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
            onClick={() => router.push('/variants')}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Variants
          </Button>
          <h1 className="text-3xl font-bold">{variant.variant_id}</h1>
          <p className="text-muted-foreground">
            {variant.protein_change || `${variant.reference_allele}&gt;${variant.alternate_allele}`}
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Variant Data
        </Button>
      </div>

      {/* Key Information Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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
              View gene details
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Location</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Chr{variant.chromosome}:{parseInt(variant.position).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
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
              className="text-lg px-3 py-1"
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
      </div>

      {/* Variant Details Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="annotations">
            Annotations ({variant.annotations.length})
          </TabsTrigger>
          <TabsTrigger value="related">
            Related Variants ({variant.related_variants.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Variant Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Variant ID</p>
                  <p className="text-sm font-mono">{variant.variant_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="text-sm">{variant.variant_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Consequence</p>
                  <p className="text-sm">{variant.consequence || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Impact</p>
                  {variant.impact ? (
                    <Badge variant={getImpactBadgeVariant(variant.impact)}>
                      {variant.impact}
                    </Badge>
                  ) : (
                    <p className="text-sm">Not specified</p>
                  )}
                </div>
                {variant.transcript_id && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Transcript</p>
                    <p className="text-sm font-mono">{variant.transcript_id}</p>
                  </div>
                )}
                {variant.protein_change && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Protein Change</p>
                    <p className="text-sm font-mono">{variant.protein_change}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Gene Information</p>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Symbol:</span>
                    <span className="text-sm">{variant.gene.symbol}</span>
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
                </div>
              </div>

              {variant.metadata && Object.keys(variant.metadata).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Additional Information</p>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <pre className="text-xs overflow-x-auto">
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
            </CardHeader>
            <CardContent>
              {variant.annotations.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No annotations available for this variant.</p>
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
                              <div key={key} className="flex items-start justify-between py-1">
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
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
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
                            View source
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
              {variant.related_variants.length === 0 ? (
                <div className="text-center py-8">
                  <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No related variants found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variant ID</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Consequence</TableHead>
                      <TableHead>Clinical Significance</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variant.related_variants.map((relatedVariant) => (
                      <TableRow key={relatedVariant.id}>
                        <TableCell className="font-medium">
                          {relatedVariant.variant_id}
                        </TableCell>
                        <TableCell>
                          {parseInt(relatedVariant.position).toLocaleString()}
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
                            onClick={() => router.push(`/variants/${relatedVariant.id}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}