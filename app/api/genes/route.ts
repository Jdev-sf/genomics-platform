// app/api/genes/route.ts - Updated with Optimized Services
import { NextRequest, NextResponse } from 'next/server';
import { createApiMiddlewareChain, withMiddlewareChain } from '@/lib/middleware/presets';
import { getOptimizedGeneService } from '@/lib/container/optimized-service-registry';
import { validateRequest, paginationSchema, addSecurityHeaders } from '@/lib/validation';
import { SearchParameterMapper } from '@/lib/shared/search-parameter-mapper';
import { withApiCache, ApiCachePresets } from '@/lib/middleware/cache-middleware';
import { z } from 'zod';

const genesQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  chromosome: z.string().optional(),
  biotype: z.string().optional(),
  hasVariants: z.boolean().optional(),
});

async function getGenesHandler(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || undefined;

  // Parse search parameters using shared mapper
  const searchParams = SearchParameterMapper.parseGeneSearchParams(request.nextUrl.searchParams);
  
  // Get OPTIMIZED service
  const geneService = await getOptimizedGeneService();

  // Execute business logic with optimization
  const result = await geneService.searchGenes(searchParams, requestId);

  // Format response
  const response = NextResponse.json({
    status: 'success',
    data: result.data,
    meta: result.meta,
  });

  return addSecurityHeaders(response);
}

// Apply middleware chain with caching
const middlewareChain = createApiMiddlewareChain();
const cachedHandler = withApiCache(ApiCachePresets.LISTS)(getGenesHandler);
export const GET = withMiddlewareChain(middlewareChain, cachedHandler);