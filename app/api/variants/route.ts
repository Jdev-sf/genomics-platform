// app/api/variants/route.ts - Updated with Optimized Services
import { NextRequest, NextResponse } from 'next/server';
import { createApiMiddlewareChain, withMiddlewareChain } from '@/lib/middleware/presets';
import { getOptimizedVariantService } from '@/lib/container/optimized-service-registry';
import { validateRequest, paginationSchema, addSecurityHeaders } from '@/lib/validation';
import { withApiCache, ApiCachePresets } from '@/lib/middleware/cache-middleware';
import { z } from 'zod';

const variantsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  geneId: z.string().optional(),
  chromosome: z.string().optional(),
  clinicalSignificance: z.string().optional(),
  impact: z.string().optional(),
  minFrequency: z.string().optional(),
  maxFrequency: z.string().optional(),
  consequence: z.string().optional(),
});

async function getVariantsHandler(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || undefined;

  try {
    // Validation
    const validation = await validateRequest(request, variantsQuerySchema, 'query');
    if (validation.error) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status || 400 }
      );
    }

    const data = validation.data!;

    // Parse arrays and numbers from query params
    const clinicalSignificance = data.clinicalSignificance 
      ? data.clinicalSignificance.split(',') 
      : undefined;
    const impact = data.impact 
      ? data.impact.split(',') 
      : undefined;
    const minFrequency = data.minFrequency 
      ? parseFloat(data.minFrequency) 
      : undefined;
    const maxFrequency = data.maxFrequency 
      ? parseFloat(data.maxFrequency) 
      : undefined;

    // Get OPTIMIZED service
    const variantService = await getOptimizedVariantService();

    // Execute business logic with optimization + caching
    const result = await variantService.searchVariants({
      search: data.search,
      geneId: data.geneId,
      chromosome: data.chromosome,
      clinicalSignificance,
      impact,
      minFrequency,
      maxFrequency,
      consequence: data.consequence,
      page: data.page,
      limit: data.limit,
      sortBy: data.sortBy,
      sortOrder: data.sortOrder,
    }, requestId);

    // Format response - già serializzato dai repository ottimizzati
    const response = NextResponse.json({
      status: 'success',
      data: result.data,
      meta: result.meta
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Error in getVariantsHandler:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId 
      },
      { status: 500 }
    );
  }
}

const middlewareChain = createApiMiddlewareChain();
const cachedHandler = withApiCache(ApiCachePresets.LISTS)(getVariantsHandler);
export const GET = withMiddlewareChain(middlewareChain, cachedHandler);