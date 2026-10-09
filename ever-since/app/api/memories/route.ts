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
    const mediaPositionX = typeof body.mediaPositionX === 'number'
      ? Math.max(0, Math.min(100, Math.round(body.mediaPositionX)))
      : 50;
    const mediaPositionY = typeof body.mediaPositionY === 'number'
      ? Math.max(0, Math.min(100, Math.round(body.mediaPositionY)))
      : 50;
    const mediaScale = typeof body.mediaScale === 'number'
      ? Math.max(1, Math.min(3, Math.round(body.mediaScale * 10) / 10))
      : 1;
    const newMemory = {
      id: randomUUID(),
      heading: body.heading ?? null,
      text: body.text ?? null,
      mediaId: body.mediaId ?? null,
      mediaPositionX,
      mediaPositionY,
      mediaScale,
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
