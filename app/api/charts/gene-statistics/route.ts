// app/api/charts/gene-statistics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getOptimizedGeneService } from '@/lib/container/optimized-service-registry';
import { prisma } from '@/lib/prisma-optimized';
import { addSecurityHeaders } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get gene statistics
    const [
      chromosomeDistribution,
      biotypeDistribution,
      variantCounts,
      clinicalSignificance,
      trends
    ] = await Promise.all([
      getChromosomeDistribution(),
      getBiotypeDistribution(),
      getTopVariantGenes(),
      getClinicalSignificanceDistribution(),
      getDiscoveryTrends()
    ]);

    const response = NextResponse.json({
      status: 'success',
      data: {
        chromosomeDistribution,
        biotypeDistribution,
        variantCounts,
        clinicalSignificance,
        trends
      }
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Gene statistics API error:', error);
    
    const errorResponse = NextResponse.json(
      { error: 'Failed to fetch gene statistics' },
      { status: 500 }
    );

    return addSecurityHeaders(errorResponse);
  }
}

// Helper functions for data aggregation
async function getChromosomeDistribution() {
  const result = await prisma.$queryRaw`
    SELECT 
      g.chromosome,
      COUNT(g.id)::int as count,
      COUNT(CASE WHEN v.clinical_significance IN ('Pathogenic', 'Likely pathogenic') THEN 1 END)::int as pathogenic
    FROM genes g
    LEFT JOIN variants v ON g.id = v.gene_id
    GROUP BY g.chromosome
    ORDER BY 
      CASE 
        WHEN g.chromosome ~ '^[0-9]+$' THEN g.chromosome::int
        WHEN g.chromosome = 'X' THEN 23
        WHEN g.chromosome = 'Y' THEN 24
        WHEN g.chromosome = 'MT' THEN 25
        ELSE 26
      END
  `;

  return result;
}

async function getBiotypeDistribution() {
  const result = await prisma.$queryRaw`
    SELECT 
      COALESCE(biotype, 'Unknown') as biotype,
      COUNT(*)::int as count,
      ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
    FROM genes
    GROUP BY biotype
    ORDER BY count DESC
    LIMIT 10
  `;

  return result;
}

async function getTopVariantGenes() {
  const result = await prisma.$queryRaw`
    SELECT 
      g.symbol as "geneSymbol",
      g.chromosome,
      COUNT(v.id)::int as "totalVariants",
      COUNT(CASE WHEN v.clinical_significance IN ('Pathogenic', 'Likely pathogenic') THEN 1 END)::int as "pathogenicVariants"
    FROM genes g
    LEFT JOIN variants v ON g.id = v.gene_id
    GROUP BY g.id, g.symbol, g.chromosome
    HAVING COUNT(v.id) > 0
    ORDER BY COUNT(v.id) DESC
    LIMIT 100
  `;

  return result;
}

async function getClinicalSignificanceDistribution() {
  const result = await prisma.$queryRaw`
    SELECT 
      COALESCE(clinical_significance, 'Not provided') as significance,
      COUNT(*)::int as count,
      ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
    FROM variants
    GROUP BY clinical_significance
    ORDER BY count DESC
  `;

  return result;
}

async function getDiscoveryTrends() {
  // Mock trend data for demonstration
  // In a real app, you'd track creation dates and generate real trends
  const result = [
    { date: '2023-01', newGenes: 1250, newVariants: 15420, pathogenicDiscovered: 234 },
    { date: '2023-02', newGenes: 1180, newVariants: 16800, pathogenicDiscovered: 187 },
    { date: '2023-03', newGenes: 1350, newVariants: 18200, pathogenicDiscovered: 298 },
    { date: '2023-04', newGenes: 1420, newVariants: 19500, pathogenicDiscovered: 312 },
    { date: '2023-05', newGenes: 1380, newVariants: 21000, pathogenicDiscovered: 278 },
    { date: '2023-06', newGenes: 1500, newVariants: 22800, pathogenicDiscovered: 345 },
    { date: '2023-07', newGenes: 1450, newVariants: 24200, pathogenicDiscovered: 321 },
    { date: '2023-08', newGenes: 1620, newVariants: 26100, pathogenicDiscovered: 398 },
    { date: '2023-09', newGenes: 1580, newVariants: 27900, pathogenicDiscovered: 367 },
    { date: '2023-10', newGenes: 1720, newVariants: 29800, pathogenicDiscovered: 412 },
    { date: '2023-11', newGenes: 1680, newVariants: 31500, pathogenicDiscovered: 389 },
    { date: '2023-12', newGenes: 1800, newVariants: 33200, pathogenicDiscovered: 445 },
  ];

  return result;
}