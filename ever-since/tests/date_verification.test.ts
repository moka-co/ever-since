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
    console.log('--- Starting Date Verification & Escalating Feedback Tests ---');

    const {
      verifyDateMatch,
      getEscalatingDateMessage,
      recordFailedDateAttempt,
      getDateLockoutStatus,
      resetDateAttempts,
      clearAllDateLockouts,
      MAX_DATE_ATTEMPTS,
      DATE_COOLDOWN_SECONDS,
    } = await import('../lib/auth/date-lockout');

    const { updateDb } = await import('../lib/storage/db');

    // Test 1: verifyDateMatch unit tests
    {
      console.log('\nTest 1: verifyDateMatch (Unit), when matching various date inputs');
      // Unconfigured date accepts any valid calendar date
      harness.assert(
        verifyDateMatch('14', '5', '2024', '') === true,
        'Empty configured date accepts valid date'
      );

      // Configured date matches exact date with padding
      harness.assert(
        verifyDateMatch('14', '05', '2024', '2024-05-14') === true,
        'Exact date matches'
      );
      harness.assert(
        verifyDateMatch('14', '5', '2024', '2024-05-14') === true,
        'Single-digit month matches with padding'
      );
      harness.assert(
        verifyDateMatch('5', '5', '2024', '2024-05-05') === true,
        'Single-digit day and month match with padding'
      );

      // Mismatch
      harness.assert(
        verifyDateMatch('15', '05', '2024', '2024-05-14') === false,
        'Mismatching day is rejected'
      );
      harness.assert(
        verifyDateMatch('14', '06', '2024', '2024-05-14') === false,
        'Mismatching month is rejected'
      );
      harness.assert(
        verifyDateMatch('14', '05', '2023', '2024-05-14') === false,
        'Mismatching year is rejected'
      );

      // Invalid calendar syntax
      harness.assert(
        verifyDateMatch('32', '05', '2024', '2024-05-14') === false,
        'Invalid day (32) is rejected'
      );
      harness.assert(
        verifyDateMatch('14', '13', '2024', '2024-05-14') === false,
        'Invalid month (13) is rejected'
      );
    }

    // Test 2: getEscalatingDateMessage exact copy validation
    {
      console.log('\nTest 2: getEscalatingDateMessage (Unit), returns exact playful copy');
      harness.assert(
        getEscalatingDateMessage(1) === "I'm crying, 3 tries left",
        'Attempt 1 returns "I\'m crying, 3 tries left"'
      );
      harness.assert(
        getEscalatingDateMessage(2) === "Why do you hate me, 2 tries left",
        'Attempt 2 returns "Why do you hate me, 2 tries left"'
      );
      harness.assert(
        getEscalatingDateMessage(3) === "You're almost single, 1 try left",
        'Attempt 3 returns "You\'re almost single, 1 try left"'
      );
      harness.assert(
        getEscalatingDateMessage(4) === '',
        'Attempt 4 has empty message (handled by lockout)'
      );
    }

    // Test 3: Date lockout unit tracking and 30-second cooldown
    {
      console.log('\nTest 3: DateLockout (Unit), 3 attempts before 30-second cooldown');
      clearAllDateLockouts();
      const testIp = '192.168.10.1';

      // Attempts 1 to 3 do not lock out
      for (let i = 1; i <= MAX_DATE_ATTEMPTS; i++) {
        const result = recordFailedDateAttempt(testIp);
        harness.assert(result.attempts === i, `Attempt ${i} recorded`);
        harness.assert(!result.isLockedOut, `Attempt ${i} does not trigger lockout`);
        harness.assert(!result.cooldownJustActivated, `Cooldown not activated on attempt ${i}`);
        harness.assert(result.message === getEscalatingDateMessage(i), `Message matches attempt ${i}`);
      }

      // 4th failed attempt triggers 30-second cooldown lockout
      const lockoutResult = recordFailedDateAttempt(testIp);
      harness.assert(lockoutResult.isLockedOut === true, '4th failure triggers lockout');
      harness.assert(lockoutResult.cooldownJustActivated === true, 'cooldownJustActivated is true');
      harness.assert(lockoutResult.remainingSeconds === DATE_COOLDOWN_SECONDS, 'Cooldown is 30 seconds');
      harness.assert(
        lockoutResult.message.includes("Don't talk to me for"),
        'Lockout message format is correct'
      );

      // Check getDateLockoutStatus returns active lockout
      const status = getDateLockoutStatus(testIp);
      harness.assert(status.isLockedOut === true, 'Status reflects active lockout');
      harness.assert(status.remainingSeconds > 0, 'Status has positive remaining seconds');

      // Reset clears attempts
      resetDateAttempts(testIp);
      const resetStatus = getDateLockoutStatus(testIp);
      harness.assert(!resetStatus.isLockedOut, 'Reset clears lockout');
      harness.assert(resetStatus.attempts === 0, 'Reset clears attempts count');
    }

    // Test 4: API integration for GET & POST /api/auth/verify-date
    {
      console.log('\nTest 4: POST & GET /api/auth/verify-date (Integration)');
      clearAllDateLockouts();

      // Configure anniversary date in temp DB
      await updateDb((currentDb) => ({
        ...currentDb,
        config: {
          ...currentDb.config,
          anniversaryDate: '2024-05-14',
        },
      }));

      const { POST, GET } = await import('../app/api/auth/verify-date/route');

      const callVerifyDate = async (body: { day: string; month: string; year: string }, ip: string) => {
        const req = new NextRequest('http://localhost:3000/api/auth/verify-date', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': ip,
          },
          body: JSON.stringify(body),
        });
        return await POST(req);
      };

      const callGetStatus = async (ip: string) => {
        const req = new NextRequest('http://localhost:3000/api/auth/verify-date', {
          method: 'GET',
          headers: {
            'x-forwarded-for': ip,
          },
        });
        return await GET(req);
      };

      const partnerIp = '192.168.20.5';

      // Initial GET returns unlocked state
      const initialGetRes = await callGetStatus(partnerIp);
      harness.assert(initialGetRes.status === 200, 'Initial GET returns 200');
      const initialGetData = await initialGetRes.json();
      harness.assert(!initialGetData.isLockedOut, 'Initial GET indicates not locked out');

      // Attempt 1: wrong date returns 400 with "I'm crying, 3 tries left"
      const res1 = await callVerifyDate({ day: '1', month: '1', year: '2024' }, partnerIp);
      harness.assert(res1.status === 400, 'Attempt 1 returns 400');
      const data1 = await res1.json();
      harness.assert(data1.valid === false, 'valid is false');
      harness.assert(data1.attempts === 1, 'attempts is 1');
      harness.assert(data1.message === "I'm crying, 3 tries left", 'Attempt 1 copy verified');

      // Attempt 2: wrong date returns 400 with "Why do you hate me, 2 tries left"
      const res2 = await callVerifyDate({ day: '2', month: '1', year: '2024' }, partnerIp);
      harness.assert(res2.status === 400, 'Attempt 2 returns 400');
      const data2 = await res2.json();
      harness.assert(data2.attempts === 2, 'attempts is 2');
      harness.assert(data2.message === "Why do you hate me, 2 tries left", 'Attempt 2 copy verified');

      // Attempt 3: wrong date returns 400 with "You're almost single, 1 try left"
      const res3 = await callVerifyDate({ day: '3', month: '1', year: '2024' }, partnerIp);
      harness.assert(res3.status === 400, 'Attempt 3 returns 400');
      const data3 = await res3.json();
      harness.assert(data3.attempts === 3, 'attempts is 3');
      harness.assert(data3.message === "You're almost single, 1 try left", 'Attempt 3 copy verified');

      // Attempt 4: triggers 429 lockout with 30s cooldown
      const res4 = await callVerifyDate({ day: '4', month: '1', year: '2024' }, partnerIp);
      harness.assert(res4.status === 429, 'Attempt 4 returns 429 Too Many Requests');
      const data4 = await res4.json();
      harness.assert(data4.lockedOut === true, 'lockedOut is true on attempt 4');
      harness.assert(data4.remainingSeconds === 30, 'remainingSeconds is 30');
      harness.assert(data4.message.includes("Don't talk to me for"), 'Lockout message formatted correctly');

      // GET reflects the lockout
      const lockGetRes = await callGetStatus(partnerIp);
      const lockGetData = await lockGetRes.json();
      harness.assert(lockGetData.isLockedOut === true, 'GET confirms active lockout');

      // Date failure should NOT write to password banned_ip.log
      harness.assert(!existsSync(testBannedIpPath), 'Date failure does not ban IP for password auth');
    }

    // Test 5: Successful date verification resets counter and returns 200
    {
      console.log('\nTest 5: Successful date entry returns 200 and resets attempts');
      clearAllDateLockouts();
      const freshIp = '192.168.20.6';
      const { POST } = await import('../app/api/auth/verify-date/route');

      // Make 1 failed attempt
      const failReq = new NextRequest('http://localhost:3000/api/auth/verify-date', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': freshIp,
        },
        body: JSON.stringify({ day: '1', month: '1', year: '2024' }),
      });
      await POST(failReq);
      harness.assert(getDateLockoutStatus(freshIp).attempts === 1, 'Attempt recorded');

      // Submit matching date (14 / 05 / 2024)
      const successReq = new NextRequest('http://localhost:3000/api/auth/verify-date', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': freshIp,
        },
        body: JSON.stringify({ day: '14', month: '5', year: '2024' }),
      });
      const successRes = await POST(successReq);
      harness.assert(successRes.status === 200, 'Matching date returns 200');
      const successData = await successRes.json();
      harness.assert(successData.valid === true, 'valid is true');
      harness.assert(getDateLockoutStatus(freshIp).attempts === 0, 'Counter reset to 0 after success');
    }

    harness.finish('Date Verification & Escalating Feedback');
  } finally {
    delete process.env.BANNED_IP_PATH;
    await temp.cleanup();
  }
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
