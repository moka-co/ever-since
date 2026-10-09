import Link from 'next/link';
import { readDb } from '@/lib/storage/db';
import { reconcileMediaLibrary } from '@/lib/media/sync';
import ConfigForm from './config-form';
import SealPhotoManager from './seal-photo-manager';
import MediaManager from './media-manager';
import MemoriesManager from './memories-manager';
import CustomizeTabs from './customize-tabs';

export const dynamic = 'force-dynamic';

export default async function CustomizePage() {
  await reconcileMediaLibrary().catch(() => {});
  const db = await readDb();

  return (
    <main className="min-h-screen w-full py-10 px-4 md:px-8 flex justify-center items-start select-none">
      {/* Mobile Notice (< 1024px) */}
      <section
        aria-label="Desktop required notice"
        className="flex lg:hidden flex-col items-center justify-center text-center p-8 bg-white rounded-[32px] border border-[#F1E8EC] shadow-[0_12px_40px_rgba(255,150,170,0.22)] max-w-sm my-auto"
      >
        <h1 className="text-xl font-bold text-foreground mb-2">Desktop Only</h1>
        <p className="text-sm text-muted mb-4">
          Please open /customize on a desktop device (1024px or wider).
        </p>
        <Link
          href="/"
          className="text-xs font-semibold text-cta hover:text-cta-hover transition-colors"
        >
          ← Return to Main Flow
        </Link>
      </section>

      {/* Desktop Admin Dashboard (>= 1024px) - Single Elevated Card */}
      <div className="hidden lg:flex flex-col w-full max-w-3xl rounded-[36px] md:rounded-[40px] border border-[#F1E8EC] bg-white p-10 md:p-12 shadow-[0_12px_40px_rgba(255,150,170,0.22)] gap-10">
        {/* Header */}
        <header className="flex items-center justify-between pb-6 border-b border-[#C4A2B2]">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customize EverSince</h1>
            <p className="text-sm text-muted mt-1">
              Configure your anniversary date, media assets, and timeline memories.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-semibold text-foreground hover:text-cta bg-[#FAF7F8] hover:bg-white border border-[#ECDCE3] px-4 py-2 rounded-full transition-all shadow-2xs hover:shadow-xs"
          >
            ← View Main Flow
          </Link>
        </header>

        {(() => {
          const usedMediaIds = Array.from(
            new Set([
              ...db.memories.map((m) => m.mediaId).filter((id): id is string => Boolean(id)),
              ...(db.config.sealMediaId ? [db.config.sealMediaId] : []),
            ])
          );
          return (
            <CustomizeTabs
              generalSettings={
                <section key="general-settings" aria-label="Story Initiation and Login Configuration">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-[#C4A2B2]">
                    <div className="flex flex-col">
                      <ConfigForm initialDate={db.config.anniversaryDate} />
                    </div>
                    <div className="flex flex-col pt-6 md:pt-0 md:pl-8">
                      <SealPhotoManager
                        initialSealMediaId={db.config.sealMediaId ?? null}
                        mediaList={db.media}
                      />
                    </div>
                  </div>
                </section>
              }
              mediaLibrary={<MediaManager key="media-library" initialMedia={db.media} usedMediaIds={usedMediaIds} />}
              memoriesTimeline={<MemoriesManager key="memories-timeline" initialMemories={db.memories} mediaList={db.media} />}
            />
          );
        })()}
      </div>
    </main>
  );
}
