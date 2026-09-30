import { NextResponse } from 'next/server';

/**
 * PUT /api/memories/reorder
 * Authenticated
 * Reorder memories after drag & drop
 */
export async function PUT() {
  return NextResponse.json(
    {
      message: 'Mock: memories reordered successfully',
    },
    { status: 200 }
  );
}
