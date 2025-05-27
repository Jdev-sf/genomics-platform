// app/api/ai/predict/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiService, variantPredictionSchema } from '@/lib/ai-services';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = variantPredictionSchema.parse(body);

    const prediction = await aiService.predictVariantPathogenicity(validatedData);

    return NextResponse.json({
      status: 'success',
      data: prediction
    });

  } catch (error) {
    console.error('AI prediction error:', error);
    return NextResponse.json(
      { error: 'Failed to generate prediction' },
      { status: 500 }
    );
  }
}