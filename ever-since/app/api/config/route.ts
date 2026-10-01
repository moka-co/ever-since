import { NextResponse } from 'next/server';
import { customizeDbClient } from '@/lib/storage/customize-db';
import { ZodError } from 'zod';

/**
 * GET /api/config
 * Authenticated
 * Fetch anniversary date & story settings
 */
export async function GET() {
  try {
    const config = await customizeDbClient.getConfig();
    return NextResponse.json(
      {
        anniversaryDate: config.anniversaryDate,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /api/config GET] Error retrieving config:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/config
 * Authenticated
 * Update anniversary date
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { anniversaryDate } = body;

    if (typeof anniversaryDate !== 'string') {
      return NextResponse.json(
        { error: 'anniversaryDate must be a string' },
        { status: 400 }
      );
    }

    const { config } = await customizeDbClient.updateAnniversaryDate(anniversaryDate);

    return NextResponse.json(
      {
        message: 'Anniversary date updated successfully',
        config,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid anniversary date format. Expected YYYY-MM-DD or empty string.',
          details: error.flatten(),
        },
        { status: 400 }
      );
    }
    console.error('[API /api/config PUT] Error updating config:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
