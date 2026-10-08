import 'server-only';
import { readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { readDb, updateDb } from '@/lib/storage/db';
import type { MediaRecord } from '@/lib/storage/schema';
import {
  MEDIA_DIR,
  MEDIA_TYPES,
  getExtension,
  isVideo,
  MAX_MEDIA_COUNT,
} from '@/lib/media/validation';
import { logger } from '@/lib/logger';

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reconciles files present on the filesystem in MEDIA_DIR with db.json:
 * - Scans MEDIA_DIR for valid image and video files.
 * - Registers any files present on disk but missing in db.json (measuring dimensions with Sharp).
 * - Generates or adopts UUIDs following the pattern of files in media/ (e.g., 03a27da4-bbe2-4790-b32b-e70f601032e6).
 * - Prunes any database records whose underlying files no longer exist on disk.
 * - Enforces the 50-file MAX_MEDIA_COUNT quota.
 * - Invoked on login, on customize, and on media API list fetch.
 */
export async function reconcileMediaLibrary(): Promise<MediaRecord[]> {
  const dir = MEDIA_DIR;
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const diskEntries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const diskFiles = diskEntries
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .filter((filename) => {
      const ext = getExtension(filename);
      return Boolean(MEDIA_TYPES[ext]);
    });

  const diskFilenameSet = new Set(diskFiles);
  const db = await readDb();

  // 1. Identify valid existing DB records whose files are present on disk
  const existingValid = db.media.filter((record) => diskFilenameSet.has(record.filename));
  const existingFilenames = new Set(existingValid.map((m) => m.filename));
  const existingIds = new Set(existingValid.map((m) => m.id));

  // 2. Identify new files present on disk that are not registered in DB
  const newDiskFiles = diskFiles.filter((filename) => !existingFilenames.has(filename));

  let addedCount = 0;
  const newlyAddedRecords: MediaRecord[] = [];

  const availableSlots = Math.max(0, MAX_MEDIA_COUNT - existingValid.length);
  const filesToRegister = newDiskFiles.slice(0, availableSlots);

  for (const filename of filesToRegister) {
    const ext = getExtension(filename);
    const baseName = filename.slice(0, filename.length - ext.length);

    let id = UUID_REGEX.test(baseName) ? baseName.toLowerCase() : randomUUID();
    while (existingIds.has(id)) {
      id = randomUUID();
    }
    existingIds.add(id);

    let width: number | undefined;
    let height: number | undefined;

    const filePath = resolve(dir, filename);
    if (!isVideo(filename)) {
      try {
        const metadata = await sharp(filePath).metadata();
        width = metadata.width;
        height = metadata.height;
      } catch (err) {
        logger.warn(
          { event: 'media_sync_metadata_warning', filename, error: String(err) },
          `Could not read image dimensions for ${filename}`
        );
      }
    }

    const record: MediaRecord = {
      id,
      filename,
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
    };

    newlyAddedRecords.push(record);
    addedCount++;
  }

  const prunedCount = db.media.length - existingValid.length;
  const hasChanges = addedCount > 0 || prunedCount > 0;

  if (hasChanges) {
    const updatedMediaList = [...existingValid, ...newlyAddedRecords];

    await updateDb((current) => {
      const currentValidIds = new Set(updatedMediaList.map((m) => m.id));
      const sealMediaId =
        current.config.sealMediaId && !currentValidIds.has(current.config.sealMediaId)
          ? null
          : current.config.sealMediaId;

      return {
        ...current,
        config: {
          ...current.config,
          sealMediaId,
        },
        media: updatedMediaList,
      };
    });

    logger.info(
      {
        event: 'media_library_reconciled',
        added: addedCount,
        pruned: prunedCount,
        total: updatedMediaList.length,
      },
      `Media library reconciled: ${addedCount} added, ${prunedCount} pruned`
    );

    return updatedMediaList;
  }

  return db.media;
}
