// hooks/use-chart-data.ts
import { useQuery } from '@tanstack/react-query';

// Hook per statistiche geni
export function useGeneStatistics(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['charts', 'gene-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/charts/gene-statistics');
      if (!response.ok) throw new Error('Failed to fetch gene statistics');
      return response.json();
    },
    enabled: options?.enabled ?? true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => data.data,
  });
}

// Hook per statistiche varianti
export function useVariantStatistics(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['charts', 'variant-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/charts/variant-statistics');
      if (!response.ok) throw new Error('Failed to fetch variant statistics');
      return response.json();
    },
    enabled: options?.enabled ?? true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => data.data,
  });
}