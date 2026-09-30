import { NextResponse } from 'next/server';

/**
 * GET /api/media
 * Authenticated
 * List media & inspect 20-file quota
 */
export async function GET() {
  return NextResponse.json(
    {
      media: [],
      quota: {
        total: 20,
        used: 0,
        remaining: 20,
      },
    },
    { status: 200 }
  );
}

/**
 * POST /api/media
 * Authenticated
 * Upload photo/video (max 10MB, Sharp processed)
 */
export async function POST() {
  return NextResponse.json(
    {
      message: 'Mock: media uploaded successfully',
      id: 'mock-media-id',
    },
    { status: 201 }
  );
}
