// app/api/variants/[id]/route.ts - FIX async params e implementazione completa
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const uuidSchema = z.string().uuid();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // FIX: Await params before accessing properties
    const resolvedParams = await params;
    const variantId = resolvedParams.id;

    // Validazione ID - accetta sia UUID che variant_id
    const isValidUUID = uuidSchema.safeParse(variantId).success;
    
    let variant;
    
    if (isValidUUID) {
      // Query per UUID
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
      // Query per variant_id come fallback
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

    // Get related variants from the same gene
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

    // Format response
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

    return NextResponse.json({
      status: 'success',
      data: formattedVariant
    });
  } catch (error) {
    console.error('Error fetching variant details:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}