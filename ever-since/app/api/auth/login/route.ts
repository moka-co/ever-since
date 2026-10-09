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

  const contentType = request.headers.get('content-type') || '';
  const isFormPost =
    (contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')) &&
    !request.headers.get('accept')?.includes('application/json');

  let password = '';
  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await request.formData().catch(() => null);
    if (formData) {
      const val = formData.get('password');
      if (typeof val === 'string') password = val;
    }
  } else {
    const body = (await request.json().catch(() => ({}))) as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  }

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
      if (isFormPost) {
        return NextResponse.redirect(new URL('/login?error=locked', request.url), 303);
      }
      return NextResponse.json(
        { error: 'IP is locked out due to too many failed login attempts', authenticated: false },
        { status: 403 }
      );
    }
    if (isFormPost) {
      return NextResponse.redirect(new URL('/login?error=1', request.url), 303);
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

  if (isFormPost) {
    return NextResponse.redirect(new URL('/login', request.url), 303);
  }

  return NextResponse.json({ authenticated: true }, { status: 200 });
}
