'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaRecord } from '@/lib/storage/schema';
import Alert from './alert';

interface SealPhotoManagerProps {
  initialSealMediaId: string | null;
  mediaList: MediaRecord[];
}

export default function SealPhotoManager({
  initialSealMediaId,
  mediaList,
}: SealPhotoManagerProps) {
  const router = useRouter();
  const [sealMediaId, setSealMediaId] = useState<string>(initialSealMediaId || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedMedia = mediaList.find((m) => m.id === sealMediaId);

  useEffect(() => {
    if (isSaved) {
      const timer = setTimeout(() => setIsSaved(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [isSaved]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setIsSaving(true);
    setIsSaved(false);

    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sealMediaId: sealMediaId || null }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to update login photo/meme.');
        return;
      }

      setIsSaved(true);
      router.refresh();
    } catch {
      setErrorMessage('A network error occurred while saving. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full justify-between">
      <div className="flex flex-col gap-1">
        <h2 id="seal-photo-heading" className="text-lg font-semibold text-foreground">
          First Photo
        </h2>
        <p className="text-xs text-muted">
          Photo or meme shown on the login date-entry screen
        </p>
      </div>

      {errorMessage && (
        <Alert type="error" message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-auto">
        <div className="flex items-center gap-2.5">
          <select
            id="seal-media-select"
            aria-label="Select first photo or meme"
            value={sealMediaId}
            onChange={(e) => setSealMediaId(e.target.value)}
            disabled={isSaving}
            className="flex-1 min-w-0 rounded-xl border border-[#ECDCE3] bg-[#FAF7F8] px-3 py-2 text-xs text-foreground focus:border-cta focus:bg-white focus:outline-none focus:ring-1 focus:ring-cta shadow-2xs disabled:opacity-50 transition-colors truncate"
          >
            <option value="">Default cute seal photo</option>
            {mediaList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.filename}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={isSaving}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all shadow-md shrink-0 hover:scale-102 active:scale-98 disabled:opacity-50 disabled:shadow-none ${
              isSaved
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.3)]'
                : 'bg-gradient-to-r from-[#F472B6] to-[#FB7185] hover:from-[#EC4899] hover:to-[#F43F5E] text-white shadow-[0_2px_10px_rgba(244,114,182,0.35)] hover:shadow-[0_4px_14px_rgba(244,114,182,0.5)] disabled:from-gray-300 disabled:to-gray-300'
            }`}
          >
            {isSaving ? 'Saving...' : isSaved ? '✓ Saved!' : 'Save Photo'}
          </button>
        </div>

        {/* Thumbnail preview */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border border-[#ECDCE3] bg-[#FAF7F8]">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 border border-[#ECDCE3] shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                selectedMedia
                  ? `/api/media/${selectedMedia.filename}`
                  : '/e9d4a14432afcc3f2f8e21cb5608cf14.jpg'
              }
              alt="Seal preview"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col text-xs min-w-0">
            <span className="font-semibold text-foreground truncate">
              {selectedMedia ? selectedMedia.filename : 'Default cute seal'}
            </span>
            <span className="text-[10px] text-muted">Preview</span>
          </div>
        </div>
      </form>
    </div>
  );
}
