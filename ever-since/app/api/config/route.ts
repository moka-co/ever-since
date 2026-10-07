import { NextResponse } from 'next/server';
import { readDb, updateDb } from '@/lib/storage/db';
import { errorResponse } from '@/lib/api';

/**
 * GET /api/config
 * Authenticated
 * Fetch anniversary date and config settings (such as sealMediaId)
 */
export async function GET() {
  try {
    const db = await readDb();
    return NextResponse.json(
      {
        anniversaryDate: db.config.anniversaryDate,
        sealMediaId: db.config.sealMediaId ?? null,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error, 'API /api/config GET');
  }
}

/**
 * PUT /api/config
 * Authenticated
 * Update anniversary date and/or sealMediaId
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { anniversaryDate, sealMediaId } = body;

    const db = await readDb();
    const newConfig = { ...db.config };

    if (anniversaryDate !== undefined) {
      if (typeof anniversaryDate !== 'string') {
        return NextResponse.json({ error: 'anniversaryDate must be a string' }, { status: 400 });
      }
      newConfig.anniversaryDate = anniversaryDate;
    }

    if (sealMediaId !== undefined) {
      if (sealMediaId !== null && typeof sealMediaId !== 'string') {
        return NextResponse.json({ error: 'sealMediaId must be a string or null' }, { status: 400 });
      }
      if (typeof sealMediaId === 'string' && sealMediaId !== '') {
        const mediaExists = db.media.some((m) => m.id === sealMediaId);
        if (!mediaExists) {
          return NextResponse.json({ error: `Media with ID '${sealMediaId}' not found` }, { status: 400 });
        }
        newConfig.sealMediaId = sealMediaId;
      } else {
        newConfig.sealMediaId = null;
      }
    }

    const updated = await updateDb((currentDb) => ({
      ...currentDb,
      config: newConfig,
    }));

    return NextResponse.json(
      {
        message: 'Configuration updated successfully',
        config: updated.config,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error, 'API /api/config PUT');
  }
}
