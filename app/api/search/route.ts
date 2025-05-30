// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createApiMiddlewareChain, withMiddlewareChain } from '@/lib/middleware/presets';
import { getGeneService, getVariantService } from '@/lib/container/service-registry';
import { validateRequest, searchSchema, addSecurityHeaders } from '@/lib/validation';

async function searchHandler(request: NextRequest) {
  // Validation
  const validation = await validateRequest(request, searchSchema, 'query');
  if (validation.error) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status || 400 }
    );
  }

  const data = validation.data!;
  const requestId = request.headers.get('x-request-id') || undefined;

  if (data.query.length < 2) {
    return NextResponse.json({
      query: data.query,
      total: 0,
      results: { genes: [], variants: [] }
    });
  }

  // Get services
  const [geneService, variantService] = await Promise.all([
    getGeneService(),
    getVariantService()
  ]);

  // Use default limit if not provided
  const limit = data.limit || 10;

  // Execute parallel searches
  const [genes, variants] = await Promise.all([
    geneService.quickSearch(data.query, Math.floor(limit / 2), requestId),
    variantService.quickSearch(data.query, Math.floor(limit / 2), requestId)
  ]);

  // Format response
  const results = {
    query: data.query,
    total: genes.length + variants.length,
    results: {
      genes: genes.map(gene => ({
        id: gene.id,
        symbol: gene.symbol,
        name: gene.name,
        chromosome: gene.chromosome || 'Unknown',
        variant_count: 0 // This would need to be added to the service method
      })),
      variants: variants.map(variant => ({
        id: variant.id,
        variant_id: variant.variantId,
        gene_symbol: (variant as any).gene?.symbol || 'Unknown',
        position: variant.position.toString(),
        clinical_significance: variant.clinicalSignificance || 'Unknown'
      }))
    }
  };

  const response = NextResponse.json(results);
  return addSecurityHeaders(response);
}

const middlewareChain = createApiMiddlewareChain();
export const GET = withMiddlewareChain(middlewareChain, searchHandler);