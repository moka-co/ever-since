import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionCookie } from '@/lib/auth/session';

/**
 * Proxy responsible for verifying the session cookie on requests to:
 * - "/" (main flow)
 * - "/customize/*" (admin dashboard)
 * - Protected API routes ("/api/*")
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public auth routes without session check
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySessionCookie(sessionCookie);

  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'not authenticated' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/customize/:path*', '/api/:path*'],
};
