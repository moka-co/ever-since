import 'server-only';
import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { getIronSession, type IronSession, type SessionOptions } from 'iron-session';
import { dbClient } from '@/lib/storage/db';

export interface SessionData {
  authenticated: boolean;
  loginAt?: number;
}

export const SESSION_TTL_SECONDS = 72 * 60 * 60; // 72 hours
export const SESSION_COOKIE_NAME = 'ever_since_session';

/**
 * Derives a 32+ character encryption password for iron-session from the
 * 20-character startup secret stored in db.json.
 * Because the secret changes on every startup, existing session cookies are
 * automatically invalidated when the server restarts.
 */
async function getSessionOptions(): Promise<SessionOptions> {
  const secret = await dbClient.getSecret();
  const derivedPassword = createHash('sha256').update(secret).digest('hex');

  return {
    password: derivedPassword,
    cookieName: SESSION_COOKIE_NAME,
    ttl: SESSION_TTL_SECONDS,
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    },
  };
}

/**
 * Retrieves the current iron-session from Next.js cookies.
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  const options = await getSessionOptions();
  return getIronSession<SessionData>(cookieStore, options);
}

/**
 * Checks whether the current request has a valid, non-expired authenticated session.
 */
export async function isSessionAuthenticated(): Promise<boolean> {
  try {
    const session = await getSession();
    if (!session.authenticated || !session.loginAt) {
      return false;
    }

    const elapsedMs = Date.now() - session.loginAt;
    if (elapsedMs > SESSION_TTL_SECONDS * 1000) {
      session.destroy();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Saves an authenticated session cookie valid for 72 hours.
 */
export async function saveAuthenticatedSession(): Promise<void> {
  const session = await getSession();
  session.authenticated = true;
  session.loginAt = Date.now();
  await session.save();
}
