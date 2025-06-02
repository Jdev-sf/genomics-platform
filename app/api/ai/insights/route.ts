// app/api/ai/insights/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiService } from '@/lib/ai-services';
import { z } from 'zod';
import prisma from '@/lib/prisma-optimized';

const insightsSchema = z.object({
  gene_symbol: z.string().min(1),
  include_variants: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { gene_symbol, include_variants } = insightsSchema.parse(body);

    let variants = undefined;
    if (include_variants) {
      // Get variants for the gene
      const gene = await prisma.gene.findFirst({
        where: { symbol: gene_symbol },
        include: {
          variants: {
            select: {
              id: true,
              clinicalSignificance: true,
              consequence: true,
            },
            take: 100, // Limit for performance
          }
        }
      });

      if (gene?.variants) {
        variants = gene.variants.map(v => ({
          id: v.id,
          clinical_significance: v.clinicalSignificance || '',
          consequence: v.consequence || '',
        }));
      }
    }

    const insights = await aiService.generateInsights(gene_symbol, variants);

    return NextResponse.json({
      status: 'success',
      data: insights
    });

  } catch (error) {
    console.error('AI insights error:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}