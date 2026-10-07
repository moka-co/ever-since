import { useTempDb, TestHarness } from './helpers';
import { readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger, getClientIp } from '../lib/logger';

async function main() {
  const harness = new TestHarness();
  const temp = await useTempDb('12345678901234567890');

  try {
    console.log('--- Starting Logger Verification Tests ---');

    // Test 1: In test mode, logger is silent and does NOT log to eversince.logs file
    {
      console.log('\nTest 1: Default logger in test environment is silent');
      const { logger } = await import('../lib/logger');
      logger.info({ message: 'This should not be written to file' });
      harness.assert(
        logger.level === 'silent',
        'Default logger level is silent in test mode'
      );
    }

    // Test 2: IP address extraction helper
    {
      console.log('\nTest 2: getClientIp extracts IP from request headers');
      const reqForwarded = new Request('http://localhost:3000/api/config', {
        headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' },
      });
      harness.assert(
        getClientIp(reqForwarded) === '203.0.113.195',
        `Correctly parsed forwarded IP: ${getClientIp(reqForwarded)}`
      );

      const reqRealIp = new Request('http://localhost:3000/api/config', {
        headers: { 'x-real-ip': '198.51.100.1' },
      });
      harness.assert(
        getClientIp(reqRealIp) === '198.51.100.1',
        `Correctly parsed x-real-ip: ${getClientIp(reqRealIp)}`
      );

      const reqFallback = new Request('http://localhost:3000/api/config');
      harness.assert(
        getClientIp(reqFallback) === '127.0.0.1',
        `Correct fallback to 127.0.0.1: ${getClientIp(reqFallback)}`
      );
    }

    // Test 3: Asynchronous JSON logging to custom log destination
    {
      console.log('\nTest 3: Asynchronous JSON logging to file');
      const testLogPath = join(temp.dir, 'test-eversince.logs');
      const activeLogger = createLogger(testLogPath);

      activeLogger.info(
        {
          event: 'login_attempt',
          ip: '192.168.1.50',
          success: true,
        },
        'Login attempt successful from IP 192.168.1.50'
      );

      activeLogger.info(
        {
          event: 'api_call',
          method: 'GET',
          pathname: '/api/config',
          ip: '192.168.1.50',
        },
        'API call: GET /api/config from 192.168.1.50'
      );

      activeLogger.info(
        {
          event: 'db_write',
          dbPath: temp.dbPath,
        },
        'Database written successfully'
      );

      activeLogger.info(
        {
          event: 'media_write',
          filePath: join(temp.mediaDir, '1.png'),
          bytes: 1024,
        },
        'Media file written to disk'
      );

      // Wait a short tick for asynchronous SonicBoom flush
      await new Promise((r) => setTimeout(r, 200));

      harness.assert(existsSync(testLogPath), 'Log file was created at destination');

      const logContent = await readFile(testLogPath, 'utf8');
      const lines = logContent.trim().split('\n').filter(Boolean);
      harness.assert(lines.length === 4, `Log file contains 4 entries (got ${lines.length})`);

      // Verify JSON format of each log entry
      for (const line of lines) {
        let parsed: Record<string, unknown> | null = null;
        try {
          parsed = JSON.parse(line);
        } catch {
          parsed = null;
        }
        harness.assert(parsed !== null, 'Log entry is valid JSON');
        harness.assert(typeof parsed?.level === 'number', 'Log entry contains numeric Pino level');
        harness.assert(typeof parsed?.time === 'number', 'Log entry contains timestamp');
        harness.assert(Boolean(parsed?.event), `Log entry contains event field (${parsed?.event})`);
      }

      await rm(testLogPath, { force: true }).catch(() => {});
    }

    // Test 4: Pino redaction masks secret property
    {
      console.log('\nTest 4: Pino redaction masks secret property in logs');
      const pino = (await import('pino')).default;
      const testLogPath = join(temp.dir, 'test-redact.logs');
      const redactLogger = pino(
        { redact: ['secret'] },
        pino.destination({ dest: testLogPath, sync: true })
      );

      redactLogger.info({ event: 'startup_secret_generated', secret: 'super-sensitive-token' }, 'Startup - Generated secret');

      const logContent = await readFile(testLogPath, 'utf8');
      const parsed = JSON.parse(logContent.trim());
      harness.assert(parsed.secret === '[Redacted]', `Secret was properly redacted (got: ${parsed.secret})`);
      harness.assert(!logContent.includes('super-sensitive-token'), 'Plaintext secret is not present in redacted log');

      await rm(testLogPath, { force: true }).catch(() => {});
    }

    harness.finish('Logger Verification');
  } finally {
    await temp.cleanup();
  }
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
