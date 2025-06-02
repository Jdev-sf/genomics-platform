import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma-optimized';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent import logs for the user
    const recentImports = await prisma.auditLog.findMany({
      where: {
        userId: session.user.id,
        action: 'import',
        entityType: { in: ['genes', 'variants'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        entityType: true,
        changes: true,
        createdAt: true,
      },
    });

    // Get statistics
    const stats = await prisma.$transaction([
      prisma.gene.count(),
      prisma.variant.count(),
      prisma.annotation.count(),
    ]);

    return NextResponse.json({
      status: 'success',
      data: {
        recentImports: recentImports.map(log => ({
          id: log.id,
          type: log.entityType,
          results: log.changes,
          createdAt: log.createdAt,
        })),
        stats: {
          totalGenes: stats[0],
          totalVariants: stats[1],
          totalAnnotations: stats[2],
        },
      },
    });
  } catch (error) {
    console.error('Error fetching import progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import progress' },
      { status: 500 }
    );
  }
}