import { NextResponse, type NextRequest } from 'next/server';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readDb, updateDb } from '@/lib/storage/db';
import {
  validateMediaConstraints,
  getNextMediaId,
  getExtension,
  isVideo,
  MEDIA_DIR,
  MAX_MEDIA_COUNT,
} from '@/lib/media/validation';
import { processPhotoBuffer } from '@/lib/media/processor';
import { errorResponse } from '@/lib/api';

/**
 * GET /api/media
 * Authenticated
 * Returns the media library and current quota inspection.
 */
export async function GET() {
  try {
    const db = await readDb();
    const used = db.media.length;

    return NextResponse.json(
      {
        media: db.media,
        quota: {
          total: MAX_MEDIA_COUNT,
          used,
          remaining: Math.max(0, MAX_MEDIA_COUNT - used),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error, 'API /api/media GET');
  }
}

/**
 * POST /api/media
 * Authenticated
 * Uploads a photo or video, enforces constraints, processes photos via Sharp,
 * saves binary to media/, and records metadata in db.json.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Invalid form data payload' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No media file provided' }, { status: 400 });
    }

    const currentDb = await readDb();
    const validationError = validateMediaConstraints(
      { name: file.name, size: file.size },
      currentDb.media.length
    );

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const nextId = getNextMediaId(currentDb.media);
    const ext = getExtension(file.name);
    const filename = `${nextId}${ext}`;

    await mkdir(MEDIA_DIR, { recursive: true });
    const targetFilePath = resolve(MEDIA_DIR, filename);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let width: number | undefined;
    let height: number | undefined;

    if (!isVideo(file.name)) {
      try {
        const processed = await processPhotoBuffer(fileBuffer);
        await writeFile(targetFilePath, processed.buffer);
        width = processed.width;
        height = processed.height;
      } catch (sharpError) {
        console.error('[API /api/media POST] Sharp processing failed:', sharpError);
        return NextResponse.json(
          { error: 'Failed to process image file. The image may be corrupted.' },
          { status: 400 }
        );
      }
    } else {
      await writeFile(targetFilePath, fileBuffer);
    }

    const newRecord = {
      id: nextId,
      filename,
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
    };

    await updateDb((db) => ({
      ...db,
      media: [...db.media, newRecord],
    }));

    return NextResponse.json(
      {
        message: 'Media uploaded successfully',
        media: newRecord,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error, 'API /api/media POST');
  }
}
