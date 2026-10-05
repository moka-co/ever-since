import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { readDb, updateDb } from '@/lib/storage/db';
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
    const body = await request.json().catch(() => ({}));
    const newMemory = {
      id: randomUUID(),
      heading: body.heading ?? null,
      text: body.text ?? null,
      mediaId: body.mediaId ?? null,
    };

    await updateDb((db) => ({
      ...db,
      memories: [...db.memories, newMemory],
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
