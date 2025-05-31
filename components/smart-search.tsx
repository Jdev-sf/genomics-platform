// components/smart-search.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Clock, TrendingUp, Hash, Database, Activity, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchSuggestion {
  id: string;
  type: 'gene' | 'variant' | 'recent' | 'popular';
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  score?: number;
}

interface SmartSearchProps {
  placeholder?: string;
  onSelect?: (suggestion: SearchSuggestion) => void;
  showRecent?: boolean;
  showPopular?: boolean;
  className?: string;
}

export function SmartSearch({ 
  placeholder = "Search genes, variants...",
  onSelect,
  showRecent = true,
  showPopular = true,
  className = ""
}: SmartSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches] = useState(['BRCA1', 'BRCA2', 'TP53', 'EGFR', 'KRAS']);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('genomics-recent-searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    }
  }, []);

  // Search API call
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}&limit=8`);
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      
      const newSuggestions: SearchSuggestion[] = [
        ...data.results.genes.map((gene: any) => ({
          id: `gene-${gene.id}`,
          type: 'gene' as const,
          title: gene.symbol,
          subtitle: gene.name,
          description: `Chr ${gene.chromosome} • ${gene.variant_count} variants`,
          badge: `Chr ${gene.chromosome}`,
          score: gene.score || 0,
        })),
        ...data.results.variants.map((variant: any) => ({
          id: `variant-${variant.id}`,
          type: 'variant' as const,
          title: variant.variant_id,
          subtitle: variant.gene_symbol,
          description: `Position ${variant.position}`,
          badge: variant.clinical_significance,
          score: variant.score || 0,
        })),
      ].sort((a, b) => (b.score || 0) - (a.score || 0));
      
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debouncedQuery && isOpen) {
      performSearch(debouncedQuery);
    } else if (!debouncedQuery) {
      setSuggestions([]);
    }
  }, [debouncedQuery, isOpen, performSearch]);

  // Generate default suggestions
  const getDefaultSuggestions = useCallback((): SearchSuggestion[] => {
    const suggestions: SearchSuggestion[] = [];
    
    if (showRecent && recentSearches.length > 0) {
      suggestions.push(...recentSearches.slice(0, 3).map(search => ({
        id: `recent-${search}`,
        type: 'recent' as const,
        title: search,
        subtitle: 'Recent search',
      })));
    }
    
    if (showPopular) {
      suggestions.push(...popularSearches.slice(0, 3).map(search => ({
        id: `popular-${search}`,
        type: 'popular' as const,
        title: search,
        subtitle: 'Popular gene',
      })));
    }
    
    return suggestions;
  }, [recentSearches, showRecent, showPopular, popularSearches]);

  // Handle input focus
  const handleFocus = () => {
    setIsOpen(true);
    if (!query && suggestions.length === 0) {
      setSuggestions(getDefaultSuggestions());
    }
  };

  // Handle suggestion selection
  const handleSelect = (suggestion: SearchSuggestion) => {
    const searchTerm = suggestion.title;
    
    // Add to recent searches
    if (suggestion.type !== 'recent') {
      const newRecent = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 10);
      setRecentSearches(newRecent);
      localStorage.setItem('genomics-recent-searches', JSON.stringify(newRecent));
    }
    
    setQuery(searchTerm);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    if (onSelect) {
      onSelect(suggestion);
    } else {
      // Default navigation
      if (suggestion.type === 'gene') {
        const geneId = suggestion.id.replace('gene-', '');
        router.push(`/genes/${geneId}`);
      } else if (suggestion.type === 'variant') {
        const variantId = suggestion.id.replace('variant-', '');
        router.push(`/variants/${variantId}`);
      } else {
        // For recent/popular searches, search for the term
        router.push(`/genes?search=${encodeURIComponent(searchTerm)}`);
      }
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('genomics-recent-searches');
    if (!query) {
      setSuggestions(getDefaultSuggestions());
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'gene': return <Database className="h-4 w-4 text-blue-500" />;
      case 'variant': return <Activity className="h-4 w-4 text-green-500" />;
      case 'recent': return <Clock className="h-4 w-4 text-gray-500" />;
      case 'popular': return <TrendingUp className="h-4 w-4 text-orange-500" />;
      default: return <Hash className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-8 w-8 p-0"
            onClick={() => {
              setQuery('');
              setSuggestions(getDefaultSuggestions());
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-background border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Searching...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="py-2">
              {/* Recent searches header */}
              {!query && recentSearches.length > 0 && suggestions.some(s => s.type === 'recent') && (
                <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                  <span>Recent Searches</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={clearRecentSearches}
                  >
                    Clear
                  </Button>
                </div>
              )}
              
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  className={`w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0 ${
                    index === selectedIndex ? 'bg-muted/50' : ''
                  }`}
                  onClick={() => handleSelect(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      {getSuggestionIcon(suggestion.type)}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{suggestion.title}</div>
                        {suggestion.subtitle && (
                          <div className="text-sm text-muted-foreground truncate">
                            {suggestion.subtitle}
                          </div>
                        )}
                        {suggestion.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {suggestion.description}
                          </div>
                        )}
                      </div>
                    </div>
                    {suggestion.badge && (
                      <Badge variant="outline" className="text-xs ml-2">
                        {suggestion.badge}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : query ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <div className="px-3 py-4">
              <p className="text-sm text-muted-foreground mb-2">
                Start typing to search for genes or variants...
              </p>
              {popularSearches.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Popular searches:</p>
                  <div className="flex flex-wrap gap-1">
                    {popularSearches.map(search => (
                      <Badge
                        key={search}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80 text-xs"
                        onClick={() => handleSelect({
                          id: `popular-${search}`,
                          type: 'popular',
                          title: search,
                        })}
                      >
                        {search}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}