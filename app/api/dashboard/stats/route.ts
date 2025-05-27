import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get basic counts
    const [
      totalGenes,
      totalVariants,
      totalAnnotations,
      pathogenicCount
    ] = await prisma.$transaction([
      prisma.gene.count(),
      prisma.variant.count(),
      prisma.annotation.count(),
      prisma.variant.count({
        where: {
          clinicalSignificance: {
            in: ['Pathogenic', 'Likely pathogenic']
          }
        }
      })
    ]);

    // Get variants by chromosome
    const variantsByChromosome = await prisma.variant.groupBy({
      by: ['chromosome'],
      _count: true,
      orderBy: {
        chromosome: 'asc'
      },
      take: 10
    });

    // Get variants by clinical significance
    const variantsByClinicalSignificance = await prisma.variant.groupBy({
      by: ['clinicalSignificance'],
      _count: true,
      orderBy: {
        _count: {
          clinicalSignificance: 'desc'
        }
      }
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = await prisma.auditLog.groupBy({
      by: ['action', 'createdAt'],
      where: {
        createdAt: {
          gte: sevenDaysAgo
        },
        action: {
          in: ['import', 'export']
        }
      },
      _count: true
    });

    // Format the response
    const stats = {
      totalGenes,
      totalVariants,
      pathogenicVariants: pathogenicCount,
      totalAnnotations,
      variantsByChromosome: variantsByChromosome.map(item => ({
        chromosome: item.chromosome,
        count: item._count
      })),
      variantsByClinicalSignificance: variantsByClinicalSignificance
        .filter(item => item.clinicalSignificance !== null)
        .map(item => ({
          name: item.clinicalSignificance || 'Unknown',
          value: item._count
        })),
      recentActivity: formatActivityData(recentActivity)
    };

    return NextResponse.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}

function formatActivityData(activityData: any[]) {
  // Group by day and action
  const dayMap = new Map();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayName = days[date.getDay()];
    dayMap.set(dayName, { date: dayName, imports: 0, exports: 0 });
  }

  // Fill with actual data
  activityData.forEach(item => {
    const dayName = days[new Date(item.createdAt).getDay()];
    if (dayMap.has(dayName)) {
      const day = dayMap.get(dayName);
      if (item.action === 'import') {
        day.imports += item._count;
      } else if (item.action === 'export') {
        day.exports += item._count;
      }
    }
  });

  return Array.from(dayMap.values());
}