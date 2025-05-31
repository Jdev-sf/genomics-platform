// components/keyboard-shortcuts.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Command, 
  Search, 
  Database, 
  Activity, 
  Upload, 
  Download,
  Settings,
  HelpCircle,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  description: string;
  action: () => void;
  category: 'navigation' | 'search' | 'actions' | 'global';
  icon?: React.ComponentType<{ className?: string }>;
}

interface KeyboardShortcutsProps {
  onExport?: () => void;
  onImport?: () => void;
  onSearch?: () => void;
}

export function KeyboardShortcuts({ 
  onExport, 
  onImport, 
  onSearch 
}: KeyboardShortcutsProps) {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const [commandPressed, setCommandPressed] = useState(false);

  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    // Global shortcuts
    {
      key: '/',
      description: 'Focus search',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="search" i]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        } else if (onSearch) {
          onSearch();
        }
      },
      category: 'search',
      icon: Search,
    },
    {
      key: 'k',
      ctrlKey: true,
      description: 'Open command palette',
      action: () => setShowHelp(true),
      category: 'global',
      icon: Command,
    },
    {
      key: '?',
      shiftKey: true,
      description: 'Show keyboard shortcuts',
      action: () => setShowHelp(true),
      category: 'global',
      icon: HelpCircle,
    },
    {
      key: 'Escape',
      description: 'Close dialogs/clear selection',
      action: () => {
        setShowHelp(false);
        // Clear any active selections
        const event = new CustomEvent('clearSelection');
        window.dispatchEvent(event);
      },
      category: 'global',
      icon: X,
    },

    // Navigation shortcuts
    {
      key: 'g',
      description: 'Go to genes',
      action: () => router.push('/genes'),
      category: 'navigation',
      icon: Database,
    },
    {
      key: 'v',
      description: 'Go to variants',
      action: () => router.push('/variants'),
      category: 'navigation',
      icon: Activity,
    },
    {
      key: 'i',
      description: 'Go to import',
      action: () => router.push('/import'),
      category: 'navigation',
      icon: Upload,
    },
    {
      key: 'h',
      description: 'Go to home',
      action: () => router.push('/'),
      category: 'navigation',
    },
    {
      key: 's',
      description: 'Go to settings',
      action: () => router.push('/settings'),
      category: 'navigation',
      icon: Settings,
    },

    // Action shortcuts
    {
      key: 'e',
      ctrlKey: true,
      description: 'Export data',
      action: () => onExport?.(),
      category: 'actions',
      icon: Download,
    },
    {
      key: 'i',
      ctrlKey: true,
      description: 'Import data',
      action: () => onImport?.(),
      category: 'actions',
      icon: Upload,
    },
    {
      key: 'a',
      ctrlKey: true,
      description: 'Select all',
      action: () => {
        const event = new CustomEvent('selectAll');
        window.dispatchEvent(event);
      },
      category: 'actions',
    },
    {
      key: 'd',
      ctrlKey: true,
      description: 'Deselect all',
      action: () => {
        const event = new CustomEvent('deselectAll');
        window.dispatchEvent(event);
      },
      category: 'actions',
    },

    // Search shortcuts
    {
      key: 'f',
      ctrlKey: true,
      description: 'Find in page',
      action: () => {
        // Let browser handle this natively
      },
      category: 'search',
    },
    {
      key: 'Enter',
      description: 'Execute search',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="search" i]') as HTMLInputElement;
        if (searchInput && searchInput === document.activeElement) {
          const form = searchInput.closest('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true }));
          }
        }
      },
      category: 'search',
    },
  ];

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs (except for specific cases)
    const activeElement = document.activeElement;
    const isInputActive = activeElement?.tagName === 'INPUT' || 
                         activeElement?.tagName === 'TEXTAREA' || 
                         activeElement?.hasAttribute('contenteditable');

    // Allow certain shortcuts even in inputs
    const allowedInInputs = ['Escape', 'Enter'];
    
    if (isInputActive && !allowedInInputs.includes(event.key)) {
      // Special case: allow / to focus search even if another input is active
      if (event.key === '/' && !event.ctrlKey && !event.altKey && !event.metaKey) {
        const searchInput = document.querySelector('input[placeholder*="search" i]') as HTMLInputElement;
        if (searchInput && searchInput !== activeElement) {
          event.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
      }
      return;
    }

    // Find matching shortcut
    const shortcut = shortcuts.find(s => {
      return s.key === event.key &&
             !!s.ctrlKey === event.ctrlKey &&
             !!s.altKey === event.altKey &&
             !!s.shiftKey === event.shiftKey &&
             !!s.metaKey === event.metaKey;
    });

    if (shortcut) {
      event.preventDefault();
      shortcut.action();
    }
  }, [shortcuts]);

  // Track command key for visual feedback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        setCommandPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        setCommandPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  // Format key combination for display
  const formatKeyCombo = (shortcut: KeyboardShortcut) => {
    const keys = [];
    if (shortcut.ctrlKey || shortcut.metaKey) keys.push('⌘');
    if (shortcut.altKey) keys.push('⌥');
    if (shortcut.shiftKey) keys.push('⇧');
    
    let keyDisplay = shortcut.key;
    if (keyDisplay === ' ') keyDisplay = 'Space';
    if (keyDisplay === 'Escape') keyDisplay = 'Esc';
    if (keyDisplay === 'Enter') keyDisplay = '↵';
    if (keyDisplay === '/') keyDisplay = '/';
    
    keys.push(keyDisplay.toUpperCase());
    
    return keys;
  };

  const categoryLabels = {
    global: 'Global',
    navigation: 'Navigation',
    search: 'Search',
    actions: 'Actions',
  };

  return (
    <>
      {/* Command indicator */}
      {commandPressed && (
        <div className="fixed bottom-4 right-4 z-50 bg-background/90 backdrop-blur border rounded-lg p-2 shadow-lg">
          <div className="flex items-center space-x-2 text-sm">
            <Command className="h-4 w-4" />
            <span>Command mode</span>
          </div>
        </div>
      )}

      {/* Help dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Command className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
                      <div className="flex items-center space-x-3">
                        {shortcut.icon && (
                          <shortcut.icon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">{shortcut.description}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {formatKeyCombo(shortcut).map((key, keyIndex) => (
                          <Badge 
                            key={keyIndex} 
                            variant="outline" 
                            className="text-xs font-mono px-2 py-1 min-w-[24px] text-center"
                          >
                            {key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              Press <Badge variant="outline" className="text-xs">?</Badge> or{' '}
              <Badge variant="outline" className="text-xs">⌘K</Badge> to toggle this help
            </div>
            <Button variant="outline" onClick={() => setShowHelp(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Hook for using keyboard shortcuts in components
export function useKeyboardShortcuts(shortcuts: Partial<KeyboardShortcut>[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputActive = activeElement?.tagName === 'INPUT' || 
                           activeElement?.tagName === 'TEXTAREA' || 
                           activeElement?.hasAttribute('contenteditable');

      if (isInputActive && event.key !== 'Escape') return;

      const shortcut = shortcuts.find(s => {
        return s.key === event.key &&
               !!s.ctrlKey === event.ctrlKey &&
               !!s.altKey === event.altKey &&
               !!s.shiftKey === event.shiftKey &&
               !!s.metaKey === event.metaKey;
      });

      if (shortcut?.action) {
        event.preventDefault();
        shortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Keyboard shortcut provider for app-wide shortcuts
interface KeyboardShortcutProviderProps {
  children: React.ReactNode;
  onExport?: () => void;
  onImport?: () => void;
  onSearch?: () => void;
}

export function KeyboardShortcutProvider({ 
  children, 
  onExport, 
  onImport, 
  onSearch 
}: KeyboardShortcutProviderProps) {
  return (
    <>
      {children}
      <KeyboardShortcuts 
        onExport={onExport}
        onImport={onImport}
        onSearch={onSearch}
      />
    </>
  );
}