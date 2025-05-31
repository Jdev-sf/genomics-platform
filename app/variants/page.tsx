// app/variants/page.tsx - UPDATED WITH UX IMPROVEMENTS
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Activity, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { ModernHeader } from '@/components/layout/modern-header';
import { useVariants, usePrefetchVariantDetail } from '@/hooks/queries/use-variants';

// NEW UX COMPONENTS
import { SmartSearch } from '@/components/smart-search';
import { TableSkeleton } from '@/components/ui/skeleton-loaders';
import { 
  BulkOperations, 
  useBulkSelection, 
  SelectableTableRow,
  BulkOperationsProvider 
} from '@/components/bulk-operations';
import { Checkbox } from '@/components/ui/checkbox';

const clinicalSignificanceColors: Record<string, string> = {
  'Pathogenic': 'bg-red-100 text-red-800 border-red-200',
  'Likely pathogenic': 'bg-orange-100 text-orange-800 border-orange-200',
  'Uncertain significance': 'bg-gray-100 text-gray-800 border-gray-200',
  'Likely benign': 'bg-green-100 text-green-800 border-green-200',
  'Benign': 'bg-green-100 text-green-800 border-green-200',
};

// Types (add at top of file after imports)
interface VariantData {
  id: string;
  variant_id: string;
  gene: {
    id: string;
    symbol: string;
    name: string;
    chromosome: string;
  };
  chromosome: string;
  position: string;
  reference_allele?: string;
  alternate_allele?: string;
  protein_change?: string;
  clinical_significance?: string;
  impact?: string;
  variant_type?: string;
  frequency?: number;
}

export default function VariantsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const prefetchVariantDetail = usePrefetchVariantDetail();

  // State from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [chromosome, setChromosome] = useState(searchParams.get('chromosome') || 'all');
  const [clinicalSig, setClinicalSig] = useState(searchParams.get('clinicalSignificance') || 'all');
  const [impact, setImpact] = useState(searchParams.get('impact') || 'all');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [pageSize] = useState(parseInt(searchParams.get('pageSize') || '25'));
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'position');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc'
  );

  // Debounced search query
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Build query params
  const queryParams = useMemo(() => ({
    search: debouncedSearch || undefined,
    chromosome: chromosome !== 'all' ? chromosome : undefined,
    clinicalSignificance: clinicalSig !== 'all' ? [clinicalSig] : undefined,
    impact: impact !== 'all' ? [impact] : undefined,
    page,
    limit: pageSize,
    sortBy,
    sortOrder,
  }), [debouncedSearch, chromosome, clinicalSig, impact, page, pageSize, sortBy, sortOrder]);

  // Use React Query hook
  const { 
    data, 
    isLoading, 
    error, 
    isFetching,
    isPlaceholderData 
  } = useVariants(queryParams);

  const variants: VariantData[] = data?.variants || [];
  const meta = data?.meta || { total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false };

  // BULK SELECTION - NEW UX FEATURE
  const bulkSelection = useBulkSelection(variants, (variant: VariantData) => variant.id);

  // Handle bulk operations
  const handleBulkAction = useCallback(async (actionId: string, selectedIds: string[]) => {
    switch (actionId) {
      case 'export':
        const params = new URLSearchParams({
          format: 'csv',
          ids: selectedIds.join(','),
        });
        
        const response = await fetch(`/api/variants/export?${params}`);
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `selected-variants-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        break;
        
      case 'copy':
        await navigator.clipboard.writeText(selectedIds.join('\n'));
        break;
        
      case 'share':
        const shareUrl = `${window.location.origin}/variants?ids=${selectedIds.join(',')}`;
        await navigator.clipboard.writeText(shareUrl);
        break;
        
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }, []);

  // Update URL when params change
  const updateURL = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (chromosome && chromosome !== 'all') params.set('chromosome', chromosome);
    if (clinicalSig && clinicalSig !== 'all') params.set('clinicalSignificance', clinicalSig);
    if (impact && impact !== 'all') params.set('impact', impact);
    if (page > 1) params.set('page', page.toString());
    if (pageSize !== 25) params.set('pageSize', pageSize.toString());
    if (sortBy !== 'position') params.set('sortBy', sortBy);
    if (sortOrder !== 'asc') params.set('sortOrder', sortOrder);

    const newURL = `/variants${params.toString() ? '?' + params.toString() : ''}`;
    router.replace(newURL, { scroll: false });
  }, [debouncedSearch, chromosome, clinicalSig, impact, page, pageSize, sortBy, sortOrder, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => updateURL(), 300);
    return () => clearTimeout(timer);
  }, [updateURL]);

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
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(chromosome && chromosome !== 'all' && { chromosome }),
        ...(clinicalSig && clinicalSig !== 'all' && { clinicalSignificance: clinicalSig }),
        ...(impact && impact !== 'all' && { impact }),
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

  const chromosomes = useMemo(() => {
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 
            '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', 'X', 'Y'];
  }, []);

  const clinicalSignificanceOptions = [
    'Pathogenic',
    'Likely pathogenic', 
    'Uncertain significance',
    'Likely benign',
    'Benign'
  ];

  const impactOptions = ['HIGH', 'MODERATE', 'LOW', 'MODIFIER'];

  // Handle row interactions
  const handleRowClick = (variantId: string) => {
    router.push(`/variants/${variantId}`);
  };

  const handleRowHover = (variantId: string) => {
    prefetchVariantDetail(variantId);
  };

  // SMART SEARCH HANDLER - NEW UX FEATURE
  const handleSearchSelect = (suggestion: any) => {
    if (suggestion.type === 'variant') {
      const variantId = suggestion.id.replace('variant-', '');
      router.push(`/variants/${variantId}`);
    } else if (suggestion.type === 'gene') {
      // Search for variants in this gene
      setSearchQuery(suggestion.title);
    } else {
      setSearchQuery(suggestion.title);
    }
  };

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <ModernHeader />
        <div className="container mx-auto py-6">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-red-600">Error Loading Variants</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                {error instanceof Error ? error.message : 'Failed to load variants'}
              </p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <BulkOperationsProvider items={variants} getItemId={(variant: VariantData) => variant.id}>
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
              <Button variant="outline" onClick={handleExport} disabled={isLoading}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Filters with Smart Search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search & Filter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* SMART SEARCH - NEW UX FEATURE */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <SmartSearch
                    placeholder="Search variants, genes..."
                    onSelect={handleSearchSelect}
                    className="w-full"
                  />
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
                  <Select value={clinicalSig} onValueChange={setClinicalSig}>
                    <SelectTrigger>
                      <SelectValue placeholder="All significance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All significance</SelectItem>
                      {clinicalSignificanceOptions.map((sig) => (
                        <SelectItem key={sig} value={sig}>
                          {sig}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Impact</label>
                  <Select value={impact} onValueChange={setImpact}>
                    <SelectTrigger>
                      <SelectValue placeholder="All impacts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All impacts</SelectItem>
                      {impactOptions.map((imp) => (
                        <SelectItem key={imp} value={imp}>
                          {imp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active filters display */}
              {(debouncedSearch || (chromosome && chromosome !== 'all') || 
                (clinicalSig && clinicalSig !== 'all') || (impact && impact !== 'all')) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {debouncedSearch && (
                    <Badge variant="secondary" className="gap-1">
                      Search: {debouncedSearch}
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
                  {clinicalSig && clinicalSig !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      {clinicalSig}
                      <button
                        onClick={() => setClinicalSig('all')}
                        className="ml-1 hover:bg-background rounded-full"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {impact && impact !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      {impact}
                      <button
                        onClick={() => setImpact('all')}
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

          {/* BULK OPERATIONS - NEW UX FEATURE */}
          <BulkOperations
            items={variants}
            selectedItems={bulkSelection.selectedItems}
            onSelectionChange={bulkSelection.setSelection}
            onBulkAction={handleBulkAction}
            getItemId={(variant: VariantData) => variant.id}
            getItemLabel={(variant: VariantData) => variant.variant_id}
          />

          {/* Results */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading variants...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {isFetching && !isLoading && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                      {meta.total.toLocaleString()} variants found
                    </div>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Page {page} of {meta.totalPages}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                // SKELETON LOADING - NEW UX FEATURE
                <TableSkeleton rows={pageSize} columns={7} />
              ) : variants.length > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={bulkSelection.selectedItems.length === variants.length}
                              onCheckedChange={() => {
                                if (bulkSelection.selectedItems.length === variants.length) {
                                  bulkSelection.clearSelection();
                                } else {
                                  bulkSelection.selectAll();
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>Variant ID</TableHead>
                          <TableHead>Gene</TableHead>
                          <TableHead 
                            className="cursor-pointer select-none"
                            onClick={() => handleSort('position')}
                          >
                            Position {sortBy === 'position' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </TableHead>
                          <TableHead>Change</TableHead>
                          <TableHead>Clinical Significance</TableHead>
                          <TableHead>Impact</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {variants.map((variant: VariantData) => (
                          <SelectableTableRow
                            key={variant.id}
                            isSelected={bulkSelection.isSelected(variant.id)}
                            onToggleSelection={() => bulkSelection.toggleSelection(variant.id)}
                            className="cursor-pointer"
                          >
                            <TableCell className="font-mono text-sm">
                              <span 
                                className="text-blue-600 hover:text-blue-800"
                                onClick={() => handleRowClick(variant.id)}
                                onMouseEnter={() => handleRowHover(variant.id)}
                              >
                                {variant.variant_id}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-blue-600">
                                  {variant.gene.symbol}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {variant.gene.name}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">
                                Chr {variant.chromosome}:{parseInt(variant.position).toLocaleString()}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {variant.reference_allele || 'N/A'} → {variant.alternate_allele || 'N/A'}
                              {variant.protein_change && (
                                <div className="text-xs text-muted-foreground">
                                  {variant.protein_change}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={`text-xs ${clinicalSignificanceColors[variant.clinical_significance || ''] || 'bg-gray-100 text-gray-800'}`}
                                variant="outline"
                              >
                                {variant.clinical_significance || 'Unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={variant.impact === 'HIGH' ? 'destructive' : 
                                       variant.impact === 'MODERATE' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {variant.impact || 'Unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(variant.id);
                                }}
                              >
                                View
                              </Button>
                            </TableCell>
                          </SelectableTableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, meta.total)} of {meta.total.toLocaleString()} variants
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={!meta.hasPrevPage || isPlaceholderData}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              className="w-8 h-8 p-0"
                              disabled={isPlaceholderData}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                        {meta.totalPages > 5 && (
                          <>
                            <span className="text-muted-foreground">...</span>
                            <Button
                              variant={page === meta.totalPages ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(meta.totalPages)}
                              className="w-8 h-8 p-0"
                              disabled={isPlaceholderData}
                            >
                              {meta.totalPages}
                            </Button>
                          </>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
                        disabled={!meta.hasNextPage || isPlaceholderData}
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
    </BulkOperationsProvider>
  );
}