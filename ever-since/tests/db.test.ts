import { useTempDb, TestHarness } from './helpers';
import { randomUUID } from 'node:crypto';

async function main() {
  const harness = new TestHarness();
  const temp = await useTempDb('12345678901234567890');

  try {
    const { updateDb, readDb } = await import('../lib/storage/db');

    console.log('--- Starting Storage db.ts Unit Tests (USE Convention & AAA Pattern) ---\n');

    // Test Case 1: Concurrent updates serialization
    // USE: updateDb (Unit), when concurrent writes occur (Scenario), should serialize writes to prevent data loss (Expectation)
    {
      console.log('Test 1: updateDb (Unit), when concurrent writes occur (Scenario), should serialize writes to prevent data loss (Expectation)');

      const concurrentWritesCount = 20;

      const updatePromises = Array.from({ length: concurrentWritesCount }, (_, index) => {
        return updateDb((current) => {
          return {
            ...current,
            memories: [
              ...current.memories,
              {
                id: randomUUID(),
                heading: `Memory #${index + 1}`,
                text: `Content for memory ${index + 1}`,
                mediaId: null,
                mediaPositionX: 50,
                mediaPositionY: 50,
                mediaScale: 1,
              },
            ],
          };
        });
      });

      await Promise.all(updatePromises);

      const finalDb = await readDb();
      harness.assert(
        finalDb.memories.length === concurrentWritesCount,
        `All ${concurrentWritesCount} concurrent writes were persisted (actual: ${finalDb.memories.length})`
      );

      const headings = new Set(finalDb.memories.map((m) => m.heading));
      const allFound = Array.from({ length: concurrentWritesCount }).every((_, i) =>
        headings.has(`Memory #${i + 1}`)
      );
      harness.assert(allFound, 'All memory headings from concurrent operations exist in the database');
    }

    // Test Case 2: Schema validation rejection on invalid update
    // USE: updateDb (Unit), when an invalid update payload is produced (Scenario), should reject and preserve database integrity (Expectation)
    {
      console.log('\nTest 2: updateDb (Unit), when an invalid update payload is produced (Scenario), should reject and preserve database integrity (Expectation)');

      let threwError = false;
      try {
        await updateDb((current) => {
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

      harness.assert(threwError, 'updateDb rejected invalid database state with validation error');
      const unchangedDb = await readDb();
      harness.assert(
        unchangedDb.config.anniversaryDate === '',
        'Database on disk preserved original valid state without corruption'
      );
    }

    // Test Case 3: Deadlock prevention after failure
    // USE: updateDb (Unit), when an update in the queue rejects (Scenario), should continue processing subsequent updates (Expectation)
    {
      console.log('\nTest 3: updateDb (Unit), when an update in the queue rejects (Scenario), should continue processing subsequent updates (Expectation)');

      const failedTask = updateDb(() => {
        throw new Error('Simulated transient failure inside updater');
      });

      const successfulTask = updateDb((current) => {
        return {
          ...current,
          config: {
            anniversaryDate: '2025-10-15',
          },
        };
      });

      let failureCaught = false;
      try {
        await failedTask;
      } catch {
        failureCaught = true;
      }

      const finalDb = await successfulTask;

      harness.assert(failureCaught, 'Failed task correctly threw error');
      harness.assert(
        finalDb.config.anniversaryDate === '2025-10-15',
        'Subsequent task in queue processed successfully after prior error without deadlocking'
      );

      const persistedDb = await readDb();
      harness.assert(
        persistedDb.config.anniversaryDate === '2025-10-15',
        'Subsequent task changes are accurately persisted to disk'
      );
    }

    // Test Case 4: verifyPassword functionality
    // USE: verifyPassword (Unit), when checking valid/invalid passwords (Scenario), should perform constant-time comparison (Expectation)
    {
      console.log('\nTest 4: verifyPassword (Unit), when checking valid/invalid passwords (Scenario), should return correct match boolean (Expectation)');

      const { verifyPassword } = await import('../lib/auth/session');
      const validMatch = await verifyPassword('12345678901234567890');
      const invalidMatch = await verifyPassword('wrongpassword1234567');
      const shortMatch = await verifyPassword('short');

      harness.assert(validMatch === true, 'Correct password returns true');
      harness.assert(invalidMatch === false, 'Incorrect 20-char password returns false');
      harness.assert(shortMatch === false, 'Different length password returns false');
    }

    harness.finish('Storage db.ts');
  } finally {
    await temp.cleanup();
  }
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
