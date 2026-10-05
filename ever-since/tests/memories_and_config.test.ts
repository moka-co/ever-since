import { useTempDb, TestHarness } from './helpers';

async function main() {
  const harness = new TestHarness();
  const temp = await useTempDb('12345678901234567890');

  try {
    const { readDb } = await import('../lib/storage/db');
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
      console.log('\nTest 4: PUT /api/config rejects invalid date string');
      const putReq = new Request('http://localhost:3000/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anniversaryDate: 'not-a-date' }),
      });
      const putRes = await putConfig(putReq);
      harness.assert(putRes.status === 400, `PUT returned 400 on invalid format (got ${putRes.status})`);
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

    harness.finish('Memories & Customize Config');
  } finally {
    await temp.cleanup();
  }
}

main().catch((err) => {
  console.error('Test execution fatal error:', err);
  process.exit(1);
});
