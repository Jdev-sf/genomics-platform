'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Database, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Search,
  Upload,
  BarChart3,
  FileText,
  Brain,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { ModernHeader } from '@/components/layout/modern-header';
import { 
  StatCard, 
  QuickActionCard, 
  ActivityFeedCard, 
  ProgressCard 
} from '@/components/dashboard/enhanced-cards';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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

export default function HomePage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Mock data for demo - replace with real API call
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

  const quickActions = [
    {
      title: 'Search Genes',
      description: 'Find genes by symbol, name, or genomic location',
      icon: Search,
      color: 'blue' as const,
      action: () => router.push('/genes')
    },
    {
      title: 'Analyze Variants',
      description: 'Explore genetic variants and their clinical significance',
      icon: Activity,
      color: 'green' as const,
      action: () => router.push('/variants')
    },
    {
      title: 'Import Data',
      description: 'Upload new genomic datasets for analysis',
      icon: Upload,
      color: 'purple' as const,
      action: () => router.push('/import')
    },
    {
      title: 'AI Insights',
      description: 'Get AI-powered predictions and literature suggestions',
      icon: Brain,
      color: 'orange' as const,
      action: () => router.push('/genes')
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <ModernHeader />
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <ModernHeader />
      
      <main className="container mx-auto py-8 px-4 space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 dark:from-white dark:via-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
            Genomics Platform Dashboard
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered genomic analysis and visualization platform for researchers and clinicians
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Genes"
            value={stats?.totalGenes || 0}
            change={12}
            changeLabel="from last month"
            icon={Database}
            color="blue"
            subtitle="Human genome reference"
          />
          <StatCard
            title="Total Variants"
            value={stats?.totalVariants || 0}
            change={8}
            changeLabel="from last month"
            icon={Activity}
            color="green"
            subtitle="Catalogued variations"
          />
          <StatCard
            title="Pathogenic Variants"
            value={stats?.pathogenicVariants || 0}
            change={-2}
            changeLabel="from last month"
            icon={AlertTriangle}
            color="red"
            subtitle="Clinical significance"
          />
          <StatCard
            title="AI Annotations"
            value={stats?.totalAnnotations || 0}
            change={15}
            changeLabel="from last month"
            icon={CheckCircle}
            color="purple"
            subtitle="Machine learning enhanced"
          />
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Quick Actions</h2>
            <Zap className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => (
              <QuickActionCard
                key={index}
                title={action.title}
                description={action.description}
                icon={action.icon}
                color={action.color}
                action={action.action}
              />
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Variants by Chromosome */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Variants by Chromosome</h3>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.variantsByChromosome}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="chromosome" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Clinical Significance */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Clinical Significance</h3>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.variantsByClinicalSignificance}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={(entry) => entry.name}
                >
                  {stats?.variantsByClinicalSignificance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity and Progress */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ActivityFeedCard />
          </div>
          <div className="space-y-6">
            <ProgressCard
              title="Database Coverage"
              current={stats?.totalGenes || 0}
              total={25000}
              color="blue"
            />
            <ProgressCard
              title="AI Analysis Complete"
              current={stats?.totalAnnotations || 0}
              total={1500000}
              color="purple"
            />
          </div>
        </div>

        {/* Platform Activity Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Platform Activity</h3>
            <span className="text-sm text-muted-foreground">Last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats?.recentActivity}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="imports" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                name="Data Imports" 
              />
              <Line 
                type="monotone" 
                dataKey="exports" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                name="Data Exports" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}