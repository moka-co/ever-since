import { NextResponse } from 'next/server';
import { memoryDbClient } from '@/lib/storage/memory-db';
import { ZodError } from 'zod';

/**
 * PUT /api/memories/reorder
 * Authenticated
 * Reorder memories after drag & drop
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: 'orderedIds must be an array of memory UUID strings' },
        { status: 400 }
      );
    }

    const { memories } = await memoryDbClient.reorderMemories(orderedIds);

    return NextResponse.json(
      {
        message: 'Memories reordered successfully',
        memories,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid reorder payload. Each ID must be a valid UUID string.',
          details: error.flatten(),
        },
        { status: 400 }
      );
    }
    console.error('[API /api/memories/reorder PUT] Error reordering memories:', error);
    return NextResponse.json(
      { error: 'Failed to reorder memories' },
      { status: 500 }
    );
  }
}
