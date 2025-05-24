import { createUser } from '@/lib/user-utils';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const admin = await createUser(
      'admin@genomics.local',
      'admin123!',
      'Admin User',
      'admin'
    );
    return NextResponse.json({ success: true, email: admin.email });
  } catch (error) {
    return NextResponse.json({ error: 'Admin already exists or error occurred' });
  }
}