// app/api/genes/route.ts - Updated with Optimized Services
import { NextRequest, NextResponse } from 'next/server';
import { createApiMiddlewareChain, withMiddlewareChain } from '@/lib/middleware/presets';
import { getOptimizedGeneService } from '@/lib/container/optimized-service-registry';
import { validateRequest, paginationSchema, addSecurityHeaders } from '@/lib/validation';
import { withApiCache, ApiCachePresets } from '@/lib/middleware/cache-middleware';
import { z } from 'zod';

const genesQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  chromosome: z.string().optional(),
  biotype: z.string().optional(),
  hasVariants: z.boolean().optional(),
});

async function getGenesHandler(request: NextRequest) {
  // Validation
  const validation = await validateRequest(request, genesQuerySchema, 'query');
  if (validation.error) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status || 400 }
    );
  }

  const data = validation.data!;
  const requestId = request.headers.get('x-request-id') || undefined;

  // Get OPTIMIZED service
  const geneService = await getOptimizedGeneService();

  // Execute business logic with optimization
  const result = await geneService.searchGenes({
    search: data.search,
    chromosome: data.chromosome,
    biotype: data.biotype,
    hasVariants: data.hasVariants,
    page: data.page,
    limit: data.limit,
    sortBy: data.sortBy,
    sortOrder: data.sortOrder,
  }, requestId);

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