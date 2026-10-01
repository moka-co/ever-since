import 'server-only';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { dbSchema, secretSchema, type DatabaseSchema } from './schema';
import { WriteQueue, writeQueue } from './queue';

const DEFAULT_DB_PATH = resolve(process.cwd(), 'data', 'db.json');

export class JsonDatabaseClient {
  protected readonly dbPath: string;
  protected readonly queue: WriteQueue;

  constructor(dbPath: string = DEFAULT_DB_PATH, queue?: WriteQueue) {
    this.dbPath = dbPath;
    this.queue = queue ?? (dbPath === DEFAULT_DB_PATH ? writeQueue : new WriteQueue(dbPath));
  }

  /**
   * Reads and validates the full database JSON against `dbSchema`.
   */
  async read(): Promise<DatabaseSchema> {
    const raw = await readFile(this.dbPath, 'utf8');
    const parsed = JSON.parse(raw);
    return dbSchema.parse(parsed);
  }

  /**
   * Retrieves the 20-character shared secret from the database and validates it via `secretSchema`.
   */
  async getSecret(): Promise<string> {
    const data = await this.read();
    const validatedSecret = secretSchema.parse(data.secret);
    return validatedSecret.value;
  }

  /**
   * Checks whether a candidate password matches the secret stored in the database
   * using constant-time comparison. Returns only `true` or `false`.
   */
  async verifySecret(candidate: string): Promise<boolean> {
    try {
      const storedSecret = await this.getSecret();
      const candidateBuf = Buffer.from(candidate, 'utf8');
      const secretBuf = Buffer.from(storedSecret, 'utf8');

      if (candidateBuf.length !== secretBuf.length) {
        return false;
      }

      return timingSafeEqual(candidateBuf, secretBuf);
    } catch {
      return false;
    }
  }

  /**
   * Safely updates the database via the write queue in a serialized read-modify-write transaction.
   */
  async update(
    updater: (current: DatabaseSchema) => Promise<DatabaseSchema> | DatabaseSchema
  ): Promise<DatabaseSchema> {
    return this.queue.update(updater);
  }
}

export const dbClient = new JsonDatabaseClient();
