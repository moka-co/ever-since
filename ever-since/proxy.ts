import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionCookie } from '@/lib/auth/session';


// Public API endpoints that do not require authentication
const PUBLIC_API_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/session',
  '/api/auth/logout',
]);

/**
 * Proxy (Next.js 16+ convention) responsible for verifying the iron-session cookie on requests to:
 * - "/" (main flow)
 * - "/customize/*" (admin dashboard)
 * - Protected API routes ("/api/*")
 *
 * Missing or expired sessions are:
 * - Returned as JSON { error: "not authenticated" } (401) for API routes
 * - Redirected to "/login" for page routes
 */
export async function proxy(request: NextRequest) {
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

// Backward-compatibility alias for tests
export { proxy as middleware };

export const config = {
  matcher: ['/', '/customize/:path*', '/api/:path*'],
};
