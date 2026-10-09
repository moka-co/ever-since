'use client';

import { useEffect, useState } from 'react';
import type { MediaRecord } from '@/lib/storage/schema';

const VIDEO_EXT = /\.(mp4|webm|ogg|mov)$/i;

interface MediaPickerProps {
  mediaList: MediaRecord[];
  value: string; // selected media id, '' = none
  onChange: (id: string) => void;
  onUploadClick: () => void;
  isUploading: boolean;
  canUpload: boolean;
  disabled?: boolean;
}

function Thumb({ media }: { media: MediaRecord }) {
  if (VIDEO_EXT.test(media.filename)) {
    return (
      <div className="relative w-full h-full">
        <video
          src={`/api/media/${media.filename}`}
          autoPlay
          loop
          muted
          playsInline
          onLoadedMetadata={(e) => {
            e.currentTarget.playbackRate = 1.5;
          }}
          className="w-full h-full object-cover pointer-events-none"
        />
        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase pointer-events-none tracking-wider">
          Video
        </span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/media/${media.filename}`}
      alt=""
      loading="lazy"
      className="w-full h-full object-cover"
    />
  );
}

export default function MediaPicker({
  mediaList,
  value,
  onChange,
  onUploadClick,
  isUploading,
  canUpload,
  disabled = false,
}: MediaPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = mediaList.find((m) => m.id === value) ?? null;

  // Close with Escape and lock page scroll while the modal is open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  function pick(id: string) {
    onChange(id);
    setIsOpen(false);
  }

  return (
    <>
      {/* Trigger: shows the current choice as a picture, not a filename */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          aria-label={selected ? 'Change selected media' : 'Choose media'}
          className="group relative w-20 h-20 shrink-0 rounded-2xl overflow-hidden border-2 border-dashed border-[#ECDCE3] bg-[#FAF7F8] hover:border-[#F472B6] transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {selected ? (
            <>
              <Thumb media={selected} />
              <span className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[11px] font-semibold text-white">
                Change
              </span>
            </>
          ) : (
            <span className="text-2xl text-muted group-hover:text-[#F472B6] transition-colors">+</span>
          )}
        </button>

        <div className="flex flex-col gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            disabled={disabled}
            className="text-left text-sm font-semibold text-foreground hover:text-[#EC4899] transition-colors disabled:opacity-50"
          >
            {selected ? 'Change media' : 'Choose a photo or video'}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onUploadClick}
              disabled={disabled || isUploading || !canUpload}
              className="text-xs font-semibold text-muted hover:text-foreground underline-offset-2 hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {isUploading ? 'Uploading...' : 'Upload new'}
            </button>
            {selected && (
              <>
                <span className="text-muted text-xs">·</span>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  disabled={disabled}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-700 underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal grid */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="media-picker-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-[28px] bg-white shadow-[0_20px_60px_rgba(244,114,182,0.25)] border border-[#F1E8EC] overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1E8EC]">
              <div>
                <h3 id="media-picker-title" className="text-base font-semibold text-foreground">
                  Choose a photo or video
                </h3>
                <p className="text-xs text-muted">{mediaList.length} in your library (photos &amp; videos)</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full border border-[#F1E8EC] bg-[#FAF7F8] hover:bg-white text-muted hover:text-foreground flex items-center justify-center transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {/* Upload tile */}
                <li>
                  <button
                    type="button"
                    onClick={onUploadClick}
                    disabled={isUploading || !canUpload}
                    className="w-full aspect-square rounded-2xl border-2 border-dashed border-[#ECDCE3] bg-[#FAF7F8] hover:border-[#F472B6] hover:text-[#EC4899] text-muted flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <span className="text-xl leading-none">+</span>
                    <span className="text-[11px] font-semibold">
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </span>
                  </button>
                </li>

                {/* No media tile */}
                <li>
                  <button
                    type="button"
                    onClick={() => pick('')}
                    aria-pressed={value === ''}
                    className={`w-full aspect-square rounded-2xl border-2 flex items-center justify-center text-[11px] font-semibold transition-all ${
                      value === ''
                        ? 'border-[#F472B6] ring-2 ring-[#F472B6]/30 text-[#EC4899] bg-rose-50'
                        : 'border-[#F1E8EC] text-muted bg-white hover:border-[#ECDCE3]'
                    }`}
                  >
                    No media
                  </button>
                </li>

                {mediaList.map((m) => {
                  const isSelected = m.id === value;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => pick(m.id)}
                        aria-pressed={isSelected}
                        aria-label={`Select ${m.filename}`}
                        className={`relative w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-[1.03] ${
                          isSelected
                            ? 'border-[#F472B6] ring-2 ring-[#F472B6]/30'
                            : 'border-transparent hover:border-[#ECDCE3]'
                        }`}
                      >
                        <Thumb media={m} />
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gradient-to-r from-[#F472B6] to-[#FB7185] text-white text-[11px] font-bold flex items-center justify-center shadow">
                            ✓
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
