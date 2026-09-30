import { NextResponse } from 'next/server';

/**
 * GET /api/memories
 * Authenticated
 * Fetch ordered memories for timeline
 */
export async function GET() {
  return NextResponse.json([], { status: 200 });
}

/**
 * POST /api/memories
 * Authenticated
 * Add a new memory item
 */
export async function POST() {
  return NextResponse.json(
    {
      message: 'Mock: memory item created',
      id: 'mock-memory-id',
    },
    { status: 201 }
  );
}
