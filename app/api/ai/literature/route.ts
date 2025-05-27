// app/api/ai/literature/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiService, literatureSearchSchema } from '@/lib/ai-services';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const validatedParams = literatureSearchSchema.parse({
      gene_symbol: searchParams.get('gene_symbol') || '',
      variant_id: searchParams.get('variant_id') || undefined,
      limit: parseInt(searchParams.get('limit') || '10'),
    });

    const literature = await aiService.suggestLiterature(
      validatedParams.gene_symbol,
      validatedParams.variant_id,
      validatedParams.limit
    );

    return NextResponse.json({
      status: 'success',
      data: literature
    });

  } catch (error) {
    console.error('Literature search error:', error);
    return NextResponse.json(
      { error: 'Failed to search literature' },
      { status: 500 }
    );
  }
}