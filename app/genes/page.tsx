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
import { LazyTable } from '@/components/lazy-table';

interface Gene {
  id: string;
  gene_id: string;
  symbol: string;
  name: string;
  chromosome: string;
  start_position: string | null;
  end_position: string | null;
  variant_count: number;
  pathogenic_count: number;
}

interface GenesResponse {
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

  // Stati
  const [genes, setGenes] = useState<Gene[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<GenesResponse['meta'] | null>(null);
  
  // Filtri e ricerca
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [chromosome, setChromosome] = useState(searchParams.get('chromosome') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'symbol');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'asc');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));

  const debouncedSearch = useDebounce(search, 500);

  // Memoized sort handler
  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  }, [sortBy, sortOrder]);

  // Memoized gene click handler
  const handleGeneClick = useCallback((geneId: string) => {
    router.push(`/genes/${geneId}`);
  }, [router]);

  // Funzione per aggiornare URL con parametri
  const updateUrlParams = useCallback((params: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'all') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });

    router.push(`/genes?${newParams.toString()}`);
  }, [searchParams, router]);

  // Fetch genes
  const fetchGenes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (chromosome && chromosome !== 'all') params.set('chromosome', chromosome);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const response = await fetch(`/api/genes?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch genes');
      }

      const data: GenesResponse = await response.json();
      setGenes(data.data);
      setMeta(data.meta);
    } catch (error) {
      console.error('Error fetching genes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load genes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, chromosome, sortBy, sortOrder, toast]);

  // Effect per fetch iniziale e quando cambiano i parametri
  useEffect(() => {
    fetchGenes();
  }, [fetchGenes]);

  // Effect per aggiornare URL quando cambiano i filtri
  useEffect(() => {
    updateUrlParams({
      search: debouncedSearch,
      chromosome,
      sortBy,
      sortOrder,
      page: page.toString(),
    });
  }, [debouncedSearch, chromosome, sortBy, sortOrder, page, updateUrlParams]);

  // Handlers già definiti sopra, rimuoviamo i duplicati

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.set('type', 'genes');
      params.set('format', 'csv');
      
      if (debouncedSearch || chromosome !== 'all') {
        const filters: any = {};
        if (debouncedSearch) filters.search = debouncedSearch;
        if (chromosome !== 'all') filters.chromosome = chromosome;
        params.set('filters', JSON.stringify(filters));
      }

      const response = await fetch(`/api/export?${params.toString()}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `genes_export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: 'Export Successful',
          description: 'Your gene data has been exported.',
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Unable to export data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Genes Database</h1>
          <p className="text-muted-foreground mt-1">
            Browse and search genomic data
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by symbol, name, or ID..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Chromosome Filter */}
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
                    Chromosome {i + 1}
                  </SelectItem>
                ))}
                <SelectItem value="X">Chromosome X</SelectItem>
                <SelectItem value="Y">Chromosome Y</SelectItem>
                <SelectItem value="MT">Mitochondrial</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field);
                setSortOrder(order);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="symbol-asc">Symbol (A-Z)</SelectItem>
                <SelectItem value="symbol-desc">Symbol (Z-A)</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="variantCount-desc">Most Variants</SelectItem>
                <SelectItem value="variantCount-asc">Least Variants</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : genes.length === 0 ? (
            <div className="text-center p-12">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No genes found matching your criteria.</p>
            </div>
          ) : (
            <LazyTable>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('symbol')}
                    >
                      Symbol
                      {sortBy === 'symbol' && (
                        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Chromosome</TableHead>
                    <TableHead className="text-right">Variants</TableHead>
                    <TableHead className="text-right">Pathogenic</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {genes.map((gene) => (
                    <TableRow 
                      key={gene.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleGeneClick(gene.id)}
                    >
                      <TableCell className="font-medium">
                        <span className="text-primary hover:underline">
                          {gene.symbol}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {gene.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          Chr {gene.chromosome}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {gene.variant_count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-destructive font-medium">
                          {gene.pathogenic_count.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGeneClick(gene.id);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </LazyTable>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(meta.page - 1) * meta.limit + 1} to{' '}
            {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} genes
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