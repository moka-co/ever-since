import { useTempDb, TestHarness } from './helpers';
import { NextRequest } from 'next/server';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

async function main() {
  const harness = new TestHarness();
  const temp = await useTempDb('12345678901234567890');

  const testBannedIpPath = join(temp.dir, 'banned_ip.log');
  process.env.BANNED_IP_PATH = testBannedIpPath;

  try {
    console.log('--- Starting Lockout Verification Tests ---');

    const {
      isIpBanned,
      recordFailedAttempt,
      resetFailedAttempts,
    } = await import('../lib/auth/lockout');

    // Test 1: Initial state - IP is not banned
    {
      console.log('\nTest 1: Initial state - IP is not banned');
      const banned = await isIpBanned('192.168.1.100');
      harness.assert(!banned, 'IP is initially not banned');
      harness.assert(!existsSync(testBannedIpPath), 'banned_ip.log does not exist initially');
    }

    // Test 2: Failed attempts 1 through 4 do not ban
    {
      console.log('\nTest 2: Failed attempts 1 to 4 do not trigger ban');
      for (let i = 1; i <= 4; i++) {
        const result = await recordFailedAttempt('192.168.1.100');
        harness.assert(!result.banned, `Attempt ${i} does not ban`);
        harness.assert(result.attempts === i, `Attempt count is ${i}`);
      }
      harness.assert(!existsSync(testBannedIpPath), 'banned_ip.log not created before 5 attempts');
    }

    // Test 3: 5th failed attempt triggers ban and persists to banned_ip.log
    {
      console.log('\nTest 3: 5th failed attempt triggers lockout and writes banned_ip.log');
      const result = await recordFailedAttempt('192.168.1.100');
      harness.assert(result.banned, '5th attempt triggers ban');
      harness.assert(result.attempts === 5, 'Attempt count is 5');
      harness.assert(existsSync(testBannedIpPath), 'banned_ip.log exists after 5th attempt');

      const content = await readFile(testBannedIpPath, 'utf8');
      harness.assert(content.includes('192.168.1.100'), 'banned_ip.log contains banned IP');

      const isBannedNow = await isIpBanned('192.168.1.100');
      harness.assert(isBannedNow, 'isIpBanned returns true for banned IP');
    }

    // Test 4: Different IP is tracked independently
    {
      console.log('\nTest 4: Different IP is tracked independently');
      const isOtherBanned = await isIpBanned('10.0.0.1');
      harness.assert(!isOtherBanned, 'Different IP is not banned');

      const otherResult = await recordFailedAttempt('10.0.0.1');
      harness.assert(!otherResult.banned, 'Other IP attempt 1 is not banned');
      harness.assert(otherResult.attempts === 1, 'Other IP count is 1');
    }

    // Test 5: resetFailedAttempts clears failed attempt counter
    {
      console.log('\nTest 5: resetFailedAttempts clears failed attempt counter');
      resetFailedAttempts('10.0.0.1');
      const retryResult = await recordFailedAttempt('10.0.0.1');
      harness.assert(retryResult.attempts === 1, 'Counter restarted from 1 after reset');
    }

    // Test 6: POST /api/auth/login API lockout integration
    {
      console.log('\nTest 6: POST /api/auth/login route lockout enforcement');
      const { POST } = await import('../app/api/auth/login/route');

      const callLogin = async (password: string, ip: string) => {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': ip,
          },
          body: JSON.stringify({ password }),
        });
        return await POST(req);
      };

      const attackerIp = '192.168.1.50';

      // 4 failed attempts return 401
      for (let i = 1; i <= 4; i++) {
        const res = await callLogin('wrong-pass', attackerIp);
        harness.assert(res.status === 401, `API login failed attempt ${i} returns 401`);
        const data = await res.json();
        harness.assert(data.authenticated === false, `Attempt ${i} returns authenticated: false`);
      }

      // 5th failed attempt returns 403 Forbidden with lockout error
      const lockedRes = await callLogin('wrong-pass', attackerIp);
      harness.assert(lockedRes.status === 403, '5th failed attempt returns 403 Forbidden');
      const lockedData = await lockedRes.json();
      harness.assert(lockedData.authenticated === false, '5th attempt returns authenticated: false');
      harness.assert(
        lockedData.error === 'IP is locked out due to too many failed login attempts',
        '5th attempt returns lockout error message'
      );

      // 6th attempt with correct password is still rejected with 403 Forbidden
      const bannedWithCorrectPass = await callLogin('12345678901234567890', attackerIp);
      harness.assert(bannedWithCorrectPass.status === 403, 'Subsequent login from banned IP is rejected with 403');
      const bannedData = await bannedWithCorrectPass.json();
      harness.assert(bannedData.authenticated === false, 'Banned IP login returns authenticated: false');

      // Different IP is unaffected
      const innocentIp = '192.168.1.51';
      const innocentRes = await callLogin('wrong-pass', innocentIp);
      harness.assert(innocentRes.status === 401, 'Different IP first failed attempt returns 401 (not 403)');

      // Counter reset on successful login
      const resetTestIp = '192.168.1.52';
      for (let i = 1; i <= 4; i++) {
        const res = await callLogin('wrong-pass', resetTestIp);
        harness.assert(res.status === 401, `Reset test attempt ${i} returns 401`);
      }
      const successRes = await callLogin('12345678901234567890', resetTestIp);
      harness.assert(successRes.status === 200, '4th failed attempt followed by valid password returns 200');

      // Subsequent 1 failed attempt should be attempt 1, returning 401, not 403
      const afterSuccessRes = await callLogin('wrong-pass', resetTestIp);
      harness.assert(afterSuccessRes.status === 401, 'Attempt after reset returns 401, not locked out');
    }

    harness.finish('Lockout Verification');
  } finally {
    delete process.env.BANNED_IP_PATH;
    await temp.cleanup();
  }
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
