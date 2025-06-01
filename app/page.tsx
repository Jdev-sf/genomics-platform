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
  AlertTriangle,
  Download,
  TrendingUp
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// NEW UX COMPONENTS
import { GeneStatisticsChart } from '@/components/charts/gene-statistics-chart';
import { VariantStatisticsChart } from '@/components/charts/variant-statistics-chart';
import { QuickHelp, DetailedHelp, HelpSuggestions } from '@/components/contextual-help';
import { useGeneStatistics, useVariantStatistics } from '@/hooks/use-chart-data';

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

  // NEW: Fetch chart data
  const { data: geneStats, isLoading: geneStatsLoading } = useGeneStatistics();
  const { data: variantStats, isLoading: variantStatsLoading } = useVariantStatistics();

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

  // Mock data for charts
  const mockGeneStats = {
    chromosomeDistribution: [
      { chromosome: '1', count: 2145, pathogenic: 234 },
      { chromosome: '2', count: 1876, pathogenic: 198 },
      { chromosome: '3', count: 1654, pathogenic: 176 },
      { chromosome: '4', count: 1432, pathogenic: 145 },
      { chromosome: '5', count: 1234, pathogenic: 123 },
      { chromosome: '6', count: 1098, pathogenic: 98 },
      { chromosome: '7', count: 987, pathogenic: 87 },
      { chromosome: '8', count: 876, pathogenic: 76 },
      { chromosome: '9', count: 765, pathogenic: 65 },
      { chromosome: '10', count: 654, pathogenic: 54 },
      { chromosome: 'X', count: 543, pathogenic: 43 },
      { chromosome: 'Y', count: 432, pathogenic: 32 },
    ],
    biotypeDistribution: [
      { biotype: 'protein_coding', count: 15432, percentage: 75.6 },
      { biotype: 'lncRNA', count: 3234, percentage: 15.8 },
      { biotype: 'miRNA', count: 1876, percentage: 9.2 },
      { biotype: 'pseudogene', count: 876, percentage: 4.3 },
      { biotype: 'snoRNA', count: 543, percentage: 2.7 },
    ],
    variantCounts: [
      { geneSymbol: 'BRCA1', totalVariants: 1245, pathogenicVariants: 234, chromosome: '17' },
      { geneSymbol: 'TP53', totalVariants: 987, pathogenicVariants: 178, chromosome: '17' },
      { geneSymbol: 'EGFR', totalVariants: 876, pathogenicVariants: 145, chromosome: '7' },
      { geneSymbol: 'KRAS', totalVariants: 765, pathogenicVariants: 123, chromosome: '12' },
      { geneSymbol: 'PIK3CA', totalVariants: 654, pathogenicVariants: 98, chromosome: '3' },
    ],
    clinicalSignificance: [
      { significance: 'Pathogenic', count: 8765, percentage: 12.3 },
      { significance: 'Likely pathogenic', count: 5432, percentage: 7.6 },
      { significance: 'Uncertain significance', count: 23456, percentage: 32.8 },
      { significance: 'Likely benign', count: 18765, percentage: 26.2 },
      { significance: 'Benign', count: 15234, percentage: 21.3 },
    ],
    trends: [
      { date: '2023-07', newGenes: 1250, newVariants: 15420, pathogenicDiscovered: 234 },
      { date: '2023-08', newGenes: 1180, newVariants: 16800, pathogenicDiscovered: 187 },
      { date: '2023-09', newGenes: 1350, newVariants: 18200, pathogenicDiscovered: 298 },
      { date: '2023-10', newGenes: 1420, newVariants: 19500, pathogenicDiscovered: 312 },
      { date: '2023-11', newGenes: 1380, newVariants: 21000, pathogenicDiscovered: 278 },
      { date: '2023-12', newGenes: 1500, newVariants: 22800, pathogenicDiscovered: 345 },
    ]
  };

  const mockVariantStats = {
    chromosomeDistribution: [
      { chromosome: '1', count: 45678, pathogenic: 3456, benign: 23456 },
      { chromosome: '2', count: 43210, pathogenic: 3210, benign: 22100 },
      { chromosome: '3', count: 38765, pathogenic: 2876, benign: 19876 },
      { chromosome: '4', count: 35432, pathogenic: 2543, benign: 18234 },
      { chromosome: '5', count: 32109, pathogenic: 2210, benign: 16543 },
    ],
    clinicalSignificance: [
      { significance: 'Pathogenic', count: 8765, percentage: 12.3 },
      { significance: 'Likely pathogenic', count: 5432, percentage: 7.6 },
      { significance: 'Uncertain significance', count: 23456, percentage: 32.8 },
      { significance: 'Likely benign', count: 18765, percentage: 26.2 },
      { significance: 'Benign', count: 15234, percentage: 21.3 },
    ],
    impactDistribution: [
      { impact: 'HIGH', count: 5432, percentage: 8.1 },
      { impact: 'MODERATE', count: 12345, percentage: 18.4 },
      { impact: 'LOW', count: 23456, percentage: 34.9 },
      { impact: 'MODIFIER', count: 25987, percentage: 38.6 },
    ],
    variantTypes: [
      { type: 'SNV', count: 45678, percentage: 68.2 },
      { type: 'INDEL', count: 12345, percentage: 18.4 },
      { type: 'CNV', count: 5432, percentage: 8.1 },
      { type: 'SV', count: 3456, percentage: 5.3 },
    ],
    frequencyDistribution: [
      { range: 'Ultra rare (<0.01%)', count: 45678, averageFrequency: 0.00005 },
      { range: 'Very rare (0.01-0.1%)', count: 12345, averageFrequency: 0.0005 },
      { range: 'Rare (0.1-1%)', count: 8765, averageFrequency: 0.005 },
      { range: 'Low frequency (1-5%)', count: 3456, averageFrequency: 0.025 },
      { range: 'Common (>5%)', count: 2345, averageFrequency: 0.15 },
    ],
    geneImpact: [
      { geneSymbol: 'BRCA1', chromosome: '17', totalVariants: 1245, pathogenicCount: 234, highImpactCount: 198 },
      { geneSymbol: 'TP53', chromosome: '17', totalVariants: 987, pathogenicCount: 178, highImpactCount: 145 },
      { geneSymbol: 'EGFR', chromosome: '7', totalVariants: 876, pathogenicCount: 145, highImpactCount: 112 },
    ],
    trends: [
      { date: '2023-07', totalVariants: 125000, pathogenicVariants: 8500, clinicallySignificant: 15200 },
      { date: '2023-08', totalVariants: 142000, pathogenicVariants: 9200, clinicallySignificant: 16800 },
      { date: '2023-09', totalVariants: 158000, pathogenicVariants: 10100, clinicallySignificant: 18500 },
      { date: '2023-10', totalVariants: 176000, pathogenicVariants: 11200, clinicallySignificant: 20200 },
      { date: '2023-11', totalVariants: 195000, pathogenicVariants: 12500, clinicallySignificant: 22100 },
      { date: '2023-12', totalVariants: 215000, pathogenicVariants: 13800, clinicallySignificant: 24300 },
    ]
  };

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
        {/* Welcome Section with Contextual Help */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 dark:from-white dark:via-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
              Genomics Platform Dashboard
            </h1>
            <QuickHelp 
              topic="keyboard-shortcuts" 
              trigger="icon"
              className="ml-2"
            />
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered genomic analysis and visualization platform for researchers and clinicians
          </p>
        </div>

        {/* Stats Cards with Help */}
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
          <div className="relative">
            <StatCard
              title="Pathogenic Variants"
              value={stats?.pathogenicVariants || 0}
              change={-2}
              changeLabel="from last month"
              icon={AlertTriangle}
              color="red"
              subtitle="Clinical significance"
            />
            <div className="absolute top-2 right-2">
              <QuickHelp topic="clinical-significance" />
            </div>
          </div>
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
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Variants by Chromosome</h3>
                <QuickHelp topic="allele-frequency" />
              </div>
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
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Clinical Significance</h3>
                <DetailedHelp topic="clinical-significance" trigger="icon" />
              </div>
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

        {/* Advanced Data Visualization - NEW UX FEATURE */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold">Advanced Analytics</h2>
              <QuickHelp topic="variant-impact" />
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Real-time
              </Badge>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Charts
              </Button>
            </div>
          </div>

          <Tabs defaultValue="genes" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="genes" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Gene Analytics
              </TabsTrigger>
              <TabsTrigger value="variants" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Variant Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="genes" className="space-y-4">
              {geneStatsLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <GeneStatisticsChart 
                  data={geneStats || mockGeneStats} 
                  className="animate-fade-in"
                />
              )}
            </TabsContent>

            <TabsContent value="variants" className="space-y-4">
              {variantStatsLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <VariantStatisticsChart 
                  data={variantStats || mockVariantStats} 
                  className="animate-fade-in"
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Context-aware Help for this page */}
        <HelpSuggestions page="dashboard" />
      </main>
    </div>
  );
}