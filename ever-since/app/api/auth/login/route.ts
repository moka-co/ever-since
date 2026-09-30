import { NextResponse } from 'next/server';

/**
 * POST /api/auth/login
 * Public (Rate-limited)
 * Authenticate with 20-char secret & set session cookie
 */
export async function POST() {
  return NextResponse.json(
    { message: 'Mock: login endpoint', authenticated: false },
    { status: 200 }
  );
}
