import { runTestSuite } from './helpers';
import sharp from 'sharp';
import { NextRequest } from 'next/server';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

runTestSuite('Media Constraints & Operations', async ({ harness, temp }) => {
    const validationModule = await import('../lib/media/validation');
    const {
      validateMediaConstraints,
      isVideo,
      getMimeType,
      MAX_PHOTO_SIZE_BYTES,
      MAX_VIDEO_SIZE_BYTES,
    } = validationModule;
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

    // Test 7: Helper functions & legacy media ID compatibility
    {
      console.log('\nTest 7: MediaHelperFunctions (Unit), when called with sample filenames (Scenario), should return expected kinds and MIME types without obsolete numeric ID generator (Expectation)');
      harness.assert(isVideo('photo.png') === false, 'photo.png identified as photo');
      harness.assert(isVideo('clip.webm') === true, 'clip.webm identified as video');
      harness.assert(isVideo('video.mov') === true, 'video.mov identified as video');

      harness.assert(getMimeType('1.jpg') === 'image/jpeg', '1.jpg mapped to image/jpeg');
      harness.assert(getMimeType('2.mp4') === 'video/mp4', '2.mp4 mapped to video/mp4');
      harness.assert(
        !('getNextMediaId' in validationModule),
        'Obsolete getNextMediaId numeric ID generator is removed'
      );

      await updateDb((current) => ({
        ...current,
        media: [{ id: '1', filename: '1.jpg' }],
      }));
      const dbWithLegacyId = await readDb();
      harness.assert(
        dbWithLegacyId.media.length === 1 && dbWithLegacyId.media[0].id === '1',
        'Existing numeric media IDs in db.json remain compatible'
      );
      await updateDb((current) => ({ ...current, media: [] }));
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
      harness.assert(serveRes.headers.get('accept-ranges') === 'bytes', 'Response includes Accept-Ranges: bytes');
      const etag = serveRes.headers.get('etag');
      harness.assert(Boolean(etag), 'Response includes an ETag header');

      // Test 3a. Range request support (206 Partial Content)
      const rangeRes = await getMediaById(new Request(`http://localhost:3000/api/media/${uploadedId}`, {
        headers: { range: 'bytes=0-9' },
      }), {
        params: Promise.resolve({ id: uploadedId }),
      });
      harness.assert(rangeRes.status === 206, `Range request returns 206 Partial Content (got ${rangeRes.status})`);
      harness.assert(Boolean(rangeRes.headers.get('content-range')?.startsWith('bytes 0-9/')), 'Response includes Content-Range header');
      harness.assert(rangeRes.headers.get('content-length') === '10', 'Chunk length matches requested 10 bytes');

      // Test 3b. Conditional request (304 Not Modified)
      if (etag) {
        const notModifiedRes = await getMediaById(new Request(`http://localhost:3000/api/media/${uploadedId}`, {
          headers: { 'if-none-match': etag },
        }), {
          params: Promise.resolve({ id: uploadedId }),
        });
        harness.assert(notModifiedRes.status === 304, `If-None-Match with matching ETag returns 304 (got ${notModifiedRes.status})`);
      }

      // Test 3c. Unsatisfiable range (416)
      const invalidRangeRes = await getMediaById(new Request(`http://localhost:3000/api/media/${uploadedId}`, {
        headers: { range: 'bytes=99999999-999999999' },
      }), {
        params: Promise.resolve({ id: uploadedId }),
      });
      harness.assert(invalidRangeRes.status === 416, `Out of bounds range returns 416 (got ${invalidRangeRes.status})`);

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
      // Test 14: POST /api/media allows video uploads
      console.log('\nTest 14: Uploading video via POST /api/media succeeds and stores video');
      const fakeVideoBuffer = Buffer.from('fake mp4 video stream bytes for testing');
      const videoFormData = new FormData();
      videoFormData.append(
        'file',
        new File([fakeVideoBuffer], 'memory-video.mp4', { type: 'video/mp4' })
      );
      const postVideoReq = new NextRequest('http://localhost:3000/api/media', {
        method: 'POST',
        body: videoFormData,
      });
      const postVideoRes = await postMedia(postVideoReq);
      harness.assert(postVideoRes.status === 201, `POST /api/media with video returned 201 (got ${postVideoRes.status})`);
      const postVideoData = await postVideoRes.json();
      harness.assert(postVideoData.media.filename === 'memory-video.mp4', 'Uploaded video preserves original filename');
      const videoDb = await readDb();
      harness.assert(videoDb.media.some((m) => m.filename === 'memory-video.mp4'), 'Video record is saved in database');

      // Test 15: Shared dashboard MediaUploadController (library upload, inline upload, existing file, full quota, input reset)
      console.log('\nTest 15: Shared dashboard MediaUploadController (library upload, inline upload, existing file, full quota, input reset)');
      const {
        MediaUploadController,
        appendUniqueMedia,
        NO_MEDIA_FILE_ERROR,
        UPLOAD_NETWORK_ERROR,
      } = await import('../app/customize/use-media-upload');

      let fetchCalls = 0;
      const routeFetch: typeof fetch = async (_input, init) => {
        fetchCalls += 1;
        const req = new NextRequest('http://localhost:3000/api/media', {
          method: init?.method || 'POST',
          body: init?.body as BodyInit,
        });
        return await postMedia(req);
      };

      // A) Library upload outcome (adds to library, sets success message, refreshes, resets input)
      let libraryList = (await readDb()).media;
      let librarySuccessMsg: string | null = null;
      let libraryRefreshes = 0;
      const libraryInput = { value: 'C:\\fakepath\\library-upload.jpg' };

      const libraryUploader = new MediaUploadController({
        fetchImpl: routeFetch,
        onRefresh: () => {
          libraryRefreshes += 1;
        },
        onSuccess: (media) => {
          libraryList = appendUniqueMedia(libraryList, media);
          librarySuccessMsg = `Successfully uploaded ${media.filename}`;
        },
      });

      const libraryFile = new File([photoBuffer], 'library-upload.jpg', {
        type: 'image/jpeg',
      });
      const uploadedLibMedia = await libraryUploader.uploadFile(
        libraryFile,
        libraryList.length,
        libraryInput
      );
      harness.assert(
        uploadedLibMedia !== null && uploadedLibMedia.filename === 'library-upload.jpg',
        'Library upload returns uploaded MediaRecord'
      );
      harness.assert(
        libraryList.some((m) => m.id === uploadedLibMedia?.id),
        'Library upload adds new item to library list'
      );
      harness.assert(
        librarySuccessMsg === 'Successfully uploaded library-upload.jpg',
        'Library upload sets success message'
      );
      harness.assert(libraryRefreshes === 1, 'Library upload triggers router refresh');
      harness.assert(libraryInput.value === '', 'Library upload resets file input value');

      // B) Inline upload outcome (adds to session list, auto-selects mediaId, refreshes, resets input)
      let sessionList: typeof libraryList = [];
      let selectedMediaId = '';
      let inlineErrorMsg: string | null = null;
      let inlineRefreshes = 0;
      const inlineInput = { value: 'C:\\fakepath\\inline-upload.jpg' };

      const inlineUploader = new MediaUploadController({
        fetchImpl: routeFetch,
        onRefresh: () => {
          inlineRefreshes += 1;
        },
        onSuccess: (media) => {
          sessionList = appendUniqueMedia(sessionList, media);
          selectedMediaId = media.id;
        },
        onError: (err) => {
          inlineErrorMsg = err;
        },
      });

      const inlineFile = new File([photoBuffer], 'inline-upload.jpg', {
        type: 'image/jpeg',
      });
      const uploadedInlineMedia = await inlineUploader.uploadFile(
        inlineFile,
        libraryList.length,
        inlineInput
      );
      harness.assert(
        uploadedInlineMedia !== null && selectedMediaId === uploadedInlineMedia.id,
        'Inline upload automatically selects newly uploaded media ID'
      );
      harness.assert(
        sessionList.length === 1 && sessionList[0].id === uploadedInlineMedia?.id,
        'Inline upload adds media to session list'
      );
      harness.assert(inlineRefreshes === 1, 'Inline upload triggers router refresh');
      harness.assert(inlineInput.value === '', 'Inline upload resets file input value');

      // C) Existing file upload (returns existing record without duplicating in list, selects it on inline upload)
      const countBeforeExisting = libraryList.length;
      const existingInput = { value: 'C:\\fakepath\\library-upload.jpg' };
      const existingMediaResult = await libraryUploader.uploadFile(
        libraryFile,
        libraryList.length,
        existingInput
      );
      harness.assert(
        existingMediaResult !== null && existingMediaResult.id === uploadedLibMedia?.id,
        'Uploading existing file returns the existing MediaRecord'
      );
      harness.assert(
        libraryList.length === countBeforeExisting,
        'Uploading existing file does not duplicate entry in library list'
      );
      harness.assert(
        existingInput.value === '',
        'Uploading existing file still resets file input value'
      );

      // D) Full quota (50 items) uses consistent validateMediaConstraints message and resets input without calling fetch
      const callsBeforeQuota = fetchCalls;
      const quotaInput = { value: 'C:\\fakepath\\overflow.jpg' };
      const quotaResult = await inlineUploader.uploadFile(
        new File([photoBuffer], 'overflow.jpg', { type: 'image/jpeg' }),
        50,
        quotaInput
      );
      const expectedQuotaError = validateMediaConstraints(
        { name: 'overflow.jpg', size: photoBuffer.length },
        50
      );
      harness.assert(quotaResult === null, 'Full quota upload returns null');
      harness.assert(
        fetchCalls === callsBeforeQuota,
        'Full quota upload is blocked before calling POST /api/media'
      );
      harness.assert(
        inlineUploader.getState().errorMessage === expectedQuotaError &&
          inlineErrorMsg === expectedQuotaError,
        'Full quota uses consistent validateMediaConstraints error copy'
      );
      harness.assert(
        quotaInput.value === '',
        'Full quota validation failure resets file input value'
      );

      // E) Missing file & network error reset input and report consistent errors
      const missingFileResult = await libraryUploader.uploadFile(undefined, 1);
      harness.assert(
        missingFileResult === null &&
          libraryUploader.getState().errorMessage === NO_MEDIA_FILE_ERROR,
        'Missing file sets NO_MEDIA_FILE_ERROR'
      );

      const netFailInput = { value: 'C:\\fakepath\\netfail.jpg' };
      const netFailUploader = new MediaUploadController({
        fetchImpl: async () => {
          throw new Error('Network down');
        },
      });
      const netFailResult = await netFailUploader.uploadFile(
        libraryFile,
        1,
        netFailInput
      );
      harness.assert(
        netFailResult === null &&
          netFailUploader.getState().errorMessage === UPLOAD_NETWORK_ERROR &&
          netFailInput.value === '',
        'Network failure sets UPLOAD_NETWORK_ERROR and resets file input'
      );

      // Test 16: Concurrent POST /api/media serializes quota checks and existing-file lookup inside updateDb
      console.log('\nTest 16: Concurrent POST /api/media serializes quota checks and existing-file lookup inside updateDb');
      const fillerMedia = Array.from({ length: 49 }, (_, idx) => ({
        id: `fill-${idx + 1}`,
        filename: `fill-${idx + 1}.jpg`,
      }));
      await updateDb((current) => ({
        ...current,
        media: fillerMedia,
      }));

      const formA = new FormData();
      formA.append('file', new File([photoBuffer], 'concurrent-a.jpg', { type: 'image/jpeg' }));
      const formB = new FormData();
      formB.append('file', new File([photoBuffer], 'concurrent-b.jpg', { type: 'image/jpeg' }));

      const [concResA, concResB] = await Promise.all([
        postMedia(new NextRequest('http://localhost:3000/api/media', { method: 'POST', body: formA })),
        postMedia(new NextRequest('http://localhost:3000/api/media', { method: 'POST', body: formB })),
      ]);
      const concStatuses = [concResA.status, concResB.status].sort();
      harness.assert(
        concStatuses[0] === 201 && concStatuses[1] === 400,
        `Concurrent POST /api/media at 49/50 accepted one (201) and rejected one (400), got ${concStatuses.join(', ')}`
      );
      const rejectedMediaRes = concResA.status === 400 ? concResA : concResB;
      const rejectedMediaData = await rejectedMediaRes.json();
      harness.assert(
        rejectedMediaData.error === expectedQuotaError,
        `Concurrent rejected media POST used validateMediaConstraints quota error (got "${rejectedMediaData.error}")`
      );
      const dbAfterConcurrentMedia = await readDb();
      harness.assert(
        dbAfterConcurrentMedia.media.length === 50,
        `Database media count remained strictly 50 after concurrent POSTs`
      );

      // Test 17: Shared MediaThumbnail descriptor (JPG, GIF, MP4, MOV, OGG exclusion, muted previews, single playbackRate, newly uploaded media)
      console.log('\nTest 17: Shared MediaThumbnail (JPG, GIF, MP4, MOV, muted previews, single playbackRate, newly uploaded media)');
      const {
        getMediaThumbnailProps,
        applyThumbnailPlaybackRate,
        THUMBNAIL_VIDEO_PLAYBACK_RATE,
      } = await import('../app/customize/media-thumbnail');

      // 1. JPG and GIF are classified as photos via isVideo
      const jpgThumb = getMediaThumbnailProps({ filename: 'anniversary.jpg' });
      const gifThumb = getMediaThumbnailProps({
        filename: 'celebration.GIF',
        mediaPositionX: 30,
        mediaPositionY: 70,
        mediaScale: 1.4,
      });
      harness.assert(
        jpgThumb.kind === 'photo' &&
          jpgThumb.badgeText === null &&
          jpgThumb.url === '/api/media/anniversary.jpg',
        'JPG file resolves to photo thumbnail without video badge'
      );
      harness.assert(
        gifThumb.kind === 'photo' &&
          gifThumb.badgeText === null &&
          gifThumb.url === '/api/media/celebration.GIF' &&
          gifThumb.imageStyle?.objectPosition === '30% 70%' &&
          gifThumb.imageStyle?.transform === 'scale(1.4)',
        'GIF file resolves to photo thumbnail with custom framing style'
      );

      // 2. MP4 and MOV are classified as videos via isVideo; OGG is not treated as video
      const mp4Thumb = getMediaThumbnailProps({ filename: 'dance.mp4', size: 'fill' });
      const movThumb = getMediaThumbnailProps({ filename: 'toast.MOV', size: 'sm' });
      const oggThumb = getMediaThumbnailProps({ filename: 'clip.ogg' });
      harness.assert(
        mp4Thumb.kind === 'video' &&
          mp4Thumb.badgeText === 'Video' &&
          mp4Thumb.sizeClass === 'w-full h-full' &&
          mp4Thumb.url === '/api/media/dance.mp4',
        'MP4 file resolves to full video thumbnail with "Video" badge'
      );
      harness.assert(
        movThumb.kind === 'video' &&
          movThumb.badgeText === 'Vid' &&
          movThumb.sizeClass === 'w-16 h-16' &&
          movThumb.url === '/api/media/toast.MOV',
        'MOV file in compact sm size resolves to video thumbnail with "Vid" badge and w-16 h-16 size'
      );
      harness.assert(
        oggThumb.kind === 'photo' && !isVideo('clip.ogg'),
        'Unsupported OGG extension is not misclassified as video'
      );

      // 3. Muted previews and single 1.5x playback speed assignment
      harness.assert(
        mp4Thumb.muted === true &&
          mp4Thumb.autoPlay === true &&
          mp4Thumb.loop === true &&
          mp4Thumb.playsInline === true &&
          mp4Thumb.playbackRate === THUMBNAIL_VIDEO_PLAYBACK_RATE &&
          THUMBNAIL_VIDEO_PLAYBACK_RATE === 1.5,
        'Video thumbnails are muted, looping, inline, and configured for 1.5x playback speed'
      );
      let playbackRateWrites = 0;
      let currentPlaybackRate = 1.0;
      const mockVideoEl = {
        get playbackRate() {
          return currentPlaybackRate;
        },
        set playbackRate(val: number) {
          playbackRateWrites += 1;
          currentPlaybackRate = val;
        },
      };
      applyThumbnailPlaybackRate(mockVideoEl);
      harness.assert(
        playbackRateWrites === 1 && currentPlaybackRate === 1.5,
        'applyThumbnailPlaybackRate sets playbackRate to 1.5 exactly once per event'
      );

      // 4. Newly uploaded media (with version cache-buster in MediaManager and direct filename in MediaPicker / MemoriesManager)
      await updateDb((current) => ({ ...current, media: [] }));
      const newUploadMedia = await inlineUploader.uploadFile(
        new File([fakeVideoBuffer], 'newly-uploaded.mov', { type: 'video/quicktime' }),
        0
      );
      harness.assert(
        newUploadMedia !== null && newUploadMedia.filename === 'newly-uploaded.mov',
        'Newly uploaded MOV file succeeded'
      );
      const uploadVersion = 1760000000000;
      const libraryNewThumb = getMediaThumbnailProps({
        filename: newUploadMedia!.filename,
        version: uploadVersion,
      });
      const pickerNewThumb = getMediaThumbnailProps({
        filename: newUploadMedia!.filename,
      });
      harness.assert(
        libraryNewThumb.kind === 'video' &&
          libraryNewThumb.muted === true &&
          libraryNewThumb.url === `/api/media/newly-uploaded.mov?t=${uploadVersion}`,
        'Newly uploaded media in library includes cache-busting version query in URL'
      );
      harness.assert(
        pickerNewThumb.kind === 'video' &&
          pickerNewThumb.muted === true &&
          pickerNewThumb.url === '/api/media/newly-uploaded.mov',
        'Newly uploaded media in picker/memories list resolves clean URL and muted video preview'
      );

      // Test 18: Single-pass partitionMediaLibrary and Set-based collectUsedMediaIds
      console.log('\nTest 18: Single-pass partitionMediaLibrary and Set-based collectUsedMediaIds');
      const { partitionMediaLibrary, collectUsedMediaIds } = await import(
        '../app/customize/media-manager'
      );

      let filenameReads = 0;
      const sampleMedia = [
        { id: 'm1', filename: 'one.jpg' },
        { id: 'm2', filename: 'two.mp4' },
        { id: 'm3', filename: 'three.gif' },
        { id: 'm4', filename: 'four.mov' },
      ].map((record) => ({
        id: record.id,
        get filename() {
          filenameReads += 1;
          return record.filename;
        },
      }));

      const partitioned = partitionMediaLibrary(sampleMedia);
      harness.assert(
        filenameReads === sampleMedia.length,
        `partitionMediaLibrary classifies photos and videos in a single pass (${filenameReads} reads for ${sampleMedia.length} items)`
      );
      harness.assert(
        partitioned.photos.map((m) => m.id).join(',') === 'm1,m3' &&
          partitioned.videos.map((m) => m.id).join(',') === 'm2,m4',
        'partitionMediaLibrary separates photos (m1,m3) and videos (m2,m4) preserving order'
      );

      const usedSet = collectUsedMediaIds(
        [
          { mediaId: 'm1' },
          { mediaId: null },
          { mediaId: 'm2' },
          { mediaId: 'm1' },
        ],
        'm4'
      );
      harness.assert(
        usedSet instanceof Set &&
          usedSet.size === 3 &&
          usedSet.has('m1') &&
          usedSet.has('m2') &&
          usedSet.has('m4') &&
          !usedSet.has('m3'),
        'collectUsedMediaIds returns a Set of unique used media IDs from memories and sealMediaId'
      );
    }
});

