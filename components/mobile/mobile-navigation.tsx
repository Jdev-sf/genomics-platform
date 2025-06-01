// components/mobile/mobile-navigation.tsx
'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  Database, 
  Activity, 
  Upload, 
  Search,
  Plus,
  Menu,
  Bell,
  User,
  X,
  Settings,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';
import { SmartSearch } from '@/components/smart-search';
import { HelpSuggestions } from '@/components/contextual-help';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  requiresAuth?: boolean;
}

const navigationItems: NavigationItem[] = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Genes', href: '/genes', icon: Database },
  { name: 'Variants', href: '/variants', icon: Activity },
  { name: 'Import', href: '/import', icon: Upload, requiresAuth: true },
];

interface MobileNavigationProps {
  children: React.ReactNode;
}

export function MobileNavigation({ children }: MobileNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  
  const [isMobile, setIsMobile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFAB, setShowFAB] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Hide/show FAB on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setShowFAB(currentScrollY < lastScrollY || currentScrollY < 100);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
    setShowSearch(false);
  }, [pathname]);

  // Don't render mobile navigation on desktop
  if (!isMobile) {
    return <>{children}</>;
  }

  const getCurrentPageName = () => {
    const item = navigationItems.find(item => item.href === pathname);
    return item?.name || 'Genomics Platform';
  };

  const quickActions = [
    {
      icon: Upload,
      label: 'Import Data',
      action: () => router.push('/import'),
      color: 'bg-blue-500 hover:bg-blue-600',
      requiresAuth: true,
    },
    {
      icon: Search,
      label: 'Search',
      action: () => setShowSearch(true),
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      icon: Database,
      label: 'Browse Genes',
      action: () => router.push('/genes'),
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      icon: Activity,
      label: 'Browse Variants',
      action: () => router.push('/variants'),
      color: 'bg-orange-500 hover:bg-orange-600',
    },
  ];

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold truncate">
              {getCurrentPageName()}
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2"
              onClick={() => setShowSearch(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="sm" className="p-2 relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-red-500">
                3
              </Badge>
            </Button>
            
            {session && (
              <Button variant="ghost" size="sm" className="p-2">
                <User className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="fixed inset-y-0 left-0 w-80 bg-white dark:bg-slate-900 shadow-xl">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Menu</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  className="p-2"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {session && (
                <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-slate-800 rounded-lg">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {session.user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{session.user?.name}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                      {session.user?.role?.name}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <nav className="p-4">
              <ul className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  if (item.requiresAuth && !session) return null;
                  
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                        {item.badge && (
                          <Badge className="ml-auto bg-red-500">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              
              {/* Additional menu items */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/settings"
                      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Settings className="h-5 w-5" />
                      <span>Settings</span>
                    </Link>
                  </li>
                  <li>
                    <button className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                      <HelpCircle className="h-5 w-5" />
                      <span>Help & Support</span>
                    </button>
                  </li>
                </ul>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Full-screen Search Overlay */}
      {showSearch && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white dark:bg-slate-900">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearch(false)}
                className="p-2"
              >
                <X className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <SmartSearch
                  placeholder="Search genes, variants..."
                  onSelect={() => setShowSearch(false)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          <div className="p-4">
            <h3 className="font-medium mb-3">Quick Actions</h3>
            <div className="grid gap-3">
              {quickActions
                .filter(action => !action.requiresAuth || session)
                .map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={action.action}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${action.color}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-medium">{action.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:container lg:mx-auto pb-20 lg:pb-0">
        {children}
      </main>

      {/* Floating Action Button */}
      {showFAB && (
        <div className="lg:hidden fixed bottom-20 right-4 z-30">
          <div className="relative">
            <Button
              size="lg"
              className="rounded-full h-14 w-14 shadow-lg bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                // Toggle quick actions menu or primary action
                if (session) {
                  router.push('/import');
                } else {
                  setShowSearch(true);
                }
              }}
            >
              <Plus className="h-6 w-6" />
            </Button>
            
            {/* Quick actions on long press */}
            <div className="absolute bottom-16 right-0 space-y-2 opacity-0 pointer-events-none transition-opacity">
              {quickActions.slice(0, 3).map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    size="sm"
                    className={`rounded-full h-10 w-10 shadow-md ${action.color}`}
                    onClick={action.action}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tab Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 safe-area-inset-bottom z-40">
        <div className="grid grid-cols-4">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            if (item.requiresAuth && !session) return null;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`py-3 flex flex-col items-center transition-colors ${
                  isActive 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-400 dark:text-slate-500'
                }`}
              >
                <div className="relative">
                  <Icon className="h-6 w-6" />
                  {item.badge && (
                    <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs bg-red-500">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs mt-1 font-medium">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Context-aware help */}
      <HelpSuggestions page={pathname.split('/')[1] || 'home'} />
    </>
  );
}