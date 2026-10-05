import { NextResponse } from 'next/server';
import { readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readDb, updateDb } from '@/lib/storage/db';
import { getMimeType, MEDIA_DIR } from '@/lib/media/validation';
import { errorResponse } from '@/lib/api';
import type { MediaRecord } from '@/lib/storage/schema';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/media/[id]
 * Authenticated
 * Serves media binary directly from the media/ directory, strictly ensuring the file is registered in db.json.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const db = await readDb();
    const mediaRecord = db.media.find(
      (m) => m.id === id || m.filename.toLowerCase() === id.toLowerCase()
    );

    if (!mediaRecord) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const filename = mediaRecord.filename;
    const filePath = resolve(MEDIA_DIR, filename);

    try {
      const buffer = await readFile(filePath);
      const mimeType = getMimeType(filename);

      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'no-cache, must-revalidate',
        },
      });
    } catch {
      return NextResponse.json({ error: 'Media file not found on disk' }, { status: 404 });
    }
  } catch (error) {
    return errorResponse(error, 'API /api/media/[id] GET');
  }
}

/**
 * DELETE /api/media/[id]
 * Authenticated
 * Deletes media record from db.json and unlinks the file from media/, reclaiming quota.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    let deleted: MediaRecord | null = null;

    await updateDb((db) => {
      const item = db.media.find((m) => m.id === id);
      if (!item) return db;
      deleted = item;
      return {
        ...db,
        media: db.media.filter((m) => m.id !== id),
      };
    });

    if (!deleted) {
      return NextResponse.json({ error: `Media with ID '${id}' not found` }, { status: 404 });
    }

    const filePath = resolve(MEDIA_DIR, (deleted as MediaRecord).filename);
    await unlink(filePath).catch((err) => {
      console.warn(`[API /api/media/[id] DELETE] Could not unlink ${filePath}:`, err.message);
    });

    return NextResponse.json(
      {
        message: `Media '${id}' deleted successfully`,
        id,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error, 'API /api/media/[id] DELETE');
  }
}
