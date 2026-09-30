import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Authenticated
 * Clear session cookie
 */
export async function POST() {
  return NextResponse.json(
    { message: 'Mock: logout endpoint', authenticated: false },
    { status: 200 }
  );
}
