// app/api/genes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createApiMiddlewareChain, withMiddlewareChain } from '@/lib/middleware/presets';
import { getGeneService } from '@/lib/container/service-registry';
import { withRateLimit } from '@/lib/rate-limit-simple';
import { addSecurityHeaders } from '@/lib/validation';

async function getGeneByIdHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const requestId = request.headers.get('x-request-id') || undefined;

  // Get service
  const geneService = await getGeneService();

  try {
    // Execute business logic
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

const middlewareChain = createApiMiddlewareChain();
export const GET = withMiddlewareChain(middlewareChain, getGeneByIdHandler);