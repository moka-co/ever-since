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
 * Helper to extract client IP from incoming requests.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  if ('ip' in request && typeof (request as { ip?: string }).ip === 'string') {
    return (request as { ip: string }).ip;
  }
  return '127.0.0.1';
}
