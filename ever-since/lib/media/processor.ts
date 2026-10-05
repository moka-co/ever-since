import 'server-only';
import sharp from 'sharp';

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

  return {
    buffer: data,
    width: info.width,
    height: info.height,
  };
}
