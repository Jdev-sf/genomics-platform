import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  search: z.string().optional(),
  geneId: z.string().optional(),
  chromosome: z.string().optional(),
  clinicalSignificance: z.string().optional(),
  impact: z.string().optional(),
  minFrequency: z.string().optional(),
  maxFrequency: z.string().optional(),
  sortBy: z.enum(['position', 'gene', 'clinicalSignificance', 'impact', 'frequency']).optional().default('position'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const queryResult = querySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      search: searchParams.get('search') || undefined,
      geneId: searchParams.get('geneId') || undefined,
      chromosome: searchParams.get('chromosome') || undefined,
      clinicalSignificance: searchParams.get('clinicalSignificance') || undefined,
      impact: searchParams.get('impact') || undefined,
      minFrequency: searchParams.get('minFrequency') || undefined,
      maxFrequency: searchParams.get('maxFrequency') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.errors },
        { status: 400 }
      );
    }

    const { 
      page, 
      limit, 
      search, 
      geneId,
      chromosome, 
      clinicalSignificance,
      impact,
      minFrequency,
      maxFrequency,
      sortBy, 
      sortOrder 
    } = queryResult.data;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = {};
    
    if (search) {
      where.OR = [
        { variantId: { contains: search, mode: 'insensitive' } },
        { proteinChange: { contains: search, mode: 'insensitive' } },
        { gene: { symbol: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (geneId) {
      where.geneId = geneId;
    }

    if (chromosome) {
      where.chromosome = chromosome;
    }

    if (clinicalSignificance) {
      where.clinicalSignificance = clinicalSignificance;
    }

    if (impact) {
      where.impact = impact;
    }

    if (minFrequency || maxFrequency) {
      where.frequency = {};
      if (minFrequency) {
        where.frequency.gte = parseFloat(minFrequency);
      }
      if (maxFrequency) {
        where.frequency.lte = parseFloat(maxFrequency);
      }
    }

    // Get total count
    const totalCount = await prisma.variant.count({ where });

    // Get variants with related data
    const variants = await prisma.variant.findMany({
      where,
      include: {
        gene: {
          select: {
            id: true,
            symbol: true,
            name: true,
          }
        },
        _count: {
          select: { annotations: true }
        }
      },
      skip,
      take: limitNum,
      orderBy: sortBy === 'gene' 
        ? { gene: { symbol: sortOrder } }
        : { [sortBy]: sortOrder }
    });

    // Format response
    const formattedVariants = variants.map((variant: any) => ({
      id: variant.id,
      variant_id: variant.variantId,
      gene: {
        id: variant.gene.id,
        symbol: variant.gene.symbol,
        name: variant.gene.name,
      },
      chromosome: variant.chromosome,
      position: variant.position.toString(),
      reference_allele: variant.referenceAllele,
      alternate_allele: variant.alternateAllele,
      variant_type: variant.variantType,
      consequence: variant.consequence,
      impact: variant.impact,
      protein_change: variant.proteinChange,
      clinical_significance: variant.clinicalSignificance,
      frequency: variant.frequency,
      annotations_count: variant._count.annotations,
      created_at: variant.createdAt,
      updated_at: variant.updatedAt
    }));

    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    return NextResponse.json({
      status: 'success',
      data: formattedVariants,
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
    console.error('Error fetching variants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}