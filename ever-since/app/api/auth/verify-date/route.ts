import { NextRequest, NextResponse } from 'next/server';
import { readDb } from '@/lib/storage/db';
import { logger, getClientIp } from '@/lib/logger';
import {
  getDateLockoutStatus,
  recordFailedDateAttempt,
  resetDateAttempts,
  verifyDateMatch,
} from '@/lib/auth/date-lockout';

/**
 * GET /api/auth/verify-date
 * Returns current date verification lockout status and remaining cooldown seconds.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const status = getDateLockoutStatus(ip);

  return NextResponse.json(status, { status: 200 });
}

/**
 * POST /api/auth/verify-date
 * Verifies the entered date against the configured anniversary date.
 * Enforces a maximum of 3 attempts before a 30-second cooldown lockout.
 * Emits Pino log ONLY when the cooldown is activated.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const currentStatus = getDateLockoutStatus(ip);

  if (currentStatus.isLockedOut) {
    return NextResponse.json(
      {
        valid: false,
        lockedOut: true,
        remainingSeconds: currentStatus.remainingSeconds,
        message: `Don't talk to me for ${currentStatus.remainingSeconds}s...`,
      },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    day?: unknown;
    month?: unknown;
    year?: unknown;
  };

  const day = typeof body.day === 'string' ? body.day : String(body.day ?? '');
  const month = typeof body.month === 'string' ? body.month : String(body.month ?? '');
  const year = typeof body.year === 'string' ? body.year : String(body.year ?? '');

  const db = await readDb();
  const configuredDate = db.config.anniversaryDate;

  const isValid = verifyDateMatch(day, month, year, configuredDate);

  if (isValid) {
    resetDateAttempts(ip);
    return NextResponse.json({ valid: true }, { status: 200 });
  }

  const result = recordFailedDateAttempt(ip);

  // Logging requirement: Log ONLY when the cooldown is activated
  if (result.cooldownJustActivated) {
    logger.warn(
      {
        event: 'date_cooldown_activated',
        ip,
        cooldownSeconds: result.remainingSeconds,
      },
      `Date lockout cooldown activated for IP ${ip}`
    );
  }

  if (result.isLockedOut) {
    return NextResponse.json(
      {
        valid: false,
        attempts: result.attempts,
        lockedOut: true,
        remainingSeconds: result.remainingSeconds,
        message: result.message,
      },
      { status: 429 }
    );
  }

  return NextResponse.json(
    {
      valid: false,
      attempts: result.attempts,
      lockedOut: false,
      message: result.message,
    },
    { status: 400 }
  );
}
