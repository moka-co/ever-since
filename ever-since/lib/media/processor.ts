import 'server-only';
import sharp from 'sharp';

export interface ProcessedPhotoResult {
  buffer: Buffer;
  width?: number;
  height?: number;
}

const MAX_IMAGE_DIMENSION = 2048;

/**
 * Processes an uploaded photo buffer using Sharp:
 * - Automatically strips EXIF and camera metadata for privacy.
 * - Extracts accurate image dimensions (width, height).
 * - Constrains maximum dimension to 2048px (preserving aspect ratio without enlargement).
 */
export async function processPhotoBuffer(inputBuffer: Buffer): Promise<ProcessedPhotoResult> {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  let transform = sharp(inputBuffer);

  // Resize if width or height exceeds MAX_IMAGE_DIMENSION
  if (
    (metadata.width && metadata.width > MAX_IMAGE_DIMENSION) ||
    (metadata.height && metadata.height > MAX_IMAGE_DIMENSION)
  ) {
    transform = transform.resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // ToBuffer will strip EXIF unless withMetadata() was explicitly requested
  const processedBuffer = await transform.toBuffer();
  const processedMeta = await sharp(processedBuffer).metadata();

  return {
    buffer: processedBuffer,
    width: processedMeta.width ?? metadata.width,
    height: processedMeta.height ?? metadata.height,
  };
}
