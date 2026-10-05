import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function errorResponse(error: unknown, context: string): NextResponse {
  if (error instanceof ZodError) {
    const message = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return NextResponse.json({ error: message }, { status: 400 });
  }
  console.error(`[${context}]`, error);
  return NextResponse.json({ error: 'Server error' }, { status: 500 });
}
