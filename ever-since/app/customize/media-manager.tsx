'use client';

import { useState, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaRecord } from '@/lib/storage/schema';
import { MAX_MEDIA_COUNT, isVideo } from '@/lib/media/validation';
import { Skeleton } from '@/components/ui/skeleton';
import Alert from './alert';

interface MediaManagerProps {
  initialMedia: MediaRecord[];
}

export default function MediaManager({ initialMedia }: MediaManagerProps) {
  const router = useRouter();
  const [mediaList, setMediaList] = useState<MediaRecord[]>(initialMedia);
  const [version, setVersion] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isQuotaFull = mediaList.length >= MAX_MEDIA_COUNT;

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const input = fileInputRef.current;
    if (!input || !input.files || input.files.length === 0) {
      setErrorMessage('Please select a photo or video to upload.');
      return;
    }

    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);

    try {
      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to upload media.');
        return;
      }

      const newMedia = data.media as MediaRecord;
      const updated = [...mediaList, newMedia];
      setMediaList(updated);
      setVersion(Date.now());
      router.refresh();
      setSuccessMessage(`Successfully uploaded ${newMedia.filename}`);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch {
      setErrorMessage('A network error occurred while uploading. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this media file?')) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setDeletingId(id);

    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to delete media.');
        return;
      }

      const updated = mediaList.filter((m) => m.id !== id);
      setMediaList(updated);
      router.refresh();
      setSuccessMessage('Media deleted successfully.');
    } catch {
      setErrorMessage('A network error occurred while deleting. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section
      aria-labelledby="media-heading"
      className="flex flex-col gap-4 pb-8 border-b border-[#C4A2B2]"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 id="media-heading" className="text-lg font-semibold text-foreground">
            Media Library
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Photos (max 10MB, EXIF stripped) & videos (max 50MB) for memories
          </p>
        </div>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full border ${
            isQuotaFull
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-[#FAF7F8] text-foreground border-[#F1E8EC]'
          }`}
        >
          {mediaList.length} / {MAX_MEDIA_COUNT} media files used
        </span>
      </div>

      {errorMessage && (
        <Alert type="error" message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}
      {successMessage && (
        <Alert type="success" message={successMessage} onDismiss={() => setSuccessMessage(null)} />
      )}

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept="image/*,video/*"
          disabled={isUploading || isQuotaFull}
          className="text-xs text-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border file:border-[#F1E8EC] file:text-xs file:font-semibold file:bg-[#FAF7F8] file:text-foreground hover:file:bg-white cursor-pointer disabled:opacity-50 transition-colors"
        />
        <button
          type="submit"
          disabled={isUploading || isQuotaFull}
          className="rounded-full bg-gradient-to-r from-[#F472B6] to-[#FB7185] hover:from-[#EC4899] hover:to-[#F43F5E] text-white px-5 py-2 text-xs font-semibold transition-all shadow-[0_2px_10px_rgba(244,114,182,0.35)] hover:shadow-[0_4px_14px_rgba(244,114,182,0.5)] disabled:opacity-50 disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none hover:scale-102 active:scale-98"
        >
          {isUploading ? 'Uploading...' : 'Upload Media'}
        </button>
      </form>

      {/* Media List / Grid */}
      {mediaList.length === 0 && !isUploading ? (
        <p className="text-xs text-muted py-6 text-center italic bg-[#FAF7F8] rounded-2xl border border-dashed border-[#F1E8EC]">
          No media files uploaded yet. Select a photo or video above to get started.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 mt-2">
          {isUploading && (
            <li
              aria-label="Uploading media item"
              className="flex items-center justify-between p-3.5 rounded-2xl border border-[#F1E8EC] bg-[#FAF7F8]"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-6 w-14 rounded-full" />
            </li>
          )}
          {mediaList.map((item) => {
            const video = isVideo(item.filename);
            return (
              <li
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-[#F1E8EC] bg-[#FAF7F8]/80 hover:bg-white hover:shadow-xs transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gray-100 border border-[#F1E8EC] overflow-hidden flex items-center justify-center shrink-0">
                    {video ? (
                      <span className="text-[10px] font-bold text-muted uppercase">VID</span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={version ? `/api/media/${item.filename}?t=${version}` : `/api/media/${item.filename}`}
                        alt={item.filename}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{item.filename}</span>
                    <span className="text-[11px] text-muted">
                      {video
                        ? 'Video'
                        : item.width && item.height
                        ? `${item.width} × ${item.height}px`
                        : 'Image'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="text-xs text-rose-500 hover:text-rose-700 font-semibold px-3 py-1.5 rounded-full hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  {deletingId === item.id ? 'Deleting...' : 'Delete'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
