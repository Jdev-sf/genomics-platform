'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Activity, AlertCircle, CheckCircle, TrendingUp, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface DashboardStats {
  totalGenes: number;
  totalVariants: number;
  pathogenicVariants: number;
  totalAnnotations: number;
  variantsByChromosome: Array<{ chromosome: string; count: number }>;
  variantsByClinicalSignificance: Array<{ name: string; value: number }>;
  recentActivity: Array<{ date: string; imports: number; exports: number }>;
}

import { MainLayout } from '@/components/layout/main-layout';

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // In produzione, questo verrebbe da un endpoint API dedicato
      // Per ora usiamo dati mock realistici
      const mockStats: DashboardStats = {
        totalGenes: 20453,
        totalVariants: 1234567,
        pathogenicVariants: 45234,
        totalAnnotations: 892123,
        variantsByChromosome: [
          { chromosome: '1', count: 98234 },
          { chromosome: '2', count: 87123 },
          { chromosome: '3', count: 76234 },
          { chromosome: '4', count: 65123 },
          { chromosome: '5', count: 58234 },
          { chromosome: '6', count: 54123 },
          { chromosome: '7', count: 52234 },
          { chromosome: '8', count: 48123 },
          { chromosome: '9', count: 45234 },
          { chromosome: '10', count: 42123 },
        ],
        variantsByClinicalSignificance: [
          { name: 'Pathogenic', value: 45234 },
          { name: 'Likely Pathogenic', value: 23456 },
          { name: 'Uncertain', value: 567890 },
          { name: 'Likely Benign', value: 234567 },
          { name: 'Benign', value: 363420 },
        ],
        recentActivity: [
          { date: 'Mon', imports: 45, exports: 23 },
          { date: 'Tue', imports: 52, exports: 28 },
          { date: 'Wed', imports: 38, exports: 32 },
          { date: 'Thu', imports: 65, exports: 45 },
          { date: 'Fri', imports: 72, exports: 52 },
          { date: 'Sat', imports: 28, exports: 18 },
          { date: 'Sun', imports: 15, exports: 12 },
        ],
      };
      setStats(mockStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#ef4444', '#f97316', '#6b7280', '#22c55e', '#10b981'];

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Genomics Platform Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Real-time insights into your genomic data
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Genes</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalGenes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1 text-green-500" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalVariants.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1 text-green-500" />
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pathogenic</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.pathogenicVariants.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats?.pathogenicVariants! / stats?.totalVariants!) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annotations</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAnnotations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Last update: 2 hours ago
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Variants by Chromosome</CardTitle>
            <CardDescription>Distribution of variants across chromosomes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.variantsByChromosome}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="chromosome" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clinical Significance</CardTitle>
            <CardDescription>Breakdown of variants by clinical significance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.variantsByClinicalSignificance}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value.toLocaleString()}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats?.variantsByClinicalSignificance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Activity</CardTitle>
          <CardDescription>Import and export activity over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats?.recentActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="imports" stroke="#3b82f6" name="Imports" />
              <Line type="monotone" dataKey="exports" stroke="#10b981" name="Exports" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates and changes in the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium">BRCA1 annotations updated</p>
                <p className="text-xs text-muted-foreground">234 new clinical annotations added</p>
              </div>
              <span className="text-xs text-muted-foreground">2 hours ago</span>
            </div>
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium">New pathogenic variant identified</p>
                <p className="text-xs text-muted-foreground">TP53 c.742C&gt;T marked as pathogenic</p>
              </div>
              <span className="text-xs text-muted-foreground">5 hours ago</span>
            </div>
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium">Bulk import completed</p>
                <p className="text-xs text-muted-foreground">1,234 variants imported successfully</p>
              </div>
              <span className="text-xs text-muted-foreground">1 day ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </MainLayout>
  );
}