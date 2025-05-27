import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In un'app reale, qui puliresti la cache specifica dell'utente
    // await redis.del(`user_cache:${session.user.id}:*`);
    // await clearUserCache(session.user.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Cache cleared successfully' 
    });

  } catch (error) {
    console.error('Cache clear error:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}