import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRateLimit } from '@/lib/rate-limit-simple';
import { addSecurityHeaders } from '@/lib/validation';

async function getVariantHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const variantId = resolvedParams.id;

    // Check if it's a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(variantId);
    
    let variant;
    
    if (isUUID) {
      variant = await prisma.variant.findUnique({
        where: { id: variantId },
        include: {
          gene: {
            select: {
              id: true,
              geneId: true,
              symbol: true,
              name: true,
              chromosome: true,
              description: true,
            }
          },
          annotations: {
            include: {
              source: true
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });
    } else {
      variant = await prisma.variant.findFirst({
        where: { variantId: variantId },
        include: {
          gene: {
            select: {
              id: true,
              geneId: true,
              symbol: true,
              name: true,
              chromosome: true,
              description: true,
            }
          },
          annotations: {
            include: {
              source: true
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });
    }

    if (!variant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      );
    }

    // Get related variants
    const relatedVariants = await prisma.variant.findMany({
      where: {
        geneId: variant.geneId,
        id: { not: variant.id },
        clinicalSignificance: variant.clinicalSignificance
      },
      select: {
        id: true,
        variantId: true,
        position: true,
        consequence: true,
        clinicalSignificance: true,
      },
      take: 5,
      orderBy: {
        position: 'asc'
      }
    });

    const formattedVariant = {
      id: variant.id,
      variant_id: variant.variantId,
      gene: {
        id: variant.gene.id,
        gene_id: variant.gene.geneId,
        symbol: variant.gene.symbol,
        name: variant.gene.name,
        chromosome: variant.gene.chromosome,
        description: variant.gene.description,
      },
      chromosome: variant.chromosome,
      position: variant.position.toString(),
      reference_allele: variant.referenceAllele,
      alternate_allele: variant.alternateAllele,
      variant_type: variant.variantType,
      consequence: variant.consequence,
      impact: variant.impact,
      protein_change: variant.proteinChange,
      transcript_id: variant.transcriptId,
      frequency: variant.frequency,
      clinical_significance: variant.clinicalSignificance,
      metadata: variant.metadata,
      created_at: variant.createdAt,
      updated_at: variant.updatedAt,
      annotations: variant.annotations.map(annotation => ({
        id: annotation.id,
        source: {
          id: annotation.source.id,
          name: annotation.source.name,
          version: annotation.source.version,
          url: annotation.source.url,
        },
        annotation_type: annotation.annotationType,
        content: annotation.content,
        confidence_score: annotation.confidenceScore,
        evidence_level: annotation.evidenceLevel,
        created_at: annotation.createdAt,
        updated_at: annotation.updatedAt,
      })),
      related_variants: relatedVariants.map(v => ({
        id: v.id,
        variant_id: v.variantId,
        position: v.position.toString(),
        consequence: v.consequence,
        clinical_significance: v.clinicalSignificance,
      }))
    };

    const response = NextResponse.json({
      status: 'success',
      data: formattedVariant
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Error fetching variant details:', error);
    
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

export const GET = withRateLimit('api')(getVariantHandler);