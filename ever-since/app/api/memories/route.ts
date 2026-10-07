import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { readDb, updateDb } from '@/lib/storage/db';
import { MAX_MEMORIES_COUNT } from '@/lib/storage/schema';
import { errorResponse } from '@/lib/api';

/**
 * GET /api/memories
 * Authenticated
 * Fetch ordered memories
 */
export async function GET() {
  try {
    const db = await readDb();
    return NextResponse.json(db.memories, { status: 200 });
  } catch (error) {
    return errorResponse(error, 'API /api/memories GET');
  }
}

/**
 * POST /api/memories
 * Authenticated
 * Add a new memory item
 */
export async function POST(request: Request) {
  try {
    const db = await readDb();
    if (db.memories.length >= MAX_MEMORIES_COUNT) {
      return NextResponse.json(
        { error: `Memories limit exceeded. A maximum of ${MAX_MEMORIES_COUNT} memories is allowed.` },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const newMemory = {
      id: randomUUID(),
      heading: body.heading ?? null,
      text: body.text ?? null,
      mediaId: body.mediaId ?? null,
    };

    await updateDb((currentDb) => ({
      ...currentDb,
      memories: [...currentDb.memories, newMemory],
    }));

    return NextResponse.json(
      {
        message: 'Memory item created successfully',
        memory: newMemory,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error, 'API /api/memories POST');
  }
}
