'use client';

import { useState, type FormEvent } from 'react';
import type { MediaRecord } from '@/lib/storage/schema';
import Alert from './alert';
import SaveSubmitButton from './save-submit-button';
import { useConfigSave } from './use-config-save';

interface SealPhotoManagerProps {
  initialSealMediaId: string | null;
  mediaList: MediaRecord[];
}

export default function SealPhotoManager({
  initialSealMediaId,
  mediaList,
}: SealPhotoManagerProps) {
  const [sealMediaId, setSealMediaId] = useState<string>(initialSealMediaId || '');
  const { isSaving, isSaved, errorMessage, clearError, submitConfig } =
    useConfigSave('Failed to update login photo/meme.');

  const selectedMedia = mediaList.find((m) => m.id === sealMediaId);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await submitConfig({ sealMediaId: sealMediaId || null });
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
        <Alert type="error" message={errorMessage} onDismiss={clearError} />
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

          <SaveSubmitButton
            isSaving={isSaving}
            isSaved={isSaved}
            idleLabel="Save Photo"
            size="sm"
          />
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
