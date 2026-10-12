import Module from 'node:module';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
// Set NODE_ENV to test to ensure file logging is disabled during test suites
(process.env as Record<string, string | undefined>).NODE_ENV = 'test';

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
  bannedIpPath: string;
  cleanup: () => Promise<void>;
}

export async function useTempDb(initialSecret = '12345678901234567890'): Promise<TempContext> {
  const dir = await mkdtemp(join(tmpdir(), 'ever-since-test-'));
  const dbPath = join(dir, 'db.json');
  const mediaDir = join(dir, 'media');
  const bannedIpPath = join(dir, 'banned_ip.log');

  await mkdir(mediaDir, { recursive: true });

  const { createDefaultDb } = await import('../lib/storage/schema');
  const defaultData = createDefaultDb({ value: initialSecret });
  await writeFile(dbPath, JSON.stringify(defaultData, null, 2), 'utf8');

  process.env.DB_PATH = dbPath;
  process.env.MEDIA_DIR = mediaDir;
  process.env.BANNED_IP_PATH = bannedIpPath;

  return {
    dir,
    dbPath,
    mediaDir,
    bannedIpPath,
    cleanup: async () => {
      delete process.env.DB_PATH;
      delete process.env.MEDIA_DIR;
      delete process.env.BANNED_IP_PATH;
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    },
  };
}

export interface SuiteContext {
  harness: TestHarness;
  temp: TempContext;
}

export interface SuiteOptions {
  initialSecret?: string;
}

export async function runTestSuite(
  suiteName: string,
  fn: (context: SuiteContext) => Promise<void> | void,
  options: SuiteOptions = {}
): Promise<void> {
  const harness = new TestHarness();
  const temp = await useTempDb(options.initialSecret);

  try {
    try {
      await fn({ harness, temp });
    } finally {
      await temp.cleanup();
    }
    harness.finish(suiteName);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

export const TEST_SUITES = [
  'tests/proxy.test.ts',
  'tests/db.test.ts',
  'tests/media.test.ts',
  'tests/memories_and_config.test.ts',
  'tests/logger.test.ts',
  'tests/lockout.test.ts',
  'tests/date_verification.test.ts',
  'tests/swipe_hint.test.ts',
  'tests/timeline_ui.test.ts',
  'tests/valentine_memory.test.ts',
] as const;

export function runSuiteProcess(suitePath: string): number {
  const result = spawnSync(process.execPath, ['--import', 'tsx', suitePath], {
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(`Failed to launch test suite ${suitePath}:`, result.error);
    return 1;
  }
  return result.status ?? 1;
}

export function runSuiteFiles(
  suites: readonly string[] = TEST_SUITES,
  runner: (suitePath: string) => number = runSuiteProcess
): number {
  for (const suite of suites) {
    const exitCode = runner(suite);
    if (exitCode !== 0) {
      return exitCode;
    }
  }
  return 0;
}

