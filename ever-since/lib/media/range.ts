/**
 * Helper to parse HTTP Range header.
 * Formats supported:
 *  - bytes=0-499
 *  - bytes=500-
 *  - bytes=-500 (suffix bytes)
 *
 * Returns:
 *  - null: if header is missing or not bytes
 *  - 'invalid': if range cannot be satisfied (syntactically bad or out of bounds)
 *  - { start: number, end: number }: 0-indexed inclusive byte range
 */
export function parseRange(
  rangeHeader: string | null | undefined,
  totalSize: number
): { start: number; end: number } | 'invalid' | null {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
    return null;
  }

  const rangeSpec = rangeHeader.slice(6).trim();
  // We only support single ranges for media streaming
  if (rangeSpec.includes(',')) {
    return 'invalid';
  }

  const match = rangeSpec.match(/^(\d*)-(\d*)$/);
  if (!match) {
    return 'invalid';
  }

  const [, startStr, endStr] = match;

  if (startStr === '' && endStr === '') {
    return 'invalid';
  }

  let start: number;
  let end: number;

  if (startStr === '') {
    // Suffix byte range: e.g. -500 means last 500 bytes
    const suffixLength = parseInt(endStr, 10);
    if (isNaN(suffixLength) || suffixLength <= 0) return 'invalid';
    if (totalSize === 0) return 'invalid';
    start = Math.max(0, totalSize - suffixLength);
    end = totalSize - 1;
  } else if (endStr === '') {
    // Open-ended range: e.g. 500-
    start = parseInt(startStr, 10);
    if (isNaN(start) || start < 0) return 'invalid';
    if (totalSize === 0 || start >= totalSize) return 'invalid';
    end = totalSize - 1;
  } else {
    // Explicit range: e.g. 0-499
    start = parseInt(startStr, 10);
    end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end) || start < 0 || end < start) return 'invalid';
    if (totalSize === 0 || start >= totalSize) return 'invalid';
    end = Math.min(end, totalSize - 1);
  }

  return { start, end };
}
