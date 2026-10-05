import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getIronSession, unsealData, type IronSession, type SessionOptions } from 'iron-session';
import { readDb } from '@/lib/storage/db';

export interface SessionData {
  authenticated: boolean;
  loginAt?: number;
}

export const SESSION_TTL_SECONDS = 72 * 60 * 60; // 72 hours
export const SESSION_COOKIE_NAME = 'ever_since_session';

async function getDerivedPassword(): Promise<string> {
  const db = await readDb();
  return createHash('sha256').update(db.secret.value).digest('hex');
}

export async function verifyPassword(candidate: string): Promise<boolean> {
  try {
    const db = await readDb();
    const storedSecret = db.secret.value;
    const candidateBuf = Buffer.from(candidate, 'utf8');
    const secretBuf = Buffer.from(storedSecret, 'utf8');

    if (candidateBuf.length !== secretBuf.length || secretBuf.length === 0) {
      return false;
    }

    return timingSafeEqual(candidateBuf, secretBuf);
  } catch {
    return false;
  }
}

async function getSessionOptions(): Promise<SessionOptions> {
  const password = await getDerivedPassword();
  return {
    password,
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

async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  const options = await getSessionOptions();
  return getIronSession<SessionData>(cookieStore, options);
}

export async function verifySessionCookie(cookieValue?: string): Promise<boolean> {
  if (!cookieValue) return false;

  try {
    const password = await getDerivedPassword();
    const session = await unsealData<SessionData>(cookieValue, {
      password,
      ttl: SESSION_TTL_SECONDS,
    });

    if (!session || !session.authenticated || !session.loginAt) {
      return false;
    }

    const elapsedMs = Date.now() - session.loginAt;
    if (elapsedMs > SESSION_TTL_SECONDS * 1000) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function isSessionAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function saveAuthenticatedSession(): Promise<void> {
  const session = await getSession();
  session.authenticated = true;
  session.loginAt = Date.now();
  await session.save();
}

export async function clearAuthenticatedSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
