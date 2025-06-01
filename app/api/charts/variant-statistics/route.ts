// app/api/charts/variant-statistics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma-optimized';
import { addSecurityHeaders } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get variant statistics
    const [
      chromosomeDistribution,
      clinicalSignificance,
      impactDistribution,
      variantTypes,
      frequencyDistribution,
      geneImpact,
      trends
    ] = await Promise.all([
      getVariantChromosomeDistribution(),
      getVariantClinicalSignificance(),
      getImpactDistribution(),
      getVariantTypes(),
      getFrequencyDistribution(),
      getGeneImpactAnalysis(),
      getVariantTrends()
    ]);

    const response = NextResponse.json({
      status: 'success',
      data: {
        chromosomeDistribution,
        clinicalSignificance,
        impactDistribution,
        variantTypes,
        frequencyDistribution,
        geneImpact,
        trends
      }
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Variant statistics API error:', error);
    
    const errorResponse = NextResponse.json(
      { error: 'Failed to fetch variant statistics' },
      { status: 500 }
    );

    return addSecurityHeaders(errorResponse);
  }
}

// Helper functions for variant data aggregation
async function getVariantChromosomeDistribution() {
  const result = await prisma.$queryRaw`
    SELECT 
      chromosome,
      COUNT(*)::int as count,
      COUNT(CASE WHEN clinical_significance IN ('Pathogenic', 'Likely pathogenic') THEN 1 END)::int as pathogenic,
      COUNT(CASE WHEN clinical_significance IN ('Benign', 'Likely benign') THEN 1 END)::int as benign
    FROM variants
    GROUP BY chromosome
    ORDER BY 
      CASE 
        WHEN chromosome ~ '^[0-9]+$' THEN chromosome::int
        WHEN chromosome = 'X' THEN 23
        WHEN chromosome = 'Y' THEN 24
        WHEN chromosome = 'MT' THEN 25
        ELSE 26
      END
  `;

  return result;
}

async function getVariantClinicalSignificance() {
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

async function getImpactDistribution() {
  const result = await prisma.$queryRaw`
    SELECT 
      COALESCE(impact, 'UNKNOWN') as impact,
      COUNT(*)::int as count,
      ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
    FROM variants
    GROUP BY impact
    ORDER BY 
      CASE impact
        WHEN 'HIGH' THEN 1
        WHEN 'MODERATE' THEN 2
        WHEN 'LOW' THEN 3
        WHEN 'MODIFIER' THEN 4
        ELSE 5
      END
  `;

  return result;
}

async function getVariantTypes() {
  const result = await prisma.$queryRaw`
    SELECT 
      COALESCE(variant_type, 'Unknown') as type,
      COUNT(*)::int as count,
      ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
    FROM variants
    GROUP BY variant_type
    ORDER BY count DESC
    LIMIT 10
  `;

  return result;
}

async function getFrequencyDistribution() {
  const result = await prisma.$queryRaw`
    SELECT 
      CASE 
        WHEN frequency IS NULL THEN 'Unknown'
        WHEN frequency = 0 THEN 'Not observed'
        WHEN frequency < 0.0001 THEN 'Ultra rare (<0.01%)'
        WHEN frequency < 0.001 THEN 'Very rare (0.01-0.1%)'
        WHEN frequency < 0.01 THEN 'Rare (0.1-1%)'
        WHEN frequency < 0.05 THEN 'Low frequency (1-5%)'
        WHEN frequency < 0.25 THEN 'Intermediate (5-25%)'
        ELSE 'Common (>25%)'
      END as range,
      COUNT(*)::int as count,
      COALESCE(AVG(frequency), 0) as "averageFrequency"
    FROM variants
    GROUP BY 
      CASE 
        WHEN frequency IS NULL THEN 'Unknown'
        WHEN frequency = 0 THEN 'Not observed'
        WHEN frequency < 0.0001 THEN 'Ultra rare (<0.01%)'
        WHEN frequency < 0.001 THEN 'Very rare (0.01-0.1%)'
        WHEN frequency < 0.01 THEN 'Rare (0.1-1%)'
        WHEN frequency < 0.05 THEN 'Low frequency (1-5%)'
        WHEN frequency < 0.25 THEN 'Intermediate (5-25%)'
        ELSE 'Common (>25%)'
      END
    ORDER BY "averageFrequency"
  `;

  return result;
}

async function getGeneImpactAnalysis() {
  const result = await prisma.$queryRaw`
    SELECT 
      g.symbol as "geneSymbol",
      g.chromosome,
      COUNT(v.id)::int as "totalVariants",
      COUNT(CASE WHEN v.clinical_significance IN ('Pathogenic', 'Likely pathogenic') THEN 1 END)::int as "pathogenicCount",
      COUNT(CASE WHEN v.impact = 'HIGH' THEN 1 END)::int as "highImpactCount"
    FROM genes g
    LEFT JOIN variants v ON g.id = v.gene_id
    GROUP BY g.id, g.symbol, g.chromosome
    HAVING COUNT(v.id) > 0
    ORDER BY COUNT(CASE WHEN v.clinical_significance IN ('Pathogenic', 'Likely pathogenic') THEN 1 END) DESC
    LIMIT 50
  `;

  return result;
}

async function getVariantTrends() {
  // Mock trend data for demonstration
  // In a real app, you'd track creation dates and generate real trends
  const result = [
    { date: '2023-01', totalVariants: 125000, pathogenicVariants: 8500, clinicallySignificant: 15200 },
    { date: '2023-02', totalVariants: 142000, pathogenicVariants: 9200, clinicallySignificant: 16800 },
    { date: '2023-03', totalVariants: 158000, pathogenicVariants: 10100, clinicallySignificant: 18500 },
    { date: '2023-04', totalVariants: 176000, pathogenicVariants: 11200, clinicallySignificant: 20200 },
    { date: '2023-05', totalVariants: 195000, pathogenicVariants: 12500, clinicallySignificant: 22100 },
    { date: '2023-06', totalVariants: 215000, pathogenicVariants: 13800, clinicallySignificant: 24300 },
    { date: '2023-07', totalVariants: 236000, pathogenicVariants: 15200, clinicallySignificant: 26800 },
    { date: '2023-08', totalVariants: 258000, pathogenicVariants: 16700, clinicallySignificant: 29500 },
    { date: '2023-09', totalVariants: 281000, pathogenicVariants: 18300, clinicallySignificant: 32400 },
    { date: '2023-10', totalVariants: 305000, pathogenicVariants: 20100, clinicallySignificant: 35600 },
    { date: '2023-11', totalVariants: 330000, pathogenicVariants: 22000, clinicallySignificant: 39100 },
    { date: '2023-12', totalVariants: 356000, pathogenicVariants: 24200, clinicallySignificant: 42900 },
  ];

  return result;
}