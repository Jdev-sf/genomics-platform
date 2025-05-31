// lib/providers/react-query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, ReactNode } from 'react';
import { createClientLogger } from '@/lib/client-logger';

const logger = createClientLogger({ requestId: 'react-query' });

// Custom error handler for queries
const handleQueryError = (error: unknown) => {
  logger.error('React Query error', error instanceof Error ? error : new Error(String(error)));
};

// Custom success handler for mutations
const handleMutationSuccess = (data: any, variables: any, context: any) => {
  logger.info('Mutation successful', { variables, context });
};

function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: handleQueryError,
    }),
    mutationCache: new MutationCache({
      onSuccess: handleMutationSuccess,
      onError: handleQueryError,
    }),
    defaultOptions: {
      queries: {
        // Cache for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Keep in cache for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Retry failed requests 2 times
        retry: 2,
        // Retry delay increases exponentially
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Refetch on window focus for critical data
        refetchOnWindowFocus: true,
        // Don't refetch on reconnect by default
        refetchOnReconnect: false,
        // Background refetch interval (10 minutes)
        refetchInterval: 10 * 60 * 1000,
      },
      mutations: {
        // Retry mutations once
        retry: 1,
        // 30 second timeout for mutations
        gcTime: 30 * 1000,
      },
    },
  });
}

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  // Create stable query client instance
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show devtools only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom"
        />
      )}
    </QueryClientProvider>
  );
}

export default ReactQueryProvider;