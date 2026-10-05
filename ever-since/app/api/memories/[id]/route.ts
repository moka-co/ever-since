import { NextResponse } from 'next/server';
import { updateDb } from '@/lib/storage/db';
import { errorResponse } from '@/lib/api';
import type { MemoryRecord } from '@/lib/storage/schema';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/memories/[id]
 * Authenticated
 * Update an existing memory
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    let updatedMemory: MemoryRecord | null = null;

    await updateDb((db) => {
      const existing = db.memories.find((m) => m.id === id);
      if (!existing) return db;

      updatedMemory = {
        id: existing.id,
        heading: body.heading !== undefined ? body.heading : existing.heading,
        text: body.text !== undefined ? body.text : existing.text,
        mediaId: body.mediaId !== undefined ? body.mediaId : existing.mediaId,
      };

      return {
        ...db,
        memories: db.memories.map((m) => (m.id === id ? updatedMemory! : m)),
      };
    });

    if (!updatedMemory) {
      return NextResponse.json(
        { error: `Memory with ID '${id}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: `Memory '${id}' updated successfully`,
        memory: updatedMemory,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error, 'API /api/memories/[id] PUT');
  }
}

/**
 * DELETE /api/memories/[id]
 * Authenticated
 * Delete a memory item
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    let deletedMemory: MemoryRecord | null = null;

    await updateDb((db) => {
      const existing = db.memories.find((m) => m.id === id);
      if (!existing) return db;
      deletedMemory = existing;
      return {
        ...db,
        memories: db.memories.filter((m) => m.id !== id),
      };
    });

    if (!deletedMemory) {
      return NextResponse.json(
        { error: `Memory with ID '${id}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: `Memory '${id}' deleted successfully`,
        id,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error, 'API /api/memories/[id] DELETE');
  }
}
