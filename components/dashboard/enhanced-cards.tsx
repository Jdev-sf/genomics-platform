'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Database, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  Zap,
  BarChart3,
  Users,
  Clock,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'red' | 'purple' | 'yellow';
  subtitle?: string;
}

export function StatCard({ title, value, change, changeLabel, icon: Icon, color, subtitle }: StatCardProps) {
  const isPositive = change > 0;
  
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600', 
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    yellow: 'from-yellow-500 to-yellow-600',
  };

  const iconColorClasses = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400',
    green: 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400',
    red: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400',
    yellow: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400',
  };

  return (
    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
      {/* Gradient background accent */}
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${colorClasses[color]}`}></div>
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${iconColorClasses[color]} transition-transform group-hover:scale-110`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="text-3xl font-bold tracking-tight">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {isPositive ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{change}%
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuickActionCard({ title, description, icon: Icon, action, color = 'blue' }: {
  title: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
    orange: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
  };

  return (
    <Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1" onClick={action}>
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white transition-transform group-hover:scale-110 group-hover:rotate-3`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>
            <div className="flex items-center mt-3 text-xs text-muted-foreground group-hover:text-primary transition-colors">
              <span>Get started</span>
              <ArrowUpRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ActivityFeedCard() {
  const activities = [
    {
      id: 1,
      type: 'annotation_update',
      message: 'BRCA1 annotations updated',
      detail: '234 new clinical annotations added from ClinVar',
      time: '2 hours ago',
      icon: Database,
      color: 'blue'
    },
    {
      id: 2,
      type: 'variant_discovery',
      message: 'New pathogenic variant identified',
      detail: 'TP53 c.742C>T classified as pathogenic',
      time: '5 hours ago',
      icon: AlertTriangle,
      color: 'red'
    },
    {
      id: 3,
      type: 'sync_complete',
      message: 'Database synchronization completed',
      detail: 'External API data synchronized successfully',
      time: '1 day ago',
      icon: CheckCircle,
      color: 'green'
    },
    {
      id: 4,
      type: 'ai_insight',
      message: 'AI analysis completed',
      detail: 'New insights generated for 15 genes',
      time: '2 days ago',
      icon: Sparkles,
      color: 'purple'
    }
  ];

  const getColorClasses = (color: string) => {
    const classes = {
      blue: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400',
      red: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400',
      green: 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400',
      purple: 'text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400',
    };
    return classes[color as keyof typeof classes] || classes.blue;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <Badge variant="secondary" className="text-xs">
          Live
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className="flex items-start space-x-4 group">
              <div className={`p-2 rounded-lg ${getColorClasses(activity.color)} transition-transform group-hover:scale-110`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{activity.message}</p>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {activity.detail}
                </p>
              </div>
            </div>
          );
        })}
        <Button variant="ghost" className="w-full mt-4">
          View all activity
        </Button>
      </CardContent>
    </Card>
  );
}

export function ProgressCard({ title, current, total, color = 'blue' }: {
  title: string;
  current: number;
  total: number;
  color?: 'blue' | 'green' | 'purple';
}) {
  const percentage = (current / total) * 100;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">{current.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">of {total.toLocaleString()}</span>
        </div>
        <div className="space-y-2">
          <Progress value={percentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {percentage.toFixed(1)}% complete
          </p>
        </div>
      </CardContent>
    </Card>
  );
}