import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mock settings data - sostituire con vera query al database
    const settings = {
      notifications: {
        email: true,
        browser: true,
        dataUpdates: true,
        securityAlerts: true,
        weeklyReports: false,
      },
      appearance: {
        theme: 'system',
        language: 'en',
        timezone: 'UTC',
      },
      data: {
        autoSave: true,
        defaultExportFormat: 'csv',
        cacheEnabled: true,
        retentionDays: 30,
      },
      privacy: {
        shareUsageStats: false,
        allowAnalytics: true,
        showOnlineStatus: true,
      },
    };

    return NextResponse.json(settings);

  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await request.json();

    // In un'app reale, qui aggiorneresti il database
    // await prisma.userSettings.upsert({
    //   where: { userId: session.user.id },
    //   update: settings,
    //   create: { userId: session.user.id, ...settings }
    // });

    return NextResponse.json({ success: true, settings });

  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}