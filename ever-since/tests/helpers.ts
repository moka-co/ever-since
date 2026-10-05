import Module from 'node:module';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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

export class TestHarness {
  private failures = 0;

  assert(condition: boolean, message: string) {
    if (!condition) {
      console.error(`FAIL: ${message}`);
      this.failures++;
    } else {
      console.log(`PASS: ${message}`);
    }
  }

  finish(suiteName: string) {
    console.log(
      `\n--- ${suiteName} Finished: ${
        this.failures === 0 ? 'ALL TESTS PASSED' : `${this.failures} FAILURES`
      } ---`
    );
    if (this.failures > 0) {
      process.exit(1);
    }
  }
}

export interface TempContext {
  dir: string;
  dbPath: string;
  mediaDir: string;
  cleanup: () => Promise<void>;
}

export async function useTempDb(initialSecret = '12345678901234567890'): Promise<TempContext> {
  const dir = await mkdtemp(join(tmpdir(), 'ever-since-test-'));
  const dbPath = join(dir, 'db.json');
  const mediaDir = join(dir, 'media');

  await mkdir(mediaDir, { recursive: true });

  const { createDefaultDb } = await import('../lib/storage/schema');
  const defaultData = createDefaultDb({ value: initialSecret });
  await writeFile(dbPath, JSON.stringify(defaultData, null, 2), 'utf8');

  process.env.DB_PATH = dbPath;
  process.env.MEDIA_DIR = mediaDir;

  return {
    dir,
    dbPath,
    mediaDir,
    cleanup: async () => {
      delete process.env.DB_PATH;
      delete process.env.MEDIA_DIR;
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    },
  };
}
