import { NextRequest, NextResponse } from 'next/server';
import { dbClient } from '@/lib/storage/db';
import { saveAuthenticatedSession } from '@/lib/auth/session';

/**
 * Extracts the submitted password from either a JSON body or FormData payload.
 */
async function extractPassword(request: NextRequest): Promise<string> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => ({}))) as { password?: unknown };
    return typeof body.password === 'string' ? body.password : '';
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await request.formData().catch(() => null);
    const value = formData?.get('password');
    return typeof value === 'string' ? value : '';
  }

  return '';
}

/**
 * POST /api/auth/login
 * Authenticate with the 20-character secret from db.json via the DB client,
 * set the 72-hour session cookie on match, and return only true/false for authentication status.
 */
export async function POST(request: NextRequest) {
  const password = await extractPassword(request);
  const isValid = await dbClient.verifySecret(password);

  if (!isValid) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  await saveAuthenticatedSession();
  return NextResponse.json({ authenticated: true }, { status: 200 });
}
