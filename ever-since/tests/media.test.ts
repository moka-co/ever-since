import { useTempDb, TestHarness } from './helpers';
import sharp from 'sharp';
import { NextRequest } from 'next/server';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function main() {
  const harness = new TestHarness();
  const temp = await useTempDb('12345678901234567890');

  try {
    const {
      validateMediaConstraints,
      getNextMediaId,
      isVideo,
      getMimeType,
      MAX_PHOTO_SIZE_BYTES,
      MAX_VIDEO_SIZE_BYTES,
    } = await import('../lib/media/validation');
    const { processPhotoBuffer } = await import('../lib/media/processor');
    const { readDb, updateDb } = await import('../lib/storage/db');

    console.log('--- Starting Media Constraints & Operations Unit Tests (USE Convention & AAA Pattern) ---\n');

    // Test 1: Photo exceeds 10MB
    {
      console.log('Test 1: validateMediaConstraints (Unit), when photo size exceeds 10MB (Scenario), should reject with size constraint error (Expectation)');
      const oversizedPhoto = {
        name: 'vacation.jpg',
        size: MAX_PHOTO_SIZE_BYTES + 1024,
      };
      const error = validateMediaConstraints(oversizedPhoto, 5);
      harness.assert(error !== null, 'Oversized photo was rejected');
      harness.assert(
        error?.includes('10MB') === true,
        `Error message mentions 10MB limit (got: "${error}")`
      );
    }

    // Test 2: Valid photo within 10MB
    {
      console.log('\nTest 2: validateMediaConstraints (Unit), when photo size is within 10MB (Scenario), should accept valid photo (Expectation)');
      const validPhoto = {
        name: 'anniversary.png',
        size: 5 * 1024 * 1024,
      };
      const error = validateMediaConstraints(validPhoto, 2);
      harness.assert(error === null, 'Photo within 10MB limit is accepted');
    }

    // Test 3: Video within 50MB (and > 10MB)
    {
      console.log('\nTest 3: validateMediaConstraints (Unit), when video is between 10MB and 50MB (Scenario), should accept valid video (Expectation)');
      const validVideo = {
        name: 'celebration.mp4',
        size: 25 * 1024 * 1024,
      };
      const error = validateMediaConstraints(validVideo, 0);
      harness.assert(error === null, 'Video larger than 10MB but within 50MB limit is accepted');
      harness.assert(isVideo('celebration.mp4') === true, 'Media kind correctly classified as video');
    }

    // Test 4: Video exceeds 50MB
    {
      console.log('\nTest 4: validateMediaConstraints (Unit), when video exceeds 50MB (Scenario), should reject with video size error (Expectation)');
      const oversizedVideo = {
        name: 'trip_movie.mov',
        size: MAX_VIDEO_SIZE_BYTES + 5000,
      };
      const error = validateMediaConstraints(oversizedVideo, 1);
      harness.assert(error !== null, 'Oversized video was rejected');
      harness.assert(
        error?.includes('50MB') === true,
        `Error message mentions 50MB limit (got: "${error}")`
      );
    }

    // Test 5: Quota limit reached (50 files)
    {
      console.log('\nTest 5: validateMediaConstraints (Unit), when media count is 50 (Scenario), should reject with quota exceeded error (Expectation)');
      const smallPhoto = {
        name: 'small.jpg',
        size: 100 * 1024,
      };
      const error = validateMediaConstraints(smallPhoto, 50);
      harness.assert(error !== null, 'Upload was rejected when quota is reached');
      harness.assert(
        error?.includes('quota exceeded') === true,
        `Error message mentions quota limit (got: "${error}")`
      );
    }

    // Test 6: Unsupported file format
    {
      console.log('\nTest 6: validateMediaConstraints (Unit), when unsupported file format is provided (Scenario), should reject with unsupported format error (Expectation)');
      const unsupportedFile = {
        name: 'report.pdf',
        size: 50 * 1024,
      };
      const error = validateMediaConstraints(unsupportedFile, 0);
      harness.assert(error !== null, 'PDF file was rejected');
      harness.assert(
        error?.includes('Unsupported file type') === true,
        `Error mentions unsupported format (got: "${error}")`
      );
    }

    // Test 7: Helper functions
    {
      console.log('\nTest 7: MediaHelperFunctions (Unit), when called with sample filenames (Scenario), should return expected kinds, MIME types, and IDs (Expectation)');
      harness.assert(isVideo('photo.png') === false, 'photo.png identified as photo');
      harness.assert(isVideo('clip.webm') === true, 'clip.webm identified as video');
      harness.assert(isVideo('video.mov') === true, 'video.mov identified as video');

      harness.assert(getMimeType('1.jpg') === 'image/jpeg', '1.jpg mapped to image/jpeg');
      harness.assert(getMimeType('2.mp4') === 'video/mp4', '2.mp4 mapped to video/mp4');

      const nextId1 = getNextMediaId([]);
      harness.assert(nextId1 === '1', `Initial next media ID is 1 (got: ${nextId1})`);

      const nextId2 = getNextMediaId([{ id: '1' }, { id: '3' }, { id: '2' }]);
      harness.assert(nextId2 === '4', `Next media ID after [1, 3, 2] is 4 (got: ${nextId2})`);
    }

    // Test 8: Sharp Photo Processing
    {
      console.log('\nTest 8: MediaProcessor (Unit), when processing an image buffer (Scenario), should strip EXIF and extract image dimensions using Sharp (Expectation)');
      const rawPngBuffer = await sharp({
        create: {
          width: 120,
          height: 80,
          channels: 3,
          background: { r: 255, g: 100, b: 50 },
        },
      })
        .png()
        .toBuffer();

      const processed = await processPhotoBuffer(rawPngBuffer);
      harness.assert(processed.width === 120, `Width accurately extracted (expected 120, got: ${processed.width})`);
      harness.assert(processed.height === 80, `Height accurately extracted (expected 80, got: ${processed.height})`);
      harness.assert(processed.buffer.length > 0, 'Processed buffer has non-zero size');
    }

    // Test 9: Media API Upload, Serve, and Delete route integration
    {
      console.log('\nTest 9: Media Routes POST, GET, DELETE integration using public test photo');
      const { POST: postMedia, GET: getMedia } = await import('../app/api/media/route');
      const { GET: getMediaById, DELETE: deleteMediaById } = await import('../app/api/media/[id]/route');

      // 1. Upload via POST using public test photo
      const testPhotoPath = join(process.cwd(), 'public', 'e9d4a14432afcc3f2f8e21cb5608cf14.jpg');
      const testPhotoBuffer = await readFile(testPhotoPath);

      const formData = new FormData();
      formData.append(
        'file',
        new File([testPhotoBuffer], 'e9d4a14432afcc3f2f8e21cb5608cf14.jpg', { type: 'image/jpeg' })
      );

      const postReq = new NextRequest('http://localhost:3000/api/media', {
        method: 'POST',
        body: formData,
      });

      const postRes = await postMedia(postReq);
      harness.assert(postRes.status === 201, `POST /api/media returned 201 (got ${postRes.status})`);
      const postData = await postRes.json();
      const uploadedId = postData.media.id;
      harness.assert(Boolean(uploadedId), 'Uploaded ID exists');
      harness.assert(
        postData.media.filename === 'e9d4a14432afcc3f2f8e21cb5608cf14.jpg',
        'Original filename is preserved without unnecessary renaming'
      );

      // 2. Fetch via GET list
      const listRes = await getMedia();
      const listData = await listRes.json();
      harness.assert(listData.media.length === 1, 'Media list now contains 1 item');
      harness.assert(listData.media[0].filename === 'e9d4a14432afcc3f2f8e21cb5608cf14.jpg', 'Media list entry has original filename');

      // 3. Serve via GET [id]
      const serveRes = await getMediaById(new Request(`http://localhost:3000/api/media/${uploadedId}`), {
        params: Promise.resolve({ id: uploadedId }),
      });
      harness.assert(serveRes.status === 200, `GET /api/media/[id] served successfully (got ${serveRes.status})`);

      // 4. Delete via DELETE [id]
      const deleteRes = await deleteMediaById(new Request(`http://localhost:3000/api/media/${uploadedId}`), {
        params: Promise.resolve({ id: uploadedId }),
      });
      harness.assert(deleteRes.status === 200, 'DELETE /api/media/[id] returned 200');

      const afterDeleteDb = await readDb();
      harness.assert(afterDeleteDb.media.length === 0, 'Media list empty after delete');
    }

    // Test 10: Path traversal prevention
    {
      console.log('\nTest 10: Path traversal prevention on GET /api/media/[id]');
      const { GET: getMediaById } = await import('../app/api/media/[id]/route');

      const traversalRes = await getMediaById(new Request('http://localhost:3000/api/media/..%2Fdata%2Fdb.json'), {
        params: Promise.resolve({ id: '../data/db.json' }),
      });
      harness.assert(traversalRes.status === 404, `Traversal request returns 404 (got ${traversalRes.status})`);
    }

    // Test 11: Max 50 media quota schema enforcement
    {
      console.log('\nTest 11: Schema validation enforces max 50 media records limit');

      for (let i = 1; i <= 50; i++) {
        await updateDb((current) => ({
          ...current,
          media: [
            ...current.media,
            { id: String(i), filename: `${i}.png` },
          ],
        }));
      }

      let threw = false;
      try {
        await updateDb((current) => ({
          ...current,
          media: [
            ...current.media,
            { id: '51', filename: '51.png' },
          ],
        }));
      } catch {
        threw = true;
      }

      harness.assert(threw, 'Zod schema threw error on 51st media addition');
      const finalDb = await readDb();
      harness.assert(finalDb.media.length === 50, 'Database remains strictly at 50 items');
    }

    // Test 12: Filesystem upload to media/ and reconciliation discovery
    {
      console.log('\nTest 12: Direct filesystem upload to media/ folder and automatic reconciliation');
      const { GET: getMedia, POST: postMedia } = await import('../app/api/media/route');

      // Reset db media array to empty
      await updateDb((current) => ({ ...current, media: [] }));

      // Directly write a file into temp.mediaDir on disk
      const diskFilename = '03a27da4-bbe2-4790-b32b-e70f601032e6.jpg';
      const diskTarget = join(temp.mediaDir, diskFilename);
      const testPhotoPath = join(process.cwd(), 'public', 'e9d4a14432afcc3f2f8e21cb5608cf14.jpg');
      const photoBuffer = await readFile(testPhotoPath);
      await writeFile(diskTarget, photoBuffer);

      // Trigger reconciliation via GET /api/media
      const getRes = await getMedia();
      harness.assert(getRes.status === 200, 'GET /api/media returns 200');
      const getData = await getRes.json();
      harness.assert(getData.media.length === 1, 'Reconciliation discovered 1 file from filesystem');

      const item = getData.media[0];
      harness.assert(item.filename === diskFilename, `Filename is preserved: ${item.filename}`);
      harness.assert(
        item.id === '03a27da4-bbe2-4790-b32b-e70f601032e6',
        `ID matches UUID structure from filename: ${item.id}`
      );
      harness.assert(typeof item.width === 'number' && item.width > 0, 'Image width was extracted by Sharp');
      harness.assert(typeof item.height === 'number' && item.height > 0, 'Image height was extracted by Sharp');

      // Test 13: Uploading a file that already exists uses existing record
      console.log('\nTest 13: Uploading existing file uses already available media record');
      const formData = new FormData();
      formData.append(
        'file',
        new File([photoBuffer], diskFilename, { type: 'image/jpeg' })
      );
      const postReq = new NextRequest('http://localhost:3000/api/media', {
        method: 'POST',
        body: formData,
      });
      const postRes = await postMedia(postReq);
      harness.assert(postRes.status === 200, 'POST returned 200 for already available media');
      const postData = await postRes.json();
      harness.assert(postData.media.id === item.id, 'Returns existing media record');
    }

    harness.finish('Media Constraints & Operations');
  } finally {
    await temp.cleanup();
  }
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
