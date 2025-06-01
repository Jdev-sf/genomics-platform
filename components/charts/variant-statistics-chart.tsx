// components/charts/variant-statistics-chart.tsx
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
  ComposedChart,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface VariantStatistics {
  chromosomeDistribution: Array<{
    chromosome: string;
    count: number;
    pathogenic: number;
    benign: number;
  }>;
  clinicalSignificance: Array<{
    significance: string;
    count: number;
    percentage: number;
  }>;
  impactDistribution: Array<{
    impact: string;
    count: number;
    percentage: number;
  }>;
  variantTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  frequencyDistribution: Array<{
    range: string;
    count: number;
    averageFrequency: number;
  }>;
  geneImpact: Array<{
    geneSymbol: string;
    totalVariants: number;
    pathogenicCount: number;
    highImpactCount: number;
    chromosome: string;
  }>;
  trends: Array<{
    date: string;
    totalVariants: number;
    pathogenicVariants: number;
    clinicallySignificant: number;
  }>;
}

interface VariantStatisticsChartProps {
  data: VariantStatistics;
  className?: string;
}

const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#6366f1',
  muted: '#6b7280',
  success: '#22c55e',
};

const CLINICAL_COLORS = {
  'Pathogenic': '#dc2626',
  'Likely pathogenic': '#ea580c',
  'Uncertain significance': '#ca8a04',
  'Likely benign': '#16a34a',
  'Benign': '#059669',
  'Not provided': '#6b7280',
};

const IMPACT_COLORS = {
  'HIGH': '#dc2626',
  'MODERATE': '#ea580c',
  'LOW': '#16a34a',
  'MODIFIER': '#6b7280',
};

export function VariantStatisticsChart({ data, className = '' }: VariantStatisticsChartProps) {
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
    const totalVariants = data.clinicalSignificance.reduce((sum, item) => sum + item.count, 0);
    const pathogenic = data.clinicalSignificance
      .filter(item => item.significance.toLowerCase().includes('pathogenic'))
      .reduce((sum, item) => sum + item.count, 0);
    const highImpact = data.impactDistribution
      .find(item => item.impact === 'HIGH')?.count || 0;
    const commonVariants = data.frequencyDistribution
      .filter(item => item.averageFrequency > 0.01)
      .reduce((sum, item) => sum + item.count, 0);

    return {
      totalVariants,
      pathogenic,
      pathogenicPercentage: totalVariants > 0 ? (pathogenic / totalVariants) * 100 : 0,
      highImpact,
      highImpactPercentage: totalVariants > 0 ? (highImpact / totalVariants) * 100 : 0,
      commonVariants,
      rareVariants: totalVariants - commonVariants,
    };
  }, [data]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {summaryStats.totalVariants.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">Total Variants</p>
            <Progress value={100} className="mt-2 h-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {summaryStats.pathogenic.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">
              Pathogenic ({summaryStats.pathogenicPercentage.toFixed(1)}%)
            </p>
            <Progress value={summaryStats.pathogenicPercentage} className="mt-2 h-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {summaryStats.highImpact.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">
              High Impact ({summaryStats.highImpactPercentage.toFixed(1)}%)
            </p>
            <Progress value={summaryStats.highImpactPercentage} className="mt-2 h-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {summaryStats.rareVariants.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">Rare Variants (&lt;1%)</p>
            <Progress 
              value={(summaryStats.rareVariants / summaryStats.totalVariants) * 100} 
              className="mt-2 h-1" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <Tabs defaultValue="distribution" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="clinical">Clinical Impact</TabsTrigger>
          <TabsTrigger value="frequency">Frequency</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Chromosome Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Variants by Chromosome</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={data.chromosomeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="chromosome" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="count" 
                      fill={COLORS.primary} 
                      radius={[2, 2, 0, 0]}
                      name="Total Variants"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pathogenic" 
                      stroke={COLORS.danger}
                      strokeWidth={2}
                      name="Pathogenic"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Variant Types */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Variant Types</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.variantTypes}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      label={({ type, percentage }) => 
                        (typeof percentage === 'number' && percentage > 5) ? `${type} (${percentage.toFixed(1)}%)` : ''
                      }
                    >
                      {data.variantTypes.map((entry, index) => (
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

          {/* Impact Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Impact Severity Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {data.impactDistribution.map((impact) => (
                  <div key={impact.impact} className="text-center p-4 border rounded-lg">
                    <div 
                      className="text-3xl font-bold mb-2"
                      style={{ color: IMPACT_COLORS[impact.impact as keyof typeof IMPACT_COLORS] }}
                    >
                      {impact.count.toLocaleString()}
                    </div>
                    <div className="font-medium">{impact.impact}</div>
                    <div className="text-sm text-muted-foreground">
                      {impact.percentage.toFixed(1)}%
                    </div>
                    <Progress 
                      value={impact.percentage} 
                      className="mt-2 h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinical" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Clinical Significance Donut Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Clinical Significance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.clinicalSignificance}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="count"
                      label={({ significance, percentage }) => 
                        (typeof percentage === 'number' && percentage > 3) ? `${significance}: ${percentage.toFixed(1)}%` : ''
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
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gene Impact Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Impacted Genes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {data.geneImpact
                    .sort((a, b) => b.pathogenicCount - a.pathogenicCount)
                    .slice(0, 10)
                    .map((gene, index) => (
                      <div key={gene.geneSymbol} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={index < 3 ? "destructive" : "outline"} 
                            className="w-8 text-center"
                          >
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
                          <div className="font-bold text-red-600">
                            {gene.pathogenicCount}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            / {gene.totalVariants} total
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Clinical Significance Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Clinical Impact Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.clinicalSignificance}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="significance" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    radius={[2, 2, 0, 0]}
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
        </TabsContent>

        <TabsContent value="frequency" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Frequency Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Allele Frequency Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.frequencyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="count" 
                      fill={COLORS.info}
                      radius={[2, 2, 0, 0]}
                      name="Variant Count"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Frequency Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Frequency Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.frequencyDistribution.map((freq, index) => {
                    const percentage = (freq.count / summaryStats.totalVariants) * 100;
                    return (
                      <div key={freq.range} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{freq.range}</span>
                          <span className="text-sm text-muted-foreground">
                            {freq.count.toLocaleString()} variants
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <div className="text-sm text-muted-foreground">
                          {percentage.toFixed(1)}% of all variants
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Variant Discovery Trends</CardTitle>
              <p className="text-sm text-muted-foreground">
                Growth in variant database over time
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={data.trends}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="totalVariants"
                    stackId="1"
                    stroke={COLORS.primary}
                    fill={COLORS.primary}
                    fillOpacity={0.6}
                    name="Total Variants"
                  />
                  <Area
                    type="monotone"
                    dataKey="pathogenicVariants"
                    stackId="2"
                    stroke={COLORS.danger}
                    fill={COLORS.danger}
                    fillOpacity={0.8}
                    name="Pathogenic Variants"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="clinicallySignificant" 
                    stroke={COLORS.warning}
                    strokeWidth={3}
                    dot={{ fill: COLORS.warning, strokeWidth: 2, r: 4 }}
                    name="Clinically Significant"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Trend Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  +{data.trends[data.trends.length - 1]?.totalVariants.toLocaleString() || 0}
                </div>
                <p className="text-sm text-muted-foreground">Total Growth</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  +{data.trends[data.trends.length - 1]?.pathogenicVariants.toLocaleString() || 0}
                </div>
                <p className="text-sm text-muted-foreground">Pathogenic Growth</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {data.trends.length > 1 ? 
                    Math.round(((data.trends[data.trends.length - 1]?.totalVariants || 0) - 
                               (data.trends[data.trends.length - 2]?.totalVariants || 0)) / 
                               (data.trends[data.trends.length - 2]?.totalVariants || 1) * 100) 
                    : 0}%
                </div>
                <p className="text-sm text-muted-foreground">Recent Growth Rate</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}