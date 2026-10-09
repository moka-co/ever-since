'use client';

import { useState, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaRecord } from '@/lib/storage/schema';
import { MAX_MEDIA_COUNT, isVideo, validateMediaConstraints } from '@/lib/media/validation';
import { Skeleton } from '@/components/ui/skeleton';
import Alert from './alert';

interface MediaManagerProps {
  initialMedia: MediaRecord[];
  usedMediaIds?: string[];
}

export default function MediaManager({ initialMedia, usedMediaIds = [] }: MediaManagerProps) {
  const router = useRouter();
  const [mediaList, setMediaList] = useState<MediaRecord[]>(initialMedia);
  const [version, setVersion] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isQuotaFull = mediaList.length >= MAX_MEDIA_COUNT;

  const photos = mediaList.filter((m) => !isVideo(m.filename));
  const videos = mediaList.filter((m) => isVideo(m.filename));

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
    const validationError = validateMediaConstraints(
      { name: file.name, size: file.size },
      mediaList.length
    );
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

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

  function renderMediaTile(item: MediaRecord) {
    const video = isVideo(item.filename);
    const isUnused = !usedMediaIds.includes(item.id);
    const mediaUrl = version ? `/api/media/${item.filename}?t=${version}` : `/api/media/${item.filename}`;

    return (
      <li
        key={item.id}
        className="group relative aspect-square rounded-2xl border border-[#F1E8EC] bg-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all"
      >
        {video ? (
          <div className="relative w-full h-full bg-black/10">
            <video
              src={mediaUrl}
              autoPlay
              loop
              muted
              playsInline
              onLoadedMetadata={(e) => {
                e.currentTarget.playbackRate = 1.5;
              }}
              ref={(el) => {
                if (el) el.playbackRate = 1.5;
              }}
              className="w-full h-full object-cover pointer-events-none"
            />
            <span className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider pointer-events-none">
              Video
            </span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl}
            alt={item.filename}
            className="w-full h-full object-cover"
          />
        )}

        {/* Visual indicator for unused media */}
        {isUnused && (
          <span
            title="Not currently assigned to any memory or seal"
            className="absolute top-1.5 left-1.5 bg-amber-500/90 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-xs pointer-events-none shadow-xs"
          >
            Unused
          </span>
        )}

        {/* Hover Overlay with Delete Button */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
          <button
            type="button"
            onClick={() => handleDelete(item.id)}
            disabled={deletingId === item.id}
            title="Delete media"
            className="p-2.5 rounded-full bg-white/95 text-rose-500 hover:text-white hover:bg-rose-500 transition-all disabled:opacity-50 transform scale-90 group-hover:scale-100 shadow-sm cursor-pointer"
          >
            {deletingId === item.id ? (
              <Skeleton className="w-4 h-4 rounded-full" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            )}
          </button>
        </div>
      </li>
    );
  }

  return (
    <section
      aria-labelledby="media-heading"
      className="flex flex-col gap-6 pb-8 border-b border-[#C4A2B2]"
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
      <form onSubmit={handleUpload} className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
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
            className="rounded-full bg-gradient-to-r from-[#F472B6] to-[#FB7185] hover:from-[#EC4899] hover:to-[#F43F5E] text-white px-5 py-2 text-xs font-semibold transition-all shadow-[0_2px_10px_rgba(244,114,182,0.35)] hover:shadow-[0_4px_14px_rgba(244,114,182,0.5)] disabled:opacity-50 disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none hover:scale-102 active:scale-98 cursor-pointer"
          >
            {isUploading ? 'Uploading...' : 'Upload Media'}
          </button>
        </div>
      </form>

      {/* Global Empty State */}
      {mediaList.length === 0 && !isUploading && (
        <p className="text-xs text-muted py-8 text-center italic bg-[#FAF7F8] rounded-2xl border border-dashed border-[#F1E8EC]">
          No media files uploaded yet. Select a photo or video above to get started.
        </p>
      )}

      {/* Section 1: Photos */}
      {(photos.length > 0 || mediaList.length > 0 || isUploading) && (
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>Photos</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#FAF7F8] border border-[#F1E8EC] text-muted">
                {photos.length}
              </span>
            </h3>
          </div>

          {photos.length === 0 && !isUploading ? (
            <p className="text-xs text-muted py-5 text-center italic bg-[#FAF7F8] rounded-2xl border border-dashed border-[#F1E8EC]">
              No photos uploaded yet.
            </p>
          ) : (
            <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {isUploading && (
                <li
                  aria-label="Uploading media item"
                  className="relative aspect-square rounded-2xl border border-[#F1E8EC] bg-[#FAF7F8] flex items-center justify-center p-2"
                >
                  <Skeleton className="w-full h-full rounded-xl" />
                </li>
              )}
              {photos.map(renderMediaTile)}
            </ul>
          )}
        </div>
      )}

      {/* Section 2: Videos */}
      {(videos.length > 0 || mediaList.length > 0) && (
        <div className="flex flex-col gap-3 pt-4 border-t border-[#F1E8EC]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>Videos</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#FAF7F8] border border-[#F1E8EC] text-muted">
                {videos.length}
              </span>
            </h3>
            <span className="text-[11px] text-muted italic">Autoplay muted preview</span>
          </div>

          {videos.length === 0 ? (
            <p className="text-xs text-muted py-5 text-center italic bg-[#FAF7F8] rounded-2xl border border-dashed border-[#F1E8EC]">
              No videos uploaded yet.
            </p>
          ) : (
            <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {videos.map(renderMediaTile)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
