// hooks/queries/use-genes.ts
import { useQuery, useMutation, useQueryClient, useInfiniteQuery, QueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { GeneSearchParams } from '@/lib/services/gene-service';

// Types for API responses
interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  meta?: any;
  error?: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface Gene {
  id: string;
  symbol: string;
  name: string;
  chromosome: string;
  variantCount: number;
  pathogenicCount: number;
  [key: string]: any;
}

interface GeneDetail {
  gene: any;
  stats: any;
  meta: any;
}

// API Functions
const genesApi = {
  // Fetch genes list with filters
  async fetchGenes(params: GeneSearchParams = {}): Promise<ApiResponse<Gene[]>> {
    const searchParams = new URLSearchParams();
    
    if (params.search) searchParams.append('search', params.search);
    if (params.chromosome) searchParams.append('chromosome', params.chromosome);
    if (params.biotype) searchParams.append('biotype', params.biotype);
    if (params.hasVariants !== undefined) searchParams.append('hasVariants', String(params.hasVariants));
    if (params.page) searchParams.append('page', String(params.page));
    if (params.limit) searchParams.append('limit', String(params.limit));
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const response = await fetch(`/api/genes?${searchParams}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  // Fetch single gene with details
  async fetchGeneDetail(id: string): Promise<ApiResponse<GeneDetail>> {
    const response = await fetch(`/api/genes/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  // Update gene
  async updateGene(id: string, data: Partial<Gene>): Promise<ApiResponse<Gene>> {
    const response = await fetch(`/api/genes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },
};

// Query Keys Factory
export const geneKeys = {
  all: ['genes'] as const,
  lists: () => [...geneKeys.all, 'list'] as const,
  list: (params: GeneSearchParams) => [...geneKeys.lists(), params] as const,
  details: () => [...geneKeys.all, 'detail'] as const,
  detail: (id: string) => [...geneKeys.details(), id] as const,
  search: (query: string) => [...geneKeys.all, 'search', query] as const,
};

// Hook: Fetch genes list
export function useGenes(params: GeneSearchParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: geneKeys.list(params),
    queryFn: () => genesApi.fetchGenes(params),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes for lists
    select: (data) => ({
      genes: data.data || [],
      meta: data.meta as PaginationMeta,
    }),
  });
}

// Hook: Infinite scroll genes
export function useInfiniteGenes(params: Omit<GeneSearchParams, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: [...geneKeys.lists(), 'infinite', params],
    queryFn: ({ pageParam = 1 }) => 
      genesApi.fetchGenes({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta as PaginationMeta;
      return meta.hasNextPage ? meta.page + 1 : undefined;
    },
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      genes: data.pages.flatMap(page => page.data || []),
      totalCount: data.pages[0]?.meta?.total || 0,
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes for infinite lists
  });
}

// Hook: Fetch gene detail
export function useGeneDetail(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: geneKeys.detail(id),
    queryFn: () => genesApi.fetchGeneDetail(id),
    enabled: (options?.enabled ?? true) && !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes for details
    select: (data) => data.data,
  });
}

// Hook: Search genes with debouncing
export function useGeneSearch(query: string, options?: { enabled?: boolean; debounceMs?: number }) {
  const debouncedQuery = useDebounce(query, options?.debounceMs ?? 300);
  
  return useQuery({
    queryKey: geneKeys.search(debouncedQuery),
    queryFn: () => genesApi.fetchGenes({ 
      search: debouncedQuery, 
      limit: 10 
    }),
    enabled: (options?.enabled ?? true) && debouncedQuery.length >= 2,
    staleTime: 30 * 1000, // 30 seconds for search
    select: (data) => data.data || [],
  });
}

// Hook: Update gene mutation
export function useUpdateGeneMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Gene> }) =>
      genesApi.updateGene(id, data),
    onSuccess: (response, { id }) => {
      // Invalidate and refetch gene detail
      queryClient.invalidateQueries({ queryKey: geneKeys.detail(id) });
      
      // Invalidate genes list to refresh counts
      queryClient.invalidateQueries({ queryKey: geneKeys.lists() });
      
      // Optionally update cache directly
      queryClient.setQueryData(geneKeys.detail(id), response);
    },
    onError: (error) => {
      console.error('Gene update failed:', error);
    },
  });
}

// Hook: Prefetch gene detail
export function usePrefetchGeneDetail() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: geneKeys.detail(id),
      queryFn: () => genesApi.fetchGeneDetail(id),
      staleTime: 10 * 60 * 1000,
    });
  };
}

// Helper hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Cache utilities
export const geneCacheUtils = {
  // Invalidate all gene queries
  invalidateAll: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: geneKeys.all });
  },

  // Clear specific gene from cache
  clearGene: (queryClient: QueryClient, id: string) => {
    queryClient.removeQueries({ queryKey: geneKeys.detail(id) });
  },

  // Prefetch popular genes
  prefetchPopular: async (queryClient: QueryClient) => {
    const popularGenes = ['BRCA1', 'BRCA2', 'TP53', 'EGFR', 'KRAS'];
    
    await Promise.all(
      popularGenes.map(symbol =>
        queryClient.prefetchQuery({
          queryKey: geneKeys.search(symbol),
          queryFn: () => genesApi.fetchGenes({ search: symbol, limit: 1 }),
          staleTime: 30 * 60 * 1000, // 30 minutes
        })
      )
    );
  },
};