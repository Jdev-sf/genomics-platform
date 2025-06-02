// components/mobile/mobile-navigation.tsx
'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Home, 
  Database, 
  Activity, 
  Upload, 
  Search,
  Menu,
  Bell,
  User,
  X,
  Settings,
  HelpCircle,
  LogOut,
  Moon,
  Sun,
  Monitor,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SmartSearch } from '@/components/smart-search';
import { HelpSuggestions } from '@/components/contextual-help';
import { useTheme } from '@/components/theme-provider';
import { UserRoleIndicator } from '@/components/user-role-indicator';
import { ModernHeader } from '@/components/layout/modern-header';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  
  const [isMobile, setIsMobile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check if we're on auth pages
  const isAuthPage = pathname.startsWith('/auth');

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
    setShowSearch(false);
  }, [pathname]);

  const getCurrentPageName = () => {
    const item = navigationItems.find(item => item.href === pathname);
    return item?.name || 'Genomics Platform';
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/login' });
  };

  const handleProfileClick = () => {
    router.push('/profile');
    setSidebarOpen(false);
  };

  const handleSettingsClick = () => {
    router.push('/settings');
    setSidebarOpen(false);
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

  // Don't render navigation on auth pages or when session is loading
  if (isAuthPage || status === 'loading') {
    return <>{children}</>;
  }

  // If no session, just render children (middleware will redirect)
  if (!session) {
    return <>{children}</>;
  }

  // Render desktop version with original ModernHeader
  if (!isMobile) {
    return (
      <>
        <ModernHeader />
        {children}
      </>
    );
  }

  // Mobile version - render our custom mobile header
  return (
    <>
      {/* Mobile Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 sticky top-0 z-40">
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

            {/* Theme Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="ghost" size="sm" className="p-2 relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-red-500">
                3
              </Badge>
            </Button>
            
            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2 flex items-center gap-1">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                    {session.user?.name?.charAt(0) || 'U'}
                  </div>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="font-medium">{session.user?.name}</p>
                  <p className="text-sm text-muted-foreground">{session.user?.email}</p>
                  <div className="mt-1">
                    <UserRoleIndicator />
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfileClick}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSettingsClick}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
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
              
              <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-slate-800 rounded-lg">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {session.user?.name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{session.user?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <UserRoleIndicator />
                  </div>
                </div>
              </div>
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
                    <button
                      onClick={handleProfileClick}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <User className="h-5 w-5" />
                      <span>Profile</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleSettingsClick}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Settings className="h-5 w-5" />
                      <span>Settings</span>
                    </button>
                  </li>
                  <li>
                    <button className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                      <HelpCircle className="h-5 w-5" />
                      <span>Help & Support</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Sign Out</span>
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
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900">
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
      <main className="pb-20">
        {children}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 safe-area-inset-bottom z-40">
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