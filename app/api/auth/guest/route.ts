// app/api/auth/guest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/user-utils';
import { addSecurityHeaders } from '@/lib/validation';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Generate unique guest credentials
    const guestId = randomUUID();
    const guestEmail = `guest_${guestId}@guest.local`;
    const guestPassword = `guest_${guestId}_${Date.now()}`;
    const guestName = `Guest User ${guestId.slice(0, 8)}`;

    // Check if somehow this guest email already exists (very unlikely)
    const existingUser = await getUserByEmail(guestEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Guest user conflict, please try again' },
        { status: 409 }
      );
    }

    // Create guest user with viewer role
    const guestUser = await createUser(
      guestEmail,
      guestPassword,
      guestName,
      'viewer'
    );

    // Return credentials for immediate sign-in
    const response = NextResponse.json({
      success: true,
      message: 'Guest access created',
      email: guestEmail,
      password: guestPassword,
      user: {
        id: guestUser.id,
        email: guestUser.email,
        name: guestUser.name,
      }
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Guest access error:', error);
    
    const response = NextResponse.json(
      { error: 'Failed to create guest access' },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}