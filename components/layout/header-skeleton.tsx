// components/layout/header-skeleton.tsx
'use client';

import { Skeleton } from '@/components/ui/skeleton-loaders';

export function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 animate-slide-down">
      <div className="container flex h-14 items-center">
        {/* Logo skeleton */}
        <div className="mr-4 flex">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="ml-2 h-6 w-32" />
        </div>

        {/* Navigation skeleton - desktop */}
        <div className="hidden md:flex md:flex-1 md:items-center md:justify-center">
          <nav className="flex items-center space-x-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-16" />
            ))}
          </nav>
        </div>

        {/* Actions skeleton */}
        <div className="flex items-center space-x-2">
          {/* Search skeleton */}
          <Skeleton className="hidden md:block h-8 w-64" />
          
          {/* Theme toggle skeleton */}
          <Skeleton className="h-8 w-8 rounded" />
          
          {/* Notifications skeleton */}
          <Skeleton className="h-8 w-8 rounded" />
          
          {/* User menu skeleton */}
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        {/* Mobile menu button skeleton */}
        <div className="md:hidden ml-2">
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </header>
  );
}