'use client';

import { useState, type FormEvent } from 'react';
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedMedia = mediaList.find((m) => m.id === sealMediaId);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(true);

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

      setSuccessMessage('Login photo/meme updated successfully.');
      router.refresh();
    } catch {
      setErrorMessage('A network error occurred while saving. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="seal-photo-heading"
      className="flex flex-col gap-4 pb-8 border-b border-[#E5E7EB]"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 id="seal-photo-heading" className="text-lg font-semibold text-foreground">
            Login Seal Photo or Meme
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Choose which uploaded photo or meme appears on the login screen alongside the date input.
          </p>
        </div>
      </div>

      {errorMessage && (
        <Alert type="error" message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}
      {successMessage && (
        <Alert type="success" message={successMessage} onDismiss={() => setSuccessMessage(null)} />
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            id="seal-media-select"
            aria-label="Select seal photo or meme"
            value={sealMediaId}
            onChange={(e) => setSealMediaId(e.target.value)}
            disabled={isSaving}
            className="w-full sm:w-64 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-foreground focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta shadow-2xs disabled:opacity-50"
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
            className="rounded-lg bg-[#1E1B24] hover:bg-[#2D2837] text-white px-5 py-2 text-sm font-medium transition-colors shadow-xs disabled:opacity-50 shrink-0"
          >
            {isSaving ? 'Saving...' : 'Save Selection'}
          </button>
        </div>

        {/* Thumbnail preview */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[#E5E7EB] bg-gray-50/70 shrink-0">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-200 shrink-0">
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
          <div className="flex flex-col text-xs">
            <span className="font-medium text-foreground truncate max-w-[140px]">
              {selectedMedia ? selectedMedia.filename : 'Default cute seal'}
            </span>
            <span className="text-[10px] text-muted">Preview</span>
          </div>
        </div>
      </form>
    </section>
  );
}
