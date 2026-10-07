import { resolve } from 'node:path';
import { logger } from '../logger';

export const MAX_MEDIA_COUNT = 20;
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const MEDIA_DIR = process.env.MEDIA_DIR ?? resolve(process.cwd(), 'media');

export const MEDIA_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

export function getExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i).toLowerCase();
}

export function getMimeType(name: string): string {
  return MEDIA_TYPES[getExtension(name)] ?? 'application/octet-stream';
}

export function isVideo(name: string): boolean {
  return getMimeType(name).startsWith('video/');
}

export interface ValidationInput {
  name: string;
  size: number;
}

export function validateMediaConstraints(
  file: ValidationInput,
  currentCount: number
): string | null {
  if (currentCount >= MAX_MEDIA_COUNT) {
    const error = `Media quota exceeded. A maximum of ${MAX_MEDIA_COUNT} files is allowed. Please delete existing files before uploading new ones.`;
    logger.warn({ event: 'media_validation_failed', filename: file.name, currentCount, reason: 'quota_exceeded' }, error);
    return error;
  }

  const ext = getExtension(file.name);
  if (!MEDIA_TYPES[ext]) {
    const error = `Unsupported file type "${ext}". Supported formats are photos (JPG, PNG, WebP, GIF, AVIF) and videos (MP4, WebM, MOV).`;
    logger.warn({ event: 'media_validation_failed', filename: file.name, ext, reason: 'unsupported_type' }, error);
    return error;
  }

  const video = isVideo(file.name);
  if (!video && file.size > MAX_PHOTO_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    const error = `Photo exceeds the maximum size limit of 10MB (file is ${sizeInMb}MB).`;
    logger.warn({ event: 'media_validation_failed', filename: file.name, size: file.size, reason: 'photo_too_large' }, error);
    return error;
  }

  if (video && file.size > MAX_VIDEO_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    const error = `Video exceeds the maximum size limit of 50MB (file is ${sizeInMb}MB).`;
    logger.warn({ event: 'media_validation_failed', filename: file.name, size: file.size, reason: 'video_too_large' }, error);
    return error;
  }

  logger.info(
    {
      event: 'media_validation_passed',
      filename: file.name,
      size: file.size,
      isVideo: video,
      currentCount,
    },
    `Media validation passed for ${file.name}`
  );

  return null;
}

export function getNextMediaId(existingMedia: { id: string }[]): string {
  const maxId = existingMedia.reduce((max, item) => {
    const num = parseInt(item.id, 10);
    return !isNaN(num) && num > max ? num : max;
  }, 0);
  return String(maxId + 1);
}
