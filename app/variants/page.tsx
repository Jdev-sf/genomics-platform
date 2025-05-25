'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Activity, Search, Filter, Download, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useDebounce } from '@/hooks/use-debounce';

interface VariantGene {
  id: string;
  symbol: string;
  name: string;
}

interface Variant {
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
  clinical_significance: string;
  frequency: number | null;
  annotations_count: number;
}

interface VariantsResponse {
  status: string;
  data: Variant[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const CLINICAL_SIGNIFICANCES = [
  'Pathogenic',
  'Likely pathogenic',
  'Uncertain significance',
  'Likely benign',
  'Benign'
];

const IMPACTS = ['HIGH', 'MODERATE', 'LOW', 'MODIFIER'];

export default function VariantsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<VariantsResponse['meta'] | null>(null);
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [chromosome, setChromosome] = useState(searchParams.get('chromosome') || 'all');
  const [clinicalSignificance, setClinicalSignificance] = useState(searchParams.get('clinicalSignificance') || 'all');
  const [impact, setImpact] = useState(searchParams.get('impact') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'position');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'asc');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));

  const debouncedSearch = useDebounce(search, 500);

  const updateUrlParams = useCallback((params: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'all') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });

    router.push(`/variants?${newParams.toString()}`);
  }, [searchParams, router]);

  const fetchVariants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (chromosome && chromosome !== 'all') params.set('chromosome', chromosome);
      if (clinicalSignificance && clinicalSignificance !== 'all') params.set('clinicalSignificance', clinicalSignificance);
      if (impact && impact !== 'all') params.set('impact', impact);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const response = await fetch(`/api/variants?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch variants');
      }

      const data: VariantsResponse = await response.json();
      setVariants(data.data);
      setMeta(data.meta);
    } catch (error) {
      console.error('Error fetching variants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load variants. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, chromosome, clinicalSignificance, impact, sortBy, sortOrder, toast]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  useEffect(() => {
    updateUrlParams({
      search: debouncedSearch,
      chromosome,
      clinicalSignificance,
      impact,
      sortBy,
      sortOrder,
      page: page.toString(),
    });
  }, [debouncedSearch, chromosome, clinicalSignificance, impact, sortBy, sortOrder, page, updateUrlParams]);

  const handleVariantClick = (variantId: string) => {
    router.push(`/variants/${variantId}`);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Variants Database</h1>
          <p className="text-muted-foreground mt-1">
            Browse and search genetic variants
          </p>
        </div>
        <Button onClick={() => {}} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search variants, genes, or protein changes..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            <Select
              value={chromosome}
              onValueChange={(value) => {
                setChromosome(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Chromosomes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chromosomes</SelectItem>
                {[...Array(22)].map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    Chr {i + 1}
                  </SelectItem>
                ))}
                <SelectItem value="X">Chr X</SelectItem>
                <SelectItem value="Y">Chr Y</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={clinicalSignificance}
              onValueChange={(value) => {
                setClinicalSignificance(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Significances" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Significances</SelectItem>
                {CLINICAL_SIGNIFICANCES.map((sig) => (
                  <SelectItem key={sig} value={sig}>
                    {sig}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={impact}
              onValueChange={(value) => {
                setImpact(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Impacts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Impacts</SelectItem>
                {IMPACTS.map((imp) => (
                  <SelectItem key={imp} value={imp}>
                    {imp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : variants.length === 0 ? (
            <div className="text-center p-12">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No variants found matching your criteria.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant ID</TableHead>
                  <TableHead>Gene</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Consequence</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Clinical Significance</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant) => (
                  <TableRow 
                    key={variant.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleVariantClick(variant.id)}
                  >
                    <TableCell className="font-medium">
                      <span className="text-primary hover:underline">
                        {variant.variant_id}
                      </span>
                      {variant.protein_change && (
                        <p className="text-xs text-muted-foreground">{variant.protein_change}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{variant.gene.symbol}</span>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {variant.gene.name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        Chr{variant.chromosome}:{parseInt(variant.position).toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {variant.reference_allele}&gt;{variant.alternate_allele}
                    </TableCell>
                    <TableCell className="text-sm">
                      {variant.consequence || '-'}
                    </TableCell>
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
                    <TableCell className="text-sm">
                      {variant.frequency ? 
                        (variant.frequency * 100).toFixed(4) + '%' : 
                        '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVariantClick(variant.id);
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(meta.page - 1) * meta.limit + 1} to{' '}
            {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} variants
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={!meta.hasPrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              <span className="text-sm">
                Page {meta.page} of {meta.totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!meta.hasNextPage}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}