import { memo } from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { Loader2 } from 'lucide-react';

interface LazyTableProps {
  children: React.ReactNode;
}

export const LazyTable = memo(function LazyTable({ children }: LazyTableProps) {
  const { ref, isVisible } = useIntersectionObserver({
    threshold: 0.1,
    freezeOnceVisible: true,
  });

  return (
    <div ref={ref as any} className="min-h-[200px]">
      {isVisible ? (
        children
      ) : (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
});