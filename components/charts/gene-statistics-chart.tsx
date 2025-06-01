// components/charts/gene-statistics-chart.tsx
'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  ScatterChart,
  Scatter,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface GeneStatistics {
  chromosomeDistribution: Array<{
    chromosome: string;
    count: number;
    pathogenic: number;
  }>;
  biotypeDistribution: Array<{
    biotype: string;
    count: number;
    percentage: number;
  }>;
  variantCounts: Array<{
    geneSymbol: string;
    totalVariants: number;
    pathogenicVariants: number;
    chromosome: string;
  }>;
  clinicalSignificance: Array<{
    significance: string;
    count: number;
    percentage: number;
  }>;
  trends: Array<{
    date: string;
    newGenes: number;
    newVariants: number;
    pathogenicDiscovered: number;
  }>;
}

interface GeneStatisticsChartProps {
  data: GeneStatistics;
  className?: string;
}

const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#6366f1',
  muted: '#6b7280',
};

const CLINICAL_COLORS = {
  'Pathogenic': '#dc2626',
  'Likely pathogenic': '#ea580c',
  'Uncertain significance': '#ca8a04',
  'Likely benign': '#16a34a',
  'Benign': '#059669',
  'Not provided': '#6b7280',
};

export function GeneStatisticsChart({ data, className = '' }: GeneStatisticsChartProps) {
  // Custom tooltip for enhanced data display
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}: {entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalGenes = data.chromosomeDistribution.reduce((sum, item) => sum + item.count, 0);
    const totalPathogenic = data.chromosomeDistribution.reduce((sum, item) => sum + item.pathogenic, 0);
    const avgVariantsPerGene = data.variantCounts.length > 0 
      ? data.variantCounts.reduce((sum, gene) => sum + gene.totalVariants, 0) / data.variantCounts.length
      : 0;
    const highVariantGenes = data.variantCounts.filter(gene => gene.totalVariants > avgVariantsPerGene).length;

    return {
      totalGenes,
      totalPathogenic,
      pathogenicPercentage: totalGenes > 0 ? (totalPathogenic / totalGenes) * 100 : 0,
      avgVariantsPerGene: Math.round(avgVariantsPerGene),
      highVariantGenes,
    };
  }, [data]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {summaryStats.totalGenes.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">Total Genes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {summaryStats.totalPathogenic.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">
              Pathogenic ({summaryStats.pathogenicPercentage.toFixed(1)}%)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {summaryStats.avgVariantsPerGene}
            </div>
            <p className="text-sm text-muted-foreground">Avg Variants/Gene</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {summaryStats.highVariantGenes}
            </div>
            <p className="text-sm text-muted-foreground">High-Variant Genes</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <Tabs defaultValue="distribution" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Chromosome Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Genes by Chromosome</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.chromosomeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="chromosome" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="count" 
                      fill={COLORS.primary} 
                      radius={[2, 2, 0, 0]}
                      name="Total Genes"
                    />
                    <Bar 
                      dataKey="pathogenic" 
                      fill={COLORS.danger} 
                      radius={[2, 2, 0, 0]}
                      name="Pathogenic"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Biotype Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gene Biotypes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.biotypeDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      label={({ biotype, percentage }) => 
                        (typeof percentage === 'number' && percentage > 5) ? `${biotype} (${percentage.toFixed(1)}%)` : ''
                      }
                    >
                      {data.biotypeDistribution.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={Object.values(COLORS)[index % Object.values(COLORS).length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="variants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gene Variant Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Genes with highest variant counts and pathogenic variants
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart data={data.variantCounts.slice(0, 50)}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="totalVariants" 
                    name="Total Variants"
                    label={{ value: 'Total Variants', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    dataKey="pathogenicVariants" 
                    name="Pathogenic Variants"
                    label={{ value: 'Pathogenic Variants', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg shadow-lg p-3">
                            <p className="font-medium">{data.geneSymbol}</p>
                            <p className="text-sm">Chr {data.chromosome}</p>
                            <p className="text-sm">Total Variants: {data.totalVariants}</p>
                            <p className="text-sm">Pathogenic: {data.pathogenicVariants}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter dataKey="pathogenicVariants" fill={COLORS.danger} />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Variant Genes Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Genes by Variant Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.variantCounts
                  .sort((a, b) => b.totalVariants - a.totalVariants)
                  .slice(0, 10)
                  .map((gene, index) => (
                    <div key={gene.geneSymbol} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-8 text-center">
                          {index + 1}
                        </Badge>
                        <div>
                          <span className="font-medium">{gene.geneSymbol}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            Chr {gene.chromosome}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{gene.totalVariants.toLocaleString()}</div>
                        <div className="text-sm text-red-600">
                          {gene.pathogenicVariants} pathogenic
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinical" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Clinical Significance Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Clinical Significance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.clinicalSignificance}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      label={({ significance, percentage }) => 
                        (typeof percentage === 'number' && percentage > 3) ? significance : ''
                      }
                    >
                      {data.clinicalSignificance.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CLINICAL_COLORS[entry.significance as keyof typeof CLINICAL_COLORS] || COLORS.muted}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Clinical Significance Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Clinical Impact Levels</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.clinicalSignificance} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="significance" 
                      width={120}
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="count" 
                      radius={[0, 2, 2, 0]}
                    >
                      {data.clinicalSignificance.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CLINICAL_COLORS[entry.significance as keyof typeof CLINICAL_COLORS] || COLORS.muted}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Discovery Trends</CardTitle>
              <p className="text-sm text-muted-foreground">
                New genes and variants discovered over time
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.trends}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="newGenes" 
                    stroke={COLORS.primary}
                    strokeWidth={3}
                    dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                    name="New Genes"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="newVariants" 
                    stroke={COLORS.secondary}
                    strokeWidth={3}
                    dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 4 }}
                    name="New Variants"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pathogenicDiscovered" 
                    stroke={COLORS.danger}
                    strokeWidth={3}
                    dot={{ fill: COLORS.danger, strokeWidth: 2, r: 4 }}
                    name="Pathogenic Discovered"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}