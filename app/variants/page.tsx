'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { LazyTable } from '@/components/lazy-table';
import { ModernHeader } from '@/components/layout/modern-header';

interface Variant {
  id: string;
  variantId: string;
  geneSymbol: string;
  geneName: string;
  chromosome: string;
  position: number;
  referenceAllele: string;
  alternateAllele: string;
  variantType: string;
  consequence: string;
  impact: string;
  proteinChange: string | null;
  transcriptId: string;
  frequency: number | null;
  clinicalSignificance: string;
  createdAt: string;
  updatedAt: string;
}

interface VariantsResponse {
  data: Variant[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function VariantsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [chromosome, setChromosome] = useState(searchParams.get('chromosome') || 'all');
  const [clinicalSignificance, setClinicalSignificance] = useState(searchParams.get('clinicalSignificance') || 'all');
  const [consequence, setConsequence] = useState(searchParams.get('consequence') || 'all');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [pageSize] = useState(parseInt(searchParams.get('pageSize') || '25'));
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'position');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'asc');

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const updateURLParams = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set('search', debouncedSearchQuery);
    if (chromosome && chromosome !== 'all') params.set('chromosome', chromosome);
    if (clinicalSignificance && clinicalSignificance !== 'all') params.set('clinicalSignificance', clinicalSignificance);
    if (consequence && consequence !== 'all') params.set('consequence', consequence);
    if (page > 1) params.set('page', page.toString());
    if (pageSize !== 25) params.set('pageSize', pageSize.toString());
    if (sortBy !== 'position') params.set('sortBy', sortBy);
    if (sortOrder !== 'asc') params.set('sortOrder', sortOrder);

    const newURL = `/variants${params.toString() ? '?' + params.toString() : ''}`;
    router.replace(newURL, { scroll: false });
  }, [debouncedSearchQuery, chromosome, clinicalSignificance, consequence, page, pageSize, sortBy, sortOrder, router]);

  const fetchVariants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        ...(chromosome && chromosome !== 'all' && { chromosome }),
        ...(clinicalSignificance && clinicalSignificance !== 'all' && { clinicalSignificance }),
        ...(consequence && consequence !== 'all' && { consequence }),
      });

      const response = await fetch(`/api/variants?${params}`);
      if (!response.ok) throw new Error('Failed to fetch variants');

      const data: VariantsResponse = await response.json();
      setVariants(data.data);
      setTotal(data.total);
    } catch (error) {
      console.error('Error fetching variants:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch variants. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearchQuery, chromosome, clinicalSignificance, consequence, sortBy, sortOrder, toast]);

  useEffect(() => {
    fetchVariants();
    updateURLParams();
  }, [fetchVariants, updateURLParams]);

  const handleSort = (column: string) => {
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(column);
    setSortOrder(newSortOrder);
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv',
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        ...(chromosome && chromosome !== 'all' && { chromosome }),
        ...(clinicalSignificance && clinicalSignificance !== 'all' && { clinicalSignificance }),
        ...(consequence && consequence !== 'all' && { consequence }),
      });

      const response = await fetch(`/api/variants/export?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `variants-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Export completed',
        description: 'Variants data has been exported successfully.',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export variants data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getClinicalSignificanceBadge = (significance: string) => {
    const normalizedSig = significance?.toLowerCase() || '';
    if (normalizedSig.includes('pathogenic')) {
      return normalizedSig.includes('likely') 
        ? <Badge variant="secondary" className="bg-orange-100 text-orange-800">Likely Pathogenic</Badge>
        : <Badge variant="destructive">Pathogenic</Badge>;
    }
    if (normalizedSig.includes('benign')) {
      return normalizedSig.includes('likely')
        ? <Badge variant="secondary" className="bg-green-100 text-green-800">Likely Benign</Badge>
        : <Badge variant="secondary" className="bg-green-100 text-green-800">Benign</Badge>;
    }
    if (normalizedSig.includes('uncertain')) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Uncertain</Badge>;
    }
    return <Badge variant="outline">{significance || 'Unknown'}</Badge>;
  };

  const getImpactBadge = (impact: string) => {
    const impactColors = {
      HIGH: 'bg-red-100 text-red-800',
      MODERATE: 'bg-orange-100 text-orange-800',
      LOW: 'bg-yellow-100 text-yellow-800',
      MODIFIER: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <Badge variant="secondary" className={impactColors[impact as keyof typeof impactColors] || 'bg-gray-100 text-gray-800'}>
        {impact}
      </Badge>
    );
  };

  const chromosomes = useMemo(() => {
    const chroms = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 
                   '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', 'X', 'Y'];
    return chroms;
  }, []);

  const clinicalSignificanceOptions = [
    'Pathogenic',
    'Likely Pathogenic',
    'Uncertain significance',
    'Likely Benign',
    'Benign'
  ];

  const consequenceOptions = [
    'missense_variant',
    'nonsense_variant',
    'frameshift_variant',
    'splice_site_variant',
    'synonymous_variant',
    'intron_variant',
    'upstream_variant',
    'downstream_variant'
  ];

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <ModernHeader />
      <div className="container mx-auto py-6 space-y-6 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Variants Database</h1>
            <p className="text-muted-foreground">
              Explore genetic variants and their clinical significance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport} disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search variants or genes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Chromosome</label>
                <Select value={chromosome} onValueChange={setChromosome}>
                  <SelectTrigger>
                    <SelectValue placeholder="All chromosomes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All chromosomes</SelectItem>
                    {chromosomes.map((chr) => (
                      <SelectItem key={chr} value={chr}>
                        Chromosome {chr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Clinical Significance</label>
                <Select value={clinicalSignificance} onValueChange={setClinicalSignificance}>
                  <SelectTrigger>
                    <SelectValue placeholder="All significances" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All significances</SelectItem>
                    {clinicalSignificanceOptions.map((sig) => (
                      <SelectItem key={sig} value={sig}>
                        {sig}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Consequence</label>
                <Select value={consequence} onValueChange={setConsequence}>
                  <SelectTrigger>
                    <SelectValue placeholder="All consequences" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All consequences</SelectItem>
                    {consequenceOptions.map((cons) => (
                      <SelectItem key={cons} value={cons}>
                        {cons.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(debouncedSearchQuery || (chromosome && chromosome !== 'all') || (clinicalSignificance && clinicalSignificance !== 'all') || (consequence && consequence !== 'all')) && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {debouncedSearchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Search: {debouncedSearchQuery}
                    <button
                      onClick={() => setSearchQuery('')}
                      className="ml-1 hover:bg-background rounded-full"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {chromosome && chromosome !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Chr {chromosome}
                    <button
                      onClick={() => setChromosome('all')}
                      className="ml-1 hover:bg-background rounded-full"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {clinicalSignificance && clinicalSignificance !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {clinicalSignificance}
                    <button
                      onClick={() => setClinicalSignificance('all')}
                      className="ml-1 hover:bg-background rounded-full"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {consequence && consequence !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {consequence.replace(/_/g, ' ')}
                    <button
                      onClick={() => setConsequence('all')}
                      className="ml-1 hover:bg-background rounded-full"
                    >
                      ×
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                {loading ? (
                  'Loading...'
                ) : (
                  `${(total || 0).toLocaleString()} variants found`
                )}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading variants...
              </div>
            ) : variants.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer select-none"
                          onClick={() => handleSort('variantId')}
                        >
                          Variant ID {sortBy === 'variantId' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer select-none"
                          onClick={() => handleSort('geneSymbol')}
                        >
                          Gene {sortBy === 'geneSymbol' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer select-none"
                          onClick={() => handleSort('position')}
                        >
                          Position {sortBy === 'position' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead>Change</TableHead>
                        <TableHead>Consequence</TableHead>
                        <TableHead>Impact</TableHead>
                        <TableHead>Clinical Significance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.map((variant) => (
                        <TableRow 
                          key={variant.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/variants/${variant.id}`)}
                        >
                          <TableCell className="font-mono text-sm">
                            <span className="text-blue-600 hover:text-blue-800 font-semibold">
                              {variant.variantId}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-blue-600">{variant.geneSymbol}</div>
                              <div className="text-sm text-muted-foreground truncate max-w-32">
                                {variant.geneName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              Chr {variant.chromosome}:{(variant.position || 0).toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {variant.referenceAllele}→{variant.alternateAllele}
                            {variant.proteinChange && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {variant.proteinChange}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{variant.consequence?.replace(/_/g, ' ')}</span>
                          </TableCell>
                          <TableCell>
                            {getImpactBadge(variant.impact)}
                          </TableCell>
                          <TableCell>
                            {getClinicalSignificanceBadge(variant.clinicalSignificance)}
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

                {/* Pagination */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {(total || 0).toLocaleString()} variants
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      {totalPages > 5 && (
                        <>
                          <span className="text-muted-foreground">...</span>
                          <Button
                            variant={page === totalPages ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(totalPages)}
                            className="w-8 h-8 p-0"
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No variants found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search criteria or filters.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}