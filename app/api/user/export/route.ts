import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mock user data export - sostituire con vera query al database
    const userData = {
      user: {
        id: session.user?.id,
        name: session.user?.name,
        email: session.user?.email,
        createdAt: '2023-01-15T10:00:00Z',
        lastLogin: new Date().toISOString()
      },
      profile: {
        bio: 'Experienced genomics researcher',
        organization: 'Genomics Research Institute',
        department: 'Cancer Genomics'
      },
      settings: {
        theme: 'system',
        language: 'en',
        notifications: {
          email: true,
          browser: true
        }
      },
      activity: {
        totalSearches: 1247,
        totalExports: 89,
        lastActivity: new Date().toISOString()
      },
      searches: [
        { query: 'BRCA1', timestamp: '2024-01-20T10:00:00Z' },
        { query: 'TP53', timestamp: '2024-01-19T15:30:00Z' }
      ],
      exports: [
        { type: 'genes', count: 25, timestamp: '2024-01-18T09:15:00Z' },
        { type: 'variants', count: 150, timestamp: '2024-01-17T14:22:00Z' }
      ],
      exportedAt: new Date().toISOString(),
      dataCompliance: {
        gdprCompliant: true,
        dataRetentionPeriod: '2 years',
        exportVersion: '1.0'
      }
    };

    const jsonData = JSON.stringify(userData, null, 2);
    
    return new NextResponse(jsonData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="user-data-${session.user?.id}-${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}