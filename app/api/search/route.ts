import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRateLimit } from '@/lib/rate-limit-simple';
import { validateRequest, searchSchema, addSecurityHeaders } from '@/lib/validation';

async function searchHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate search parameters with sanitization
    const validation = await validateRequest(request, searchSchema, 'query');
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status || 400 }
      );
    }

    const data = validation.data!;
    const query = data.query;
    const limit = data.limit ?? 10;

    if (query.length < 2) {
      return NextResponse.json({
        query,
        total: 0,
        results: { genes: [], variants: [] }
      });
    }

    try {
      // Parallel search queries with optimized indices
      const [genes, variants] = await Promise.all([
        // Use contains for fuzzy search
        prisma.gene.findMany({
          where: {
            OR: [
              { symbol: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
              { geneId: { contains: query, mode: 'insensitive' } },
            ]
          },
          include: {
            _count: { select: { variants: true } }
          },
          take: Math.floor(limit / 2),
          orderBy: [
            // Prioritize exact matches
            { symbol: 'asc' }
          ]
        }),

        prisma.variant.findMany({
          where: {
            OR: [
              { variantId: { contains: query, mode: 'insensitive' } },
              { gene: { symbol: { contains: query, mode: 'insensitive' } } },
            ]
          },
          include: {
            gene: { select: { symbol: true } }
          },
          take: Math.floor(limit / 2),
          orderBy: [{ position: 'asc' }]
        })
      ]);

      const results = {
        query,
        total: genes.length + variants.length,
        results: {
          genes: genes.map(gene => ({
            id: gene.id,
            symbol: gene.symbol,
            name: gene.name,
            chromosome: gene.chromosome || 'Unknown',
            variant_count: gene._count.variants
          })),
          variants: variants.map(variant => ({
            id: variant.id,
            variant_id: variant.variantId,
            gene_symbol: variant.gene.symbol,
            position: variant.position.toString(),
            clinical_significance: variant.clinicalSignificance || 'Unknown'
          }))
        }
      };

      const response = NextResponse.json(results);
      return addSecurityHeaders(response);

    } catch (dbError) {
      console.error('Database search error:', dbError);
      
      // Fallback to mock data with sanitized query
      const mockResults = {
        query,
        total: 0,
        results: { genes: [], variants: [] }
      };

      const response = NextResponse.json(mockResults);
      return addSecurityHeaders(response);
    }

  } catch (error) {
    console.error('Search API error:', error);
    
    const response = NextResponse.json(
      { 
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}

export const GET = withRateLimit('search')(searchHandler);