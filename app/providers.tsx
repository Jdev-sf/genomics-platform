// app/providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactQueryProvider } from '@/lib/providers/react-query-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <SessionProvider>
        {children}
      </SessionProvider>
    </ReactQueryProvider>
  );
}