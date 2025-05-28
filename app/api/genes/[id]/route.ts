import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRateLimit } from '@/lib/rate-limit-simple';
import { addSecurityHeaders } from '@/lib/validation';

async function getGeneHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const geneId = resolvedParams.id;
    
    // Check if it's a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(geneId);
    
    let gene;
    
    if (isUUID) {
      gene = await prisma.gene.findUnique({
        where: { id: geneId },
        include: {
          aliases: true,
          variants: {
            select: {
              id: true,
              variantId: true,
              position: true,
              referenceAllele: true,
              alternateAllele: true,
              variantType: true,
              consequence: true,
              impact: true,
              proteinChange: true,
              clinicalSignificance: true,
              frequency: true,
              createdAt: true,
              annotations: {
                include: {
                  source: true
                },
                orderBy: {
                  createdAt: 'desc'
                },
                take: 5
              }
            },
            orderBy: [
              { clinicalSignificance: 'asc' },
              { position: 'asc' }
            ],
            take: 100
          },
          _count: {
            select: {
              variants: true
            }
          }
        }
      });
    } else {
      gene = await prisma.gene.findFirst({
        where: { symbol: geneId },
        include: {
          aliases: true,
          variants: {
            select: {
              id: true,
              variantId: true,
              position: true,
              referenceAllele: true,
              alternateAllele: true,
              variantType: true,
              consequence: true,
              impact: true,
              proteinChange: true,
              clinicalSignificance: true,
              frequency: true,
              createdAt: true,
              annotations: {
                include: {
                  source: true
                },
                orderBy: {
                  createdAt: 'desc'
                },
                take: 5
              }
            },
            orderBy: [
              { clinicalSignificance: 'asc' },
              { position: 'asc' }
            ],
            take: 100
          },
          _count: {
            select: {
              variants: true
            }
          }
        }
      });
    }

    if (!gene) {
      return NextResponse.json(
        { error: 'Gene not found' },
        { status: 404 }
      );
    }

    // Calculate variant statistics
    const variantStats = await prisma.variant.groupBy({
      by: ['clinicalSignificance'],
      where: { geneId: gene.id },
      _count: true
    });

    const stats = {
      total_variants: gene._count.variants,
      pathogenic: 0,
      likely_pathogenic: 0,
      uncertain_significance: 0,
      likely_benign: 0,
      benign: 0,
      not_provided: 0
    };

    variantStats.forEach(stat => {
      const significance = stat.clinicalSignificance?.toLowerCase();
      if (significance?.includes('pathogenic') && significance.includes('likely')) {
        stats.likely_pathogenic = stat._count;
      } else if (significance?.includes('pathogenic')) {
        stats.pathogenic = stat._count;
      } else if (significance?.includes('benign') && significance.includes('likely')) {
        stats.likely_benign = stat._count;
      } else if (significance?.includes('benign')) {
        stats.benign = stat._count;
      } else if (significance?.includes('uncertain')) {
        stats.uncertain_significance = stat._count;
      } else {
        stats.not_provided += stat._count;
      }
    });

    const formattedGene = {
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
      metadata: gene.metadata,
      created_at: gene.createdAt,
      updated_at: gene.updatedAt,
      aliases: gene.aliases,
      variants: gene.variants.map(variant => ({
        id: variant.id,
        variant_id: variant.variantId,
        position: variant.position.toString(),
        reference_allele: variant.referenceAllele,
        alternate_allele: variant.alternateAllele,
        variant_type: variant.variantType,
        consequence: variant.consequence,
        impact: variant.impact,
        protein_change: variant.proteinChange,
        clinical_significance: variant.clinicalSignificance,
        frequency: variant.frequency,
        created_at: variant.createdAt,
        annotations: variant.annotations,
        annotations_count: variant.annotations.length
      }))
    };

    const response = NextResponse.json({
      status: 'success',
      data: {
        gene: formattedGene,
        stats,
        meta: {
          variants_shown: gene.variants.length,
          total_variants: gene._count.variants,
          has_more_variants: gene.variants.length < gene._count.variants
        }
      }
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Error fetching gene details:', error);
    
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

export const GET = withRateLimit('api')(getGeneHandler);