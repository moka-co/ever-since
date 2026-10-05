import { NextResponse } from 'next/server';
import { readDb, updateDb } from '@/lib/storage/db';
import { errorResponse } from '@/lib/api';

/**
 * GET /api/config
 * Authenticated
 * Fetch anniversary date
 */
export async function GET() {
  try {
    const db = await readDb();
    return NextResponse.json({ anniversaryDate: db.config.anniversaryDate }, { status: 200 });
  } catch (error) {
    return errorResponse(error, 'API /api/config GET');
  }
}

/**
 * PUT /api/config
 * Authenticated
 * Update anniversary date
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { anniversaryDate } = body;

    if (typeof anniversaryDate !== 'string') {
      return NextResponse.json({ error: 'anniversaryDate must be a string' }, { status: 400 });
    }

    const updated = await updateDb((db) => ({
      ...db,
      config: { anniversaryDate },
    }));

    return NextResponse.json(
      {
        message: 'Anniversary date updated successfully',
        config: updated.config,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error, 'API /api/config PUT');
  }
}
