import 'server-only';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dbSchema, type DatabaseSchema } from './schema';

const DEFAULT_DB_PATH = resolve(process.cwd(), 'data', 'db.json');

export class WriteQueue {
  private readonly dbPath: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(dbPath: string = DEFAULT_DB_PATH) {
    this.dbPath = dbPath;
  }

  /**
   * Enqueues an arbitrary asynchronous operation, guaranteeing sequential FIFO execution.
   */
  async enqueue<T>(operation: () => Promise<T> | T): Promise<T> {
    const resultPromise = new Promise<T>((resolveTask, rejectTask) => {
      this.queue = this.queue
        .catch(() => {
          // Prevent earlier errors from deadlocking subsequent queued tasks
        })
        .then(async () => {
          try {
            const result = await operation();
            resolveTask(result);
          } catch (error) {
            rejectTask(error);
          }
        });
    });

    return resultPromise;
  }

  /**
   * Serializes a read-modify-write transaction on db.json:
   * 1. Reads current db.json from disk
   * 2. Executes updater(current)
   * 3. Validates updated data against dbSchema
   * 4. Writes validated JSON back to disk
   */
  async update(
    updater: (current: DatabaseSchema) => Promise<DatabaseSchema> | DatabaseSchema
  ): Promise<DatabaseSchema> {
    return this.enqueue(async () => {
      try {
        const raw = await readFile(this.dbPath, 'utf8');
        const current = dbSchema.parse(JSON.parse(raw));
        const updated = await updater(current);
        const validated = dbSchema.parse(updated);
        await writeFile(this.dbPath, JSON.stringify(validated, null, 2), 'utf8');
        return validated;
      } catch (error) {
        console.error(`[WriteQueue] Update failed for ${this.dbPath}:`, error);
        throw error;
      }
    });
  }
}

export const writeQueue = new WriteQueue();
