import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/memories/[id]
 * Authenticated
 * Update an existing memory
 */
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return NextResponse.json(
    {
      message: `Mock: memory '${id}' updated`,
    },
    { status: 200 }
  );
}

/**
 * DELETE /api/memories/[id]
 * Authenticated
 * Delete a memory item
 */
export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return NextResponse.json(
    {
      message: `Mock: memory '${id}' deleted`,
    },
    { status: 200 }
  );
}
