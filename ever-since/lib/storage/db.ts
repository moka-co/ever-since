import 'server-only';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dbSchema, type DatabaseSchema } from './schema';

// DB_PATH is only overridden by tests.
export const DB_PATH = process.env.DB_PATH ?? resolve(process.cwd(), 'data', 'db.json');

export async function readDb(): Promise<DatabaseSchema> {
  return dbSchema.parse(JSON.parse(await readFile(DB_PATH, 'utf8')));
}

// Serializes read-modify-write cycles so concurrent requests never lose updates.
let queue: Promise<unknown> = Promise.resolve();

export function updateDb(
  updater: (db: DatabaseSchema) => DatabaseSchema | Promise<DatabaseSchema>
): Promise<DatabaseSchema> {
  const run = queue.then(async () => {
    const next = dbSchema.parse(await updater(await readDb()));
    await writeFile(DB_PATH, JSON.stringify(next, null, 2), 'utf8');
    return next;
  });
  queue = run.catch((error) => console.error('[db] update failed:', error));
  return run;
}
