'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Database, Activity, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchResult {
  id: string;
  type: 'gene' | 'variant';
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
}

interface SearchResponse {
  query: string;
  total: number;
  results: {
    genes: Array<{
      id: string;
      symbol: string;
      name: string;
      chromosome: string;
      variant_count: number;
    }>;
    variants: Array<{
      id: string;
      variant_id: string;
      gene_symbol: string;
      position: string;
      clinical_significance: string;
    }>;
  };
}

export function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Search function
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}&limit=8`);
      if (!response.ok) throw new Error('Search failed');
      
      const data: SearchResponse = await response.json();
      
      const searchResults: SearchResult[] = [
        ...data.results.genes.map(gene => ({
          id: gene.id,
          type: 'gene' as const,
          title: gene.symbol,
          subtitle: gene.name,
          description: `Chr ${gene.chromosome} • ${gene.variant_count} variants`,
          badge: `Chr ${gene.chromosome}`,
        })),
        ...data.results.variants.map(variant => ({
          id: variant.id,
          type: 'variant' as const,
          title: variant.variant_id,
          subtitle: variant.gene_symbol,
          description: `Position ${variant.position}`,
          badge: variant.clinical_significance,
        })),
      ];
      
      setResults(searchResults.slice(0, 8));
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Effect for debounced search
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setQuery('');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleResultClick = (result: SearchResult) => {
    const path = result.type === 'gene' ? `/genes/${result.id}` : `/variants/${result.id}`;
    router.push(path);
    setIsOpen(false);
    setQuery('');
  };

  const handleOpenSearch = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <>
      {/* Desktop Search Button */}
      <div className="hidden md:block relative">
        <Button
          variant="outline"
          className="w-64 justify-start text-muted-foreground"
          onClick={handleOpenSearch}
        >
          <Search className="mr-2 h-4 w-4" />
          Search...
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        {/* Desktop Search Modal */}
        {isOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]">
              <div ref={resultsRef} className="bg-background border rounded-lg shadow-lg">
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search genes, variants..."
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 shadow-none"
                  />
                  <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Searching...</span>
                    </div>
                  ) : results.length > 0 ? (
                    <div className="py-2">
                      {results.map((result, index) => (
                        <button
                          key={result.id}
                          className={`w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors ${
                            index === selectedIndex ? 'bg-muted/50' : ''
                          }`}
                          onClick={() => handleResultClick(result)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {result.type === 'gene' ? (
                                <Database className="h-4 w-4 text-blue-500" />
                              ) : (
                                <Activity className="h-4 w-4 text-green-500" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="font-medium truncate">{result.title}</div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {result.subtitle}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {result.description}
                                </div>
                              </div>
                            </div>
                            {result.badge && (
                              <Badge variant="outline" className="text-xs">
                                {result.badge}
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : query ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No results found for "{query}"
                    </div>
                  ) : (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      Start typing to search genes and variants...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global keyboard shortcut */}
      <div className="hidden">
        <input
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
              e.preventDefault();
              handleOpenSearch();
            }
          }}
        />
      </div>
    </>
  );
}