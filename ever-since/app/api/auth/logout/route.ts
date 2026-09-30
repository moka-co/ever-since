import { NextResponse } from 'next/server';
import { clearAuthenticatedSession } from '@/lib/auth/session';

/**
 * POST /api/auth/logout
 * Authenticated
 * Clear session cookie
 */
export async function POST() {
  await clearAuthenticatedSession();

  return NextResponse.json(
    { authenticated: false },
    { status: 200 }
  );
}
