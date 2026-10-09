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

      let mediaPositionX = existing.mediaPositionX ?? 50;
      if (body.mediaPositionX !== undefined && typeof body.mediaPositionX === 'number') {
        mediaPositionX = Math.max(0, Math.min(100, Math.round(body.mediaPositionX)));
      }

      let mediaPositionY = existing.mediaPositionY ?? 50;
      if (body.mediaPositionY !== undefined && typeof body.mediaPositionY === 'number') {
        mediaPositionY = Math.max(0, Math.min(100, Math.round(body.mediaPositionY)));
      }

      let mediaScale = existing.mediaScale ?? 1;
      if (body.mediaScale !== undefined && typeof body.mediaScale === 'number') {
        mediaScale = Math.max(1, Math.min(3, Math.round(body.mediaScale * 10) / 10));
      }

      updatedMemory = {
        id: existing.id,
        heading: body.heading !== undefined ? body.heading : existing.heading,
        text: body.text !== undefined ? body.text : existing.text,
        mediaId: body.mediaId !== undefined ? body.mediaId : existing.mediaId,
        mediaPositionX,
        mediaPositionY,
        mediaScale,
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
