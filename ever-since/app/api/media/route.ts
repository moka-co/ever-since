import { NextResponse, type NextRequest } from 'next/server';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { mediaDbClient } from '@/lib/storage/media-db';
import {
  validateMediaConstraints,
  getNextMediaId,
  MAX_MEDIA_COUNT,
} from '@/lib/media/validation';
import { processPhotoBuffer } from '@/lib/media/processor';

const MEDIA_DIR = resolve(process.cwd(), 'media');

/**
 * GET /api/media
 * Authenticated
 * Returns the media library and current quota inspection.
 */
export async function GET() {
  try {
    const db = await mediaDbClient.read();
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
    console.error('[API /api/media GET] Failed to fetch media:', error);
    return NextResponse.json({ error: 'Failed to retrieve media library' }, { status: 500 });
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

    // Inspect existing media count for quota
    const currentDb = await mediaDbClient.read();
    const validation = validateMediaConstraints(
      {
        name: file.name,
        size: file.size,
        type: file.type,
      },
      currentDb.media.length
    );

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Prepare ID and target filename
    const nextId = getNextMediaId(currentDb.media);
    const rawExt = extname(file.name).toLowerCase();
    const ext = rawExt || (validation.mediaKind === 'photo' ? '.jpg' : '.mp4');
    const filename = `${nextId}${ext}`;

    // Ensure target media directory exists
    await mkdir(MEDIA_DIR, { recursive: true });
    const targetFilePath = resolve(MEDIA_DIR, filename);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let width: number | undefined;
    let height: number | undefined;

    if (validation.mediaKind === 'photo') {
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
      // Save video buffer directly
      await writeFile(targetFilePath, fileBuffer);
    }

    // Commit metadata to database via child client
    const newRecord = {
      id: nextId,
      filename,
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
    };

    const updatedDb = await mediaDbClient.addMedia(newRecord);
    const used = updatedDb.media.length;

    return NextResponse.json(
      {
        message: 'Media uploaded successfully',
        media: newRecord,
        quota: {
          total: MAX_MEDIA_COUNT,
          used,
          remaining: Math.max(0, MAX_MEDIA_COUNT - used),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API /api/media POST] Upload failed:', error);
    return NextResponse.json({ error: 'Server error uploading media file' }, { status: 500 });
  }
}
