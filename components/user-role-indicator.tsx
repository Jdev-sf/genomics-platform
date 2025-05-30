// components/user-role-indicator.tsx
'use client';

import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Eye, User, Microscope, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function UserRoleIndicator() {
  const { data: session } = useSession();

  if (!session?.user?.role) return null;

  const role = session.user.role.name;
  
  const roleConfig = {
    viewer: {
      icon: Eye,
      label: 'Viewer',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      description: 'Read-only access to browse genes and variants'
    },
    researcher: {
      icon: Microscope,
      label: 'Researcher',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'Full access: import data, run analysis, export results'
    },
    clinician: {
      icon: User,
      label: 'Clinician',
      color: 'bg-green-100 text-green-800 border-green-200',
      description: 'Clinical focus: view variants and clinical annotations'
    },
    admin: {
      icon: AlertCircle,
      label: 'Admin',
      color: 'bg-red-100 text-red-800 border-red-200',
      description: 'Full system administration access'
    }
  };

  const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.viewer;
  const Icon = config.icon;

  // Show guest indicator for temporary guest accounts
  const isGuest = session.user.email?.includes('@guest.local');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Badge className={`${config.color} flex items-center gap-1`}>
              <Icon className="h-3 w-3" />
              {config.label}
              {isGuest && <span className="text-xs">(Guest)</span>}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-medium">{config.label} Access</p>
            <p className="text-xs text-muted-foreground mt-1">
              {config.description}
            </p>
            {isGuest && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️ Temporary guest session - data is read-only
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}