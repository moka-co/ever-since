import 'server-only';
import { JsonDatabaseClient } from './db';
import type { DatabaseSchema, MediaRecord } from './schema';
import type { WriteQueue } from './queue';

/**
 * Child database client specialized in managing media assets and enforces
 * serialized updates and constraints on the media collection in db.json.
 */
export class MediaDatabaseClient extends JsonDatabaseClient {
  constructor(dbPath?: string, queue?: WriteQueue) {
    super(dbPath, queue);
  }

  /**
   * Retrieves all media records currently registered in the database.
   */
  async getMedia(): Promise<MediaRecord[]> {
    const data = await this.read();
    return data.media;
  }

  /**
   * Finds a specific media record by its ID or filename.
   */
  async getMediaById(idOrFilename: string): Promise<MediaRecord | null> {
    const media = await this.getMedia();
    return (
      media.find(
        (m) => m.id === idOrFilename || m.filename.toLowerCase() === idOrFilename.toLowerCase()
      ) ?? null
    );
  }

  /**
   * Appends a new media record using the serialized update queue.
   * Enforces schema constraints (including max 20 files limit).
   */
  async addMedia(record: MediaRecord): Promise<DatabaseSchema> {
    return this.update((current) => ({
      ...current,
      media: [...current.media, record],
    }));
  }

  /**
   * Removes a media record by ID using the serialized update queue.
   */
  async deleteMedia(id: string): Promise<{ deleted: MediaRecord | null; db: DatabaseSchema }> {
    let deleted: MediaRecord | null = null;
    const db = await this.update((current) => {
      const item = current.media.find((m) => m.id === id);
      deleted = item ?? null;
      return {
        ...current,
        media: current.media.filter((m) => m.id !== id),
      };
    });
    return { deleted, db };
  }
}

export const mediaDbClient = new MediaDatabaseClient();
