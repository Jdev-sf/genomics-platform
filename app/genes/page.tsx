// app/genes/page.tsx - AGGIORNATO CON NUOVE UX FEATURES
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Database, Download, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { ModernHeader } from '@/components/layout/modern-header';
import { useGenes, usePrefetchGeneDetail } from '@/hooks/queries/use-genes';

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
import { QuickHelp, DetailedHelp, HelpSuggestions } from '@/components/contextual-help';
import { useToast } from '@/hooks/use-toast';

export default function GenesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const prefetchGeneDetail = usePrefetchGeneDetail();

  // State from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [chromosome, setChromosome] = useState(searchParams.get('chromosome') || 'all');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [pageSize] = useState(parseInt(searchParams.get('pageSize') || '25'));
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'symbol');
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
    page,
    limit: pageSize,
    sortBy,
    sortOrder,
  }), [debouncedSearch, chromosome, page, pageSize, sortBy, sortOrder]);

  // Use React Query hook
  const { 
    data, 
    isLoading, 
    error, 
    isFetching,
    isPlaceholderData 
  } = useGenes(queryParams);

  const genes = data?.genes || [];
  const meta = data?.meta || { total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false };

  // BULK SELECTION - NEW UX FEATURE
  const bulkSelection = useBulkSelection(genes, (gene) => gene.id);

  // Handle bulk operations
  const handleBulkAction = useCallback(async (actionId: string, selectedIds: string[]) => {
    switch (actionId) {
      case 'export':
        // Export selected genes
        const params = new URLSearchParams({
          format: 'csv',
          ids: selectedIds.join(','),
        });
        
        const response = await fetch(`/api/genes/export?${params}`);
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `selected-genes-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        break;
        
      case 'copy':
        await navigator.clipboard.writeText(selectedIds.join('\n'));
        break;
        
      case 'share':
        const shareUrl = `${window.location.origin}/genes?ids=${selectedIds.join(',')}`;
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
    if (page > 1) params.set('page', page.toString());
    if (pageSize !== 25) params.set('pageSize', pageSize.toString());
    if (sortBy !== 'symbol') params.set('sortBy', sortBy);
    if (sortOrder !== 'asc') params.set('sortOrder', sortOrder);

    const newURL = `/genes${params.toString() ? '?' + params.toString() : ''}`;
    router.replace(newURL, { scroll: false });
  }, [debouncedSearch, chromosome, page, pageSize, sortBy, sortOrder, router]);

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
      });

      const response = await fetch(`/api/genes/export?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `genes-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Export completed',
        description: 'Genes data has been exported successfully.',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export genes data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const chromosomes = useMemo(() => {
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 
            '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', 'X', 'Y'];
  }, []);

  const handleRowClick = (geneId: string) => {
    router.push(`/genes/${geneId}`);
  };

  const handleRowHover = (geneId: string) => {
    prefetchGeneDetail(geneId);
  };

  // SMART SEARCH HANDLER - NEW UX FEATURE
  const handleSearchSelect = (suggestion: any) => {
    if (suggestion.type === 'gene') {
      const geneId = suggestion.id.replace('gene-', '');
      router.push(`/genes/${geneId}`);
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
              <CardTitle className="text-red-600">Error Loading Genes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                {error instanceof Error ? error.message : 'Failed to load genes'}
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
    <BulkOperationsProvider items={genes} getItemId={(gene) => gene.id}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        
        <div className="container mx-auto py-6 space-y-6 px-4">
          {/* Header with Contextual Help */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">Genes Database</h1>
              <QuickHelp topic="gene-expression" />
            </div>
            <div className="flex items-center gap-2">
              <DetailedHelp 
                topic="gene-expression" 
                trigger="custom"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Learn about genes
              </DetailedHelp>
              <Button variant="outline" onClick={handleExport} disabled={isLoading}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Filters with Smart Search */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Search & Filter</CardTitle>
                <QuickHelp topic="keyboard-shortcuts" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {/* SMART SEARCH - NEW UX FEATURE */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <SmartSearch
                    placeholder="Search by gene symbol or name..."
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
                  <label className="text-sm font-medium mb-2 block">Sort by</label>
                  <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                    const [newSortBy, newSortOrder] = value.split('-');
                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder as 'asc' | 'desc');
                    setPage(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="symbol-asc">Symbol (A-Z)</SelectItem>
                      <SelectItem value="symbol-desc">Symbol (Z-A)</SelectItem>
                      <SelectItem value="variantCount-desc">Most variants</SelectItem>
                      <SelectItem value="variantCount-asc">Least variants</SelectItem>
                      <SelectItem value="pathogenicCount-desc">Most pathogenic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(debouncedSearch || (chromosome && chromosome !== 'all')) && (
                <div className="flex items-center gap-2">
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
                </div>
              )}
            </CardContent>
          </Card>

          {/* BULK OPERATIONS - NEW UX FEATURE */}
          <BulkOperations
            items={genes}
            selectedItems={bulkSelection.selectedItems}
            onSelectionChange={bulkSelection.setSelection}
            onBulkAction={handleBulkAction}
            getItemId={(gene) => gene.id}
            getItemLabel={(gene) => gene.symbol}
          />

          {/* Results */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Loading genes...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {isFetching && !isLoading && (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      )}
                      {meta.total.toLocaleString()} genes found
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
                <TableSkeleton rows={pageSize} columns={6} />
              ) : genes.length > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={bulkSelection.selectedItems.length === genes.length}
                              onCheckedChange={() => {
                                if (bulkSelection.selectedItems.length === genes.length) {
                                  bulkSelection.clearSelection();
                                } else {
                                  bulkSelection.selectAll();
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer select-none"
                            onClick={() => handleSort('symbol')}
                          >
                            Symbol {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead 
                            className="cursor-pointer select-none"
                            onClick={() => handleSort('chromosome')}
                          >
                            Location {sortBy === 'chromosome' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer select-none text-right"
                            onClick={() => handleSort('variantCount')}
                          >
                            Variants {sortBy === 'variantCount' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer select-none text-right"
                            onClick={() => handleSort('pathogenicCount')}
                          >
                            Pathogenic {sortBy === 'pathogenicCount' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {genes.map((gene) => (
                          <SelectableTableRow
                            key={gene.id}
                            isSelected={bulkSelection.isSelected(gene.id)}
                            onToggleSelection={() => bulkSelection.toggleSelection(gene.id)}
                            className="cursor-pointer"
                          >
                            <TableCell className="font-medium">
                              <span 
                                className="text-blue-600 hover:text-blue-800 font-semibold"
                                onClick={() => handleRowClick(gene.id)}
                                onMouseEnter={() => handleRowHover(gene.id)}
                              >
                                {gene.symbol}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{gene.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {gene.biotype}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">
                                Chr {gene.chromosome}:{gene.startPosition ? parseInt(gene.startPosition).toLocaleString() : 'N/A'}-{gene.endPosition ? parseInt(gene.endPosition).toLocaleString() : 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {(gene.variantCount || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-mono ${(gene.pathogenicCount || 0) > 0 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                                {(gene.pathogenicCount || 0).toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(gene.id);
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
                      Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, meta.total)} of {meta.total.toLocaleString()} genes
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
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No genes found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search criteria or filters.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Context-aware Help for this page */}
          <HelpSuggestions page="genes" />
        </div>
      </div>
    </BulkOperationsProvider>
  );
}