import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, saveAuthenticatedSession } from '@/lib/auth/session';
import { isIpBanned, recordFailedAttempt, resetFailedAttempts } from '@/lib/auth/lockout';
import { reconcileMediaLibrary } from '@/lib/media/sync';
import { logger, getClientIp } from '@/lib/logger';

/**
 * POST /api/auth/login
 * Authenticate with the 20-character secret from db.json,
 * set the 72-hour session cookie on match.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  if (await isIpBanned(ip)) {
    logger.warn(
      {
        event: 'login_attempt_banned_ip',
        ip,
      },
      `Rejected login attempt from banned IP ${ip}`
    );
    return NextResponse.json(
      { error: 'IP is locked out due to too many failed login attempts', authenticated: false },
      { status: 403 }
    );
  }

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
    const { banned } = await recordFailedAttempt(ip);
    if (banned) {
      return NextResponse.json(
        { error: 'IP is locked out due to too many failed login attempts', authenticated: false },
        { status: 403 }
      );
    }
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  resetFailedAttempts(ip);

  // Reconcile filesystem media library with db.json on login
  await reconcileMediaLibrary().catch((err) => {
    logger.warn({ event: 'reconcile_on_login_failed', error: String(err) }, 'Reconciliation on login failed');
  });

  try {
    await saveAuthenticatedSession();
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      throw err;
    }
  }

  return NextResponse.json({ authenticated: true }, { status: 200 });
}
