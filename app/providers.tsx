// app/providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactQueryProvider } from '@/lib/providers/react-query-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <SessionProvider
        refetchInterval={5 * 60} // Refetch session every 5 minutes
        refetchOnWindowFocus={true}
        refetchWhenOffline={false}
      >
        {children}
      </SessionProvider>
    </ReactQueryProvider>
  );
}