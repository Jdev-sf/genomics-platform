'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Database, Activity, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchResult {
  id: string;
  type: 'gene' | 'variant';
  [key: string]: any;
}

interface SearchResponse {
  query: string;
  total: number;
  results: {
    genes: SearchResult[];
    variants: SearchResult[];
  };
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch();
    } else {
      setResults(null);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const performSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(debouncedQuery)}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setOpen(false);
    setQuery('');
    setResults(null);
    
    if (result.type === 'gene') {
      router.push(`/genes/${result.id}`);
    } else if (result.type === 'variant') {
      router.push(`/variants/${result.id}`);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <Search size={16} />
        <span>Search...</span>
        <kbd className="hidden md:inline-flex items-center space-x-1 px-2 py-0.5 text-xs bg-white rounded border">
          <span>⌘</span>
          <span>K</span>
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50">
          <div ref={searchRef} className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl">
            <div className="bg-white rounded-lg shadow-2xl">
              <div className="flex items-center px-4 py-3 border-b">
                <Search className="text-gray-400 mr-3" size={20} />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search genes, variants..."
                  className="flex-1 border-0 focus:ring-0 p-0"
                />
                {loading && <Loader2 className="animate-spin text-gray-400" size={20} />}
                <button
                  onClick={() => {
                    setOpen(false);
                    setQuery('');
                    setResults(null);
                  }}
                  className="ml-3 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              {results && results.total > 0 && (
                <div className="max-h-96 overflow-y-auto">
                  {results.results.genes.length > 0 && (
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-500 px-2 py-1">Genes</p>
                      {results.results.genes.map((gene) => (
                        <button
                          key={gene.id}
                          onClick={() => handleResultClick(gene)}
                          className="w-full flex items-center justify-between p-2 hover:bg-gray-100 rounded"
                        >
                          <div className="flex items-center space-x-3">
                            <Database className="text-blue-500" size={16} />
                            <div className="text-left">
                              <p className="font-medium">{gene.symbol}</p>
                              <p className="text-sm text-gray-500 truncate max-w-md">
                                {gene.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="text-xs">
                              Chr {gene.chromosome}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {gene.variant_count} variants
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.results.variants.length > 0 && (
                    <div className="p-2 border-t">
                      <p className="text-xs font-medium text-gray-500 px-2 py-1">Variants</p>
                      {results.results.variants.map((variant) => (
                        <button
                          key={variant.id}
                          onClick={() => handleResultClick(variant)}
                          className="w-full flex items-center justify-between p-2 hover:bg-gray-100 rounded"
                        >
                          <div className="flex items-center space-x-3">
                            <Activity className="text-green-500" size={16} />
                            <div className="text-left">
                              <p className="font-medium">{variant.variant_id}</p>
                              <p className="text-sm text-gray-500">
                                {variant.gene_symbol} - {variant.change}
                              </p>
                            </div>
                          </div>
                          {variant.clinical_significance && (
                            <Badge 
                              variant={
                                variant.clinical_significance.toLowerCase().includes('pathogenic') 
                                  ? 'destructive' 
                                  : 'secondary'
                              }
                              className="text-xs"
                            >
                              {variant.clinical_significance}
                            </Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {results && results.total === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <p>No results found for "{query}"</p>
                </div>
              )}

              {!results && query.length >= 2 && !loading && (
                <div className="p-8 text-center text-gray-500">
                  <p>Type to search...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}