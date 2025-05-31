// app/api/genes/[id]/route.ts - Updated with Caching
import { NextRequest, NextResponse } from 'next/server';
import { createApiMiddlewareChain, withMiddlewareChain } from '@/lib/middleware/presets';
import { getCachedGeneService } from '@/lib/container/service-registry';
import { withApiCache, ApiCachePresets, withCacheInvalidation } from '@/lib/middleware/cache-middleware';
import { addSecurityHeaders } from '@/lib/validation';

async function getGeneByIdHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const requestId = request.headers.get('x-request-id') || undefined;

  // Get cached service
  const geneService = await getCachedGeneService();

  try {
    // Execute business logic with caching
    const result = await geneService.getGeneWithDetails(
      resolvedParams.id,
      requestId
    );

    // Format response
    const response = NextResponse.json({
      status: 'success',
      data: result,
    });

    return addSecurityHeaders(response);

  } catch (error) {
    // Error handling is done by middleware chain
    throw error;
  }
}

// Example update handler with cache invalidation
async function updateGeneHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const requestId = request.headers.get('x-request-id') || undefined;
  const updateData = await request.json();

  const geneService = await getCachedGeneService();

  try {
    const result = await geneService.updateGene(
      resolvedParams.id,
      updateData,
      requestId
    );

    const response = NextResponse.json({
      status: 'success',
      data: result,
    });

    return addSecurityHeaders(response);

  } catch (error) {
    throw error;
  }
}

// Apply middleware chain with caching
const middlewareChain = createApiMiddlewareChain();

// GET with caching
const cachedGetHandler = withApiCache(ApiCachePresets.DETAILS)(getGeneByIdHandler);
export const GET = withMiddlewareChain(middlewareChain, cachedGetHandler);

// PUT with cache invalidation
const updateWithInvalidation = withCacheInvalidation((req) => {
  const url = new URL(req.url);
  const geneId = url.pathname.split('/').pop();
  return [
    `detail:${geneId}`,
    'list:*',
    'search:*',
    `service:gene:*`,
  ];
})(updateGeneHandler);
export const PUT = withMiddlewareChain(middlewareChain, updateWithInvalidation);