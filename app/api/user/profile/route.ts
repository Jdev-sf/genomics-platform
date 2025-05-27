import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mock profile data - sostituire con vera query al database
    const profile = {
      id: session.user?.id || '1',
      name: session.user?.name || 'Dr. John Smith',
      email: session.user?.email || 'john.smith@genomics.com',
      role: {
        id: 'researcher',
        name: 'Researcher'
      },
      bio: 'Experienced genomics researcher specializing in cancer genetics and variant interpretation.',
      organization: 'Genomics Research Institute',
      department: 'Cancer Genomics',
      phone: '+1 (555) 123-4567',
      location: 'Boston, MA',
      lastLogin: new Date().toISOString(),
      createdAt: '2023-01-15T10:00:00Z',
      preferences: {
        emailNotifications: true,
        darkMode: false,
        language: 'en'
      },
      stats: {
        totalSearches: 1247,
        totalExports: 89,
        lastActivity: new Date().toISOString()
      }
    };

    return NextResponse.json(profile);

  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, bio, organization, department, phone, location } = body;

    // In un'app reale, qui aggiorneresti il database
    // await prisma.user.update({
    //   where: { id: session.user.id },
    //   data: { name, bio, organization, department, phone, location }
    // });

    // Mock response con dati aggiornati
    const updatedProfile = {
      id: session.user?.id || '1',
      name: name || session.user?.name,
      email: session.user?.email,
      role: {
        id: 'researcher',
        name: 'Researcher'
      },
      bio,
      organization,
      department,
      phone,
      location,
      lastLogin: new Date().toISOString(),
      createdAt: '2023-01-15T10:00:00Z',
      preferences: {
        emailNotifications: true,
        darkMode: false,
        language: 'en'
      },
      stats: {
        totalSearches: 1247,
        totalExports: 89,
        lastActivity: new Date().toISOString()
      }
    };

    return NextResponse.json(updatedProfile);

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}