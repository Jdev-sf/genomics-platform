import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(2),
  types: z.array(z.enum(['genes', 'variants', 'annotations'])).optional(),
  limit: z.string().optional().default('10'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const queryResult = searchSchema.safeParse({
      query: searchParams.get('query') || '',
      types: searchParams.get('types')?.split(',') || ['genes', 'variants'],
      limit: searchParams.get('limit') || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const { query, types, limit } = queryResult.data;
    const limitNum = parseInt(limit);

    const results: any = {
      genes: [],
      variants: [],
      annotations: [],
    };

    // Search genes
    if (types?.includes('genes')) {
      const genes = await prisma.gene.findMany({
        where: {
          OR: [
            { symbol: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
            { geneId: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          geneId: true,
          symbol: true,
          name: true,
          chromosome: true,
          _count: {
            select: { variants: true },
          },
        },
        take: limitNum,
      });

      results.genes = genes.map((gene: any) => ({
        id: gene.id,
        gene_id: gene.geneId,
        symbol: gene.symbol,
        name: gene.name,
        chromosome: gene.chromosome,
        variant_count: gene._count.variants,
        type: 'gene',
      }));
    }

    // Search variants
    if (types?.includes('variants')) {
      const variants = await prisma.variant.findMany({
        where: {
          OR: [
            { variantId: { contains: query, mode: 'insensitive' } },
            { proteinChange: { contains: query, mode: 'insensitive' } },
            { gene: { symbol: { contains: query, mode: 'insensitive' } } },
          ],
        },
        include: {
          gene: {
            select: {
              symbol: true,
              name: true,
            },
          },
        },
        take: limitNum,
      });

      results.variants = variants.map((variant: any) => ({
        id: variant.id,
        variant_id: variant.variantId,
        gene_symbol: variant.gene.symbol,
        gene_name: variant.gene.name,
        chromosome: variant.chromosome,
        position: variant.position.toString(),
        change: `${variant.referenceAllele}>${variant.alternateAllele}`,
        protein_change: variant.proteinChange,
        clinical_significance: variant.clinicalSignificance,
        type: 'variant',
      }));
    }

    // Calculate total results
    const totalResults = results.genes.length + results.variants.length;

    return NextResponse.json({
      status: 'success',
      data: {
        query,
        total: totalResults,
        results,
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}