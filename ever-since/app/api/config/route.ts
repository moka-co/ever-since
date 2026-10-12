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
    return errorResponse(error, 'API /api/config GET', 'load the settings');
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

    if (anniversaryDate !== undefined && typeof anniversaryDate !== 'string') {
      return NextResponse.json({ error: 'anniversaryDate must be a string' }, { status: 400 });
    }

    if (sealMediaId !== undefined && sealMediaId !== null && typeof sealMediaId !== 'string') {
      return NextResponse.json({ error: 'sealMediaId must be a string or null' }, { status: 400 });
    }

    let missingMediaError: string | null = null;

    const updated = await updateDb((currentDb) => {
      const newConfig = { ...currentDb.config };

      if (anniversaryDate !== undefined) {
        newConfig.anniversaryDate = anniversaryDate;
      }

      if (sealMediaId !== undefined) {
        if (typeof sealMediaId === 'string' && sealMediaId !== '') {
          const mediaExists = currentDb.media.some((m) => m.id === sealMediaId);
          if (!mediaExists) {
            missingMediaError = `Media with ID '${sealMediaId}' not found`;
            return currentDb;
          }
          newConfig.sealMediaId = sealMediaId;
        } else {
          newConfig.sealMediaId = null;
        }
      }

      return {
        ...currentDb,
        config: newConfig,
      };
    });

    if (missingMediaError) {
      return NextResponse.json({ error: missingMediaError }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: 'Configuration updated successfully',
        config: updated.config,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error, 'API /api/config PUT', 'save the settings');
  }
}
