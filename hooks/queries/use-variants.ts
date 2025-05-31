// hooks/queries/use-variants.ts
import { useQuery, useMutation, useQueryClient, useInfiniteQuery, QueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { VariantSearchParams } from '@/lib/services/variant-service';

// Types
interface Variant {
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
  clinical_significance: string | null;
  impact: string | null;
  frequency: number | null;
  [key: string]: any;
}

interface VariantDetail {
  variant: any;
  relatedVariants: any[];
}

// API Functions
const variantsApi = {
  async fetchVariants(params: VariantSearchParams = {}) {
    const searchParams = new URLSearchParams();
    
    if (params.search) searchParams.append('search', params.search);
    if (params.geneId) searchParams.append('geneId', params.geneId);
    if (params.chromosome) searchParams.append('chromosome', params.chromosome);
    if (params.clinicalSignificance?.length) {
      searchParams.append('clinicalSignificance', params.clinicalSignificance.join(','));
    }
    if (params.impact?.length) {
      searchParams.append('impact', params.impact.join(','));
    }
    if (params.minFrequency !== undefined) searchParams.append('minFrequency', String(params.minFrequency));
    if (params.maxFrequency !== undefined) searchParams.append('maxFrequency', String(params.maxFrequency));
    if (params.page) searchParams.append('page', String(params.page));
    if (params.limit) searchParams.append('limit', String(params.limit));
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const response = await fetch(`/api/variants?${searchParams}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  async fetchVariantDetail(id: string) {
    const response = await fetch(`/api/variants/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  async updateVariant(id: string, data: Partial<Variant>) {
    const response = await fetch(`/api/variants/${id}`, {
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
export const variantKeys = {
  all: ['variants'] as const,
  lists: () => [...variantKeys.all, 'list'] as const,
  list: (params: VariantSearchParams) => [...variantKeys.lists(), params] as const,
  details: () => [...variantKeys.all, 'detail'] as const,
  detail: (id: string) => [...variantKeys.details(), id] as const,
  search: (query: string) => [...variantKeys.all, 'search', query] as const,
  byGene: (geneId: string) => [...variantKeys.all, 'byGene', geneId] as const,
  clinical: (significance: string[]) => [...variantKeys.all, 'clinical', significance.join(',')] as const,
};

// Hook: Fetch variants list
export function useVariants(params: VariantSearchParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: variantKeys.list(params),
    queryFn: () => variantsApi.fetchVariants(params),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => ({
      variants: data.data || [],
      meta: data.meta,
    }),
  });
}

// Hook: Infinite scroll variants
export function useInfiniteVariants(params: Omit<VariantSearchParams, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: [...variantKeys.lists(), 'infinite', params],
    queryFn: ({ pageParam = 1 }) => 
      variantsApi.fetchVariants({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta;
      return meta.hasNextPage ? meta.page + 1 : undefined;
    },
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      variants: data.pages.flatMap(page => page.data || []),
      totalCount: data.pages[0]?.meta?.total || 0,
    }),
    staleTime: 5 * 60 * 1000,
  });
}

// Hook: Fetch variant detail
export function useVariantDetail(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: variantKeys.detail(id),
    queryFn: () => variantsApi.fetchVariantDetail(id),
    enabled: (options?.enabled ?? true) && !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes for details
    select: (data) => data.data,
  });
}

// Hook: Variants by gene
export function useVariantsByGene(geneId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: variantKeys.byGene(geneId),
    queryFn: () => variantsApi.fetchVariants({ geneId, limit: 100 }),
    enabled: (options?.enabled ?? true) && !!geneId,
    staleTime: 5 * 60 * 1000,
    select: (data) => data.data || [],
  });
}

// Hook: Pathogenic variants
export function usePathogenicVariants(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: variantKeys.clinical(['Pathogenic', 'Likely pathogenic']),
    queryFn: () => variantsApi.fetchVariants({ 
      clinicalSignificance: ['Pathogenic', 'Likely pathogenic'],
      limit: 50 
    }),
    enabled: options?.enabled ?? true,
    staleTime: 10 * 60 * 1000, // 10 minutes for clinical data
    select: (data) => data.data || [],
  });
}

// Hook: Variant search with debouncing
export function useVariantSearch(query: string, options?: { enabled?: boolean; debounceMs?: number }) {
  const debouncedQuery = useDebounce(query, options?.debounceMs ?? 300);
  
  return useQuery({
    queryKey: variantKeys.search(debouncedQuery),
    queryFn: () => variantsApi.fetchVariants({ 
      search: debouncedQuery, 
      limit: 10 
    }),
    enabled: (options?.enabled ?? true) && debouncedQuery.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
    select: (data) => data.data || [],
  });
}

// Hook: Update variant mutation
export function useUpdateVariantMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Variant> }) =>
      variantsApi.updateVariant(id, data),
    onSuccess: (response, { id }) => {
      // Invalidate variant detail
      queryClient.invalidateQueries({ queryKey: variantKeys.detail(id) });
      
      // Invalidate variants lists
      queryClient.invalidateQueries({ queryKey: variantKeys.lists() });
      
      // If variant has gene association, invalidate gene's variants
      if (response.data?.gene?.id) {
        queryClient.invalidateQueries({ 
          queryKey: variantKeys.byGene(response.data.gene.id) 
        });
      }
    },
    onError: (error) => {
      console.error('Variant update failed:', error);
    },
  });
}

// Hook: Prefetch variant detail
export function usePrefetchVariantDetail() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: variantKeys.detail(id),
      queryFn: () => variantsApi.fetchVariantDetail(id),
      staleTime: 10 * 60 * 1000,
    });
  };
}

// Background sync for critical variants
export function useVariantBackgroundSync() {
  const queryClient = useQueryClient();

  return {
    syncPathogenic: () => {
      queryClient.invalidateQueries({ 
        queryKey: variantKeys.clinical(['Pathogenic', 'Likely pathogenic']) 
      });
    },
    
    syncByGene: (geneId: string) => {
      queryClient.invalidateQueries({ 
        queryKey: variantKeys.byGene(geneId) 
      });
    },
    
    syncAll: () => {
      queryClient.invalidateQueries({ 
        queryKey: variantKeys.all 
      });
    },
  };
}

// Helper hook for debouncing (if not already defined)
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
export const variantCacheUtils = {
  invalidateAll: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: variantKeys.all });
  },

  clearVariant: (queryClient: QueryClient, id: string) => {
    queryClient.removeQueries({ queryKey: variantKeys.detail(id) });
  },

  prefetchClinical: async (queryClient: QueryClient) => {
    const clinicalCategories = [
      ['Pathogenic'],
      ['Likely pathogenic'],
      ['Uncertain significance'],
    ];
    
    await Promise.all(
      clinicalCategories.map(significance =>
        queryClient.prefetchQuery({
          queryKey: variantKeys.clinical(significance),
          queryFn: () => variantsApi.fetchVariants({ 
            clinicalSignificance: significance, 
            limit: 20 
          }),
          staleTime: 15 * 60 * 1000, // 15 minutes
        })
      )
    );
  },
};