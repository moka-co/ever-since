'use client';

import { useState, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaRecord } from '@/lib/storage/schema';
import { MAX_MEDIA_COUNT, isVideo } from '@/lib/media/validation';
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
      className="flex flex-col gap-4 pb-8 border-b border-[#E5E7EB]"
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
          className={`text-xs font-medium px-3 py-1 rounded-full border ${
            isQuotaFull
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-gray-100 text-foreground border-[#E5E7EB]'
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
          className="text-xs text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-[#E5E7EB] file:text-xs file:font-medium file:bg-gray-50 file:text-foreground hover:file:bg-gray-100 cursor-pointer disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isUploading || isQuotaFull}
          className="rounded-lg bg-[#1E1B24] hover:bg-[#2D2837] text-white px-4 py-2 text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Upload Media'}
        </button>
      </form>

      {/* Media List / Grid */}
      {mediaList.length === 0 ? (
        <p className="text-xs text-muted py-4 text-center italic bg-gray-50/50 rounded-xl border border-dashed border-[#E5E7EB]">
          No media files uploaded yet. Select a photo or video above to get started.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 mt-2">
          {mediaList.map((item) => {
            const video = isVideo(item.filename);
            return (
              <li
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl border border-[#E5E7EB] bg-gray-50/50 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-200 border border-[#E5E7EB] overflow-hidden flex items-center justify-center shrink-0">
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
                    <span className="text-sm font-medium text-foreground">{item.filename}</span>
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
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium px-3 py-1 rounded-md hover:bg-rose-50 transition-colors disabled:opacity-50"
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
