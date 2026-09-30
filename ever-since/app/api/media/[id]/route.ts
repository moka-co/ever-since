import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/media/[filename]
 * Authenticated
 * Serve media binary directly from disk
 */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return NextResponse.json(
    {
      message: `Mock: serving media binary for '${id}'`,
    },
    { status: 200 }
  );
}

/**
 * DELETE /api/media/[id]
 * Authenticated
 * Delete media file and reclaim quota
 */
export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return NextResponse.json(
    {
      message: `Mock: media '${id}' deleted`,
    },
    { status: 200 }
  );
}
