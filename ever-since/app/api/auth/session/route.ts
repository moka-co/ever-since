import { NextResponse } from 'next/server';

/**
 * GET /api/auth/session
 * Public
 * Inspect session state & lockout countdown
 */
export async function GET() {
  return NextResponse.json(
    {
      authenticated: false,
      lockout: {
        isLockedOut: false,
        retryAfter: 0,
        attemptsLeft: 5,
      },
    },
    { status: 200 }
  );
}
