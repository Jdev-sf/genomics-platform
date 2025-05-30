// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/user-utils';
import { addSecurityHeaders } from '@/lib/validation';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['researcher', 'clinician', 'viewer']).default('viewer'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.errors.map(err => err.message).join(', ')
        },
        { status: 400 }
      );
    }

    const { name, email, password, role } = validationResult.data;

    // Check if user already exists
    const existingUser = await import('@/lib/user-utils').then(({ getUserByEmail }) => 
      getUserByEmail(email)
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create user
    const user = await createUser(email, password, name, role);

    // Return success (don't include sensitive data)
    const response = NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    }, { status: 201 });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Registration error:', error);
    
    const response = NextResponse.json(
      { error: 'Internal server error during registration' },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}