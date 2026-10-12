import { runTestSuite } from './helpers';

runTestSuite('Memories & Customize Config', async ({ harness }) => {
    const { readDb, updateDb } = await import('../lib/storage/db');
    const { GET: getConfig, PUT: putConfig } = await import('../app/api/config/route');
    const { GET: getMemories, POST: postMemory } = await import('../app/api/memories/route');
    const { PUT: putMemory, DELETE: deleteMemory } = await import('../app/api/memories/[id]/route');
    const { PUT: reorderMemories } = await import('../app/api/memories/reorder/route');

    console.log('--- Starting Memories & Customize Config Tests (USE Convention & AAA Pattern) ---\n');

    // Test 1: Config GET initial
    {
      console.log('Test 1: GET /api/config returns initial configuration');
      const getRes = await getConfig();
      harness.assert(getRes.status === 200, `GET returned 200 (got ${getRes.status})`);
      const getData = await getRes.json();
      harness.assert(getData.anniversaryDate === '', 'Initial anniversaryDate is empty');
    }

    // Test 2: Config PUT valid date
    {
      console.log('\nTest 2: PUT /api/config updates anniversary date');
      const putReq = new Request('http://localhost:3000/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anniversaryDate: '2025-10-15' }),
      });
      const putRes = await putConfig(putReq);
      harness.assert(putRes.status === 200, 'PUT returned 200');
      const putData = await putRes.json();
      harness.assert(putData.config.anniversaryDate === '2025-10-15', 'Updated date returned');

      const db = await readDb();
      harness.assert(db.config.anniversaryDate === '2025-10-15', 'Updated date saved in DB');
    }

    // Test 3: Config PUT empty string
    {
      console.log('\nTest 3: PUT /api/config allows resetting to empty string');
      const putReq = new Request('http://localhost:3000/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anniversaryDate: '' }),
      });
      const putRes = await putConfig(putReq);
      harness.assert(putRes.status === 200, 'PUT with empty string returned 200');
    }

    // Test 4: Config PUT invalid date format
    {
      console.log('\nTest 4: Config PUT rejects invalid date string');
      const putReq = new Request('http://localhost:3000/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anniversaryDate: 'not-a-date' }),
      });
      const putRes = await putConfig(putReq);
      harness.assert(putRes.status === 400, `PUT returned 400 on invalid format (got ${putRes.status})`);
    }

    // Test 4b: Config PUT & GET sealMediaId
    {
      console.log('\nTest 4b: Config PUT & GET sealMediaId customization');
      // 1. Initial GET check
      const getRes = await getConfig();
      const getData = await getRes.json();
      harness.assert(getData.sealMediaId === null, 'Initial sealMediaId is null');

      // 2. Reject non-existent media ID
      const invalidMediaReq = new Request('http://localhost:3000/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sealMediaId: 'non-existent-media-id' }),
      });
      const invalidRes = await putConfig(invalidMediaReq);
      harness.assert(invalidRes.status === 400, 'Non-existent sealMediaId rejected with 400');

      // 3. Insert mock media record into DB
      await updateDb((current) => ({
        ...current,
        media: [
          ...current.media,
          { id: 'seal-test-1', filename: 'seal.jpg', width: 400, height: 400 },
        ],
      }));

      // 4. Update with existing media ID
      const validMediaReq = new Request('http://localhost:3000/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sealMediaId: 'seal-test-1' }),
      });
      const validRes = await putConfig(validMediaReq);
      harness.assert(validRes.status === 200, 'Existing sealMediaId accepted with 200');
      const validData = await validRes.json();
      harness.assert(validData.config.sealMediaId === 'seal-test-1', 'sealMediaId set in PUT response');

      // 5. GET returns updated sealMediaId
      const getResUpdated = await getConfig();
      const getDataUpdated = await getResUpdated.json();
      harness.assert(getDataUpdated.sealMediaId === 'seal-test-1', 'sealMediaId returned in GET');

      // 6. Reset sealMediaId to null
      const resetReq = new Request('http://localhost:3000/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sealMediaId: null }),
      });
      const resetRes = await putConfig(resetReq);
      harness.assert(resetRes.status === 200, 'Resetting sealMediaId to null succeeds');
      const resetData = await resetRes.json();
      harness.assert(resetData.config.sealMediaId === null, 'sealMediaId reset to null');
    }

    // Test 4c: Shared ConfigSaveController & SaveSubmitButton (independent saves, API & network errors, disabled during submission)
    {
      console.log('\nTest 4c: Shared ConfigSaveController & SaveSubmitButton');
      const {
        ConfigSaveController,
        SAVE_FEEDBACK_DURATION_MS,
        NETWORK_ERROR_MESSAGE,
      } = await import('../app/customize/hooks/use-config-save');
      const { getSaveSubmitButtonState } = await import('../app/customize/ui/save-submit-button');

      harness.assert(
        SAVE_FEEDBACK_DURATION_MS === 2500,
        'Saved feedback timer duration is 2500ms'
      );

      let dateRefreshed = 0;
      let sealRefreshed = 0;

      // Route-backed fetch stub with controllable deferred resolution to inspect in-flight state
      let resolveInFlight: (() => void) | null = null;
      const routeFetch: typeof fetch = async (input, init) => {
        if (resolveInFlight) {
          await new Promise<void>((r) => {
            resolveInFlight = r;
          });
        }
        const req = new Request('http://localhost:3000/api/config', {
          method: init?.method || 'PUT',
          headers: init?.headers,
          body: init?.body,
        });
        return await putConfig(req);
      };

      const dateSaver = new ConfigSaveController({
        fallbackErrorMessage: 'Failed to update anniversary date.',
        fetchImpl: routeFetch,
        onRefresh: () => {
          dateRefreshed += 1;
        },
      });
      const sealSaver = new ConfigSaveController({
        fallbackErrorMessage: 'Failed to update login photo/meme.',
        fetchImpl: routeFetch,
        onRefresh: () => {
          sealRefreshed += 1;
        },
      });

      // 1. Verify idle button states and independence
      const initialDateBtn = getSaveSubmitButtonState({
        ...dateSaver.getState(),
        idleLabel: 'Save Date',
        size: 'md',
      });
      const initialSealBtn = getSaveSubmitButtonState({
        ...sealSaver.getState(),
        idleLabel: 'Save Photo',
        size: 'sm',
      });
      harness.assert(
        !initialDateBtn.disabled && initialDateBtn.label === 'Save Date',
        'Idle date button enabled with "Save Date"'
      );
      harness.assert(
        !initialSealBtn.disabled && initialSealBtn.label === 'Save Photo',
        'Idle photo button enabled with "Save Photo"'
      );

      // 2. Verify in-flight submission disables only the submitting form's button
      resolveInFlight = () => {};
      const pendingDatePromise = dateSaver.submit({ anniversaryDate: '2026-02-14' });
      const savingDateBtn = getSaveSubmitButtonState({
        ...dateSaver.getState(),
        idleLabel: 'Save Date',
        size: 'md',
      });
      const untouchedSealBtn = getSaveSubmitButtonState({
        ...sealSaver.getState(),
        idleLabel: 'Save Photo',
        size: 'sm',
      });
      harness.assert(
        dateSaver.getState().isSaving &&
          savingDateBtn.disabled &&
          savingDateBtn.label === 'Saving...',
        'Date button is disabled and shows "Saving..." during submission'
      );
      harness.assert(
        !sealSaver.getState().isSaving && !untouchedSealBtn.disabled,
        'First Photo form remains independent and enabled while Anniversary Date saves'
      );

      // Complete in-flight request
      const unblock = resolveInFlight as () => void;
      resolveInFlight = null;
      unblock();
      const dateOk = await pendingDatePromise;
      harness.assert(dateOk === true, 'Date save succeeded');
      harness.assert(
        dateSaver.getState().isSaved && !dateSaver.getState().isSaving,
        'Date saver transitions to isSaved=true and isSaving=false'
      );
      harness.assert(dateRefreshed === 1 && sealRefreshed === 0, 'Only date saver triggered refresh');

      const savedDateBtn = getSaveSubmitButtonState({
        ...dateSaver.getState(),
        idleLabel: 'Save Date',
        size: 'md',
      });
      harness.assert(
        !savedDateBtn.disabled && savedDateBtn.label === '✓ Saved!',
        'Saved button re-enables and displays "✓ Saved!"'
      );

      // 3. Independent save of sealMediaId preserves anniversaryDate in DB
      const sealOk = await sealSaver.submit({ sealMediaId: 'seal-test-1' });
      harness.assert(sealOk === true && sealSaver.getState().isSaved, 'Seal photo save succeeded independently');
      const dbAfterBoth = await readDb();
      harness.assert(
        dbAfterBoth.config.anniversaryDate === '2026-02-14' &&
          dbAfterBoth.config.sealMediaId === 'seal-test-1',
        'Independent saves persisted both anniversaryDate and sealMediaId without overwriting each other'
      );

      // Reset anniversaryDate back to empty string for subsequent tests
      await dateSaver.submit({ anniversaryDate: '' });
      await sealSaver.submit({ sealMediaId: null });

      // 4. API error handling (e.g. non-existent sealMediaId or invalid date)
      const apiFailOk = await sealSaver.submit({ sealMediaId: 'missing-media' });
      harness.assert(apiFailOk === false, 'API error returns false');
      harness.assert(
        !sealSaver.getState().isSaving &&
          !sealSaver.getState().isSaved &&
          sealSaver.getState().errorMessage === "Media with ID 'missing-media' not found",
        'API error populates errorMessage and clears isSaved/isSaving'
      );

      // 5. Fallback error message when API returns empty error body
      const emptyErrorSaver = new ConfigSaveController({
        fallbackErrorMessage: 'Failed to update login photo/meme.',
        fetchImpl: async () =>
          new Response(JSON.stringify({}), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }),
      });
      await emptyErrorSaver.submit({ sealMediaId: null });
      harness.assert(
        emptyErrorSaver.getState().errorMessage === 'Failed to update login photo/meme.',
        'Uses field-specific fallbackErrorMessage when response has no error string'
      );

      // 6. Network error handling
      const networkErrorSaver = new ConfigSaveController({
        fallbackErrorMessage: 'Failed to update anniversary date.',
        fetchImpl: async () => {
          throw new Error('Offline');
        },
      });
      const netOk = await networkErrorSaver.submit({ anniversaryDate: '2025-10-15' });
      harness.assert(
        netOk === false &&
          !networkErrorSaver.getState().isSaving &&
          networkErrorSaver.getState().errorMessage === NETWORK_ERROR_MESSAGE,
        'Network failure sets standard network error message and re-enables form'
      );
      networkErrorSaver.clearError();
      harness.assert(
        networkErrorSaver.getState().errorMessage === null,
        'clearError resets errorMessage to null'
      );
    }

    // Test 5: Memories POST & GET
    let createdMemoryId1 = '';
    let createdMemoryId2 = '';
    let createdMemoryId3 = '';
    {
      console.log('\nTest 5: POST /api/memories creates memories in sequence');
      const postReq1 = new Request('http://localhost:3000/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heading: 'First Date',
          text: 'Coffee by the canal',
          mediaId: '1.jpg',
        }),
      });
      const res1 = await postMemory(postReq1);
      harness.assert(res1.status === 201, 'First memory created with 201');
      const data1 = await res1.json();
      createdMemoryId1 = data1.memory.id;

      const postReq2 = new Request('http://localhost:3000/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heading: 'Trip to Rome',
          text: 'Gelato at the Colosseum',
          mediaId: '2.png',
        }),
      });
      const res2 = await postMemory(postReq2);
      const data2 = await res2.json();
      createdMemoryId2 = data2.memory.id;

      const postReq3 = new Request('http://localhost:3000/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heading: 'Our Anniversary',
          text: 'Celebration dinner',
          mediaId: null,
        }),
      });
      const res3 = await postMemory(postReq3);
      const data3 = await res3.json();
      createdMemoryId3 = data3.memory.id;

      const getRes = await getMemories();
      const list = await getRes.json();
      harness.assert(list.length === 3, `All 3 memories returned in GET (got ${list.length})`);
      harness.assert(list[0].id === createdMemoryId1, 'First memory in correct place');
      harness.assert(list[1].id === createdMemoryId2, 'Second memory in correct place');
      harness.assert(list[2].id === createdMemoryId3, 'Third memory in correct place');
    }

    // Test 6: Memory PUT update
    {
      console.log('\nTest 6: PUT /api/memories/[id] updates memory item');
      const putReq = new Request(`http://localhost:3000/api/memories/${createdMemoryId1}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heading: 'First Date Updated',
          text: 'Hot chocolate by the canal',
        }),
      });
      const putRes = await putMemory(putReq, { params: Promise.resolve({ id: createdMemoryId1 }) });
      harness.assert(putRes.status === 200, 'Update memory returned 200');
      const putData = await putRes.json();
      harness.assert(putData.memory.heading === 'First Date Updated', 'Updated heading verified');
      harness.assert(putData.memory.mediaId === '1.jpg', 'Original mediaId retained');

      // Update non-existent
      const notFoundRes = await putMemory(putReq, {
        params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }),
      });
      harness.assert(notFoundRes.status === 404, 'Updating non-existent memory returns 404');
    }

    // Test 7: Memories PUT reorder
    {
      console.log('\nTest 7: PUT /api/memories/reorder updates list order');
      const reorderReq = new Request('http://localhost:3000/api/memories/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderedIds: [createdMemoryId3, createdMemoryId1, createdMemoryId2],
        }),
      });
      const reorderRes = await reorderMemories(reorderReq);
      harness.assert(reorderRes.status === 200, 'Reorder returned 200');
      const reorderData = await reorderRes.json();
      harness.assert(reorderData.memories[0].id === createdMemoryId3, 'Memory 3 moved to top');

      const db = await readDb();
      harness.assert(db.memories[0].id === createdMemoryId3, 'DB order verified');
    }

    // Test 8: Memory DELETE
    {
      console.log('\nTest 8: DELETE /api/memories/[id] removes memory item');
      const delReq = new Request(`http://localhost:3000/api/memories/${createdMemoryId2}`, {
        method: 'DELETE',
      });
      const delRes = await deleteMemory(delReq, { params: Promise.resolve({ id: createdMemoryId2 }) });
      harness.assert(delRes.status === 200, 'DELETE returned 200');

      const notFoundDel = await deleteMemory(delReq, {
        params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }),
      });
      harness.assert(notFoundDel.status === 404, 'DELETE non-existent returns 404');

      const db = await readDb();
      harness.assert(db.memories.length === 2, 'DB now has 2 memories');
    }

    // Test 9: Memory validation constraint (>100 characters)
    {
      console.log('\nTest 9: Heading >100 characters rejected with 400');
      const invalidPostReq = new Request('http://localhost:3000/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heading: 'a'.repeat(101),
          text: 'Short text',
        }),
      });
      const invalidRes = await postMemory(invalidPostReq);
      harness.assert(invalidRes.status === 400, `POST returned 400 on >100 chars (got ${invalidRes.status})`);
    }

    // Test 10: mediaPositionX support, default value, and clamping in POST / PUT
    {
      console.log('\nTest 10: mediaPositionX support, default value, and clamping');
      // POST with explicit mediaPositionX: 75
      const postReq1 = new Request('http://localhost:3000/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heading: 'Positioned Memory',
          text: 'Custom framing',
          mediaPositionX: 75,
        }),
      });
      const res1 = await postMemory(postReq1);
      harness.assert(res1.status === 201, 'POST with mediaPositionX returned 201');
      const data1 = await res1.json();
      harness.assert(data1.memory.mediaPositionX === 75, `memory.mediaPositionX is 75 (got ${data1.memory.mediaPositionX})`);
      const testMemId = data1.memory.id;

      // POST without mediaPositionX defaults to 50
      const postReq2 = new Request('http://localhost:3000/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heading: 'Default Position Memory',
          text: 'Default framing',
        }),
      });
      const res2 = await postMemory(postReq2);
      harness.assert(res2.status === 201, 'POST without mediaPositionX returned 201');
      const data2 = await res2.json();
      harness.assert(data2.memory.mediaPositionX === 50, `Default mediaPositionX is 50 (got ${data2.memory.mediaPositionX})`);

      // PUT updates mediaPositionX to 20
      const putReq1 = new Request(`http://localhost:3000/api/memories/${testMemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaPositionX: 20,
        }),
      });
      const putRes1 = await putMemory(putReq1, { params: Promise.resolve({ id: testMemId }) });
      harness.assert(putRes1.status === 200, 'PUT returned 200');
      const putData1 = await putRes1.json();
      harness.assert(putData1.memory.mediaPositionX === 20, `PUT updated mediaPositionX to 20 (got ${putData1.memory.mediaPositionX})`);

      // PUT clamps value > 100 to 100
      const putReqClampHigh = new Request(`http://localhost:3000/api/memories/${testMemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaPositionX: 130,
        }),
      });
      const putResClampHigh = await putMemory(putReqClampHigh, { params: Promise.resolve({ id: testMemId }) });
      const putDataClampHigh = await putResClampHigh.json();
      harness.assert(putDataClampHigh.memory.mediaPositionX === 100, `Clamped high mediaPositionX to 100 (got ${putDataClampHigh.memory.mediaPositionX})`);

      // PUT clamps value < 0 to 0
      const putReqClampLow = new Request(`http://localhost:3000/api/memories/${testMemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaPositionX: -15,
        }),
      });
      const putResClampLow = await putMemory(putReqClampLow, { params: Promise.resolve({ id: testMemId }) });
      const putDataClampLow = await putResClampLow.json();
      harness.assert(putDataClampLow.memory.mediaPositionX === 0, `Clamped low mediaPositionX to 0 (got ${putDataClampLow.memory.mediaPositionX})`);

      // Verify persisted in DB
      const db = await readDb();
      const persistedMem = db.memories.find((m) => m.id === testMemId);
      harness.assert(persistedMem?.mediaPositionX === 0, 'Persisted memory has mediaPositionX 0 in DB');

      // Test mediaPositionY and mediaScale defaults and clamping
      const zoomPostReq = new Request('http://localhost:3000/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heading: 'Zoomed Memory',
          text: '2D positioning and zoom',
          mediaPositionX: 40,
          mediaPositionY: 60,
          mediaScale: 2.2,
        }),
      });
      const zoomRes = await postMemory(zoomPostReq);
      harness.assert(zoomRes.status === 201, 'POST with mediaScale and mediaPositionY returned 201');
      const zoomData = await zoomRes.json();
      harness.assert(zoomData.memory.mediaPositionY === 60, `mediaPositionY is 60 (got ${zoomData.memory.mediaPositionY})`);
      harness.assert(zoomData.memory.mediaScale === 2.2, `mediaScale is 2.2 (got ${zoomData.memory.mediaScale})`);
      const zoomMemId = zoomData.memory.id;

      // PUT updates mediaScale with clamping (clamping > 3 to 3, < 1 to 1)
      const putZoomHigh = new Request(`http://localhost:3000/api/memories/${zoomMemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaScale: 5.0,
          mediaPositionY: 120,
        }),
      });
      const putZoomRes = await putMemory(putZoomHigh, { params: Promise.resolve({ id: zoomMemId }) });
      const putZoomData = await putZoomRes.json();
      harness.assert(putZoomData.memory.mediaScale === 3, `Clamped high mediaScale to 3 (got ${putZoomData.memory.mediaScale})`);
      harness.assert(putZoomData.memory.mediaPositionY === 100, `Clamped high mediaPositionY to 100 (got ${putZoomData.memory.mediaPositionY})`);
    }

    // Test 11: Memories maximum quota of 50 enforcement
    {
      console.log('\nTest 11: Schema & API enforce maximum 50 memories limit');
      const current = await readDb();
      const needed = 50 - current.memories.length;
      for (let i = 0; i < needed; i++) {
        const postReq = new Request('http://localhost:3000/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            heading: `Memory fill ${i}`,
            text: 'text',
          }),
        });
        const res = await postMemory(postReq);
        harness.assert(res.status === 201, `Fill memory ${i} created with 201`);
      }

      const dbAtCapacity = await readDb();
      harness.assert(dbAtCapacity.memories.length === 50, 'Database memories count is exactly 50');

      // Attempting 51st memory via API should be rejected with 400
      const overflowReq = new Request('http://localhost:3000/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heading: '51st memory',
          text: 'overflow',
        }),
      });
      const overflowRes = await postMemory(overflowReq);
      harness.assert(overflowRes.status === 400, `51st memory rejected with 400 (got ${overflowRes.status})`);
      const overflowData = await overflowRes.json();
      harness.assert(overflowData.error.includes('Memories limit exceeded'), 'Error message informs of memories limit');
    }

    // Test 12: Concurrent config PUTs and memory POSTs serialize checks and merges inside updateDb
    {
      console.log('\nTest 12: Concurrent config PUTs and memory POSTs serialize checks and merges inside updateDb');
      await updateDb((current) => ({
        ...current,
        config: { anniversaryDate: '', sealMediaId: null },
        memories: current.memories.slice(0, 49),
      }));

      const concurrentDateReq = new Request('http://localhost:3000/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anniversaryDate: '2025-06-01' }),
      });
      const concurrentSealReq = new Request('http://localhost:3000/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sealMediaId: 'seal-test-1' }),
      });

      const [dateRes, sealRes] = await Promise.all([
        putConfig(concurrentDateReq),
        putConfig(concurrentSealReq),
      ]);
      harness.assert(
        dateRes.status === 200 && sealRes.status === 200,
        'Both concurrent PUT /api/config requests succeeded with 200'
      );
      const mergedDb = await readDb();
      harness.assert(
        mergedDb.config.anniversaryDate === '2025-06-01' &&
          mergedDb.config.sealMediaId === 'seal-test-1',
        `Concurrent PUT /api/config preserved both anniversaryDate (${mergedDb.config.anniversaryDate}) and sealMediaId (${mergedDb.config.sealMediaId})`
      );

      const memReqA = new Request('http://localhost:3000/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heading: 'Concurrent A', text: 'Slot 50' }),
      });
      const memReqB = new Request('http://localhost:3000/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heading: 'Concurrent B', text: 'Overflow 51' }),
      });

      const [memResA, memResB] = await Promise.all([
        postMemory(memReqA),
        postMemory(memReqB),
      ]);
      const statuses = [memResA.status, memResB.status].sort();
      harness.assert(
        statuses[0] === 201 && statuses[1] === 400,
        `Concurrent POST /api/memories at 49/50 accepted one (201) and rejected one (400), got ${statuses.join(', ')}`
      );
      const rejectedRes = memResA.status === 400 ? memResA : memResB;
      const rejectedBody = await rejectedRes.json();
      harness.assert(
        rejectedBody.error === 'Memories limit exceeded. A maximum of 50 memories is allowed.',
        `Rejected concurrent memory POST used quota error message (got "${rejectedBody.error}")`
      );
      const finalMemDb = await readDb();
      harness.assert(
        finalMemDb.memories.length === 50,
        `Database memories count remained strictly 50 after concurrent POSTs`
      );
    }

    // Test 13: Shared getPhotoFramingStyle & matching position and zoom after saving and reopening a memory
    {
      console.log('\nTest 13: Shared getPhotoFramingStyle & matching position and zoom after saving and reopening a memory');
      const { getPhotoFramingStyle } = await import('../lib/storage/schema');
      const { getMemoryFormState } = await import('../app/customize/memories/memories-manager');
      const { getMediaThumbnailProps } = await import('../app/customize/media/media-thumbnail');

      // Free one slot so we can create and reopen a memory
      await updateDb((current) => ({
        ...current,
        memories: current.memories.slice(0, 10),
      }));

      // Default fallback when framing is omitted or null
      const defaultFraming = getPhotoFramingStyle(null);
      harness.assert(
        typeof getPhotoFramingStyle === 'function' &&
          defaultFraming.objectPosition === '50% 50%' &&
          defaultFraming.transform === 'scale(1)',
        'getPhotoFramingStyle returns default 50% 50% and scale(1) when input is null/omitted'
      );

      // 1. Save a new memory with custom position and zoom
      const createFramedReq = new Request('http://localhost:3000/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heading: 'Framed Memory',
          text: 'Custom crop and zoom',
          mediaId: 'seal-test-1',
          mediaPositionX: 28,
          mediaPositionY: 74,
          mediaScale: 2.4,
        }),
      });
      const createFramedRes = await postMemory(createFramedReq);
      harness.assert(createFramedRes.status === 201, 'Created framed memory with 201');
      const { memory: createdFramed } = await createFramedRes.json();

      // Reopen via GET /api/memories and hydrate editor form state
      const listRes1 = await getMemories();
      const list1 = await listRes1.json();
      const savedMemory = list1.find((m: { id: string }) => m.id === createdFramed.id);
      const reopenedForm = getMemoryFormState(savedMemory);

      harness.assert(
        reopenedForm.mediaPositionX === 28 &&
          reopenedForm.mediaPositionY === 74 &&
          reopenedForm.mediaScale === 2.4,
        'Reopened memory form state preserves saved X (28), Y (74), and scale (2.4)'
      );

      const editorPreviewStyle = getPhotoFramingStyle(reopenedForm);
      const timelineCardStyle = getPhotoFramingStyle(savedMemory);
      const listThumbStyle = getMediaThumbnailProps({
        filename: 'seal.jpg',
        size: 'sm',
        mediaPositionX: savedMemory.mediaPositionX,
        mediaPositionY: savedMemory.mediaPositionY,
        mediaScale: savedMemory.mediaScale,
      }).imageStyle;

      harness.assert(
        editorPreviewStyle.objectPosition === '28% 74%' &&
          editorPreviewStyle.transform === 'scale(2.4)',
        'Editor preview style matches 28% 74% and scale(2.4)'
      );
      harness.assert(
        timelineCardStyle.objectPosition === editorPreviewStyle.objectPosition &&
          timelineCardStyle.transform === editorPreviewStyle.transform &&
          listThumbStyle?.objectPosition === editorPreviewStyle.objectPosition &&
          listThumbStyle?.transform === editorPreviewStyle.transform,
        'Editor preview, memory list thumbnail, and timeline card styles match after saving and reopening'
      );

      // 2. Edit framing, save via PUT, and reopen again
      const updateFramedReq = new Request(
        `http://localhost:3000/api/memories/${createdFramed.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mediaPositionX: 82,
            mediaPositionY: 15,
            mediaScale: 1.8,
          }),
        }
      );
      const updateFramedRes = await putMemory(updateFramedReq, {
        params: Promise.resolve({ id: createdFramed.id }),
      });
      harness.assert(updateFramedRes.status === 200, 'Updated framed memory with 200');

      const listRes2 = await getMemories();
      const list2 = await listRes2.json();
      const updatedSavedMemory = list2.find((m: { id: string }) => m.id === createdFramed.id);
      const reopenedUpdatedForm = getMemoryFormState(updatedSavedMemory);

      const updatedPreviewStyle = getPhotoFramingStyle(reopenedUpdatedForm);
      const updatedTimelineStyle = getPhotoFramingStyle(updatedSavedMemory);
      const updatedThumbStyle = getMediaThumbnailProps({
        filename: 'seal.jpg',
        size: 'sm',
        mediaPositionX: updatedSavedMemory.mediaPositionX,
        mediaPositionY: updatedSavedMemory.mediaPositionY,
        mediaScale: updatedSavedMemory.mediaScale,
      }).imageStyle;

      harness.assert(
        updatedPreviewStyle.objectPosition === '82% 15%' &&
          updatedPreviewStyle.transform === 'scale(1.8)' &&
          updatedTimelineStyle.objectPosition === '82% 15%' &&
          updatedTimelineStyle.transform === 'scale(1.8)' &&
          updatedThumbStyle?.objectPosition === '82% 15%' &&
          updatedThumbStyle?.transform === 'scale(1.8)',
        'Updated position (82% 15%) and zoom (1.8x) match across editor preview, list thumbnail, and timeline after reopening'
      );
    }
});

