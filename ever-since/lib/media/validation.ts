import { extname } from 'node:path';

export const MAX_MEDIA_COUNT = 20;
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const ALLOWED_PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.quicktime'];

export type MediaKind = 'photo' | 'video' | 'unsupported';

/**
 * Detects whether a file is a photo, video, or unsupported based on extension and MIME type.
 */
export function getMediaKind(filename: string, mimeType?: string): MediaKind {
  const ext = extname(filename).toLowerCase();

  if (ALLOWED_PHOTO_EXTENSIONS.includes(ext) || (mimeType && mimeType.startsWith('image/'))) {
    return 'photo';
  }

  if (ALLOWED_VIDEO_EXTENSIONS.includes(ext) || (mimeType && mimeType.startsWith('video/'))) {
    return 'video';
  }

  return 'unsupported';
}

export interface ValidationInput {
  name: string;
  size: number;
  type?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  mediaKind?: 'photo' | 'video';
}

/**
 * Validates media constraints:
 * 1. Maximum quota (cannot exceed 20 files).
 * 2. Allowed file format (photo or video).
 * 3. Maximum size (10MB for photos, 50MB for videos).
 */
export function validateMediaConstraints(
  file: ValidationInput,
  currentCount: number
): ValidationResult {
  // 1. Quota check
  if (currentCount >= MAX_MEDIA_COUNT) {
    return {
      valid: false,
      error: `Media quota exceeded. A maximum of ${MAX_MEDIA_COUNT} files is allowed. Please delete existing files before uploading new ones.`,
    };
  }

  // 2. Type check
  const kind = getMediaKind(file.name, file.type);
  if (kind === 'unsupported') {
    return {
      valid: false,
      error: `Unsupported file type "${extname(file.name)}". Supported formats are photos (JPG, PNG, WebP, GIF, AVIF) and videos (MP4, WebM, MOV).`,
    };
  }

  // 3. Size constraints
  if (kind === 'photo' && file.size > MAX_PHOTO_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Photo exceeds the maximum size limit of 10MB (file is ${sizeInMb}MB).`,
    };
  }

  if (kind === 'video' && file.size > MAX_VIDEO_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Video exceeds the maximum size limit of 50MB (file is ${sizeInMb}MB).`,
    };
  }

  return {
    valid: true,
    mediaKind: kind,
  };
}

/**
 * Computes the next media ID sequentially (simple +1 strategy) based on existing records.
 */
export function getNextMediaId(existingMedia: { id: string }[]): string {
  const maxId = existingMedia.reduce((max, item) => {
    const num = parseInt(item.id, 10);
    return !isNaN(num) && num > max ? num : max;
  }, 0);
  return String(maxId + 1);
}

/**
 * Maps a filename to its standard HTTP Content-Type MIME header.
 */
export function getMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.avif':
      return 'image/avif';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mov':
    case '.quicktime':
      return 'video/quicktime';
    default:
      return 'application/octet-stream';
  }
}
