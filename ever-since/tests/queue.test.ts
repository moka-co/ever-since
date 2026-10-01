import Module from 'node:module';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

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
  const { WriteQueue } = await import('../lib/storage/queue');
  const { JsonDatabaseClient } = await import('../lib/storage/db');
  const { createDefaultDb } = await import('../lib/storage/schema');

  const TEST_DB_PATH = resolve(process.cwd(), 'tests', 'fixtures', 'test-db.json');
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

  console.log('--- Starting WriteQueue Unit Tests (USE Convention & AAA Pattern) ---\n');

  // Test Case 1: Concurrent updates serialization
  // USE: WriteQueue (Unit), when concurrent updates occur (Scenario), should serialize writes to prevent data loss (Expectation)
  {
    console.log('Test 1: WriteQueue (Unit), when concurrent writes occur (Scenario), should serialize writes to prevent data loss (Expectation)');

    // Arrange: Initialize test database fixture and queue instance
    await resetTestDb();
    const queue = new WriteQueue(TEST_DB_PATH);
    const concurrentWritesCount = 20;

    // Act: Trigger 20 simultaneous update transactions using Promise.all
    const updatePromises = Array.from({ length: concurrentWritesCount }, (_, index) => {
      return queue.update((current) => {
        return {
          ...current,
          memories: [
            ...current.memories,
            {
              id: randomUUID(),
              heading: `Memory #${index + 1}`,
              text: `Content for memory ${index + 1}`,
              mediaId: null,
            },
          ],
        };
      });
    });

    await Promise.all(updatePromises);

    // Assert: Verify that all 20 memories are present on disk without any lost updates
    const client = new JsonDatabaseClient(TEST_DB_PATH, queue);
    const finalDb = await client.read();
    assert(
      finalDb.memories.length === concurrentWritesCount,
      `All ${concurrentWritesCount} concurrent writes were persisted (actual: ${finalDb.memories.length})`
    );

    // Verify all memory headers are accounted for
    const headings = new Set(finalDb.memories.map((m) => m.heading));
    const allFound = Array.from({ length: concurrentWritesCount }).every((_, i) =>
      headings.has(`Memory #${i + 1}`)
    );
    assert(allFound, 'All memory headings from concurrent operations exist in the database');
  }

  // Test Case 2: Schema validation rejection on invalid update
  // USE: WriteQueue (Unit), when an invalid update payload is produced (Scenario), should reject and preserve database integrity (Expectation)
  {
    console.log('\nTest 2: WriteQueue (Unit), when an invalid update payload is produced (Scenario), should reject and preserve database integrity (Expectation)');

    // Arrange: Reset test database fixture
    await resetTestDb();
    const queue = new WriteQueue(TEST_DB_PATH);
    const client = new JsonDatabaseClient(TEST_DB_PATH, queue);

    // Act: Attempt to apply an update with an invalid date format violating dbSchema
    let threwError = false;
    try {
      await queue.update((current) => {
        return {
          ...current,
          config: {
            anniversaryDate: 'invalid-non-date-format',
          },
        };
      });
    } catch {
      threwError = true;
    }

    // Assert: Verify operation rejected and database file remained unchanged
    assert(threwError, 'WriteQueue rejected invalid database state with validation error');
    const unchangedDb = await client.read();
    assert(
      unchangedDb.config.anniversaryDate === '',
      'Database on disk preserved original valid state without corruption'
    );
  }

  // Test Case 3: Deadlock prevention after failure
  // USE: WriteQueue (Unit), when an update in the queue rejects (Scenario), should continue processing subsequent updates (Expectation)
  {
    console.log('\nTest 3: WriteQueue (Unit), when an update in the queue rejects (Scenario), should continue processing subsequent updates (Expectation)');

    // Arrange: Reset test database fixture
    await resetTestDb();
    const queue = new WriteQueue(TEST_DB_PATH);
    const client = new JsonDatabaseClient(TEST_DB_PATH, queue);

    // Act: Enqueue a failing task, immediately followed by a valid task
    const failedTask = queue.update(() => {
      throw new Error('Simulated transient failure inside updater');
    });

    const successfulTask = queue.update((current) => {
      return {
        ...current,
        config: {
          anniversaryDate: '2025-10-15',
        },
      };
    });

    // Await both tasks
    let failureCaught = false;
    try {
      await failedTask;
    } catch {
      failureCaught = true;
    }

    const finalDb = await successfulTask;

    // Assert: The failing task threw, but the queue remained healthy and processed the subsequent task
    assert(failureCaught, 'Failed task correctly threw error');
    assert(
      finalDb.config.anniversaryDate === '2025-10-15',
      'Subsequent task in queue processed successfully after prior error without deadlocking'
    );

    const persistedDb = await client.read();
    assert(
      persistedDb.config.anniversaryDate === '2025-10-15',
      'Subsequent task changes are accurately persisted to disk'
    );
  }

  // Test Case 4: JsonDatabaseClient integration
  // USE: JsonDatabaseClient (Unit), when update method is invoked (Scenario), should delegate to WriteQueue and serialize changes (Expectation)
  {
    console.log('\nTest 4: JsonDatabaseClient (Unit), when update method is invoked (Scenario), should delegate to WriteQueue and serialize changes (Expectation)');

    // Arrange: Create JsonDatabaseClient with dedicated test fixture
    await resetTestDb();
    const client = new JsonDatabaseClient(TEST_DB_PATH);

    // Act: Perform update via client.update()
    await client.update((current) => ({
      ...current,
      config: {
        anniversaryDate: '2026-02-14',
      },
    }));

    // Assert: Verify client read returns the newly updated state
    const updatedDb = await client.read();
    assert(
      updatedDb.config.anniversaryDate === '2026-02-14',
      'JsonDatabaseClient.update() safely modified and persisted database state'
    );
  }

  // Cleanup test fixture file
  await unlink(TEST_DB_PATH).catch(() => {});

  console.log(`\n--- WriteQueue Tests Finished: ${failures === 0 ? 'ALL TESTS PASSED' : `${failures} FAILURES`} ---`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
