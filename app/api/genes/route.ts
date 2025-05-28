import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRateLimit } from '@/lib/rate-limit-simple';
import { validateRequest, paginationSchema, addSecurityHeaders, sanitizedString } from '@/lib/validation';
import { z } from 'zod';

// Extended schema for genes API
const genesQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  chromosome: z.string().optional(),
});

async function getGenesHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate query parameters
    const validation = await validateRequest(request, genesQuerySchema, 'query');
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status || 400 }
      );
    }

    const data = validation.data!;
    const page = data.page ?? 1;
    const limit = data.limit ?? 20;
    const sortBy = data.sortBy ?? 'symbol';
    const sortOrder = data.sortOrder ?? 'asc';
    const search = data.search;
    const chromosomeFilter = data.chromosome;
    
    const skip = (page - 1) * limit;

    // Build optimized where clause
    const where: any = {};
    
    if (search) {
      // Use PostgreSQL full-text search
      where.OR = [
        { symbol: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { geneId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (chromosomeFilter) {
      where.chromosome = chromosomeFilter;
    }

    // Parallel queries for better performance
    const [totalCount, genes] = await Promise.all([
      prisma.gene.count({ where }),
      prisma.gene.findMany({
        where,
        include: {
          _count: {
            select: { variants: true }
          },
          variants: {
            where: {
              clinicalSignificance: { in: ['Pathogenic', 'Likely pathogenic'] }
            },
            select: { id: true }
          }
        },
        skip,
        take: limit,
        orderBy: sortBy === 'variantCount' 
          ? { variants: { _count: sortOrder } }
          : { [sortBy || 'symbol']: sortOrder }
      })
    ]);

    // Format response with proper typing
    const formattedGenes = genes.map((gene: any) => ({
      id: gene.id,
      gene_id: gene.geneId,
      symbol: gene.symbol,
      name: gene.name,
      chromosome: gene.chromosome,
      start_position: gene.startPosition ? gene.startPosition.toString() : null,
      end_position: gene.endPosition ? gene.endPosition.toString() : null,
      strand: gene.strand,
      biotype: gene.biotype,
      description: gene.description,
      variant_count: gene._count.variants,
      pathogenic_count: gene.variants.length,
      created_at: gene.createdAt,
      updated_at: gene.updatedAt
    }));

    const totalPages = Math.ceil(totalCount / limit);

    const response = NextResponse.json({
      status: 'success',
      data: formattedGenes,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Error fetching genes:', error);
    
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

export const GET = withRateLimit('api')(getGenesHandler);