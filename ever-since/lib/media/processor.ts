import 'server-only';
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { logger } from '../logger';

export interface ProcessedPhotoResult {
  buffer: Buffer;
  width?: number;
  height?: number;
}

/**
 * Processes an uploaded photo buffer using Sharp:
 * - Automatically strips EXIF/camera metadata for privacy.
 * - Auto-orients image based on EXIF before stripping.
 * - Extracts accurate image dimensions (width, height).
 * - Constrains maximum dimension to 2048px (preserving aspect ratio without enlargement).
 */
export async function processPhotoBuffer(inputBuffer: Buffer): Promise<ProcessedPhotoResult> {
  const { data, info } = await sharp(inputBuffer)
    .rotate()
    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  logger.info(
    {
      event: 'media_processed',
      inputBytes: inputBuffer.length,
      outputBytes: data.length,
      width: info.width,
      height: info.height,
    },
    'Photo buffer processed successfully with Sharp'
  );

  return {
    buffer: data,
    width: info.width,
    height: info.height,
  };
}

/**
 * Writes processed media buffer to disk and logs the write operation.
 */
export async function writeMediaFile(
  filePath: string,
  buffer: Buffer,
  metadata?: Record<string, unknown>
): Promise<void> {
  await writeFile(filePath, buffer);
  logger.info(
    {
      event: 'media_write',
      filePath,
      bytes: buffer.length,
      ...metadata,
    },
    `Media file written to disk: ${filePath}`
  );
}
