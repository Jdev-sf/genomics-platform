'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Database, Search, Filter, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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
import { ModernHeader } from '@/components/layout/modern-header';

interface Gene {
  id: string;
  symbol: string;
  name: string;
  chromosome: string;
  startPosition: string | null;
  endPosition: string | null;
  strand: string;
  biotype: string;
  description: string;
  variantCount: number;
  pathogenicCount: number;
  createdAt: string;
  updatedAt: string;
}

interface GenesResponse {
  error: string;
  status: string;
  data: Gene[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export default function GenesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [genes, setGenes] = useState<Gene[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [chromosome, setChromosome] = useState(searchParams.get('chromosome') || 'all');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [pageSize] = useState(parseInt(searchParams.get('pageSize') || '25'));
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'symbol');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'asc');

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const updateURLParams = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set('search', debouncedSearchQuery);
    if (chromosome && chromosome !== 'all') params.set('chromosome', chromosome);
    if (page > 1) params.set('page', page.toString());
    if (pageSize !== 25) params.set('pageSize', pageSize.toString());
    if (sortBy !== 'symbol') params.set('sortBy', sortBy);
    if (sortOrder !== 'asc') params.set('sortOrder', sortOrder);

    const newURL = `/genes${params.toString() ? '?' + params.toString() : ''}`;
    router.replace(newURL, { scroll: false });
  }, [debouncedSearchQuery, chromosome, page, pageSize, sortBy, sortOrder, router]);

  const fetchGenes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder,
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        ...(chromosome && chromosome !== 'all' && { chromosome }),
      });

      const response = await fetch(`/api/genes?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: GenesResponse = await response.json();
      
      if (data.status !== 'success') {
        throw new Error(data.error || 'API returned error status');
      }

      setGenes(data.data || []);
      setTotal(data.meta?.total || 0);
      setTotalPages(data.meta?.totalPages || 0);

    } catch (error) {
      console.error('Error fetching genes:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch genes. Please try again.',
        variant: 'destructive',
      });
      setGenes([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearchQuery, chromosome, sortBy, sortOrder, toast]);

  useEffect(() => {
    fetchGenes();
    updateURLParams();
  }, [fetchGenes, updateURLParams]);

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
    const chroms = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 
                   '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', 'X', 'Y'];
    return chroms;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <ModernHeader />
      <div className="container mx-auto py-6 space-y-6 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Genes Database</h1>
            <p className="text-muted-foreground">
              Explore and analyze human genes with AI-powered insights
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
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by gene symbol or name..."
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
                <label className="text-sm font-medium mb-2 block">Sort by</label>
                <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                  const [newSortBy, newSortOrder] = value.split('-');
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
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

            {(debouncedSearchQuery || (chromosome && chromosome !== 'all')) && (
              <div className="flex items-center gap-2">
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
                  `${total.toLocaleString()} genes found`
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
                Loading genes...
              </div>
            ) : genes.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                        <TableRow 
                          key={gene.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/genes/${gene.id}`)}
                        >
                          <TableCell className="font-medium">
                            <span className="text-blue-600 hover:text-blue-800 font-semibold">
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
                                router.push(`/genes/${gene.id}`);
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
                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total.toLocaleString()} genes
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
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No genes found</h3>
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