import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionCookie } from '@/lib/auth/session';

export const runtime = 'nodejs';

// Public API endpoints that do not require authentication
const PUBLIC_API_PATHS = new Set(['/api/auth/login', '/api/auth/session']);

/**
 * Middleware responsible for verifying the iron-session cookie on requests to:
 * - "/" (main flow)
 * - "/customize/*" (admin dashboard)
 * - Protected API routes ("/api/*")
 *
 * Missing or expired sessions are redirected to "/login".
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const normalizedPath = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;

  // Allow public API routes without session check
  if (PUBLIC_API_PATHS.has(normalizedPath)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySessionCookie(sessionCookie);

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/customize/:path*', '/api/:path*'],
};
