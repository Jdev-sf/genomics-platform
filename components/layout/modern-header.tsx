// components/layout/modern-header.tsx - FIX Layout e Z-Index
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Search, 
  Bell, 
  User, 
  ChevronDown, 
  Database, 
  Activity, 
  Upload, 
  FileText,
  Settings,
  LogOut,
  Moon,
  Sun,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/components/theme-provider';
import { GlobalSearch } from '@/components/global-search';
import { useDebounce } from '@/hooks/use-debounce';
import { signOut } from 'next-auth/react';

interface SearchResult {
  id: string;
  type: 'gene' | 'variant';
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
}

export function ModernHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  // Mobile search functionality
  useEffect(() => {
    const performMobileSearch = async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}&limit=6`);
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        
        const searchResults: SearchResult[] = [
          ...data.results.genes.map((gene: any) => ({
            id: `gene-${gene.id}`,
            type: 'gene' as const,
            title: gene.symbol,
            subtitle: gene.name,
            description: `Chr ${gene.chromosome} • ${gene.variant_count} variants`,
            badge: `Chr ${gene.chromosome}`,
          })),
          ...data.results.variants.map((variant: any) => ({
            id: `variant-${variant.id}`,
            type: 'variant' as const,
            title: variant.variant_id,
            subtitle: variant.gene_symbol,
            description: `Position ${variant.position}`,
            badge: variant.clinical_significance,
          })),
        ];
        
        setResults(searchResults.slice(0, 6));
      } catch (error) {
        console.error('Mobile search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    if (debouncedQuery && mobileSearchOpen) {
      performMobileSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, mobileSearchOpen]);

  const handleResultClick = (result: SearchResult) => {
    const originalId = result.id.replace(/^(gene|variant)-/, '');
    const path = result.type === 'gene' ? `/genes/${originalId}` : `/variants/${originalId}`;
    router.push(path);
    setMobileSearchOpen(false);
    setQuery('');
    setResults([]);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside user menu
      const target = event.target as Element;
      if (userMenuOpen && !target.closest('[data-user-menu]')) {
        setUserMenuOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [userMenuOpen]);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Database, current: pathname === '/' },
    { name: 'Genes', href: '/genes', icon: Database, current: pathname.startsWith('/genes') },
    { name: 'Variants', href: '/variants', icon: Activity, current: pathname.startsWith('/variants') },
    { name: 'Import', href: '/import', icon: Upload, current: pathname === '/import' },
  ];

  if (!session) return null;

  return (
    <>
      {/* FIX: Header con z-index controllato */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-3 transition-opacity hover:opacity-80">
              <div className="relative">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <Database className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Genomics Platform
                </h1>
                <p className="text-xs text-muted-foreground -mt-1">AI-Powered Analysis</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      item.current
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                    {item.current && (
                      <div className="h-1 w-1 rounded-full bg-primary"></div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center space-x-4">
            {/* Global Search - FIX: Rimosso z-index conflittuali */}
            <div className="hidden md:block">
              <GlobalSearch />
            </div>

            {/* Mobile Search */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="relative"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500 hover:bg-red-500">
                3
              </Badge>
            </Button>

            {/* User Menu - FIX: z-index e data attributes */}
            <div className="relative" data-user-menu>
              <Button
                variant="ghost"
                className="flex items-center space-x-2 pl-2 pr-3"
                onClick={(e) => {
                  e.stopPropagation();
                  setUserMenuOpen(!userMenuOpen);
                }}
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                  {session.user?.name?.charAt(0) || 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{session.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{session.user?.role?.name}</p>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>

              {/* User Dropdown - FIX: z-index specifico per evitare conflitti */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-background shadow-lg z-50" data-user-menu>
                  <div className="p-3 border-b">
                    <p className="font-medium">{session.user?.name}</p>
                    <p className="text-sm text-muted-foreground">{session.user?.email}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {session.user?.role?.name}
                    </Badge>
                  </div>
                  <div className="p-1">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => {
                        setUserMenuOpen(false);
                        router.push('/profile');
                      }}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => {
                        setUserMenuOpen(false);
                        router.push('/settings');
                      }}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => {
                        setUserMenuOpen(false);
                        router.push('/documentation');
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Documentation
                    </Button>
                    <div className="my-1 h-px bg-border"></div>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => signOut({ callbackUrl: '/auth/login' })}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t bg-background/95 backdrop-blur">
          <div className="container px-4 py-2">
            <div className="flex space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex-1 flex flex-col items-center space-y-1 px-2 py-2 rounded-lg text-xs transition-all ${
                      item.current
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Search Modal - FIX: Portal con z-index alto */}
      {mobileSearchOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[9998] bg-black/50 md:hidden" />
          
          {/* Modal */}
          <div className="fixed inset-0 z-[9999] md:hidden">
            <div className="bg-background border-b">
              <div className="flex items-center p-4 space-x-3">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search genes, variants..."
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setMobileSearchOpen(false);
                    setQuery('');
                    setResults([]);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Mobile Search Results */}
              <div className="max-h-96 overflow-y-auto border-t">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Searching...</span>
                  </div>
                ) : results.length > 0 ? (
                  <div className="py-2">
                    {results.map((result) => (
                      <button
                        key={result.id}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
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
                  <div className="px-4 pb-4">
                    <p className="text-sm text-muted-foreground">
                      Start typing to search for genes or variants...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}