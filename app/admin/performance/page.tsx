// app/admin/performance/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Activity, 
  Database, 
  Zap, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Download
} from 'lucide-react';
import { ModernHeader } from '@/components/layout/modern-header';

interface PerformanceMetrics {
  queryReport: {
    totalQueries: number;
    averageDuration: number;
    slowQueries: number;
    slowQueryPercentage: number;
    topSlowOperations: Array<{
      operation: string;
      count: number;
      averageDuration: number;
      maxDuration: number;
      avgRowCount: number;
    }>;
    performanceTrend: 'improving' | 'degrading' | 'stable';
    timeWindow: number;
  };
  slowQueries: Array<{
    query: string;
    duration: number;
    threshold: number;
    frequency: number;
    lastOccurrence: Date;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    type: string;
    description: string;
    query?: string;
  }>;
  cacheStats?: {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
    cacheSize: number;
  };
  databaseHealth?: {
    healthy: boolean;
    latency?: number;
    connectionCount: number;
    queryCount: number;
  };
}

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/performance');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      
      const data = await response.json();
      setMetrics(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      const response = await fetch('/api/cache/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      });
      
      if (response.ok) {
        alert('Cache cleared successfully');
        fetchMetrics();
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const warmupCache = async () => {
    try {
      const response = await fetch('/api/cache/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'warmup' }),
      });
      
      if (response.ok) {
        alert('Cache warmup initiated');
        fetchMetrics();
      }
    } catch (error) {
      console.error('Failed to warmup cache:', error);
    }
  };

  const exportReport = () => {
    if (!metrics) return;
    
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalQueries: metrics.queryReport.totalQueries,
        averageDuration: metrics.queryReport.averageDuration,
        slowQueryPercentage: metrics.queryReport.slowQueryPercentage,
        performanceTrend: metrics.queryReport.performanceTrend,
      },
      slowQueries: metrics.slowQueries,
      recommendations: metrics.recommendations,
      cacheStats: metrics.cacheStats,
      databaseHealth: metrics.databaseHealth,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchMetrics, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'degrading': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <ModernHeader />
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Loading performance metrics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <ModernHeader />
      <div className="container mx-auto py-6 space-y-6 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Performance Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor system performance, query optimization, and cache efficiency
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto' : 'Manual'}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportReport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Last Update */}
        <div className="text-sm text-muted-foreground">
          Last updated: {lastUpdate.toLocaleString()}
        </div>

        {/* Overview Cards */}
        {metrics && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.queryReport.totalQueries.toLocaleString()}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {getTrendIcon(metrics.queryReport.performanceTrend)}
                    <span className="ml-1">Performance {metrics.queryReport.performanceTrend}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.queryReport.averageDuration}ms</div>
                  <p className="text-xs text-muted-foreground">
                    Last {metrics.queryReport.timeWindow} minutes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Slow Queries</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{metrics.queryReport.slowQueries}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.queryReport.slowQueryPercentage}% of total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {metrics.cacheStats ? `${metrics.cacheStats.hitRate.toFixed(1)}%` : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.cacheStats ? 
                      `${metrics.cacheStats.totalHits} hits, ${metrics.cacheStats.totalMisses} misses` : 
                      'Cache data unavailable'
                    }
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Metrics */}
            <Tabs defaultValue="queries" className="space-y-4">
              <TabsList>
                <TabsTrigger value="queries">Query Performance</TabsTrigger>
                <TabsTrigger value="cache">Cache Management</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              </TabsList>

              <TabsContent value="queries" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Slowest Operations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Operation</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Avg Duration</TableHead>
                          <TableHead>Max Duration</TableHead>
                          <TableHead>Avg Rows</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.queryReport.topSlowOperations.map((op, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm">{op.operation}</TableCell>
                            <TableCell>{op.count}</TableCell>
                            <TableCell>{op.averageDuration}ms</TableCell>
                            <TableCell className="text-red-600 font-semibold">{op.maxDuration}ms</TableCell>
                            <TableCell>{op.avgRowCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Slow Queries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Query</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Last Occurrence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.slowQueries.slice(0, 10).map((query, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm max-w-xs truncate">
                              {query.query}
                            </TableCell>
                            <TableCell className="text-red-600 font-semibold">
                              {query.duration}ms
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{query.frequency}x</Badge>
                            </TableCell>
                            <TableCell>{new Date(query.lastOccurrence).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cache" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Cache Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {metrics.cacheStats ? (
                      <>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <p className="text-sm font-medium">Hit Rate</p>
                            <div className="mt-2">
                              <Progress value={metrics.cacheStats.hitRate} className="h-2" />
                              <p className="text-2xl font-bold mt-1">{metrics.cacheStats.hitRate.toFixed(1)}%</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Total Hits</p>
                            <p className="text-2xl font-bold text-green-600">{metrics.cacheStats.totalHits.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Total Misses</p>
                            <p className="text-2xl font-bold text-red-600">{metrics.cacheStats.totalMisses.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={clearCache} variant="destructive" size="sm">
                            Clear Cache
                          </Button>
                          <Button onClick={warmupCache} variant="outline" size="sm">
                            Warmup Cache
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Cache statistics not available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {metrics.recommendations.map((rec, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={getPriorityColor(rec.priority)}>
                              {rec.priority.toUpperCase()} PRIORITY
                            </Badge>
                            <span className="text-sm text-muted-foreground">{rec.type}</span>
                          </div>
                          <p className="text-sm">{rec.description}</p>
                          {rec.query && (
                            <div className="mt-2 p-2 bg-muted rounded font-mono text-xs">
                              {rec.query}
                            </div>
                          )}
                        </div>
                      ))}
                      {metrics.recommendations.length === 0 && (
                        <p className="text-muted-foreground text-center py-8">
                          No performance recommendations at this time. Great job! 🎉
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}