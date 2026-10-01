import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { JsonDatabaseClient } from './db';
import { memorySchema, type DatabaseSchema, type MemoryRecord } from './schema';
import type { WriteQueue } from './queue';

export const memoryInputSchema = z.object({
  heading: z.string().max(100).nullable().optional(),
  text: z.string().max(100).nullable().optional(),
  mediaId: z.string().nullable().optional(),
});
export type MemoryInput = z.infer<typeof memoryInputSchema>;

export const reorderInputSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1, 'At least one memory ID must be provided'),
});
export type ReorderInput = z.infer<typeof reorderInputSchema>;

/**
 * Child database client specialized in managing memory timeline items
 * with serialized atomic mutations through WriteQueue.
 */
export class MemoryDatabaseClient extends JsonDatabaseClient {
  constructor(dbPath?: string, queue?: WriteQueue) {
    super(dbPath, queue);
  }

  /**
   * Retrieves all memory records in current story order.
   */
  async getMemories(): Promise<MemoryRecord[]> {
    const data = await this.read();
    return data.memories;
  }

  /**
   * Retrieves a single memory record by its UUID.
   */
  async getMemoryById(id: string): Promise<MemoryRecord | null> {
    const memories = await this.getMemories();
    return memories.find((m) => m.id === id) ?? null;
  }

  /**
   * Appends a new memory item to the timeline.
   */
  async addMemory(input: MemoryInput): Promise<{ memory: MemoryRecord; db: DatabaseSchema }> {
    const validated = memoryInputSchema.parse(input);

    const record: MemoryRecord = memorySchema.parse({
      id: randomUUID(),
      heading: validated.heading ?? null,
      text: validated.text ?? null,
      mediaId: validated.mediaId ?? null,
    });

    const db = await this.update((current) => ({
      ...current,
      memories: [...current.memories, record],
    }));

    return { memory: record, db };
  }

  /**
   * Updates an existing memory record by its UUID.
   */
  async updateMemory(
    id: string,
    updates: MemoryInput
  ): Promise<{ memory: MemoryRecord | null; db: DatabaseSchema }> {
    const validatedUpdates = memoryInputSchema.parse(updates);
    let updatedMemory: MemoryRecord | null = null;

    const db = await this.update((current) => {
      const existing = current.memories.find((m) => m.id === id);
      if (!existing) {
        return current;
      }

      const merged: MemoryRecord = memorySchema.parse({
        id: existing.id,
        heading: validatedUpdates.heading !== undefined ? validatedUpdates.heading : existing.heading,
        text: validatedUpdates.text !== undefined ? validatedUpdates.text : existing.text,
        mediaId: validatedUpdates.mediaId !== undefined ? validatedUpdates.mediaId : existing.mediaId,
      });

      updatedMemory = merged;

      return {
        ...current,
        memories: current.memories.map((m) => (m.id === id ? merged : m)),
      };
    });

    return { memory: updatedMemory, db };
  }

  /**
   * Deletes a memory record by its UUID.
   */
  async deleteMemory(id: string): Promise<{ deleted: MemoryRecord | null; db: DatabaseSchema }> {
    let deleted: MemoryRecord | null = null;

    const db = await this.update((current) => {
      const existing = current.memories.find((m) => m.id === id);
      if (!existing) {
        return current;
      }

      deleted = existing;

      return {
        ...current,
        memories: current.memories.filter((m) => m.id !== id),
      };
    });

    return { deleted, db };
  }

  /**
   * Reorders memories to match the array of UUIDs provided in `orderedIds`.
   * Preserves any existing memories that might not be in the reordered slice.
   */
  async reorderMemories(
    orderedIds: string[]
  ): Promise<{ memories: MemoryRecord[]; db: DatabaseSchema }> {
    const validated = reorderInputSchema.parse({ orderedIds });

    let reordered: MemoryRecord[] = [];

    const db = await this.update((current) => {
      const memoryMap = new Map(current.memories.map((m) => [m.id, m]));

      // 1. Arrange items specified in orderedIds
      const newOrderedList: MemoryRecord[] = [];
      for (const id of validated.orderedIds) {
        const item = memoryMap.get(id);
        if (item) {
          newOrderedList.push(item);
          memoryMap.delete(id);
        }
      }

      // 2. Append any remaining memories not included in orderedIds to prevent data loss
      for (const remainingItem of memoryMap.values()) {
        newOrderedList.push(remainingItem);
      }

      reordered = newOrderedList;

      return {
        ...current,
        memories: newOrderedList,
      };
    });

    return { memories: reordered, db };
  }
}

export const memoryDbClient = new MemoryDatabaseClient();
