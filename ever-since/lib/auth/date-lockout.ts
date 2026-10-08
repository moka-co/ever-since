import 'server-only';

export const MAX_DATE_ATTEMPTS = 3;
export const DATE_COOLDOWN_SECONDS = 30;

interface DateAttemptState {
  attempts: number;
  lockedUntil: number | null;
}

const dateAttemptsMap = new Map<string, DateAttemptState>();

/**
 * Returns the exact playful escalating copy for attempts 1 through 3.
 */
export function getEscalatingDateMessage(attempts: number): string {
  switch (attempts) {
    case 1:
      return "I'm crying, 3 tries left";
    case 2:
      return "Why do you hate me, 2 tries left";
    case 3:
      return "You're almost single, 1 try left";
    default:
      return "";
  }
}

/**
 * Verifies whether the entered day/month/year matches the configured anniversary date.
 * If configuredDate is empty, any valid calendar date succeeds.
 */
export function verifyDateMatch(
  day: string,
  month: string,
  year: string,
  configuredDate: string
): boolean {
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  if (
    isNaN(d) ||
    d < 1 ||
    d > 31 ||
    isNaN(m) ||
    m < 1 ||
    m > 12 ||
    isNaN(y) ||
    y < 1900 ||
    y > 2100
  ) {
    return false;
  }

  // If no date is configured in the database, allow any valid date format through
  if (!configuredDate || configuredDate.trim() === '') {
    return true;
  }

  const paddedDay = String(d).padStart(2, '0');
  const paddedMonth = String(m).padStart(2, '0');
  const paddedYear = String(y).padStart(4, '0');
  const formattedInput = `${paddedYear}-${paddedMonth}-${paddedDay}`;

  return formattedInput === configuredDate.trim();
}

/**
 * Returns the current date lockout status and remaining cooldown seconds for an IP.
 */
export function getDateLockoutStatus(ip: string): {
  attempts: number;
  isLockedOut: boolean;
  remainingSeconds: number;
} {
  const normalized = ip.trim();
  const entry = dateAttemptsMap.get(normalized);

  if (!entry) {
    return { attempts: 0, isLockedOut: false, remainingSeconds: 0 };
  }

  const now = Date.now();
  if (entry.lockedUntil) {
    if (entry.lockedUntil > now) {
      const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
      return { attempts: entry.attempts, isLockedOut: true, remainingSeconds };
    }
    // Cooldown expired: reset state
    dateAttemptsMap.delete(normalized);
    return { attempts: 0, isLockedOut: false, remainingSeconds: 0 };
  }

  return { attempts: entry.attempts, isLockedOut: false, remainingSeconds: 0 };
}

/**
 * Records a failed date verification attempt for an IP.
 * - Attempts 1 to 3 return the escalating playful copy.
 * - Attempt 4 (after 3 failures) activates the 30-second cooldown timer.
 */
export function recordFailedDateAttempt(ip: string): {
  attempts: number;
  isLockedOut: boolean;
  remainingSeconds: number;
  message: string;
  cooldownJustActivated: boolean;
} {
  const normalized = ip.trim();
  const status = getDateLockoutStatus(normalized);

  if (status.isLockedOut) {
    return {
      attempts: status.attempts,
      isLockedOut: true,
      remainingSeconds: status.remainingSeconds,
      message: `Don't talk to me for ${formatTime(status.remainingSeconds)}...`,
      cooldownJustActivated: false,
    };
  }

  const currentAttempts = status.attempts + 1;

  if (currentAttempts > MAX_DATE_ATTEMPTS) {
    const lockedUntil = Date.now() + DATE_COOLDOWN_SECONDS * 1000;
    dateAttemptsMap.set(normalized, {
      attempts: currentAttempts,
      lockedUntil,
    });

    return {
      attempts: currentAttempts,
      isLockedOut: true,
      remainingSeconds: DATE_COOLDOWN_SECONDS,
      message: `Don't talk to me for ${formatTime(DATE_COOLDOWN_SECONDS)}...`,
      cooldownJustActivated: true,
    };
  }

  dateAttemptsMap.set(normalized, {
    attempts: currentAttempts,
    lockedUntil: null,
  });

  return {
    attempts: currentAttempts,
    isLockedOut: false,
    remainingSeconds: 0,
    message: getEscalatingDateMessage(currentAttempts),
    cooldownJustActivated: false,
  };
}

/**
 * Resets the failed date attempts for an IP upon correct date submission.
 */
export function resetDateAttempts(ip: string): void {
  const normalized = ip.trim();
  dateAttemptsMap.delete(normalized);
}

/**
 * Helper to format seconds to MM:SS string.
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Clears all date lockout entries (test helper).
 */
export function clearAllDateLockouts(): void {
  dateAttemptsMap.clear();
}
