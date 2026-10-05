import { readDb } from '@/lib/storage/db';
import TimelineClient from './timeline-client';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const db = await readDb().catch(() => ({
    secret: { value: '' },
    config: { anniversaryDate: '' },
    memories: [],
    media: [],
  }));

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-6 md:p-12 select-none overflow-x-hidden">
      <TimelineClient memories={db.memories} media={db.media} />
    </main>
  );
}