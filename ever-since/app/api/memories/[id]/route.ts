import { NextResponse } from 'next/server';
import { memoryDbClient } from '@/lib/storage/memory-db';
import { ZodError } from 'zod';

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

    const { memory } = await memoryDbClient.updateMemory(id, {
      heading: body.heading !== undefined ? body.heading : undefined,
      text: body.text !== undefined ? body.text : undefined,
      mediaId: body.mediaId !== undefined ? body.mediaId : undefined,
    });

    if (!memory) {
      return NextResponse.json(
        { error: `Memory with ID '${id}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: `Memory '${id}' updated successfully`,
        memory,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid memory update payload. Header and text must be 100 characters or fewer.',
          details: error.flatten(),
        },
        { status: 400 }
      );
    }
    console.error('[API /api/memories/[id] PUT] Error updating memory:', error);
    return NextResponse.json(
      { error: 'Failed to update memory item' },
      { status: 500 }
    );
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
    const { deleted } = await memoryDbClient.deleteMemory(id);

    if (!deleted) {
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
    console.error('[API /api/memories/[id] DELETE] Error deleting memory:', error);
    return NextResponse.json(
      { error: 'Failed to delete memory item' },
      { status: 500 }
    );
  }
}
