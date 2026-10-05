import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, saveAuthenticatedSession } from '@/lib/auth/session';

/**
 * POST /api/auth/login
 * Authenticate with the 20-character secret from db.json,
 * set the 72-hour session cookie on match.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { password?: unknown };
  const password = typeof body.password === 'string' ? body.password : '';
  const isValid = await verifyPassword(password);

  if (!isValid) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  await saveAuthenticatedSession();
  return NextResponse.json({ authenticated: true }, { status: 200 });
}
