import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Translates an unexpected server-side failure into a short, specific,
 * non-technical reason that can be shown in the /customize dashboard.
 * Full details (stack traces, internal paths) are only written to the server log.
 */
export function describeServerError(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  switch (code) {
    case 'ENOSPC':
      return 'The server has run out of disk space.';
    case 'EACCES':
    case 'EPERM':
      return 'The server does not have permission to read or write its data files.';
    case 'ENOENT':
      return 'A required data file or folder is missing on the server.';
    case 'EBUSY':
    case 'EMFILE':
      return 'A data file is temporarily busy. Please try again in a moment.';
  }
  if (error instanceof SyntaxError) {
    return 'The stored data file is damaged or is not valid JSON.';
  }
  if (error instanceof TypeError) {
    return 'The server code is out of date or inconsistent. Restarting the app usually fixes this.';
  }
  if (error instanceof Error && error.message) {
    return `Unexpected error: ${error.message}`;
  }
  return 'An unexpected error occurred.';
}

/**
 * @param context Log tag, e.g. 'API /api/memories POST'.
 * @param action  What the user was trying to do, phrased to follow "Could not",
 *                e.g. 'create the memory'.
 */
export function errorResponse(
  error: unknown,
  context: string,
  action = 'complete the request'
): NextResponse {
  if (error instanceof ZodError) {
    const message = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return NextResponse.json({ error: message }, { status: 400 });
  }
  console.error(`[${context}]`, error);
  return NextResponse.json(
    { error: `Could not ${action}. ${describeServerError(error)}` },
    { status: 500 }
  );
}
