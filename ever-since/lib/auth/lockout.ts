import 'server-only';
import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { logger } from '../logger';

export const MAX_FAILED_ATTEMPTS = 5;

export function getBannedIpPath(): string {
  return process.env.BANNED_IP_PATH ?? resolve(process.cwd(), 'banned_ip.log');
}

const failedAttempts = new Map<string, number>();

/**
 * Loads the current set of banned IPs from the persistence log file.
 */
export async function loadBannedIps(): Promise<Set<string>> {
  const filePath = getBannedIpPath();
  if (!existsSync(filePath)) {
    return new Set();
  }

  try {
    const content = await readFile(filePath, 'utf8');
    const ips = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
    return new Set(ips);
  } catch (error) {
    logger.error(
      {
        event: 'read_banned_ip_error',
        filePath,
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to read banned IP file'
    );
    return new Set();
  }
}

/**
 * Checks whether an IP address is currently banned.
 */
export async function isIpBanned(ip: string): Promise<boolean> {
  const normalized = ip.trim();
  if (!normalized) return false;
  const bannedSet = await loadBannedIps();
  return bannedSet.has(normalized);
}

/**
 * Records a failed login attempt for an IP address.
 * If the IP reaches 5 failed attempts, it is appended to banned_ip.log and locked out.
 */
export async function recordFailedAttempt(
  ip: string
): Promise<{ banned: boolean; attempts: number }> {
  const normalized = ip.trim();
  const current = (failedAttempts.get(normalized) ?? 0) + 1;
  failedAttempts.set(normalized, current);

  if (current >= MAX_FAILED_ATTEMPTS) {
    const filePath = getBannedIpPath();
    await mkdir(dirname(filePath), { recursive: true });

    const bannedSet = await loadBannedIps();
    if (!bannedSet.has(normalized)) {
      await appendFile(filePath, `${normalized}\n`, 'utf8');
    }

    logger.warn(
      {
        event: 'ip_banned',
        ip: normalized,
        attempts: current,
      },
      `IP ${normalized} locked out after ${current} failed login attempts`
    );

    return { banned: true, attempts: current };
  }

  return { banned: false, attempts: current };
}

/**
 * Resets the failed attempts counter for an IP address upon successful login.
 */
export function resetFailedAttempts(ip: string): void {
  const normalized = ip.trim();
  failedAttempts.delete(normalized);
}
