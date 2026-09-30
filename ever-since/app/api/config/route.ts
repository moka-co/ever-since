import { NextResponse } from 'next/server';

/**
 * GET /api/config
 * Authenticated
 * Fetch anniversary date & story settings
 */
export async function GET() {
  return NextResponse.json(
    {
      anniversaryDate: '2025-01-01',
    },
    { status: 200 }
  );
}

/**
 * PUT /api/config
 * Authenticated
 * Update anniversary date
 */
export async function PUT() {
  return NextResponse.json(
    {
      message: 'Mock: anniversary config updated',
    },
    { status: 200 }
  );
}
