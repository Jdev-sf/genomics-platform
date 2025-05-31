// app/api/variants/[id]/route.ts - Updated with Optimized Services
import { NextRequest, NextResponse } from 'next/server';
import { createApiMiddlewareChain, withMiddlewareChain } from '@/lib/middleware/presets';
import { getOptimizedVariantService } from '@/lib/container/optimized-service-registry';
import { withApiCache, ApiCachePresets } from '@/lib/middleware/cache-middleware';
import { addSecurityHeaders } from '@/lib/validation';

async function getVariantByIdHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const requestId = request.headers.get('x-request-id') || undefined;

  // Get OPTIMIZED service
  const variantService = await getOptimizedVariantService();

  try {
    // Execute business logic with optimization + caching
    const result = await variantService.getVariantWithDetails(
      resolvedParams.id,
      requestId
    );

    // Format detailed response - già ottimizzato dal repository
    const formattedVariant = {
      id: result.variant.id,
      variant_id: result.variant.variantId,
      gene: {
        id: result.variant.gene.id,
        gene_id: result.variant.gene.geneId,
        symbol: result.variant.gene.symbol,
        name: result.variant.gene.name,
        chromosome: result.variant.gene.chromosome,
        description: result.variant.gene.description,
      },
      chromosome: result.variant.chromosome,
      position: result.variant.position, // Già convertito a string dai repository ottimizzati
      reference_allele: result.variant.referenceAllele,
      alternate_allele: result.variant.alternateAllele,
      variant_type: result.variant.variantType,
      consequence: result.variant.consequence,
      impact: result.variant.impact,
      protein_change: result.variant.proteinChange,
      transcript_id: result.variant.transcriptId,
      frequency: result.variant.frequency,
      clinical_significance: result.variant.clinicalSignificance,
      metadata: result.variant.metadata,
      created_at: result.variant.createdAt,
      updated_at: result.variant.updatedAt,
      annotations: result.variant.annotations?.map((annotation: any) => ({
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
      })) || [],
      related_variants: result.relatedVariants.map(v => ({
        id: v.id,
        variant_id: v.variantId,
        position: v.position, // Già convertito a string
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
    // Error handling is done by middleware chain
    throw error;
  }
}

const middlewareChain = createApiMiddlewareChain();
const cachedHandler = withApiCache(ApiCachePresets.DETAILS)(getVariantByIdHandler);
export const GET = withMiddlewareChain(middlewareChain, cachedHandler);