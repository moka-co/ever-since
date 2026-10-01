import { NextResponse } from 'next/server';
import { readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { mediaDbClient } from '@/lib/storage/media-db';
import { getMimeType, MAX_MEDIA_COUNT } from '@/lib/media/validation';

const MEDIA_DIR = resolve(process.cwd(), 'media');

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/media/[id]
 * Authenticated
 * Serves media binary directly from the media/ directory.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const mediaRecord = await mediaDbClient.getMediaById(id);

    const filename = mediaRecord ? mediaRecord.filename : id;
    const filePath = resolve(MEDIA_DIR, filename);

    try {
      const buffer = await readFile(filePath);
      const mimeType = getMimeType(filename);

      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch {
      return NextResponse.json({ error: 'Media file not found on disk' }, { status: 404 });
    }
  } catch (error) {
    console.error('[API /api/media/[id] GET] Error serving media:', error);
    return NextResponse.json({ error: 'Server error serving media' }, { status: 500 });
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
    const { deleted, db } = await mediaDbClient.deleteMedia(id);

    if (!deleted) {
      return NextResponse.json({ error: `Media with ID '${id}' not found` }, { status: 404 });
    }

    // Remove file from disk
    const filePath = resolve(MEDIA_DIR, deleted.filename);
    await unlink(filePath).catch((err) => {
      console.warn(`[API /api/media/[id] DELETE] Could not unlink ${filePath}:`, err.message);
    });

    const used = db.media.length;

    return NextResponse.json(
      {
        message: `Media '${id}' deleted successfully`,
        id,
        quota: {
          total: MAX_MEDIA_COUNT,
          used,
          remaining: Math.max(0, MAX_MEDIA_COUNT - used),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /api/media/[id] DELETE] Error deleting media:', error);
    return NextResponse.json({ error: 'Server error deleting media' }, { status: 500 });
  }
}
