import 'server-only';
import pino from 'pino';
import { resolve } from 'node:path';

// Resolved log file path (defaults to eversince.logs in current working directory)
export const LOG_FILE_PATH = process.env.LOG_FILE_PATH ?? resolve(process.cwd(), 'eversince.logs');

/**
 * Creates the pino logger instance.
 * - Logs are saved to eversince.logs.
 * - Logs are always written asynchronously (sync: false).
 * - Logs are formatted in JSON.
 * - In test mode (NODE_ENV === 'test' unless FORCE_LOG=true), logger is silent so tests are NOT logged to file.
 */
export function createLogger(customDest?: string): pino.Logger {
  // If running in browser or environment without pino.destination, return standard browser-safe logger
  if (typeof window !== 'undefined' || typeof pino.destination !== 'function') {
    return pino();
  }

  const isTest = process.env.NODE_ENV === 'test' && !process.env.FORCE_LOG;

  if (isTest && !customDest) {
    return pino({ level: 'silent' });
  }

  const destPath = customDest ?? LOG_FILE_PATH;
  const destination = pino.destination({
    dest: destPath,
    sync: false,
    mkdir: true,
  });

  return pino(
    {
      level: process.env.LOG_LEVEL || 'info',
      redact: [
        'secret',
        '*.secret',
        'secret.value',
        '*.secret.value',
        'password',
        '*.password',
      ],
    },
    destination
  );
}

export const logger = createLogger();

/**
 * Normalizes an IP address to IPv4 format:
 * - Maps IPv6 localhost '::1' to '127.0.0.1'
 * - Strips IPv4-mapped IPv6 prefix '::ffff:192.0.2.1' -> '192.0.2.1'
 */
export function normalizeToIpv4(ip: string): string {
  const trimmed = ip.trim();

  // Strip IPv6 brackets if present, e.g. [::1] or [::ffff:127.0.0.1]
  const unbracketed = trimmed.replace(/^\[(.*)\]$/, '$1');

  // IPv6 loopback
  if (unbracketed === '::1') {
    return '127.0.0.1';
  }

  // IPv4-mapped IPv6 address (e.g., ::ffff:192.168.1.1 or ::ffff:127.0.0.1)
  const mappedMatch = unbracketed.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (mappedMatch) {
    return mappedMatch[1];
  }

  return unbracketed;
}

/**
 * Helper to extract client IP from incoming requests and return in IPv4 format.
 */
export function getClientIp(request: Request): string {
  let rawIp = '';

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    rawIp = forwarded.split(',')[0].trim();
  } else {
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      rawIp = realIp.trim();
    } else if ('ip' in request && typeof (request as { ip?: string }).ip === 'string') {
      rawIp = (request as { ip: string }).ip.trim();
    }
  }

  if (!rawIp) {
    return '127.0.0.1';
  }

  return normalizeToIpv4(rawIp);
}
