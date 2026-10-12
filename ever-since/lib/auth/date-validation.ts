import { z } from 'zod';

const isoDateSchema = z.string().date();

/**
 * Pure calendar date validator shared by client and server.
 * Validates day (1..31), month (1..12), year (1900..2100), and real calendar rules
 * (month lengths and leap years). Returns normalized YYYY-MM-DD or null if invalid.
 */
export function parseCalendarDate(
  day: string,
  month: string,
  year: string
): string | null {
  const trimmedDay = day.trim();
  const trimmedMonth = month.trim();
  const trimmedYear = year.trim();

  if (
    !/^\d{1,2}$/.test(trimmedDay) ||
    !/^\d{1,2}$/.test(trimmedMonth) ||
    !/^\d{4}$/.test(trimmedYear)
  ) {
    return null;
  }

  const d = Number(trimmedDay);
  const m = Number(trimmedMonth);
  const y = Number(trimmedYear);

  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
    return null;
  }

  const utcDate = new Date(Date.UTC(y, m - 1, d));
  if (
    utcDate.getUTCFullYear() !== y ||
    utcDate.getUTCMonth() !== m - 1 ||
    utcDate.getUTCDate() !== d
  ) {
    return null;
  }

  const formatted = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (!isoDateSchema.safeParse(formatted).success) {
    return null;
  }

  return formatted;
}

/**
 * Returns true if day, month, and year form a valid calendar date between 1900 and 2100.
 */
export function isValidCalendarDate(
  day: string,
  month: string,
  year: string
): boolean {
  return parseCalendarDate(day, month, year) !== null;
}
