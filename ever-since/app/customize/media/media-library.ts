import type { MediaRecord } from '@/lib/storage/schema';
import { isVideo } from '@/lib/media/validation';

// Pure helpers shared by the server page (`app/customize/page.tsx`) and the
// client `MediaManager`. This module intentionally has NO 'use client'
// directive: exports of a 'use client' module become client references on the
// server and cannot be invoked from Server Components.

export function partitionMediaLibrary(mediaList: MediaRecord[]): {
  photos: MediaRecord[];
  videos: MediaRecord[];
} {
  const photos: MediaRecord[] = [];
  const videos: MediaRecord[] = [];
  for (const item of mediaList) {
    if (isVideo(item.filename)) {
      videos.push(item);
    } else {
      photos.push(item);
    }
  }
  return { photos, videos };
}

export function collectUsedMediaIds(
  memories: { mediaId?: string | null }[],
  sealMediaId?: string | null
): Set<string> {
  const used = new Set<string>();
  for (const memory of memories) {
    if (memory.mediaId) {
      used.add(memory.mediaId);
    }
  }
  if (sealMediaId) {
    used.add(sealMediaId);
  }
  return used;
}
