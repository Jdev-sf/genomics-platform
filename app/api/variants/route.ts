// app/api/variants/route.ts - Updated with Optimized Services
import { NextRequest, NextResponse } from 'next/server';
import { createApiMiddlewareChain, withMiddlewareChain } from '@/lib/middleware/presets';
import { getOptimizedVariantService } from '@/lib/container/optimized-service-registry';
import { validateRequest, paginationSchema, addSecurityHeaders } from '@/lib/validation';
import { SearchParameterMapper } from '@/lib/shared/search-parameter-mapper';
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
    // Parse search parameters using shared mapper
    const searchParams = SearchParameterMapper.parseVariantSearchParams(request.nextUrl.searchParams);

    // Get OPTIMIZED service
    const variantService = await getOptimizedVariantService();

    // Execute business logic with optimization + caching
    const result = await variantService.searchVariants(searchParams, requestId);

    // Format response
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