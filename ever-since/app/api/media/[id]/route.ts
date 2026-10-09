import { NextResponse } from 'next/server';
import { unlink, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { resolve } from 'node:path';
import { readDb, updateDb } from '@/lib/storage/db';
import { getMimeType, MEDIA_DIR } from '@/lib/media/validation';
import { parseRange } from '@/lib/media/range';
import { errorResponse } from '@/lib/api';
import { logger } from '@/lib/logger';
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
      const stats = await stat(filePath);
      const totalSize = stats.size;
      const mimeType = getMimeType(filename);
      const etag = `W/"${totalSize.toString(16)}-${Math.floor(stats.mtimeMs).toString(16)}"`;

      const baseHeaders: Record<string, string> = {
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, no-cache',
        ETag: etag,
      };

      // Handle conditional ETag request (304 Not Modified)
      const ifNoneMatch = request.headers.get('if-none-match');
      if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === stats.mtimeMs.toString())) {
        return new Response(null, {
          status: 304,
          headers: baseHeaders,
        });
      }

      const rangeHeader = request.headers.get('range');
      if (rangeHeader) {
        const parsed = parseRange(rangeHeader, totalSize);
        if (parsed === 'invalid') {
          return new Response(null, {
            status: 416,
            headers: {
              ...baseHeaders,
              'Content-Range': `bytes */${totalSize}`,
            },
          });
        }

        if (parsed) {
          const { start, end } = parsed;
          const chunkSize = end - start + 1;
          const stream = createReadStream(filePath, { start, end });
          const body = Readable.toWeb(stream) as ReadableStream;

          return new Response(body, {
            status: 206,
            headers: {
              ...baseHeaders,
              'Content-Range': `bytes ${start}-${end}/${totalSize}`,
              'Content-Length': String(chunkSize),
            },
          });
        }
      }

      // Full content response (streamed)
      const stream = createReadStream(filePath);
      const body = Readable.toWeb(stream) as ReadableStream;

      return new Response(body, {
        status: 200,
        headers: {
          ...baseHeaders,
          'Content-Length': String(totalSize),
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
        config: {
          ...db.config,
          sealMediaId: db.config.sealMediaId === id ? null : db.config.sealMediaId,
        },
        media: db.media.filter((m) => m.id !== id),
      };
    });

    if (!deleted) {
      return NextResponse.json({ error: `Media with ID '${id}' not found` }, { status: 404 });
    }

    const filePath = resolve(MEDIA_DIR, (deleted as MediaRecord).filename);
    await unlink(filePath).catch((err) => {
      logger.warn({ event: 'media_unlink_warning', filePath, error: err.message }, `Could not unlink ${filePath}: ${err.message}`);
      console.warn(`[API /api/media/[id] DELETE] Could not unlink ${filePath}:`, err.message);
    });

    logger.info({
      event: 'media_deleted',
      id,
      filename: (deleted as MediaRecord).filename,
    }, `Media '${id}' deleted successfully`);

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
