// app/api/variants/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createApiMiddlewareChain, withMiddlewareChain } from '@/lib/middleware/presets';
import { getVariantService } from '@/lib/container/service-registry';
import { validateRequest, paginationSchema, addSecurityHeaders } from '@/lib/validation';
import { createPaginatedResponse } from '@/lib/utils/serialization';
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

    // Get service
    const variantService = await getVariantService();

    // Execute business logic
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

    // AGGRESSIVE BigInt conversion
    const safeBigIntConvert = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return obj.toString();
      if (obj instanceof Date) return obj.toISOString();
      if (Array.isArray(obj)) return obj.map(safeBigIntConvert);
      if (typeof obj === 'object') {
        const converted: any = {};
        for (const [key, value] of Object.entries(obj)) {
          converted[key] = safeBigIntConvert(value);
        }
        return converted;
      }
      return obj;
    };

    // Convert everything
    const safeResult = safeBigIntConvert(result);

    // Create response object manually
    const responseData = {
      status: 'success',
      data: safeResult.data,
      meta: safeResult.meta
    };

    // Test JSON.stringify before sending to NextResponse
    try {
      const testJson = JSON.stringify(responseData);
      console.log('Variants JSON.stringify test passed, length:', testJson.length);
    } catch (jsonError) {
      console.error('Variants JSON.stringify test failed:', jsonError);
      throw new Error('Data contains non-serializable values');
    }

    // Format response
    const response = NextResponse.json(responseData);

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
export const GET = withMiddlewareChain(middlewareChain, getVariantsHandler);