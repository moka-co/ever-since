import Link from 'next/link';
import { readDb } from '@/lib/storage/db';
import ConfigForm from './config-form';
import SealPhotoManager from './seal-photo-manager';
import MediaManager from './media-manager';
import MemoriesManager from './memories-manager';

export const dynamic = 'force-dynamic';

export default async function CustomizePage() {
  const db = await readDb();

  return (
    <main className="min-h-screen w-full py-10 px-4 md:px-8 flex justify-center items-start select-none">
      {/* Mobile Notice (< 1024px) */}
      <section
        aria-label="Desktop required notice"
        className="flex lg:hidden flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm max-w-sm my-auto"
      >
        <h1 className="text-xl font-bold text-foreground mb-2">Desktop Only</h1>
        <p className="text-sm text-muted mb-4">
          Please open /customize on a desktop device (1024px or wider).
        </p>
        <Link
          href="/"
          className="text-xs font-medium text-cta hover:text-cta-hover transition-colors"
        >
          ← Return to Main Flow
        </Link>
      </section>

      {/* Desktop Admin Dashboard (>= 1024px) - Single Long Vertical Card */}
      <div className="hidden lg:flex flex-col w-full max-w-3xl rounded-[28px] border border-[#E5E7EB] bg-white p-10 md:p-12 shadow-md gap-10">
        {/* Header */}
        <header className="flex items-center justify-between pb-6 border-b border-[#E5E7EB]">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customize EverSince</h1>
            <p className="text-sm text-muted mt-1">
              Configure your anniversary date, media assets, and timeline memories.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-foreground hover:text-cta bg-gray-50 hover:bg-gray-100 border border-[#E5E7EB] px-4 py-2 rounded-lg transition-colors shadow-2xs"
          >
            ← View Main Flow
          </Link>
        </header>

        {/* 1. Anniversary Date Config */}
        <ConfigForm initialDate={db.config.anniversaryDate} />

        {/* 2. Login Screen Seal Photo / Meme Config */}
        <SealPhotoManager
          initialSealMediaId={db.config.sealMediaId ?? null}
          mediaList={db.media}
        />

        {/* 3. Media Management */}
        <MediaManager initialMedia={db.media} />

        {/* 4 & 5. Memory Authoring & Memories Timeline List */}
        <MemoriesManager initialMemories={db.memories} mediaList={db.media} />
      </div>
    </main>
  );
}
