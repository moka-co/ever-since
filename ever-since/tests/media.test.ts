import Module from 'node:module';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import sharp from 'sharp';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const origRequire = (Module.prototype as any).require;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Module.prototype as any).require = function (this: unknown, id: string, ...args: unknown[]) {
  if (id === 'server-only') {
    return {};
  }
  return origRequire.apply(this, [id, ...args]);
};

async function main() {
  const {
    validateMediaConstraints,
    getNextMediaId,
    getMediaKind,
    getMimeType,
    MAX_PHOTO_SIZE_BYTES,
    MAX_VIDEO_SIZE_BYTES,
  } = await import('../lib/media/validation');
  const { processPhotoBuffer } = await import('../lib/media/processor');
  const { MediaDatabaseClient } = await import('../lib/storage/media-db');
  const { createDefaultDb } = await import('../lib/storage/schema');

  const TEST_DB_PATH = resolve(process.cwd(), 'tests', 'fixtures', 'test-media-db.json');
  await mkdir(dirname(TEST_DB_PATH), { recursive: true });

  const initialSecret = { value: '12345678901234567890' };
  let failures = 0;

  function assert(condition: boolean, message: string) {
    if (!condition) {
      console.error(`FAIL: ${message}`);
      failures++;
    } else {
      console.log(`PASS: ${message}`);
    }
  }

  async function resetTestDb() {
    const defaultData = createDefaultDb(initialSecret);
    await writeFile(TEST_DB_PATH, JSON.stringify(defaultData, null, 2), 'utf8');
  }

  console.log('--- Starting Media Constraints & Operations Unit Tests (USE Convention & AAA Pattern) ---\n');

  // Test 1: Photo exceeds 10MB
  // USE: validateMediaConstraints (Unit), when photo size exceeds 10MB (Scenario), should reject with size constraint error (Expectation)
  {
    console.log('Test 1: validateMediaConstraints (Unit), when photo size exceeds 10MB (Scenario), should reject with size constraint error (Expectation)');

    // Arrange: Create simulated photo payload larger than 10MB
    const oversizedPhoto = {
      name: 'vacation.jpg',
      size: MAX_PHOTO_SIZE_BYTES + 1024,
      type: 'image/jpeg',
    };

    // Act: Run validation
    const result = validateMediaConstraints(oversizedPhoto, 5);

    // Assert: Check rejection
    assert(!result.valid, 'Oversized photo was rejected');
    assert(
      result.error?.includes('10MB') === true,
      `Error message mentions 10MB limit (got: "${result.error}")`
    );
  }

  // Test 2: Valid photo within 10MB
  // USE: validateMediaConstraints (Unit), when photo size is within 10MB (Scenario), should accept valid photo (Expectation)
  {
    console.log('\nTest 2: validateMediaConstraints (Unit), when photo size is within 10MB (Scenario), should accept valid photo (Expectation)');

    // Arrange: Create simulated photo payload of 5MB
    const validPhoto = {
      name: 'anniversary.png',
      size: 5 * 1024 * 1024,
      type: 'image/png',
    };

    // Act: Run validation
    const result = validateMediaConstraints(validPhoto, 2);

    // Assert: Check acceptance
    assert(result.valid === true, 'Photo within 10MB limit is accepted');
    assert(result.mediaKind === 'photo', 'Media kind correctly classified as photo');
  }

  // Test 3: Video within 50MB (and > 10MB)
  // USE: validateMediaConstraints (Unit), when video is between 10MB and 50MB (Scenario), should accept valid video (Expectation)
  {
    console.log('\nTest 3: validateMediaConstraints (Unit), when video is between 10MB and 50MB (Scenario), should accept valid video (Expectation)');

    // Arrange: Create video payload of 25MB (would exceed photo limit but allowed for video)
    const validVideo = {
      name: 'celebration.mp4',
      size: 25 * 1024 * 1024,
      type: 'video/mp4',
    };

    // Act: Run validation
    const result = validateMediaConstraints(validVideo, 0);

    // Assert: Check acceptance
    assert(result.valid === true, 'Video larger than 10MB but within 50MB limit is accepted');
    assert(result.mediaKind === 'video', 'Media kind correctly classified as video');
  }

  // Test 4: Video exceeds 50MB
  // USE: validateMediaConstraints (Unit), when video exceeds 50MB (Scenario), should reject with video size error (Expectation)
  {
    console.log('\nTest 4: validateMediaConstraints (Unit), when video exceeds 50MB (Scenario), should reject with video size error (Expectation)');

    // Arrange: Create video payload larger than 50MB
    const oversizedVideo = {
      name: 'trip_movie.mov',
      size: MAX_VIDEO_SIZE_BYTES + 5000,
      type: 'video/quicktime',
    };

    // Act: Run validation
    const result = validateMediaConstraints(oversizedVideo, 1);

    // Assert: Check rejection
    assert(!result.valid, 'Oversized video was rejected');
    assert(
      result.error?.includes('50MB') === true,
      `Error message mentions 50MB limit (got: "${result.error}")`
    );
  }

  // Test 5: Quota limit reached (20 files)
  // USE: validateMediaConstraints (Unit), when media count is 20 (Scenario), should reject with quota exceeded error (Expectation)
  {
    console.log('\nTest 5: validateMediaConstraints (Unit), when media count is 20 (Scenario), should reject with quota exceeded error (Expectation)');

    // Arrange: Small valid file but with currentCount at maximum 20
    const smallPhoto = {
      name: 'small.jpg',
      size: 100 * 1024,
      type: 'image/jpeg',
    };

    // Act: Run validation
    const result = validateMediaConstraints(smallPhoto, 20);

    // Assert: Check rejection
    assert(!result.valid, 'Upload was rejected when quota is reached');
    assert(
      result.error?.includes('quota exceeded') === true,
      `Error message mentions quota limit (got: "${result.error}")`
    );
  }

  // Test 6: Unsupported file format
  // USE: validateMediaConstraints (Unit), when unsupported file format is provided (Scenario), should reject with unsupported format error (Expectation)
  {
    console.log('\nTest 6: validateMediaConstraints (Unit), when unsupported file format is provided (Scenario), should reject with unsupported format error (Expectation)');

    // Arrange: Disallowed file format
    const unsupportedFile = {
      name: 'report.pdf',
      size: 50 * 1024,
      type: 'application/pdf',
    };

    // Act: Run validation
    const result = validateMediaConstraints(unsupportedFile, 0);

    // Assert: Check rejection
    assert(!result.valid, 'PDF file was rejected');
    assert(
      result.error?.includes('Unsupported file type') === true,
      `Error mentions unsupported format (got: "${result.error}")`
    );
  }

  // Test 7: Helper functions (getMediaKind, getNextMediaId, getMimeType)
  // USE: MediaHelperFunctions (Unit), when called with sample filenames (Scenario), should return expected kinds, MIME types, and IDs (Expectation)
  {
    console.log('\nTest 7: MediaHelperFunctions (Unit), when called with sample filenames (Scenario), should return expected kinds, MIME types, and IDs (Expectation)');

    // Arrange & Act & Assert
    assert(getMediaKind('photo.png') === 'photo', 'photo.png identified as photo');
    assert(getMediaKind('clip.webm') === 'video', 'clip.webm identified as video');
    assert(getMediaKind('script.sh') === 'unsupported', 'script.sh identified as unsupported');

    assert(getMimeType('1.jpg') === 'image/jpeg', '1.jpg mapped to image/jpeg');
    assert(getMimeType('2.mp4') === 'video/mp4', '2.mp4 mapped to video/mp4');

    const nextId1 = getNextMediaId([]);
    assert(nextId1 === '1', `Initial next media ID is 1 (got: ${nextId1})`);

    const nextId2 = getNextMediaId([{ id: '1' }, { id: '3' }, { id: '2' }]);
    assert(nextId2 === '4', `Next media ID after [1, 3, 2] is 4 (got: ${nextId2})`);
  }

  // Test 8: Sharp Photo Processing
  // USE: MediaProcessor (Unit), when processing an image buffer (Scenario), should strip EXIF and extract image dimensions using Sharp (Expectation)
  {
    console.log('\nTest 8: MediaProcessor (Unit), when processing an image buffer (Scenario), should strip EXIF and extract image dimensions using Sharp (Expectation)');

    // Arrange: Generate a raw 120x80 test PNG using Sharp
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

    // Act: Process buffer with processPhotoBuffer
    const processed = await processPhotoBuffer(rawPngBuffer);

    // Assert: Dimensions extracted correctly and buffer is valid
    assert(processed.width === 120, `Width accurately extracted (expected 120, got: ${processed.width})`);
    assert(processed.height === 80, `Height accurately extracted (expected 80, got: ${processed.height})`);
    assert(processed.buffer.length > 0, 'Processed buffer has non-zero size');
  }

  // Test 9: MediaDatabaseClient addMedia & deleteMedia
  // USE: MediaDatabaseClient (Unit), when addMedia and deleteMedia are invoked (Scenario), should persist metadata and reclaim quota via WriteQueue (Expectation)
  {
    console.log('\nTest 9: MediaDatabaseClient (Unit), when addMedia and deleteMedia are invoked (Scenario), should persist metadata and reclaim quota via WriteQueue (Expectation)');

    // Arrange: Initialize isolated test DB and child client
    await resetTestDb();
    const mediaClient = new MediaDatabaseClient(TEST_DB_PATH);

    // Act: Add media item
    const record = {
      id: '1',
      filename: '1.jpg',
      width: 1920,
      height: 1080,
    };
    await mediaClient.addMedia(record);

    // Assert: Verify addition
    const dbAfterAdd = await mediaClient.read();
    assert(dbAfterAdd.media.length === 1, 'Media array contains 1 record');
    assert(dbAfterAdd.media[0].id === '1', 'Record ID matches');
    assert(dbAfterAdd.media[0].filename === '1.jpg', 'Filename matches');

    // Act: Delete media item
    const { deleted, db: dbAfterDel } = await mediaClient.deleteMedia('1');

    // Assert: Verify deletion
    assert(deleted !== null && deleted.id === '1', 'Deleted record returned');
    assert(dbAfterDel.media.length === 0, 'Media array is empty after deletion');
  }

  // Test 10: MediaDatabaseClient 20 files quota schema enforcement
  // USE: MediaDatabaseClient (Unit), when 20 media items exist and another is added (Scenario), should reject via Zod schema enforcement (Expectation)
  {
    console.log('\nTest 10: MediaDatabaseClient (Unit), when 20 media items exist and another is added (Scenario), should reject via Zod schema enforcement (Expectation)');

    // Arrange: Populate database with exactly 20 items
    await resetTestDb();
    const mediaClient = new MediaDatabaseClient(TEST_DB_PATH);

    for (let i = 1; i <= 20; i++) {
      await mediaClient.addMedia({
        id: String(i),
        filename: `${i}.jpg`,
      });
    }

    const current20 = await mediaClient.read();
    assert(current20.media.length === 20, 'Successfully populated 20 media items');

    // Act: Attempt to add 21st item
    let threw = false;
    try {
      await mediaClient.addMedia({
        id: '21',
        filename: '21.jpg',
      });
    } catch {
      threw = true;
    }

    // Assert: Enforced schema violation
    assert(threw, 'Zod schema threw error on 21st media addition');
    const finalDb = await mediaClient.read();
    assert(finalDb.media.length === 20, 'Database remains strictly at 20 items');
  }

  // Cleanup test fixture
  await unlink(TEST_DB_PATH).catch(() => {});

  console.log(`\n--- Media Tests Finished: ${failures === 0 ? 'ALL TESTS PASSED' : `${failures} FAILURES`} ---`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
