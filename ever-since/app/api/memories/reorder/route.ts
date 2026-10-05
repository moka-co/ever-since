import { NextResponse } from 'next/server';
import { updateDb } from '@/lib/storage/db';
import { errorResponse } from '@/lib/api';
import type { MemoryRecord } from '@/lib/storage/schema';

/**
 * PUT /api/memories/reorder
 * Authenticated
 * Reorder memories after drag & drop
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { error: 'orderedIds must be a non-empty array of memory UUID strings' },
        { status: 400 }
      );
    }

    let reordered: MemoryRecord[] = [];

    await updateDb((db) => {
      const memoryMap = new Map(db.memories.map((m) => [m.id, m]));
      const newOrderedList: MemoryRecord[] = [];

      for (const id of orderedIds) {
        const item = memoryMap.get(id);
        if (item) {
          newOrderedList.push(item);
          memoryMap.delete(id);
        }
      }

      for (const remaining of memoryMap.values()) {
        newOrderedList.push(remaining);
      }

      reordered = newOrderedList;
      return {
        ...db,
        memories: newOrderedList,
      };
    });

    return NextResponse.json(
      {
        message: 'Memories reordered successfully',
        memories: reordered,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error, 'API /api/memories/reorder PUT');
  }
}
