import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, saveAuthenticatedSession } from '@/lib/auth/session';
import { logger, getClientIp } from '@/lib/logger';

/**
 * POST /api/auth/login
 * Authenticate with the 20-character secret from db.json,
 * set the 72-hour session cookie on match.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const body = (await request.json().catch(() => ({}))) as { password?: unknown };
  const password = typeof body.password === 'string' ? body.password : '';
  const isValid = await verifyPassword(password);

  // Every login attempt is logged
  logger.info(
    {
      event: 'login_attempt',
      ip,
      success: isValid,
    },
    `Login attempt ${isValid ? 'successful' : 'failed'} from IP ${ip}`
  );

  if (!isValid) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  await saveAuthenticatedSession();
  return NextResponse.json({ authenticated: true }, { status: 200 });
}
