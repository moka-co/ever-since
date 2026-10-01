import Module from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

// Intercept 'server-only' to allow testing in Node/tsx environment
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
  const { CustomizeDatabaseClient } = await import('../lib/storage/customize-db');
  const { MemoryDatabaseClient } = await import('../lib/storage/memory-db');
  const { createDefaultDb } = await import('../lib/storage/schema');

  const TEST_DB_PATH = resolve(process.cwd(), 'tests', 'fixtures', 'test-memories-db.json');
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
    defaultData.config.anniversaryDate = '2025-01-01';
    await writeFile(TEST_DB_PATH, JSON.stringify(defaultData, null, 2), 'utf8');
  }

  console.log('--- Starting Memories & Customize Config Tests (USE Convention & AAA Pattern) ---\n');

  // Test 1: CustomizeDatabaseClient getConfig
  // USE: CustomizeDatabaseClient (Unit), when getConfig is called (Scenario), should return anniversary date (Expectation)
  {
    console.log('Test 1: CustomizeDatabaseClient (Unit), when getConfig is called (Scenario), should return anniversary date (Expectation)');
    await resetTestDb();
    const client = new CustomizeDatabaseClient(TEST_DB_PATH);

    const config = await client.getConfig();
    assert(config.anniversaryDate === '2025-01-01', `Returned anniversary date matches initial value (got: ${config.anniversaryDate})`);
  }

  // Test 2: CustomizeDatabaseClient updateAnniversaryDate valid
  // USE: CustomizeDatabaseClient (Unit), when valid date is updated (Scenario), should persist and return new date (Expectation)
  {
    console.log('\nTest 2: CustomizeDatabaseClient (Unit), when valid date is updated (Scenario), should persist and return new date (Expectation)');
    await resetTestDb();
    const client = new CustomizeDatabaseClient(TEST_DB_PATH);

    const { config, db } = await client.updateAnniversaryDate('2025-10-15');
    assert(config.anniversaryDate === '2025-10-15', 'Returned config contains updated date');
    assert(db.config.anniversaryDate === '2025-10-15', 'Database object contains updated date');

    const verified = await client.getConfig();
    assert(verified.anniversaryDate === '2025-10-15', 'Subsequent read returns newly updated date');
  }

  // Test 3: CustomizeDatabaseClient updateAnniversaryDate empty string
  // USE: CustomizeDatabaseClient (Unit), when date is set to empty string (Scenario), should accept and persist empty string (Expectation)
  {
    console.log('\nTest 3: CustomizeDatabaseClient (Unit), when date is set to empty string (Scenario), should accept and persist empty string (Expectation)');
    await resetTestDb();
    const client = new CustomizeDatabaseClient(TEST_DB_PATH);

    const { config } = await client.updateAnniversaryDate('');
    assert(config.anniversaryDate === '', 'Empty string date accepted');
  }

  // Test 4: CustomizeDatabaseClient updateAnniversaryDate invalid format
  // USE: CustomizeDatabaseClient (Unit), when invalid date format is provided (Scenario), should throw validation error (Expectation)
  {
    console.log('\nTest 4: CustomizeDatabaseClient (Unit), when invalid date format is provided (Scenario), should throw validation error (Expectation)');
    await resetTestDb();
    const client = new CustomizeDatabaseClient(TEST_DB_PATH);

    let threw = false;
    try {
      await client.updateAnniversaryDate('not-a-date');
    } catch {
      threw = true;
    }
    assert(threw, 'Threw error on invalid date string');
  }

  // Test 5: MemoryDatabaseClient addMemory
  // USE: MemoryDatabaseClient (Unit), when addMemory is called (Scenario), should generate UUID and persist record (Expectation)
  let createdMemoryId1 = '';
  let createdMemoryId2 = '';
  let createdMemoryId3 = '';
  {
    console.log('\nTest 5: MemoryDatabaseClient (Unit), when addMemory is called (Scenario), should generate UUID and persist record (Expectation)');
    await resetTestDb();
    const client = new MemoryDatabaseClient(TEST_DB_PATH);

    const res1 = await client.addMemory({
      heading: 'First Date',
      text: 'Coffee by the canal',
      mediaId: '1.jpg',
    });

    assert(Boolean(res1.memory.id), `Generated memory ID is defined: ${res1.memory.id}`);
    assert(res1.memory.heading === 'First Date', 'Heading stored correctly');
    assert(res1.memory.text === 'Coffee by the canal', 'Text stored correctly');
    assert(res1.memory.mediaId === '1.jpg', 'mediaId stored correctly');
    assert(res1.db.memories.length === 1, 'Database contains 1 memory item');
    createdMemoryId1 = res1.memory.id;

    const res2 = await client.addMemory({
      heading: 'Trip to Rome',
      text: 'Gelato at the Colosseum',
      mediaId: '2.png',
    });
    createdMemoryId2 = res2.memory.id;

    const res3 = await client.addMemory({
      heading: 'Our Anniversary',
      text: 'Celebration dinner',
      mediaId: null,
    });
    createdMemoryId3 = res3.memory.id;

    const all = await client.getMemories();
    assert(all.length === 3, `All 3 memories persisted (count: ${all.length})`);
    assert(all[0].id === createdMemoryId1, 'First memory in correct sequence');
    assert(all[1].id === createdMemoryId2, 'Second memory in correct sequence');
    assert(all[2].id === createdMemoryId3, 'Third memory in correct sequence');
  }

  // Test 6: MemoryDatabaseClient getMemoryById
  // USE: MemoryDatabaseClient (Unit), when getMemoryById is called (Scenario), should return matching record or null (Expectation)
  {
    console.log('\nTest 6: MemoryDatabaseClient (Unit), when getMemoryById is called (Scenario), should return matching record or null (Expectation)');
    const client = new MemoryDatabaseClient(TEST_DB_PATH);

    const found = await client.getMemoryById(createdMemoryId2);
    assert(found !== null && found.heading === 'Trip to Rome', 'Found correct memory by ID');

    const notFound = await client.getMemoryById('00000000-0000-0000-0000-000000000000');
    assert(notFound === null, 'Returned null for non-existent memory ID');
  }

  // Test 7: MemoryDatabaseClient updateMemory
  // USE: MemoryDatabaseClient (Unit), when updateMemory is called (Scenario), should modify specified fields and persist (Expectation)
  {
    console.log('\nTest 7: MemoryDatabaseClient (Unit), when updateMemory is called (Scenario), should modify specified fields and persist (Expectation)');
    const client = new MemoryDatabaseClient(TEST_DB_PATH);

    const { memory } = await client.updateMemory(createdMemoryId1, {
      heading: 'First Date Updated',
      text: 'Hot chocolate by the canal',
    });

    assert(memory !== null, 'Updated memory returned');
    assert(memory?.heading === 'First Date Updated', 'Heading updated');
    assert(memory?.text === 'Hot chocolate by the canal', 'Text updated');
    assert(memory?.mediaId === '1.jpg', 'Original mediaId retained');

    const nullUpdate = await client.updateMemory('00000000-0000-0000-0000-000000000000', {
      heading: 'Unknown',
    });
    assert(nullUpdate.memory === null, 'Returned null when updating non-existent memory');
  }

  // Test 8: MemoryDatabaseClient reorderMemories
  // USE: MemoryDatabaseClient (Unit), when reorderMemories is called (Scenario), should re-sequence items to match array (Expectation)
  {
    console.log('\nTest 8: MemoryDatabaseClient (Unit), when reorderMemories is called (Scenario), should re-sequence items to match array (Expectation)');
    const client = new MemoryDatabaseClient(TEST_DB_PATH);

    // Reorder from [1, 2, 3] to [3, 1, 2]
    const { memories } = await client.reorderMemories([createdMemoryId3, createdMemoryId1, createdMemoryId2]);
    assert(memories[0].id === createdMemoryId3, 'Memory 3 moved to first position');
    assert(memories[1].id === createdMemoryId1, 'Memory 1 moved to second position');
    assert(memories[2].id === createdMemoryId2, 'Memory 2 moved to third position');

    const reloaded = await client.getMemories();
    assert(reloaded[0].id === createdMemoryId3, 'Persisted order verified on subsequent read');
  }

  // Test 9: MemoryDatabaseClient deleteMemory
  // USE: MemoryDatabaseClient (Unit), when deleteMemory is called (Scenario), should remove memory and reclaim position (Expectation)
  {
    console.log('\nTest 9: MemoryDatabaseClient (Unit), when deleteMemory is called (Scenario), should remove memory and reclaim position (Expectation)');
    const client = new MemoryDatabaseClient(TEST_DB_PATH);

    const { deleted, db } = await client.deleteMemory(createdMemoryId2);
    assert(deleted !== null && deleted.id === createdMemoryId2, 'Deleted memory returned');
    assert(db.memories.length === 2, 'Database now has 2 memories remaining');

    const notFoundDelete = await client.deleteMemory('00000000-0000-0000-0000-000000000000');
    assert(notFoundDelete.deleted === null, 'Deleting non-existent memory returns deleted: null');
  }

  // Test 10: Validation constraints on heading and text length (> 100 characters)
  // USE: MemoryDatabaseClient (Unit), when heading exceeds 100 characters (Scenario), should reject via Zod schema (Expectation)
  {
    console.log('\nTest 10: MemoryDatabaseClient (Unit), when heading exceeds 100 characters (Scenario), should reject via Zod schema (Expectation)');
    const client = new MemoryDatabaseClient(TEST_DB_PATH);

    let rejected = false;
    try {
      await client.addMemory({
        heading: 'a'.repeat(101),
        text: 'Short text',
      });
    } catch {
      rejected = true;
    }
    assert(rejected, 'Adding memory with heading > 100 chars was rejected');
  }

  // Test 11: Route handler integration tests (/api/config)
  {
    console.log('\nTest 11: Route Handler Integration: GET & PUT /api/config');
    const { GET: getConfig, PUT: putConfig } = await import('../app/api/config/route');

    // GET
    const getRes = await getConfig();
    assert(getRes.status === 200, `GET /api/config returned 200 (got: ${getRes.status})`);
    const getData = await getRes.json();
    assert(typeof getData.anniversaryDate === 'string', 'GET returns anniversaryDate');

    // PUT invalid
    const invalidPutReq = new Request('http://localhost:3000/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anniversaryDate: 12345 }),
    });
    const invalidPutRes = await putConfig(invalidPutReq);
    assert(invalidPutRes.status === 400, `PUT /api/config invalid type returned 400 (got: ${invalidPutRes.status})`);

    // PUT valid
    const validPutReq = new Request('http://localhost:3000/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anniversaryDate: '2025-12-25' }),
    });
    const validPutRes = await putConfig(validPutReq);
    assert(validPutRes.status === 200, `PUT /api/config valid date returned 200 (got: ${validPutRes.status})`);
    const validPutData = await validPutRes.json();
    assert(validPutData.config.anniversaryDate === '2025-12-25', 'PUT returns updated config');
  }

  // Test 12: Route handler integration tests (/api/memories & /api/memories/[id])
  {
    console.log('\nTest 12: Route Handler Integration: /api/memories & /api/memories/[id]');
    const { GET: getMemories, POST: postMemory } = await import('../app/api/memories/route');
    const { PUT: putMemory, DELETE: deleteMemory } = await import('../app/api/memories/[id]/route');
    const { PUT: reorderMemories } = await import('../app/api/memories/reorder/route');

    // POST create memory
    const postReq = new Request('http://localhost:3000/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        heading: 'Route Test Memory',
        text: 'Testing route creation',
        mediaId: '1.jpg',
      }),
    });
    const postRes = await postMemory(postReq);
    assert(postRes.status === 201, `POST /api/memories returned 201 (got: ${postRes.status})`);
    const postData = await postRes.json();
    const newId = postData.memory.id;
    assert(Boolean(newId), 'POST returned created memory ID');

    // GET all memories
    const getRes = await getMemories();
    assert(getRes.status === 200, 'GET /api/memories returned 200');
    const list = await getRes.json();
    assert(Array.isArray(list) && list.some((m: { id: string }) => m.id === newId), 'Created memory present in GET list');

    // PUT update memory
    const putReq = new Request(`http://localhost:3000/api/memories/${newId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        heading: 'Route Test Memory Updated',
      }),
    });
    const putRes = await putMemory(putReq, { params: Promise.resolve({ id: newId }) });
    assert(putRes.status === 200, 'PUT /api/memories/[id] returned 200');
    const putData = await putRes.json();
    assert(putData.memory.heading === 'Route Test Memory Updated', 'PUT updated heading verified');

    // PUT reorder
    const reorderReq = new Request('http://localhost:3000/api/memories/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderedIds: [newId],
      }),
    });
    const reorderRes = await reorderMemories(reorderReq);
    assert(reorderRes.status === 200, 'PUT /api/memories/reorder returned 200');

    // DELETE memory
    const deleteReq = new Request(`http://localhost:3000/api/memories/${newId}`, {
      method: 'DELETE',
    });
    const deleteRes = await deleteMemory(deleteReq, { params: Promise.resolve({ id: newId }) });
    assert(deleteRes.status === 200, 'DELETE /api/memories/[id] returned 200');

    // DELETE non-existent
    const deleteNotFoundRes = await deleteMemory(deleteReq, {
      params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }),
    });
    assert(deleteNotFoundRes.status === 404, 'DELETE /api/memories/[id] on non-existent returned 404');
  }

  console.log(`\n--- Memories & Customize Tests Finished: ${failures === 0 ? 'ALL TESTS PASSED' : `${failures} FAILURES`} ---`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Test execution fatal error:', err);
  process.exit(1);
});
