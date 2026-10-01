import { NextResponse } from 'next/server';
import { memoryDbClient } from '@/lib/storage/memory-db';
import { ZodError } from 'zod';

/**
 * GET /api/memories
 * Authenticated
 * Fetch ordered memories for timeline
 */
export async function GET() {
  try {
    const memories = await memoryDbClient.getMemories();
    return NextResponse.json(memories, { status: 200 });
  } catch (error) {
    console.error('[API /api/memories GET] Error fetching memories:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve memories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/memories
 * Authenticated
 * Add a new memory item
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { heading, text, mediaId } = body;

    const { memory } = await memoryDbClient.addMemory({
      heading: heading ?? null,
      text: text ?? null,
      mediaId: mediaId ?? null,
    });

    return NextResponse.json(
      {
        message: 'Memory item created successfully',
        memory,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid memory payload. Header and text must be 100 characters or fewer.',
          details: error.flatten(),
        },
        { status: 400 }
      );
    }
    console.error('[API /api/memories POST] Error creating memory:', error);
    return NextResponse.json(
      { error: 'Failed to create memory item' },
      { status: 500 }
    );
  }
}
