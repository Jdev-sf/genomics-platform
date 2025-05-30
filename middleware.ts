// middleware.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = [
    '/auth/login',
    '/api/auth',
    '/api/health',
    '/_next',
    '/favicon.ico',
    '/icons',
    '/manifest.json',
    '/sw.js'
  ];

  // Check if the current path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check authentication for ALL protected paths (including root)
  const session = await auth();

  // If no session, redirect to login
  if (!session) {
    const loginUrl = new URL('/auth/login', request.url);
    
    // Add redirect parameter to return to original page after login
    if (pathname !== '/') {
      loginUrl.searchParams.set('callbackUrl', pathname);
    }
    
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and trying to access login page, redirect to dashboard
  if (session && pathname.startsWith('/auth/login')) {
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl');
    const redirectUrl = callbackUrl && callbackUrl.startsWith('/') 
      ? new URL(callbackUrl, request.url)
      : new URL('/', request.url);
    
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match ALL paths except static files and API routes we want to keep public
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (except auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)',
  ],
};