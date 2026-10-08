import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionCookie } from '@/lib/auth/session';
import { isIpBanned } from '@/lib/auth/lockout';
import { logger, getClientIp } from '@/lib/logger';

/**
 * Proxy responsible for verifying the session cookie on requests to:
 * - "/" (main flow)
 * - "/customize/*" (admin dashboard)
 * - Protected API routes ("/api/*")
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  if (await isIpBanned(ip)) {
    logger.warn(
      {
        event: 'banned_ip_rejected',
        method: request.method,
        pathname,
        ip,
      },
      `Rejected request from banned IP ${ip}`
    );
    return NextResponse.json({ error: 'IP is locked out' }, { status: 403 });
  }

  // Every API call is logged, including IP address of the user
  if (pathname.startsWith('/api/')) {
    logger.info(
      {
        event: 'api_call',
        method: request.method,
        pathname,
        ip,
      },
      `API call: ${request.method} ${pathname} from ${ip}`
    );
  }

  // Allow public auth routes without session check
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySessionCookie(sessionCookie);

  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      logger.warn(
        {
          event: 'unauthorized_api_call',
          method: request.method,
          pathname,
          ip,
        },
        `Unauthorized API call: ${request.method} ${pathname} from ${ip}`
      );
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
