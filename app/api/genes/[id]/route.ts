import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema validazione per UUID
const uuidSchema = z.string().uuid();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verifica autenticazione
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validazione ID
    const idResult = uuidSchema.safeParse(params.id);
    if (!idResult.success) {
      return NextResponse.json(
        { error: 'Invalid gene ID format' },
        { status: 400 }
      );
    }

    // Query gene con dati correlati
    const gene = await prisma.gene.findUnique({
      where: { id: params.id },
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
              take: 5 // Ultime 5 annotazioni per variante
            }
          },
          orderBy: [
            { clinicalSignificance: 'asc' }, // Pathogenic first
            { position: 'asc' }
          ],
          take: 100 // Limite iniziale di varianti
        },
        _count: {
          select: {
            variants: true
          }
        }
      }
    });

    if (!gene) {
      return NextResponse.json(
        { error: 'Gene not found' },
        { status: 404 }
      );
    }

    // Conteggio varianti per significato clinico
    const variantStats = await prisma.variant.groupBy({
      by: ['clinicalSignificance'],
      where: { geneId: params.id },
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
      if (significance in stats) {
        (stats as any)[significance] = stat._count;
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}