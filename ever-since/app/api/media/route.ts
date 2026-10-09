import { NextResponse, type NextRequest } from 'next/server';
import { mkdir } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { readDb, updateDb } from '@/lib/storage/db';
import {
  validateMediaConstraints,
  getExtension,
  isVideo,
  MEDIA_DIR,
  MAX_MEDIA_COUNT,
} from '@/lib/media/validation';
import { processPhotoBuffer, writeMediaFile } from '@/lib/media/processor';
import { reconcileMediaLibrary, UUID_REGEX } from '@/lib/media/sync';
import { errorResponse } from '@/lib/api';
import { logger } from '@/lib/logger';

/**
 * GET /api/media
 * Authenticated
 * Reconciles filesystem files with db.json, returns the media library and current quota.
 */
export async function GET() {
  try {
    const media = await reconcileMediaLibrary();
    const used = media.length;

    return NextResponse.json(
      {
        media,
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
 * Uploads a photo or video without unnecessary renaming, processes photos via Sharp,
 * saves binary to media/, and records metadata in db.json.
 */
export async function POST(request: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError: unknown) {
      const parseMessage = parseError instanceof Error ? parseError.message : String(parseError);
      logger.error(
        { event: 'media_form_data_parse_failed', error: parseMessage },
        `Failed to parse multipart form data: ${parseMessage}`
      );
      return NextResponse.json(
        {
          error:
            'Failed to parse uploaded file. Please ensure the file is a valid photo (up to 10MB) or video (up to 50MB).',
        },
        { status: 400 }
      );
    }

    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No media file provided' }, { status: 400 });
    }

    const currentDb = await readDb();

    // Check if a media record with this exact filename is already available
    const existingRecord = currentDb.media.find(
      (m) => m.filename.toLowerCase() === file.name.toLowerCase()
    );
    if (existingRecord) {
      return NextResponse.json(
        {
          message: 'Media already available',
          media: existingRecord,
        },
        { status: 200 }
      );
    }

    const validationError = validateMediaConstraints(
      { name: file.name, size: file.size },
      currentDb.media.length
    );

    if (validationError) {
      logger.warn(
        {
          event: 'media_validation_failed',
          filename: file.name,
          size: file.size,
          error: validationError,
        },
        `Media validation failed: ${validationError}`
      );
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    logger.info(
      {
        event: 'media_validation_passed',
        filename: file.name,
        size: file.size,
      },
      `Media validation passed for ${file.name}`
    );

    // Preserve original filename, sanitizing directory separators
    const cleanBasename = basename(file.name).replace(/[^\w\d._-]/g, '_');
    const ext = getExtension(cleanBasename);
    const nameWithoutExt = cleanBasename.slice(0, cleanBasename.length - ext.length);

    let filename = cleanBasename;
    // Handle collision if file already exists in db or on disk
    if (currentDb.media.some((m) => m.filename.toLowerCase() === filename.toLowerCase())) {
      filename = `${nameWithoutExt}-${Date.now()}${ext}`;
    }

    // Determine ID: follow UUID structure (or use filename's UUID if present)
    const id = UUID_REGEX.test(nameWithoutExt)
      ? nameWithoutExt.toLowerCase()
      : randomUUID();

    await mkdir(MEDIA_DIR, { recursive: true });
    const targetFilePath = resolve(MEDIA_DIR, filename);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let width: number | undefined;
    let height: number | undefined;

    if (!isVideo(filename)) {
      try {
        const processed = await processPhotoBuffer(fileBuffer);
        await writeMediaFile(targetFilePath, processed.buffer, { id, filename, type: 'photo' });
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
      await writeMediaFile(targetFilePath, fileBuffer, { id, filename, type: 'video' });
    }

    const newRecord = {
      id,
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
