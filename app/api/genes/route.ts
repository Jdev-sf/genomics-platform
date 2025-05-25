import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema di validazione per query params
const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  search: z.string().optional(),
  chromosome: z.string().optional(),
  sortBy: z.enum(['symbol', 'name', 'chromosome', 'variantCount']).optional().default('symbol'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse e validazione query params
    const searchParams = request.nextUrl.searchParams;
    const queryResult = querySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      search: searchParams.get('search') || undefined,
      chromosome: searchParams.get('chromosome') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const { page, limit, search, chromosome, sortBy, sortOrder } = queryResult.data;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Costruzione filtri
    const where: any = {};
    
    if (search) {
      where.OR = [
        { symbol: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { geneId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (chromosome) {
      where.chromosome = chromosome;
    }

    // Query per il conteggio totale
    const totalCount = await prisma.gene.count({ where });

    // Query per i geni con conteggio varianti
    const genes = await prisma.gene.findMany({
      where,
      include: {
        _count: {
          select: { variants: true }
        },
        variants: {
          where: {
            clinicalSignificance: 'Pathogenic'
          },
          select: { id: true }
        }
      },
      skip,
      take: limitNum,
      orderBy: sortBy === 'variantCount' 
        ? { variants: { _count: sortOrder } }
        : { [sortBy]: sortOrder }
    });

    // Formattazione response
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

    // Metadati paginazione
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    return NextResponse.json({
      status: 'success',
      data: formattedGenes,
      meta: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error fetching genes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}