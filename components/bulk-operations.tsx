// components/bulk-operations.tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import { 
  Download, 
  Trash2, 
  Edit, 
  Copy, 
  Share, 
  MoreHorizontal,
  CheckSquare,
  Square,
  Minus,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import React from 'react';
import { useToast } from '@/hooks/use-toast';

interface BulkAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'outline';
  requiresConfirmation?: boolean;
  confirmMessage?: string;
}

interface BulkOperationsProps<T> {
  items: T[];
  selectedItems: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onBulkAction: (actionId: string, selectedIds: string[]) => Promise<void>;
  getItemId: (item: T) => string;
  getItemLabel?: (item: T) => string;
  actions?: BulkAction[];
  className?: string;
}

// Default bulk actions
const defaultActions: BulkAction[] = [
  {
    id: 'export',
    label: 'Export Selected',
    icon: Download,
    variant: 'outline',
  },
  {
    id: 'copy',
    label: 'Copy IDs',
    icon: Copy,
    variant: 'outline',
  },
  {
    id: 'share',
    label: 'Share Selection',
    icon: Share,
    variant: 'outline',
  },
  {
    id: 'delete',
    label: 'Delete Selected',
    icon: Trash2,
    variant: 'destructive',
    requiresConfirmation: true,
    confirmMessage: 'Are you sure you want to delete the selected items?',
  },
];

export function BulkOperations<T>({
  items,
  selectedItems,
  onSelectionChange,
  onBulkAction,
  getItemId,
  getItemLabel,
  actions = defaultActions,
  className = "",
}: BulkOperationsProps<T>) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Selection state calculations
  const selectedCount = selectedItems.length;
  const totalCount = items.length;
  const isAllSelected = selectedCount === totalCount && totalCount > 0;
  const isPartiallySelected = selectedCount > 0 && selectedCount < totalCount;

  // Toggle all selection
  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map(getItemId));
    }
  }, [isAllSelected, items, getItemId, onSelectionChange]);

  // Handle bulk action execution
  const handleBulkAction = useCallback(async (action: BulkAction) => {
    if (selectedItems.length === 0) return;

    if (action.requiresConfirmation) {
      const confirmed = window.confirm(action.confirmMessage || 'Are you sure?');
      if (!confirmed) return;
    }

    setIsProcessing(action.id);
    try {
      await onBulkAction(action.id, selectedItems);
      
      // Show success message
      toast({
        title: 'Action completed',
        description: `${action.label} completed for ${selectedItems.length} item(s)`,
      });

      // Clear selection after successful action
      if (action.id === 'delete') {
        onSelectionChange([]);
      }
    } catch (error) {
      toast({
        title: 'Action failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(null);
    }
  }, [selectedItems, onBulkAction, toast, onSelectionChange]);

  // Clear selection
  const clearSelection = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  // Quick copy IDs action
  const copySelectedIds = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(selectedItems.join('\n'));
      toast({
        title: 'Copied to clipboard',
        description: `${selectedItems.length} IDs copied`,
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  }, [selectedItems, toast]);

  // Get checkbox state
  const getCheckboxState = useMemo(() => {
    if (isAllSelected) return 'checked';
    if (isPartiallySelected) return 'indeterminate';
    return 'unchecked';
  }, [isAllSelected, isPartiallySelected]);

  if (selectedCount === 0) return null;

  return (
    <div className={`flex items-center justify-between p-3 bg-muted/50 border rounded-lg ${className}`}>
      <div className="flex items-center space-x-3">
        {/* Master checkbox */}
        <div className="relative">
          <Checkbox
            checked={getCheckboxState === 'checked'}
            onCheckedChange={handleSelectAll}
            className="data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground"
          />
          {getCheckboxState === 'indeterminate' && (
            <Minus className="absolute inset-0 h-4 w-4 text-primary-foreground pointer-events-none" />
          )}
        </div>

        {/* Selection info */}
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="font-mono">
            {selectedCount} of {totalCount} selected
          </Badge>
          
          {/* Quick actions */}
          <Button
            variant="ghost"
            size="sm"
            onClick={copySelectedIds}
            className="h-7 px-2"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy IDs
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="h-7 px-2"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Primary actions */}
        {actions.slice(0, 2).map((action) => {
          const Icon = action.icon;
          const isLoading = isProcessing === action.id;
          
          return (
            <Button
              key={action.id}
              variant={action.variant || 'outline'}
              size="sm"
              onClick={() => handleBulkAction(action)}
              disabled={isLoading || !!isProcessing}
              className="h-8"
            >
              <Icon className="h-4 w-4 mr-1" />
              {isLoading ? 'Processing...' : action.label}
            </Button>
          );
        })}

        {/* More actions dropdown */}
        {actions.length > 2 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.slice(2).map((action, index) => {
                const Icon = action.icon;
                const isLoading = isProcessing === action.id;
                
                return (
                  <DropdownMenuItem
                    key={action.id}
                    onClick={() => handleBulkAction(action)}
                    className={`${action.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''} ${isLoading || !!isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {isLoading ? 'Processing...' : action.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// Hook for managing bulk selection state
export function useBulkSelection<T>(items: T[], getItemId: (item: T) => string) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const isSelected = useCallback((itemId: string) => {
    return selectedItems.includes(itemId);
  }, [selectedItems]);

  const toggleSelection = useCallback((itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedItems(items.map(getItemId));
  }, [items, getItemId]);

  const clearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  const setSelection = useCallback((itemIds: string[]) => {
    setSelectedItems(itemIds);
  }, []);

  return {
    selectedItems,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    setSelection,
    selectedCount: selectedItems.length,
  };
}

// Enhanced table row with selection
interface SelectableTableRowProps {
  isSelected: boolean;
  onToggleSelection: () => void;
  children: React.ReactNode;
  className?: string;
}

export function SelectableTableRow({ 
  isSelected, 
  onToggleSelection, 
  children, 
  className = "" 
}: SelectableTableRowProps) {
  return (
    <tr 
      className={`transition-colors hover:bg-muted/50 ${
        isSelected ? 'bg-muted/30' : ''
      } ${className}`}
      onClick={(e) => {
        // Only toggle if not clicking on interactive elements
        const target = e.target as HTMLElement;
        if (!target.closest('button, a, input, select, textarea')) {
          onToggleSelection();
        }
      }}
    >
      <td className="w-12 px-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelection}
          onClick={(e) => e.stopPropagation()}
        />
      </td>
      {children}
    </tr>
  );
}

// Bulk operations context provider
interface BulkOperationsContextType {
  selectedItems: string[];
  isSelected: (id: string) => boolean;
  toggleSelection: (id: string) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;
}

const BulkOperationsContext = React.createContext<BulkOperationsContextType | null>(null);

export function BulkOperationsProvider<T>({ 
  children, 
  items, 
  getItemId 
}: { 
  children: React.ReactNode;
  items: T[];
  getItemId: (item: T) => string;
}) {
  const bulkSelection = useBulkSelection(items, getItemId);

  return (
    <BulkOperationsContext.Provider value={bulkSelection}>
      {children}
    </BulkOperationsContext.Provider>
  );
}

export function useBulkOperationsContext() {
  const context = React.useContext(BulkOperationsContext);
  if (!context) {
    throw new Error('useBulkOperationsContext must be used within BulkOperationsProvider');
  }
  return context;
}