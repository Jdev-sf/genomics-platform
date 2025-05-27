// app/api/genes/[id]/route.ts - FIX async params
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema validazione per UUID
const uuidSchema = z.string().uuid();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verifica autenticazione
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // FIX: Await params before accessing properties
    const resolvedParams = await params;
    let geneId = resolvedParams.id;
    
    // Se non è un UUID valido, cerca per symbol per compatibilità
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(geneId);
    
    let gene;
    
    if (isValidUUID) {
      // Query per UUID
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
      // Query per symbol come fallback
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

    // Conteggio varianti per significato clinico
    const variantStats = await prisma.variant.groupBy({
      by: ['clinicalSignificance'],
      where: { geneId: gene.id },
      _count: true
    });

    // Formattazione statistiche
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
      const significance = stat.clinicalSignificance?.toLowerCase().replace(/ /g, '_') || 'not_provided';
      const key = significance.includes('pathogenic') && significance.includes('likely') ? 'likely_pathogenic' :
                  significance.includes('pathogenic') ? 'pathogenic' :
                  significance.includes('benign') && significance.includes('likely') ? 'likely_benign' :
                  significance.includes('benign') ? 'benign' :
                  significance.includes('uncertain') ? 'uncertain_significance' : 'not_provided';
      
      if (key in stats) {
        (stats as any)[key] = stat._count;
      }
    });

    // Response formattata
    return NextResponse.json({
      status: 'success',
      data: {
        gene: {
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
        },
        stats,
        meta: {
          variants_shown: gene.variants.length,
          total_variants: gene._count.variants,
          has_more_variants: gene.variants.length < gene._count.variants
        }
      }
    });
  } catch (error) {
    console.error('Error fetching gene details:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}