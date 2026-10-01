import 'server-only';
import { z } from 'zod';
import { JsonDatabaseClient } from './db';
import type { DatabaseSchema } from './schema';
import type { WriteQueue } from './queue';

export const configInputSchema = z.object({
  anniversaryDate: z.string().date().or(z.literal('')),
});
export type ConfigInput = z.infer<typeof configInputSchema>;

/**
 * Child database client specialized in managing configuration settings
 * for the customize area (such as the relationship kickoff anniversary date).
 */
export class CustomizeDatabaseClient extends JsonDatabaseClient {
  constructor(dbPath?: string, queue?: WriteQueue) {
    super(dbPath, queue);
  }

  /**
   * Retrieves the current configuration from db.json.
   */
  async getConfig(): Promise<{ anniversaryDate: string }> {
    const data = await this.read();
    return data.config;
  }

  /**
   * Safely updates the anniversary date in db.json via WriteQueue.
   * Validates ISO date format YYYY-MM-DD or empty string.
   */
  async updateAnniversaryDate(anniversaryDate: string): Promise<{
    config: { anniversaryDate: string };
    db: DatabaseSchema;
  }> {
    const validated = configInputSchema.parse({ anniversaryDate });

    let updatedConfig: { anniversaryDate: string } = { anniversaryDate: '' };

    const db = await this.update((current) => {
      updatedConfig = {
        ...current.config,
        anniversaryDate: validated.anniversaryDate,
      };
      return {
        ...current,
        config: updatedConfig,
      };
    });

    return { config: updatedConfig, db };
  }
}

export const customizeDbClient = new CustomizeDatabaseClient();
